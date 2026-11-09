// Reel Brawl desktop wrapper (STEAM_READINESS S4). Loads the web build (../dist, built with `npm run build:steam`)
// in one window, and bridges the few native things the game needs: quit, fullscreen, save files (Steam Auto-Cloud
// syncs the saves folder) and, when Steam is running, the persona name and achievements.
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// The Steam app id. Launched by Steam, the client sets SteamAppId (the real id, demo or full game). Outside Steam (a dev
// run) it comes from STEAM_APP_ID or steam_appid.txt; 480 (Spacewar) is Valve's test app. The file must not ship in a
// depot (Valve), so a missing file is normal and never stops the game (QA STEAM-01: it crashed on launch).
const readAppIdFile = () => {
  try {
    return fs.readFileSync(path.join(__dirname, 'steam_appid.txt'), 'utf8').trim();
  } catch {
    return '';
  }
};
// A packaged build carries its own id (resources/appid.json, written by package.cjs for the full game or the demo).
const readPackagedAppId = () => {
  try {
    return app.isPackaged ? String(JSON.parse(fs.readFileSync(path.join(process.resourcesPath, 'appid.json'), 'utf8')).appId || '') : '';
  } catch {
    return '';
  }
};
const APP_ID = Number(process.env.SteamAppId || process.env.STEAM_APP_ID || readPackagedAppId() || readAppIdFile() || 480);

// The game starts its sound on the first key press anyway; on desktop there's no autoplay gate to wait for.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let steam = null;
try {
  steam = require('steamworks.js').init(APP_ID);
} catch (err) {
  console.warn('[steam] not available, running without it:', err && err.message);
  // Launched by Steam but Steamworks failed (a native module left inside the asar, a missing steam_api): no achievements
  // and no overlay, silently. Leave a note where a bug report can find it (QA STEAM-03).
  if (process.env.SteamAppId) {
    try {
      fs.mkdirSync(app.getPath('userData'), { recursive: true });
      fs.appendFileSync(path.join(app.getPath('userData'), 'steam.log'), `${new Date().toISOString()} app ${APP_ID}: ${err && err.message}\n`);
    } catch {
      /* nowhere to write */
    }
  }
}

const savesDir = () => path.join(app.getPath('userData'), 'saves');

// Window prefs (fullscreen) live beside the saves, not in them: the game's saves never learn about the window.
const windowFile = () => path.join(app.getPath('userData'), 'window.json');
const readWindowPrefs = () => {
  try {
    return JSON.parse(fs.readFileSync(windowFile(), 'utf8')) || {};
  } catch {
    return {};
  }
};
const writeWindowPrefs = (prefs) => {
  try {
    fs.writeFileSync(windowFile(), JSON.stringify(prefs));
  } catch {
    /* read-only disk: the window just opens windowed next time */
  }
};
// 1280x720 unless the screen's work area is smaller (a 1366x768 laptop, 1080p at 150% scaling): then the biggest
// 16:9 that fits in 90% of it (QA STEAM-14).
const startSize = () => {
  const { width: aw, height: ah } = screen.getPrimaryDisplay().workAreaSize;
  const k = Math.min(1, (aw * 0.9) / 1280, (ah * 0.9) / 720);
  return { width: Math.round(1280 * k), height: Math.round(720 * k) };
};
const safeKey = (k) => String(k).replace(/[^a-z0-9._-]/gi, '_');

function createWindow() {
  const prefs = readWindowPrefs();
  const win = new BrowserWindow({
    ...startSize(),
    fullscreen: !!prefs.fullscreen,
    minWidth: 640,
    minHeight: 360,
    backgroundColor: '#07030d',
    useContentSize: true,
    autoHideMenuBar: true,
    title: 'Reel Brawl',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
    },
  });
  win.removeMenu();
  // Fullscreen is remembered between launches (F11, Alt+Enter or the setting).
  win.on('enter-full-screen', () => writeWindowPrefs({ ...readWindowPrefs(), fullscreen: true }));
  win.on('leave-full-screen', () => writeWindowPrefs({ ...readWindowPrefs(), fullscreen: false }));
  // backgroundThrottling is off (the music would stutter), which also turns off the page's visibility events: tell the
  // game itself when the window is minimised or hidden, so the music and the clock stop (QA STEAM-07).
  const hidden = (on) => !win.isDestroyed() && win.webContents.send('desktop:hidden', on);
  win.on('minimize', () => hidden(true));
  win.on('hide', () => hidden(true));
  win.on('restore', () => hidden(false));
  win.on('show', () => hidden(false));
  // A file dropped on the window would replace the game with it; a crashed page would leave a dead window (QA STEAM-15).
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('render-process-gone', (_e, details) => {
    console.warn('[desktop] page gone:', details && details.reason);
    if (details && details.reason !== 'clean-exit' && !win.isDestroyed()) win.webContents.reload();
  });
  const dist = app.isPackaged ? path.join(process.resourcesPath, 'web', 'index.html') : path.join(__dirname, '..', 'dist', 'index.html');
  win.loadFile(dist);
  // Links (the credits, the feedback form) open in the browser, never inside the game window.
  // (https only: the demo's WISHLIST ON STEAM comes this way.)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
  return win;
}

ipcMain.on('desktop:quit', () => app.quit());
ipcMain.on('desktop:fullscreen', (e, on) => BrowserWindow.fromWebContents(e.sender)?.setFullScreen(!!on));
ipcMain.on('desktop:isFullscreen', (e) => (e.returnValue = !!BrowserWindow.fromWebContents(e.sender)?.isFullScreen()));
// Save mirror: the game writes each save key here too (atomic: temp file, then rename).
ipcMain.on('desktop:saveWrite', (e, key, json) => {
  try {
    fs.mkdirSync(savesDir(), { recursive: true });
    const file = path.join(savesDir(), `${safeKey(key)}.json`);
    fs.writeFileSync(`${file}.tmp`, json);
    fs.renameSync(`${file}.tmp`, file);
    e.returnValue = true;
  } catch {
    e.returnValue = false;
  }
});
ipcMain.on('desktop:saveRead', (e, key) => {
  try {
    e.returnValue = fs.readFileSync(path.join(savesDir(), `${safeKey(key)}.json`), 'utf8');
  } catch {
    e.returnValue = null;
  }
});
ipcMain.on('desktop:saveRemove', (e, key) => {
  const file = path.join(savesDir(), `${safeKey(key)}.json`);
  try {
    fs.rmSync(file, { force: true });
    e.returnValue = true;
  } catch {
    // Can't delete it: blank it instead, so a cleared run never comes back through CONTINUE (save QA 2026-11-02).
    try {
      fs.writeFileSync(file, '');
      e.returnValue = true;
    } catch {
      e.returnValue = false;
    }
  }
});
ipcMain.on('steam:info', (e) => {
  e.returnValue = steam ? { name: steam.localplayer.getName(), id: String(steam.localplayer.getSteamId().steamId64) } : null;
});
// WISHLIST ON STEAM: the overlay's store page (the player stays in Steam); the browser if the overlay can't.
ipcMain.on('steam:openStore', (_e, appId) => {
  const id = Number(appId);
  if (!Number.isInteger(id) || id <= 0) return;
  try {
    steam.overlay.activateToStore(id, 0);
  } catch {
    require('electron').shell.openExternal(`https://store.steampowered.com/app/${id}`);
  }
});
ipcMain.on('steam:unlock', (_e, id) => {
  try {
    if (steam && !steam.achievement.isActivated(id)) steam.achievement.activate(id);
  } catch (err) {
    console.warn('[steam] achievement', id, err && err.message);
  }
});

// One copy at a time: two windows on one save folder would overwrite each other's saves (save QA 2026-11-02).
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => {
  const w = BrowserWindow.getAllWindows()[0];
  if (w) {
    if (w.isMinimized()) w.restore();
    w.focus();
  }
});

app.whenReady().then(() => {
  const win = createWindow();
  // SVS_SMOKE=<png path>: load, wait, screenshot, report the bridge, quit (a headless check of the wrapper).
  if (process.env.SVS_SMOKE) {
    win.webContents.on('console-message', (_e, level, msg) => level >= 2 && console.log('[page]', msg));
    win.webContents.once('did-finish-load', () =>
      setTimeout(async () => {
        const img = await win.capturePage();
        fs.writeFileSync(process.env.SVS_SMOKE, img.toPNG());
        const probe = await win.webContents.executeJavaScript('JSON.stringify({ desktop: typeof window.desktop, steam: typeof window.steam, fs: window.desktop && window.desktop.isFullscreen() })');
        console.log('[smoke]', probe);
        app.quit();
      }, 4000),
    );
  }
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => app.quit());
// The Steam overlay needs these on some GPUs.
if (steam) {
  try {
    require('steamworks.js').electronEnableSteamOverlay();
  } catch {
    /* older steamworks.js */
  }
}

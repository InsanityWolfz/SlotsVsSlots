// Slots vs. Slots desktop wrapper (STEAM_READINESS S4). Loads the web build (../dist, built with `npm run build:steam`)
// in one window, and bridges the few native things the game needs: quit, fullscreen, save files (Steam Auto-Cloud
// syncs the saves folder) and, when Steam is running, the persona name and achievements.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// The Steam app id. 480 (Spacewar) is Valve's test app; replace it with the real id (and in steam_appid.txt).
const APP_ID = Number(process.env.STEAM_APP_ID || fs.readFileSync(path.join(__dirname, 'steam_appid.txt'), 'utf8').trim() || 480);

// The game starts its sound on the first key press anyway; on desktop there's no autoplay gate to wait for.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let steam = null;
try {
  steam = require('steamworks.js').init(APP_ID);
} catch (err) {
  console.warn('[steam] not available, running without it:', err && err.message);
}

const savesDir = () => path.join(app.getPath('userData'), 'saves');
const safeKey = (k) => String(k).replace(/[^a-z0-9._-]/gi, '_');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    backgroundColor: '#07030d',
    useContentSize: true,
    autoHideMenuBar: true,
    title: 'Slots vs. Slots',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
    },
  });
  win.removeMenu();
  const dist = app.isPackaged ? path.join(process.resourcesPath, 'web', 'index.html') : path.join(__dirname, '..', 'dist', 'index.html');
  win.loadFile(dist);
  // Links (the credits, the feedback form) open in the browser, never inside the game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
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
  try {
    fs.rmSync(path.join(savesDir(), `${safeKey(key)}.json`), { force: true });
  } catch {
    /* already gone */
  }
  e.returnValue = true;
});
ipcMain.on('steam:info', (e) => {
  e.returnValue = steam ? { name: steam.localplayer.getName(), id: String(steam.localplayer.getSteamId().steamId64) } : null;
});
ipcMain.on('steam:unlock', (_e, id) => {
  try {
    if (steam && !steam.achievement.isActivated(id)) steam.achievement.activate(id);
  } catch (err) {
    console.warn('[steam] achievement', id, err && err.message);
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

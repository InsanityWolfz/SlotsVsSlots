// The bridge the game sees: `globalThis.desktop` (always) and `globalThis.steam` (only when Steam is running).
// Synchronous on purpose: the game reads its saves and the player's name at boot, before the first frame.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  quit: () => ipcRenderer.send('desktop:quit'),
  setFullscreen: (on) => ipcRenderer.send('desktop:fullscreen', !!on),
  isFullscreen: () => ipcRenderer.sendSync('desktop:isFullscreen'),
  saveWrite: (key, json) => ipcRenderer.sendSync('desktop:saveWrite', key, json),
  saveRead: (key) => ipcRenderer.sendSync('desktop:saveRead', key),
  saveRemove: (key) => ipcRenderer.sendSync('desktop:saveRemove', key),
  // Steam sets SteamDeck=1 on a Deck: the button prompts say L1 / R1 / L2, not LB / RB / LT.
  steamDeck: () => process.env.SteamDeck === '1',
  // The window was minimised / hidden (true) or brought back (false): the page's own visibility events are off.
  onHidden: (cb) => ipcRenderer.on('desktop:hidden', (_e, on) => cb(!!on)),
});

const info = ipcRenderer.sendSync('steam:info');
if (info) {
  contextBridge.exposeInMainWorld('steam', {
    personaName: () => info.name,
    steamId: () => info.id,
    unlock: (id) => ipcRenderer.send('steam:unlock', id),
  });
}

const { contextBridge, ipcRenderer } = require('electron');

// Expose only the small surface the renderer needs, keeping Node/Electron internals isolated.
contextBridge.exposeInMainWorld('stickyDesk', {
  version: '0.1.0',
  platform: process.platform,
  getIdleSeconds: () => ipcRenderer.invoke('activity:get-idle-seconds'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  setWindowSize: (width, height) =>
    ipcRenderer.invoke('window:set-size', width, height),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('window:set-always-on-top', value),
});

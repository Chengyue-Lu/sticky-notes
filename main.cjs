const path = require('node:path');
const { app, BrowserWindow, ipcMain, powerMonitor } = require('electron');

function getSenderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function createWindow() {
  // Keep the desktop shell narrow so it behaves more like a sticky panel than a full app window.
  const mainWindow = new BrowserWindow({
    width: 440,
    height: 980,
    minWidth: 360,
    minHeight: 640,
    show: false,
    frame: false,
    resizable: true,
    thickFrame: true,
    transparent: true,
    backgroundColor: '#00000052',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (!app.isPackaged) {
    // In development the renderer is served by Vite; in production we load the built HTML file.
    void mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  void mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
  // Renderer polls this lightweight bridge instead of importing Electron APIs directly.
  ipcMain.handle('activity:get-idle-seconds', () =>
    powerMonitor.getSystemIdleTime(),
  );
  ipcMain.on('window:minimize', (event) => {
    getSenderWindow(event)?.minimize();
  });
  ipcMain.on('window:close', (event) => {
    getSenderWindow(event)?.close();
  });
  ipcMain.handle('window:set-size', (event, width, height) => {
    const targetWindow = getSenderWindow(event);

    if (!targetWindow) {
      return null;
    }

    const safeWidth = Math.min(760, Math.max(360, Math.round(Number(width))));
    const safeHeight = Math.min(1400, Math.max(640, Math.round(Number(height))));

    if (!Number.isFinite(safeWidth) || !Number.isFinite(safeHeight)) {
      return null;
    }

    const currentBounds = targetWindow.getBounds();

    targetWindow.setBounds({
      ...currentBounds,
      width: safeWidth,
      height: safeHeight,
    });

    return targetWindow.getBounds();
  });
  ipcMain.handle('window:set-always-on-top', (event, value) => {
    const targetWindow = getSenderWindow(event);

    if (!targetWindow) {
      return false;
    }

    targetWindow.setAlwaysOnTop(Boolean(value));

    return targetWindow.isAlwaysOnTop();
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

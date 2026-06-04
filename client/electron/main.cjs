const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show until maximized
    icon: path.join(__dirname, '../public/logo2.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b', // Default dark bg, will be overridden by IPC
      symbolColor: '#ffffff',
      height: 32
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Disable CORS restrictions for local file:// execution
    }
  });

  mainWindow.maximize();
  mainWindow.show();

  // Remove the default Windows menu bar
  mainWindow.setMenu(null);

  if (isDev) {
    // In development, load the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

ipcMain.on('theme-changed', (event, theme) => {
  nativeTheme.themeSource = theme;
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (win) {
    if (theme === 'dark') {
      win.setTitleBarOverlay({
        color: '#0a0a0a', 
        symbolColor: '#ffffff'
      });
    } else {
      win.setTitleBarOverlay({
        color: '#f8fafc', // slate-50
        symbolColor: '#000000'
      });
    }
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

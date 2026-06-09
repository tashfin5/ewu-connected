const { app, BrowserWindow, ipcMain, nativeTheme, Tray, Menu } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show until maximized
    icon: path.join(__dirname, '../public/logo2.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: 'rgba(0, 0, 0, 0)', // Transparent so React background shows through
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

  // Handle window close to minimize to tray instead
  mainWindow.on('close', function (event) {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/logo2.png'); // Better to use .ico for windows if possible, but png works
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: function () {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: function () {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('EWU ConnectED');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on('activate', function () {
      if (mainWindow === null) createWindow();
      else mainWindow.show();
    });
  });
}

ipcMain.on('theme-changed', (event, theme) => {
  nativeTheme.themeSource = theme;
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (win) {
    if (theme === 'dark') {
      win.setTitleBarOverlay({
        color: 'rgba(0, 0, 0, 0)', 
        symbolColor: '#ffffff'
      });
    } else {
      win.setTitleBarOverlay({
        color: 'rgba(0, 0, 0, 0)',
        symbolColor: '#000000'
      });
    }
  }
});

// Force terminate when all windows closed AND quitting
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

import { app, BrowserWindow, ipcMain, shell, session, Menu, protocol } from "electron";
import path from "node:path";
import { config } from "dotenv";

// Prevent electron-log conflicts by ensuring single initialization

// Load environment variables FIRST before any other imports that might use them
// Use app.getAppPath() to get the correct base path
const appPath = app.getAppPath();
const envPath = app.isPackaged 
  ? path.join(process.resourcesPath, '.env')
  : path.join(appPath, '.env');

const result = config({ path: envPath });
console.log('App path:', appPath);
console.log('Dotenv loaded from:', envPath, result);
console.log('OneDrive Client ID from env:', process.env.ONEDRIVE_CLIENT_ID);

// Now import other modules that depend on environment variables
import log from "./log";
import "./ipc-handlers";
import { setupSecurity } from "./services/security";
import { handleError } from "./services/errorHandler";
import { monitoringService } from "./services/monitoring";
import { updaterService } from "./services/updater";
import { validateCloudServiceConfig } from "./config/cloudServices";

// Validate cloud service configuration after environment variables are loaded
validateCloudServiceConfig();

// Removed global security-disabling switches - these will be handled per-window

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "DocWriter",
    backgroundColor: "#f9fafb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Initialize auto-updater
    if (mainWindow) {
      updaterService.initialize(mainWindow);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../../renderer/index.html"));
  } else {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
    
    // Force DevTools to open after page loads
    mainWindow.webContents.once('dom-ready', () => {
      mainWindow.webContents.openDevTools();
    });
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isValidExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  setupWindowErrorHandlers(mainWindow);
}

function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function setupWindowErrorHandlers(window: BrowserWindow) {
  window.webContents.on('crashed', (event, killed) => {
    log.error('Renderer process crashed', { killed });
    handleError(new Error('Renderer process crashed'));
  });

  window.on('unresponsive', () => {
    log.error('Window became unresponsive');
    handleError(new Error('Window became unresponsive'));
  });
}

app.whenReady().then(async () => {
  try {
    // Initialize monitoring
    monitoringService.initialize({
      environment: app.isPackaged ? 'production' : 'development',
      enableInDevelopment: false
    });
    monitoringService.startResourceMonitoring();
    
    await setupSecurity();
    
    // License checking will be added after fixing core issues
    
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowedPermissions = ['clipboard-read', 'clipboard-write'];
      callback(allowedPermissions.includes(permission));
    });

    createWindow();

    // Hide the menu bar entirely
    Menu.setApplicationMenu(null);
  } catch (error) {
    log.error('Failed to initialize application', error);
    handleError(error as Error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception', error);
  handleError(error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection', { reason, promise });
  handleError(new Error(`Unhandled rejection: ${reason}`));
});

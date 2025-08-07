import { app, BrowserWindow, ipcMain, shell, session, Menu, protocol } from "electron";
import path from "node:path";
import { config } from "dotenv";

// Disable hardware acceleration FIRST before ANY app operations
// Only call if app is not ready yet to prevent errors from dynamic imports
if (!app.isReady()) {
  app.disableHardwareAcceleration();
}

// MUST set paths before any other app operations
try {
  const userDataPath = path.join(app.getPath('appData'), 'DocWriter');
  app.setPath('userData', userDataPath);
  // Use temp directory for cache to avoid permission issues
  app.setPath('cache', path.join(app.getPath('temp'), 'DocWriter-cache'));
} catch (e) {
  console.error('Failed to set app paths:', e);
}

let mainWindow: BrowserWindow | null = null;
let windowCreated = false;

// Always prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

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
import { registerIpcHandlers } from "./ipc-handlers";
import { setupSecurity } from "./services/security";
import { handleError } from "./services/errorHandler";
import { monitoringService } from "./services/monitoring";
import { updaterService } from "./services/updater";
import { validateCloudServiceConfig } from "./config/cloudServices";

// Validate cloud service configuration after environment variables are loaded
validateCloudServiceConfig();

// Removed global security-disabling switches - these will be handled per-window

function createWindow() {
  // Prevent creating multiple windows
  if (windowCreated || mainWindow) {
    if (mainWindow) {
      mainWindow.focus();
    }
    return;
  }
  
  windowCreated = true;
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
    windowCreated = false;
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../../renderer/index.html"));
  } else {
    mainWindow.loadURL("http://localhost:5173");
    // Dev tools disabled - uncomment below to enable
    // mainWindow.webContents.openDevTools();
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

// Add timeout to prevent hanging
setTimeout(() => {
  if (!mainWindow) {
    console.error('App failed to start within 30 seconds, exiting...');
    app.quit();
  }
}, 30000);

app.whenReady().then(async () => {
  try {
    // Register IPC handlers first - wrap in try-catch to handle duplicate registration
    try {
      registerIpcHandlers();
    } catch (handlerError: any) {
      if (handlerError.message?.includes('second handler')) {
        log.info('IPC handlers already registered, continuing...');
      } else {
        throw handlerError;
      }
    }
    
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

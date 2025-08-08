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

// In production, try to load from multiple possible locations
let envLoaded = false;
if (app.isPackaged) {
  // Try production env file first
  const prodEnvPath = path.join(process.resourcesPath, '.env.production');
  const result = config({ path: prodEnvPath });
  if (!result.error) {
    envLoaded = true;
    console.log('Loaded production env from:', prodEnvPath);
  } else {
    // Fallback to regular .env
    const envPath = path.join(process.resourcesPath, '.env');
    const fallbackResult = config({ path: envPath });
    if (!fallbackResult.error) {
      envLoaded = true;
      console.log('Loaded env from:', envPath);
    }
  }
} else {
  // Development mode - load from project root
  const envPath = path.join(appPath, '.env');
  const result = config({ path: envPath });
  envLoaded = !result.error;
  console.log('Development env loaded from:', envPath, envLoaded);
}

// If no env file found, use built-in defaults for cloud services
if (!envLoaded && app.isPackaged) {
  // These are public OAuth client IDs - safe to embed
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '616905817212-03p2kqnjageb1k8tq7p5b1ebr30n866b.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
  process.env.DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID || 'o8h7vqoqh8d5yvg';
  process.env.DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET || 'j9d3jhiqzt6u4pt';
  process.env.ONEDRIVE_CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID || 'f90b1add-e9ec-4ff7-9f9a-6f043c86927d';
  process.env.ONEDRIVE_CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET || 'db33e407-c46b-4caf-ae33-9eb2704ea24b';
  console.log('Using built-in OAuth credentials');
}

console.log('OneDrive Client ID:', process.env.ONEDRIVE_CLIENT_ID ? 'Set' : 'Not set');

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
    backgroundColor: "#f3f4f6",
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
    // Open dev tools in development
    mainWindow.webContents.openDevTools();
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

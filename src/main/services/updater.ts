import { autoUpdater } from 'electron-updater';
import { app, dialog, BrowserWindow } from 'electron';
import log from '../log';
import { monitoringService } from './monitoring';

class UpdaterService {
  private mainWindow: BrowserWindow | null = null;

  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    
    // Configure auto-updater
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Set up event handlers
    this.setupEventHandlers();

    // Check for updates on app start (after a delay)
    setTimeout(() => {
      this.checkForUpdates();
    }, 10000); // 10 seconds after startup

    // Check for updates periodically
    setInterval(() => {
      this.checkForUpdates();
    }, 3600000); // Every hour
  }

  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for updates...');
      monitoringService.trackFeatureUsage('update_check');
    });

    autoUpdater.on('update-available', (info) => {
      log.info('Update available', info);
      monitoringService.trackFeatureUsage('update_available', { version: info.version });
      
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Update Available',
        message: `A new version ${info.version} is available. Would you like to download it now?`,
        detail: 'The update will be installed automatically when you quit the app.',
        buttons: ['Download', 'Later'],
        defaultId: 0
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });

    autoUpdater.on('update-not-available', () => {
      log.info('Update not available');
    });

    autoUpdater.on('error', (err) => {
      log.error('Update error', err);
      monitoringService.captureException(err, { context: 'auto_updater' });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      log.info(logMessage);
      
      // Send progress to renderer
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded', info);
      monitoringService.trackFeatureUsage('update_downloaded', { version: info.version });
      
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded',
        detail: `Version ${info.version} has been downloaded and will be installed on restart.`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }

  checkForUpdates(): void {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch(err => {
        log.error('Failed to check for updates', err);
      });
    } else {
      log.info('Skipping update check in development');
    }
  }

  checkForUpdatesManually(): void {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates()
        .then(result => {
          if (!result || !result.updateInfo) {
            dialog.showMessageBox(this.mainWindow!, {
              type: 'info',
              title: 'No Updates',
              message: 'You are running the latest version.',
              buttons: ['OK']
            });
          }
        })
        .catch(err => {
          log.error('Failed to check for updates', err);
          dialog.showMessageBox(this.mainWindow!, {
            type: 'error',
            title: 'Update Check Failed',
            message: 'Failed to check for updates.',
            detail: err.message,
            buttons: ['OK']
          });
        });
    } else {
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Development Mode',
        message: 'Update checking is disabled in development mode.',
        buttons: ['OK']
      });
    }
  }
}

export const updaterService = new UpdaterService();
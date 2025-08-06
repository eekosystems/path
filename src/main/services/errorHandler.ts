import { app, dialog, BrowserWindow } from 'electron';
import log from '../log';
import { monitoringService } from './monitoring';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError {
  message: string;
  severity: ErrorSeverity;
  code?: string;
  details?: any;
  timestamp: Date;
}

class ErrorHandler {
  private errorQueue: AppError[] = [];
  private isHandlingError = false;

  async handleError(error: Error | AppError, severity: ErrorSeverity = ErrorSeverity.MEDIUM): Promise<void> {
    const appError: AppError = {
      message: error.message,
      severity: 'severity' in error ? error.severity : severity,
      code: 'code' in error ? error.code : undefined,
      details: 'details' in error ? error.details : error.stack,
      timestamp: new Date()
    };

    log.error('Application error', appError);
    
    // Send to monitoring service
    monitoringService.captureException(error instanceof Error ? error : new Error(error.message), {
      severity: appError.severity,
      code: appError.code,
      details: appError.details
    });
    
    this.errorQueue.push(appError);

    if (!this.isHandlingError) {
      this.isHandlingError = true;
      await this.processErrorQueue();
      this.isHandlingError = false;
    }
  }

  private async processErrorQueue(): Promise<void> {
    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift()!;
      
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          await this.handleCriticalError(error);
          break;
        case ErrorSeverity.HIGH:
          await this.showErrorDialog(error);
          break;
        case ErrorSeverity.MEDIUM:
          this.notifyRenderer(error);
          break;
        case ErrorSeverity.LOW:
          // Just log, already done above
          break;
      }
    }
  }

  private async handleCriticalError(error: AppError): Promise<void> {
    const result = await dialog.showMessageBox({
      type: 'error',
      title: 'Critical Error',
      message: 'A critical error has occurred',
      detail: error.message,
      buttons: ['Restart', 'Quit'],
      defaultId: 0
    });

    if (result.response === 0) {
      app.relaunch();
    }
    app.quit();
  }

  private async showErrorDialog(error: AppError): Promise<void> {
    await dialog.showMessageBox({
      type: 'error',
      title: 'Error',
      message: error.message,
      detail: error.details ? String(error.details) : undefined,
      buttons: ['OK']
    });
  }

  private notifyRenderer(error: AppError): void {
    const mainWindow = BrowserWindow.getFocusedWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('app-error', {
        message: error.message,
        severity: error.severity,
        code: error.code
      });
    }
  }

  public createError(message: string, severity: ErrorSeverity, code?: string, details?: any): AppError {
    return {
      message,
      severity,
      code,
      details,
      timestamp: new Date()
    };
  }
}

export const errorHandler = new ErrorHandler();

export function handleError(error: Error | AppError, severity?: ErrorSeverity): void {
  errorHandler.handleError(error, severity);
}

export function createError(message: string, severity: ErrorSeverity, code?: string, details?: any): AppError {
  return errorHandler.createError(message, severity, code, details);
}
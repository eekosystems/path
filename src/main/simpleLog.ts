// Simple logger to avoid electron-log conflicts
import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const isDev = !app.isPackaged;

class SimpleLogger {
  private logPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.logPath = path.join(userDataPath, 'logs', 'main.log');
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `${timestamp} > ${message}${dataStr}`;
  }

  private writeToFile(message: string) {
    if (!isDev) {
      fs.appendFileSync(this.logPath, message + '\n');
    }
  }

  info(message: string, data?: any) {
    const formatted = this.formatMessage('INFO', message, data);
    console.log(formatted);
    this.writeToFile(formatted);
  }

  error(message: string, error?: any) {
    const formatted = this.formatMessage('ERROR', message, error);
    console.error(formatted);
    this.writeToFile(formatted);
  }

  warn(message: string, data?: any) {
    const formatted = this.formatMessage('WARN', message, data);
    console.warn(formatted);
    this.writeToFile(formatted);
  }

  debug(message: string, data?: any) {
    if (isDev) {
      const formatted = this.formatMessage('DEBUG', message, data);
      console.log(formatted);
    }
  }
}

const log = new SimpleLogger();
export default log;
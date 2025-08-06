import { app, protocol, session } from 'electron';
import path from 'node:path';
import { URL } from 'node:url';
import log from '../log';

export async function setupSecurity(): Promise<void> {
  // Prevent new window creation
  app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', async (event, navigationUrl) => {
      event.preventDefault();
      log.warn(`Prevented new window: ${navigationUrl}`);
    });

    // Prevent navigation to external protocols
    contents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
        event.preventDefault();
        log.warn(`Prevented navigation to: ${navigationUrl}`);
      }
    });
  });

  // Set Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self'",
          "connect-src 'self' https://api.openai.com https://login.microsoftonline.com https://login.live.com https://graph.microsoft.com https://api.dropbox.com https://www.googleapis.com https://accounts.google.com",
          "media-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests"
        ].join('; ')
      }
    });
  });

  // Register custom protocol for secure file access
  protocol.registerFileProtocol('clerk', (request, callback) => {
    const url = request.url.substr(8); // Remove 'clerk://'
    const decodedUrl = decodeURIComponent(url);
    
    // Validate the file path
    const safePath = path.normalize(decodedUrl);
    const appPath = app.getAppPath();
    
    if (!safePath.startsWith(appPath)) {
      log.error(`Attempted to access file outside app directory: ${safePath}`);
      callback({ error: -6 }); // NET_ERROR_FILE_NOT_FOUND
      return;
    }
    
    callback({ path: safePath });
  });

  // Set additional security headers
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['X-Frame-Options'] = 'DENY';
    details.requestHeaders['X-Content-Type-Options'] = 'nosniff';
    details.requestHeaders['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    callback({ requestHeaders: details.requestHeaders });
  });

  log.info('Security measures initialized');
}

export function sanitizeInput(input: string): string {
  // Remove any potential script tags or dangerous content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function validateApiKey(key: string): boolean {
  // OpenAI API keys start with 'sk-' and are typically 51 characters
  return /^sk-[a-zA-Z0-9]{48}$/.test(key);
}

export function validateFileSize(sizeInBytes: number): boolean {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  return sizeInBytes <= MAX_FILE_SIZE;
}

export function validateFileType(filename: string): boolean {
  const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
}
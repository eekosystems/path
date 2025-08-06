import Store from 'electron-store';
import path from 'node:path';
import log from '../log';
import { CloudFile } from '../types/ipc';
import { googleDriveAPI } from './googleDriveApi';

interface CloudCredentials {
  googleDrive?: {
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
  };
  dropbox?: {
    accessToken: string;
  };
  oneDrive?: {
    accessToken: string;
    refreshToken: string;
  };
}

class CloudStorageService {
  private store: Store;

  constructor() {
    this.store = new Store({
      name: 'clerk-cloud-storage',
      encryptionKey: process.env.CLOUD_ENCRYPTION_KEY || 'clerk-cloud-key-dev'
    });
  }

  private getUserCredentialsKey(userId: string): string {
    return `cloud-credentials-${userId}`;
  }

  async connectGoogleDrive(userId: string): Promise<void> {
    try {
      // For development, simulate the connection
      // In production, you would:
      // 1. Open browser with googleDriveAPI.getAuthorizationUrl(redirectUri)
      // 2. Handle the callback with authorization code
      // 3. Exchange code for tokens using googleDriveAPI.exchangeCodeForTokens(code, redirectUri)
      
      const credentials: CloudCredentials = this.store.get(this.getUserCredentialsKey(userId), {}) as CloudCredentials;
      
      // Simulate OAuth flow for now
      credentials.googleDrive = {
        accessToken: 'simulated-access-token',
        refreshToken: 'simulated-refresh-token',
        expiryDate: Date.now() + 3600000 // 1 hour from now
      };
      
      this.store.set(this.getUserCredentialsKey(userId), credentials);
      log.info('Google Drive connected', { userId });
    } catch (error) {
      log.error('Google Drive connection failed', error);
      throw error;
    }
  }

  async fetchGoogleDriveFiles(userId: string): Promise<CloudFile[]> {
    try {
      const credentials = this.store.get(this.getUserCredentialsKey(userId), {}) as CloudCredentials;
      
      if (!credentials.googleDrive) {
        throw new Error('Google Drive not connected');
      }

      // Check if token is expired and refresh if needed
      if (credentials.googleDrive.expiryDate < Date.now()) {
        const refreshed = await googleDriveAPI.refreshAccessToken(credentials.googleDrive.refreshToken);
        credentials.googleDrive = refreshed;
        this.store.set(this.getUserCredentialsKey(userId), credentials);
      }

      // If we have real credentials (not simulated), use the API
      if (!credentials.googleDrive.accessToken.startsWith('simulated-')) {
        return await googleDriveAPI.listFiles(credentials.googleDrive.accessToken);
      }

      // For simulated credentials, return mock data
      const simulatedFiles: CloudFile[] = [
        {
          id: 'gdrive-1',
          name: 'Sample Immigration Document.pdf',
          mimeType: 'application/pdf',
          size: 1024000,
          modifiedTime: new Date().toISOString(),
          source: 'googleDrive'
        },
        {
          id: 'gdrive-2',
          name: 'Case Notes.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 512000,
          modifiedTime: new Date().toISOString(),
          source: 'googleDrive'
        }
      ];

      return simulatedFiles;
    } catch (error) {
      log.error('Failed to fetch Google Drive files', error);
      throw error;
    }
  }

  async connectDropbox(userId: string): Promise<void> {
    try {
      const credentials: CloudCredentials = this.store.get(this.getUserCredentialsKey(userId), {}) as CloudCredentials;
      
      // Simulate OAuth flow for Dropbox
      credentials.dropbox = {
        accessToken: 'simulated-dropbox-token'
      };
      
      this.store.set(this.getUserCredentialsKey(userId), credentials);
      log.info('Dropbox connected', { userId });
    } catch (error) {
      log.error('Dropbox connection failed', error);
      throw error;
    }
  }

  async fetchDropboxFiles(userId: string): Promise<CloudFile[]> {
    try {
      const credentials = this.store.get(this.getUserCredentialsKey(userId), {}) as CloudCredentials;
      
      if (!credentials.dropbox) {
        throw new Error('Dropbox not connected');
      }

      // Simulated Dropbox files
      return [
        {
          id: 'dropbox-1',
          name: 'Legal Brief Template.pdf',
          mimeType: 'application/pdf',
          size: 2048000,
          modifiedTime: new Date().toISOString(),
          source: 'dropbox'
        }
      ];
    } catch (error) {
      log.error('Failed to fetch Dropbox files', error);
      throw error;
    }
  }

  async connectOneDrive(userId: string): Promise<void> {
    try {
      const credentials: CloudCredentials = this.store.get(this.getUserCredentialsKey(userId), {}) as CloudCredentials;
      
      // Simulate OAuth flow for OneDrive
      credentials.oneDrive = {
        accessToken: 'simulated-onedrive-access-token',
        refreshToken: 'simulated-onedrive-refresh-token'
      };
      
      this.store.set(this.getUserCredentialsKey(userId), credentials);
      log.info('OneDrive connected', { userId });
    } catch (error) {
      log.error('OneDrive connection failed', error);
      throw error;
    }
  }

  async fetchOneDriveFiles(userId: string): Promise<CloudFile[]> {
    try {
      const credentials = this.store.get(this.getUserCredentialsKey(userId), {}) as CloudCredentials;
      
      if (!credentials.oneDrive) {
        throw new Error('OneDrive not connected');
      }

      // Simulated OneDrive files
      return [
        {
          id: 'onedrive-1',
          name: 'Client Information.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          size: 768000,
          modifiedTime: new Date().toISOString(),
          source: 'oneDrive'
        }
      ];
    } catch (error) {
      log.error('Failed to fetch OneDrive files', error);
      throw error;
    }
  }

  async disconnect(service: string, userId: string): Promise<void> {
    try {
      const credentials = this.store.get(this.getUserCredentialsKey(userId), {}) as CloudCredentials;
      
      switch (service) {
        case 'googleDrive':
          delete credentials.googleDrive;
          break;
        case 'dropbox':
          delete credentials.dropbox;
          break;
        case 'oneDrive':
          delete credentials.oneDrive;
          break;
      }
      
      this.store.set(this.getUserCredentialsKey(userId), credentials);
      log.info(`${service} disconnected`, { userId });
    } catch (error) {
      log.error(`Failed to disconnect ${service}`, error);
      throw error;
    }
  }

  async downloadFile(fileId: string, service: string, userId: string): Promise<Buffer> {
    try {
      const credentials = this.store.get(this.getUserCredentialsKey(userId), {}) as CloudCredentials;
      
      if (service === 'googleDrive' && credentials.googleDrive) {
        // Check if token is expired and refresh if needed
        if (credentials.googleDrive.expiryDate < Date.now()) {
          const refreshed = await googleDriveAPI.refreshAccessToken(credentials.googleDrive.refreshToken);
          credentials.googleDrive = refreshed;
          this.store.set(this.getUserCredentialsKey(userId), credentials);
        }
        
        // If we have real credentials, use the API
        if (!credentials.googleDrive.accessToken.startsWith('simulated-')) {
          return await googleDriveAPI.downloadFile(fileId, credentials.googleDrive.accessToken);
        }
      }
      
      // For other services or simulated mode, return mock data
      log.info('Downloading file (simulated)', { fileId, service, userId });
      return Buffer.from('Simulated file content');
    } catch (error) {
      log.error('Failed to download file', error);
      throw error;
    }
  }

  async uploadFile(filePath: string, service: string, userId: string): Promise<CloudFile> {
    try {
      const credentials = this.store.get(this.getUserCredentialsKey(userId), {}) as CloudCredentials;
      
      if (service === 'googleDrive' && credentials.googleDrive) {
        // Check if token is expired and refresh if needed
        if (credentials.googleDrive.expiryDate < Date.now()) {
          const refreshed = await googleDriveAPI.refreshAccessToken(credentials.googleDrive.refreshToken);
          credentials.googleDrive = refreshed;
          this.store.set(this.getUserCredentialsKey(userId), credentials);
        }
        
        // If we have real credentials, use the API
        if (!credentials.googleDrive.accessToken.startsWith('simulated-')) {
          const fs = await import('node:fs/promises');
          const content = await fs.readFile(filePath);
          const name = path.basename(filePath);
          const mimeType = 'application/octet-stream'; // You could use a mime-type library here
          
          return await googleDriveAPI.uploadFile(
            name,
            content,
            mimeType,
            credentials.googleDrive.accessToken
          );
        }
      }
      
      // For other services or simulated mode, return mock data
      log.info('Uploading file (simulated)', { filePath, service, userId });
      
      return {
        id: `${service}-uploaded-${Date.now()}`,
        name: path.basename(filePath),
        mimeType: 'application/octet-stream',
        size: 1024000,
        modifiedTime: new Date().toISOString(),
        source: service as 'googleDrive' | 'dropbox' | 'oneDrive'
      };
    } catch (error) {
      log.error('Failed to upload file', error);
      throw error;
    }
  }
}

export const cloudStorageService = new CloudStorageService();
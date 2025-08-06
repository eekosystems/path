import { googleDriveDirectApi } from './googleDriveDirectApi';
import { Dropbox } from 'dropbox';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import path from 'node:path';
import fs from 'node:fs/promises';
import log from '../log';
import { CloudFile } from '../types/ipc';
import { OAuthHandlerBrowser } from './oauthHandlerBrowser';
import { getCloudServiceConfig, oauthEndpoints } from '../config/cloudServices';
import keytar from 'keytar';
import fetch from 'node-fetch';

const SERVICE_NAME = 'clerk-app';
const oauthHandler = new OAuthHandlerBrowser();

class CloudStorageService {
  // Token management methods
  private async exchangeCodeForTokens(service: 'google' | 'dropbox' | 'onedrive', code: string, userId: string): Promise<void> {
    try {
      const cloudServiceConfig = getCloudServiceConfig();
      let tokenUrl: string;
      let params: URLSearchParams;

      switch (service) {
        case 'google':
          tokenUrl = oauthEndpoints.google.tokenUrl;
          const googleVerifier = await keytar.getPassword(SERVICE_NAME, `google-pkce-${userId}`);
          const googleRedirect = await keytar.getPassword(SERVICE_NAME, `google-redirect-${userId}`);
          
          log.info('Google token exchange params:', {
            hasClientId: !!cloudServiceConfig.googleDrive.clientId,
            hasClientSecret: !!cloudServiceConfig.googleDrive.clientSecret,
            clientSecretLength: cloudServiceConfig.googleDrive.clientSecret?.length,
            hasCode: !!code,
            hasVerifier: !!googleVerifier,
            hasRedirect: !!googleRedirect
          });
          
          params = new URLSearchParams({
            code,
            client_id: cloudServiceConfig.googleDrive.clientId,
            client_secret: cloudServiceConfig.googleDrive.clientSecret,
            code_verifier: googleVerifier || '',
            grant_type: 'authorization_code',
            redirect_uri: googleRedirect || ''
          });
          await keytar.deletePassword(SERVICE_NAME, `google-pkce-${userId}`);
          await keytar.deletePassword(SERVICE_NAME, `google-redirect-${userId}`);
          break;

        case 'dropbox':
          tokenUrl = oauthEndpoints.dropbox.tokenUrl;
          const dropboxVerifier = await keytar.getPassword(SERVICE_NAME, `dropbox-pkce-${userId}`);
          const dropboxRedirect = await keytar.getPassword(SERVICE_NAME, `dropbox-redirect-${userId}`);
          params = new URLSearchParams({
            code,
            client_id: cloudServiceConfig.dropbox.clientId,
            code_verifier: dropboxVerifier || '',
            grant_type: 'authorization_code',
            redirect_uri: dropboxRedirect || ''
          });
          await keytar.deletePassword(SERVICE_NAME, `dropbox-pkce-${userId}`);
          await keytar.deletePassword(SERVICE_NAME, `dropbox-redirect-${userId}`);
          break;

        case 'onedrive':
          tokenUrl = oauthEndpoints.microsoft.tokenUrl;
          const onedriveVerifier = await keytar.getPassword(SERVICE_NAME, `onedrive-pkce-${userId}`);
          const onedriveRedirect = await keytar.getPassword(SERVICE_NAME, `onedrive-redirect-${userId}`);
          params = new URLSearchParams({
            code,
            client_id: cloudServiceConfig.oneDrive.clientId,
            code_verifier: onedriveVerifier || '',
            grant_type: 'authorization_code',
            redirect_uri: onedriveRedirect || '',
            scope: cloudServiceConfig.oneDrive.scopes.join(' ')
          });
          await keytar.deletePassword(SERVICE_NAME, `onedrive-pkce-${userId}`);
          await keytar.deletePassword(SERVICE_NAME, `onedrive-redirect-${userId}`);
          break;
      }

      log.info(`Making token exchange request to ${service}:`, {
        url: tokenUrl,
        bodyParams: params.toString()
      });
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        log.error(`Token exchange failed for ${service}:`, {
          status: response.status,
          statusText: response.statusText,
          error: error
        });
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokens = await response.json();
      
      log.info(`Token exchange response for ${service}`, {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        tokenType: tokens.token_type,
        expiresIn: tokens.expires_in
      });

      // Store tokens securely with error handling
      try {
        log.info(`Attempting to store ${service} access token`, { userId, tokenLength: tokens.access_token?.length });
        await keytar.setPassword(SERVICE_NAME, `${service}-access-${userId}`, tokens.access_token);
        log.info(`${service} access token stored successfully`);
        
        if (tokens.refresh_token) {
          log.info(`Attempting to store ${service} refresh token`, { userId });
          await keytar.setPassword(SERVICE_NAME, `${service}-refresh-${userId}`, tokens.refresh_token);
          log.info(`${service} refresh token stored successfully`);
        }
        
        // Verify tokens were stored
        const verifyAccess = await keytar.getPassword(SERVICE_NAME, `${service}-access-${userId}`);
        log.info(`${service} token storage verification`, {
          accessTokenVerified: !!verifyAccess,
          accessTokenLength: verifyAccess?.length
        });
      } catch (keytarError) {
        log.error(`Failed to store tokens in keytar for ${service}`, {
          error: keytarError,
          message: keytarError instanceof Error ? keytarError.message : 'Unknown error'
        });
        throw new Error(`Failed to securely store authentication tokens: ${keytarError instanceof Error ? keytarError.message : 'Unknown error'}`);
      }

      log.info(`${service} tokens stored successfully`, { 
        userId,
        accessTokenStored: true,
        refreshTokenStored: !!tokens.refresh_token
      });
    } catch (error) {
      log.error(`Failed to exchange code for ${service} tokens`, error);
      throw error;
    }
  }

  private async getAccessToken(service: 'google' | 'dropbox' | 'onedrive', userId: string): Promise<string> {
    const token = await keytar.getPassword(SERVICE_NAME, `${service}-access-${userId}`);
    if (!token) {
      log.error(`No access token found for ${service}`, { userId, service });
      // Try to list all stored credentials for debugging
      try {
        const allCreds = await keytar.findCredentials(SERVICE_NAME);
        log.info('All stored credentials', { 
          count: allCreds.length,
          accounts: allCreds.map(c => c.account)
        });
      } catch (e) {
        log.error('Failed to list credentials', e);
      }
      throw new Error(`No access token found for ${service}`);
    }
    log.info(`Access token retrieved for ${service}`, { userId, tokenLength: token.length });
    return token;
  }

  private async refreshToken(service: 'google' | 'dropbox' | 'onedrive', userId: string): Promise<string> {
    try {
      const cloudServiceConfig = getCloudServiceConfig();
      const refreshToken = await keytar.getPassword(SERVICE_NAME, `${service}-refresh-${userId}`);
      if (!refreshToken) {
        throw new Error(`No refresh token found for ${service}`);
      }

      let tokenUrl: string;
      let params: URLSearchParams;

      switch (service) {
        case 'google':
          tokenUrl = oauthEndpoints.google.tokenUrl;
          params = new URLSearchParams({
            refresh_token: refreshToken,
            client_id: cloudServiceConfig.googleDrive.clientId,
            grant_type: 'refresh_token'
          });
          break;

        case 'dropbox':
          tokenUrl = oauthEndpoints.dropbox.tokenUrl;
          params = new URLSearchParams({
            refresh_token: refreshToken,
            client_id: cloudServiceConfig.dropbox.clientId,
            grant_type: 'refresh_token'
          });
          break;

        case 'onedrive':
          tokenUrl = oauthEndpoints.microsoft.tokenUrl;
          params = new URLSearchParams({
            refresh_token: refreshToken,
            client_id: cloudServiceConfig.oneDrive.clientId,
            grant_type: 'refresh_token',
            scope: cloudServiceConfig.oneDrive.scopes.join(' ')
          });
          break;
      }

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const tokens = await response.json();

      // Update stored tokens
      await keytar.setPassword(SERVICE_NAME, `${service}-access-${userId}`, tokens.access_token);
      if (tokens.refresh_token) {
        await keytar.setPassword(SERVICE_NAME, `${service}-refresh-${userId}`, tokens.refresh_token);
      }

      log.info(`${service} tokens refreshed successfully`, { userId });
      return tokens.access_token;
    } catch (error) {
      log.error(`Failed to refresh ${service} token`, error);
      throw error;
    }
  }

  async disconnect(service: 'google' | 'dropbox' | 'onedrive', userId: string): Promise<void> {
    try {
      // Delete stored tokens
      await keytar.deletePassword(SERVICE_NAME, `${service}-access-${userId}`);
      await keytar.deletePassword(SERVICE_NAME, `${service}-refresh-${userId}`);
      
      // Also clean up any temporary auth data
      await keytar.deletePassword(SERVICE_NAME, `${service}-pkce-${userId}`).catch(() => {});
      await keytar.deletePassword(SERVICE_NAME, `${service}-state-${userId}`).catch(() => {});
      await keytar.deletePassword(SERVICE_NAME, `${service}-redirect-${userId}`).catch(() => {});
      
      log.info(`${service} disconnected and all tokens cleared`, { userId });
    } catch (error) {
      log.error(`Failed to disconnect ${service}`, error);
      throw error;
    }
  }

  // Force clear all OneDrive tokens for all users (useful when changing client IDs)
  async clearAllOneDriveTokens(): Promise<void> {
    try {
      const allPasswords = await keytar.findCredentials(SERVICE_NAME);
      for (const cred of allPasswords) {
        if (cred.account.includes('onedrive')) {
          await keytar.deletePassword(SERVICE_NAME, cred.account);
          log.info(`Cleared token: ${cred.account}`);
        }
      }
      log.info('All OneDrive tokens cleared');
    } catch (error) {
      log.error('Failed to clear OneDrive tokens', error);
    }
  }

  // Google Drive implementation
  async connectGoogleDrive(userId: string): Promise<void> {
    try {
      const cloudServiceConfig = getCloudServiceConfig();
      if (!cloudServiceConfig.googleDrive.clientId) {
        throw new Error('Google Drive client ID is not configured. Please set GOOGLE_CLIENT_ID environment variable.');
      }
      const authCode = await oauthHandler.authenticateGoogle(userId);
      await this.exchangeCodeForTokens('google', authCode, userId);
      log.info('Google Drive connected successfully', { userId });
    } catch (error) {
      log.error('Google Drive connection failed', error);
      throw error;
    }
  }

  async fetchGoogleDriveFiles(userId: string): Promise<CloudFile[]> {
    try {
      log.info('Starting fetchGoogleDriveFiles using direct API', { userId });
      
      // Get access token with better error handling
      let accessToken: string;
      try {
        accessToken = await this.getAccessToken('google', userId);
        log.info('Access token retrieved successfully', { tokenLength: accessToken?.length });
      } catch (tokenError) {
        log.error('Failed to get access token', { tokenError, userId });
        throw new Error('Authentication expired. Please reconnect to Google Drive.');
      }
      
      // Use direct API to avoid electron-log conflicts
      try {
        const files = await googleDriveDirectApi.listFiles(accessToken);
        return files;
      } catch (error: any) {
        if (error.message === 'Token expired') {
          log.info('Token expired, refreshing...');
          accessToken = await this.refreshToken('google', userId);
          const files = await googleDriveDirectApi.listFiles(accessToken);
          return files;
        }
        throw error;
      }
    } catch (error) {
      log.error('Failed to fetch Google Drive files', error);
      throw error;
    }
  }

  async downloadGoogleDriveFile(fileId: string, userId: string): Promise<Buffer> {
    try {
      let accessToken = await this.getAccessToken('google', userId);
      
      // Use direct API to avoid electron-log conflicts
      try {
        return await googleDriveDirectApi.downloadFile(fileId, accessToken);
      } catch (error: any) {
        if (error.message === 'Token expired') {
          accessToken = await this.refreshToken('google', userId);
          return await googleDriveDirectApi.downloadFile(fileId, accessToken);
        }
        throw error;
      }
    } catch (error) {
      log.error('Failed to download Google Drive file', error);
      throw error;
    }
  }

  // Dropbox implementation
  async connectDropbox(userId: string): Promise<void> {
    try {
      const cloudServiceConfig = getCloudServiceConfig();
      if (!cloudServiceConfig.dropbox.clientId) {
        throw new Error('Dropbox client ID is not configured. Please set DROPBOX_CLIENT_ID environment variable.');
      }
      const authCode = await oauthHandler.authenticateDropbox(userId);
      await this.exchangeCodeForTokens('dropbox', authCode, userId);
      log.info('Dropbox connected successfully', { userId });
    } catch (error) {
      log.error('Dropbox connection failed', error);
      throw error;
    }
  }

  async fetchDropboxFiles(userId: string): Promise<CloudFile[]> {
    try {
      let accessToken = await this.getAccessToken('dropbox', userId);
      
      const dbx = new Dropbox({ accessToken });

      const response = await dbx.filesListFolder({ 
        path: '',
        limit: 100
      }).catch(async (error) => {
        if (error.status === 401) {
          accessToken = await this.refreshToken('dropbox', userId);
          const newDbx = new Dropbox({ accessToken });
          return newDbx.filesListFolder({ 
            path: '',
            limit: 100
          });
        }
        throw error;
      });

      const files: CloudFile[] = response.result.entries
        .filter(entry => entry['.tag'] === 'file')
        .filter(entry => {
          const name = entry.name.toLowerCase();
          return name.endsWith('.pdf') || name.endsWith('.docx') || 
                 name.endsWith('.txt') || name.endsWith('.md');
        })
        .map(entry => ({
          id: entry.id,
          name: entry.name,
          mimeType: this.getMimeType(entry.name),
          size: (entry as any).size || 0,
          modifiedTime: (entry as any).client_modified || new Date().toISOString(),
          source: 'dropbox' as const
        }));

      return files;
    } catch (error) {
      log.error('Failed to fetch Dropbox files', error);
      throw error;
    }
  }

  async downloadDropboxFile(fileId: string, userId: string): Promise<Buffer> {
    try {
      let accessToken = await this.getAccessToken('dropbox', userId);
      const dbx = new Dropbox({ accessToken });

      const response = await dbx.filesDownload({ path: fileId })
        .catch(async (error) => {
          if (error.status === 401) {
            accessToken = await this.refreshToken('dropbox', userId);
            const newDbx = new Dropbox({ accessToken });
            return newDbx.filesDownload({ path: fileId });
          }
          throw error;
        });

      // The file content is in the fileBinary property
      return Buffer.from((response.result as any).fileBinary);
    } catch (error) {
      log.error('Failed to download Dropbox file', error);
      throw error;
    }
  }

  // OneDrive implementation
  async connectOneDrive(userId: string): Promise<void> {
    try {
      const cloudServiceConfig = getCloudServiceConfig();
      if (!cloudServiceConfig.oneDrive.clientId) {
        throw new Error('OneDrive client ID is not configured. Please set ONEDRIVE_CLIENT_ID environment variable.');
      }
      const authCode = await oauthHandler.authenticateOneDrive(userId);
      await this.exchangeCodeForTokens('onedrive', authCode, userId);
      log.info('OneDrive connected successfully', { userId });
    } catch (error) {
      log.error('OneDrive connection failed', error);
      throw error;
    }
  }

  async fetchOneDriveFiles(userId: string): Promise<CloudFile[]> {
    try {
      let accessToken = await this.getAccessToken('onedrive', userId);
      
      log.info('Fetching OneDrive files', { userId, hasToken: !!accessToken });
      
      const client = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        }
      });

      // First, let's try without the filter to see all files
      const response = await client
        .api('/me/drive/root/children')
        .select('id,name,size,lastModifiedDateTime,file')
        .top(100)
        .get()
        .catch(async (error) => {
          log.error('OneDrive API error', { error, statusCode: error.statusCode });
          if (error.statusCode === 401) {
            accessToken = await this.refreshToken('onedrive', userId);
            const newClient = Client.init({
              authProvider: (done) => {
                done(null, accessToken);
              }
            });
            return newClient
              .api('/me/drive/root/children')
              .select('id,name,size,lastModifiedDateTime,file')
              .top(100)
              .get();
          }
          throw error;
        });

      log.info('OneDrive API response', { 
        hasValue: !!response?.value,
        valueLength: response?.value?.length,
        responseKeys: Object.keys(response || {}),
        firstFile: response?.value?.[0]
      });

      // Filter files client-side for the supported extensions
      const supportedExtensions = ['.pdf', '.docx', '.txt', '.md'];
      const allFiles = response?.value || [];
      
      const files: CloudFile[] = allFiles
        .filter((file: any) => {
          // Only include files (not folders)
          if (!file.file) return false;
          
          // Check if the file has a supported extension
          const name = file.name?.toLowerCase() || '';
          return supportedExtensions.some(ext => name.endsWith(ext));
        })
        .map((file: any) => ({
          id: file.id,
          name: file.name,
          mimeType: file.file?.mimeType || this.getMimeType(file.name),
          size: file.size || 0,
          modifiedTime: file.lastModifiedDateTime,
          source: 'oneDrive' as const
        }));

      log.info('OneDrive files filtered and mapped', { 
        totalFiles: allFiles.length,
        filteredCount: files.length,
        sampleFileNames: files.slice(0, 5).map(f => f.name)
      });

      return files;
    } catch (error) {
      log.error('Failed to fetch OneDrive files', error);
      throw error;
    }
  }

  async downloadOneDriveFile(fileId: string, userId: string): Promise<Buffer> {
    try {
      let accessToken = await this.getAccessToken('onedrive', userId);
      
      const client = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        }
      });

      const stream = await client
        .api(`/me/drive/items/${fileId}/content`)
        .getStream()
        .catch(async (error) => {
          if (error.statusCode === 401) {
            accessToken = await this.refreshToken('onedrive', userId);
            const newClient = Client.init({
              authProvider: (done) => {
                done(null, accessToken);
              }
            });
            return newClient
              .api(`/me/drive/items/${fileId}/content`)
              .getStream();
          }
          throw error;
        });

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    } catch (error) {
      log.error('Failed to download OneDrive file', error);
      throw error;
    }
  }

  // Debug method to check token status
  async checkTokenStatus(service: 'google' | 'dropbox' | 'onedrive', userId: string): Promise<{ hasAccess: boolean; hasRefresh: boolean; error?: string }> {
    try {
      const accessToken = await keytar.getPassword(SERVICE_NAME, `${service}-access-${userId}`);
      const refreshToken = await keytar.getPassword(SERVICE_NAME, `${service}-refresh-${userId}`);
      
      log.info(`Token status for ${service}`, {
        userId,
        hasAccess: !!accessToken,
        hasRefresh: !!refreshToken,
        accessLength: accessToken?.length,
        refreshLength: refreshToken?.length
      });
      
      return {
        hasAccess: !!accessToken,
        hasRefresh: !!refreshToken
      };
    } catch (error) {
      log.error(`Failed to check token status for ${service}`, error);
      return {
        hasAccess: false,
        hasRefresh: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Common methods
  async downloadFile(fileId: string, service: string, userId: string): Promise<Buffer> {
    switch (service) {
      case 'googleDrive':
        return this.downloadGoogleDriveFile(fileId, userId);
      case 'dropbox':
        return this.downloadDropboxFile(fileId, userId);
      case 'oneDrive':
        return this.downloadOneDriveFile(fileId, userId);
      default:
        throw new Error(`Unsupported service: ${service}`);
    }
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.txt':
        return 'text/plain';
      case '.md':
        return 'text/markdown';
      default:
        return 'application/octet-stream';
    }
  }
}

export const cloudStorageService = new CloudStorageService();
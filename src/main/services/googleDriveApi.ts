import log from '../log';
import { CloudFile } from '../types/ipc';

const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_OAUTH_BASE = 'https://oauth2.googleapis.com/token';

interface GoogleDriveCredentials {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
}

interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

export class GoogleDriveAPI {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || 'your-client-id';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret';
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleDriveCredentials> {
    try {
      const response = await fetch(GOOGLE_OAUTH_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        refreshToken: refreshToken, // Refresh token doesn't change
        expiryDate: Date.now() + (data.expires_in * 1000),
      };
    } catch (error) {
      log.error('Failed to refresh Google access token', error);
      throw error;
    }
  }

  /**
   * List files from Google Drive
   */
  async listFiles(accessToken: string, query?: string): Promise<CloudFile[]> {
    try {
      const params = new URLSearchParams({
        pageSize: '100',
        fields: 'files(id,name,mimeType,size,modifiedTime)',
      });

      if (query) {
        params.append('q', query);
      }

      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Google Drive access token expired');
        }
        throw new Error(`Failed to list files: ${response.statusText}`);
      }

      const data: DriveListResponse = await response.json();
      
      return data.files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size) : undefined,
        modifiedTime: file.modifiedTime,
        source: 'googleDrive' as const,
      }));
    } catch (error) {
      log.error('Failed to list Google Drive files', error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string, accessToken: string): Promise<DriveFile> {
    try {
      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,size,modifiedTime`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get file: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      log.error('Failed to get Google Drive file', error);
      throw error;
    }
  }

  /**
   * Download file content
   */
  async downloadFile(fileId: string, accessToken: string): Promise<Buffer> {
    try {
      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      log.error('Failed to download Google Drive file', error);
      throw error;
    }
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(
    name: string, 
    content: Buffer, 
    mimeType: string, 
    accessToken: string,
    folderId?: string
  ): Promise<CloudFile> {
    try {
      // Step 1: Create file metadata
      const metadata = {
        name,
        mimeType,
        ...(folderId && { parents: [folderId] }),
      };

      // Step 2: Create multipart request
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        closeDelimiter;

      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipartRequestBody,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
      }

      const uploadedFile: DriveFile = await response.json();
      
      return {
        id: uploadedFile.id,
        name: uploadedFile.name,
        mimeType: uploadedFile.mimeType,
        size: uploadedFile.size ? parseInt(uploadedFile.size) : undefined,
        modifiedTime: uploadedFile.modifiedTime,
        source: 'googleDrive',
      };
    } catch (error) {
      log.error('Failed to upload to Google Drive', error);
      throw error;
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId: string, accessToken: string): Promise<void> {
    try {
      const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }
    } catch (error) {
      log.error('Failed to delete Google Drive file', error);
      throw error;
    }
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthorizationUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleDriveCredentials> {
    try {
      const response = await fetch(GOOGLE_OAUTH_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiryDate: Date.now() + (data.expires_in * 1000),
      };
    } catch (error) {
      log.error('Failed to exchange code for tokens', error);
      throw error;
    }
  }
}

export const googleDriveAPI = new GoogleDriveAPI();
import fetch from 'node-fetch';
import log from '../log';
import { CloudFile } from '../types/ipc';

export class GoogleDriveDirectApi {
  private baseUrl = 'https://www.googleapis.com/drive/v3';

  async listFiles(accessToken: string): Promise<CloudFile[]> {
    try {
      const url = `${this.baseUrl}/files?` + new URLSearchParams({
        pageSize: '100',
        fields: 'files(id,name,mimeType,size,modifiedTime)',
        orderBy: 'modifiedTime desc',
        // Only get files, not folders
        q: "mimeType!='application/vnd.google-apps.folder'"
      });

      log.info('Fetching files directly from Google Drive API', { url });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('Google Drive API direct request failed', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        if (response.status === 401) {
          throw new Error('Token expired');
        }
        
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      log.info('Google Drive API direct response', {
        hasFiles: !!data.files,
        fileCount: data.files?.length || 0
      });

      if (!data.files) {
        return [];
      }

      // Filter for supported file types
      const supportedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown'
      ];

      const supportedExtensions = ['.pdf', '.docx', '.txt', '.md'];

      const filteredFiles = data.files.filter((file: any) => {
        // Check MIME type
        if (file.mimeType && supportedMimeTypes.includes(file.mimeType)) {
          return true;
        }
        // Check file extension as fallback
        const name = file.name?.toLowerCase() || '';
        return supportedExtensions.some(ext => name.endsWith(ext));
      });

      log.info('Filtered Google Drive files', {
        totalFiles: data.files.length,
        filteredCount: filteredFiles.length,
        sampleFiles: filteredFiles.slice(0, 5).map((f: any) => ({
          name: f.name,
          mimeType: f.mimeType
        }))
      });

      return filteredFiles.map((file: any) => ({
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        size: parseInt(file.size || '0'),
        modifiedTime: file.modifiedTime || new Date().toISOString(),
        source: 'googleDrive' as const
      }));
    } catch (error) {
      log.error('Failed to fetch Google Drive files directly', error);
      throw error;
    }
  }

  async downloadFile(fileId: string, accessToken: string): Promise<Buffer> {
    try {
      const url = `${this.baseUrl}/files/${fileId}?alt=media`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token expired');
        }
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.buffer();
      return buffer;
    } catch (error) {
      log.error('Failed to download Google Drive file directly', error);
      throw error;
    }
  }
}

export const googleDriveDirectApi = new GoogleDriveDirectApi();
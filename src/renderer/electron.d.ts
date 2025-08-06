export interface ElectronAPI {
  // Store operations
  getStoreData: (key: string) => Promise<any>;
  setStoreData: (payload: { key: string; data: any }) => Promise<boolean>;
  
  // Secrets management
  getApiKey: (provider?: 'openai' | 'anthropic' | 'gemini') => Promise<string | null>;
  setApiKey: (key: string, provider?: 'openai' | 'anthropic' | 'gemini') => Promise<boolean>;

  // File operations
  openFileDialog: () => Promise<any>;
  readFileContent: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  
  // Cloud services
  connectGoogleDrive: () => Promise<any>;
  fetchGoogleDriveFiles: () => Promise<any>;
  connectDropbox: () => Promise<any>;
  fetchDropboxFiles: () => Promise<any>;
  connectOneDrive: () => Promise<any>;
  fetchOneDriveFiles: () => Promise<any>;
  disconnectCloudService: (service: string) => Promise<any>;

  // AI operations
  generateContent: (payload: any) => Promise<any>;
  
  // Export operations
  exportLetter: (data: any) => Promise<{ success: boolean; error?: string; message?: string }>;
  
  // Auth operations
  login: (credentials: { email: string; password: string }) => Promise<any>;
  logout: () => Promise<any>;
  checkAuth: () => Promise<any>;
  
  // License operations
  activateLicense: (data: { key: string; email: string; name: string }) => Promise<any>;
  validateLicense: () => Promise<any>;
  getLicenseInfo: () => Promise<any>;
  startTrial: (data: { email: string; name: string }) => Promise<any>;
  checkFeature: (feature: string) => Promise<{ hasFeature: boolean }>;
  
  // Support operations
  sendSupportEmail: (data: { subject: string; issueType: string; description: string }) => Promise<{ success: boolean; ticketId?: string; error?: string }>;
  
  // Error logging
  logError: (error: { message: string; stack?: string; context?: string }) => void;
  
  // App events
  onAppError: (callback: (error: any) => void) => void;
  
  // External links
  openExternal: (url: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
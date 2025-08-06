import { contextBridge, ipcRenderer, shell } from "electron";
import { IPC_CHANNELS } from "./types/ipc";

const invoke = (channel: string, data?: any) => ipcRenderer.invoke(channel, data);

contextBridge.exposeInMainWorld("electronAPI", {
  // Store operations
  getStoreData: (key: string) => invoke(IPC_CHANNELS.STORE_GET, { key }),
  setStoreData: (payload: { key: string; data: any }) => invoke(IPC_CHANNELS.STORE_SET, payload),
  
  // Secrets management
  getApiKey: (provider?: 'openai' | 'anthropic' | 'gemini') => invoke(IPC_CHANNELS.SECRETS_GET, provider),
  setApiKey: (key: string, provider?: 'openai' | 'anthropic' | 'gemini') => invoke(IPC_CHANNELS.SECRETS_SET, key, provider),

  // File operations
  openFileDialog: () => invoke(IPC_CHANNELS.FILES_OPEN),
  readFileContent: (filePath: string) => invoke(IPC_CHANNELS.FILES_READ, filePath),
  
  // Cloud services
  connectGoogleDrive: () => invoke(IPC_CHANNELS.GDRIVE_CONNECT),
  fetchGoogleDriveFiles: () => invoke(IPC_CHANNELS.GDRIVE_FETCH),
  connectDropbox: () => invoke(IPC_CHANNELS.DROPBOX_CONNECT),
  fetchDropboxFiles: () => invoke(IPC_CHANNELS.DROPBOX_FETCH),
  connectOneDrive: () => invoke(IPC_CHANNELS.ONEDRIVE_CONNECT),
  fetchOneDriveFiles: () => invoke(IPC_CHANNELS.ONEDRIVE_FETCH),
  disconnectCloudService: (service: string) => invoke(IPC_CHANNELS.CLOUD_DISCONNECT, service),

  // AI operations
  generateContent: (payload: any) => invoke(IPC_CHANNELS.AI_GENERATE, payload),
  
  // Export operations
  exportLetter: (data: any) => invoke(IPC_CHANNELS.EXPORT_LETTER, data),
  
  // Auth operations
  login: (credentials: { email: string; password: string }) => invoke(IPC_CHANNELS.AUTH_LOGIN, credentials),
  logout: () => invoke(IPC_CHANNELS.AUTH_LOGOUT),
  checkAuth: () => invoke(IPC_CHANNELS.AUTH_CHECK),
  
  // License operations
  activateLicense: (data: { key: string }) => invoke(IPC_CHANNELS.LICENSE_ACTIVATE, data),
  validateLicense: () => invoke(IPC_CHANNELS.LICENSE_VALIDATE),
  getLicenseInfo: () => invoke(IPC_CHANNELS.LICENSE_INFO),
  checkFeature: (feature: string) => invoke(IPC_CHANNELS.LICENSE_CHECK_FEATURE, feature),
  
  // Subscription operations
  createCheckoutSession: (data: { email: string; planType: 'monthly' | 'annual' }) => 
    invoke(IPC_CHANNELS.SUBSCRIPTION_CREATE_CHECKOUT, data),
  getSubscriptionStatus: (data: { licenseKey: string }) => 
    invoke(IPC_CHANNELS.SUBSCRIPTION_GET_STATUS, data),
  createPortalSession: (data: { licenseKey: string }) => 
    invoke(IPC_CHANNELS.SUBSCRIPTION_CREATE_PORTAL, data),
  
  // Support
  sendSupportEmail: (data: { subject: string; issueType: string; description: string }) => 
    invoke(IPC_CHANNELS.SUPPORT_SEND_EMAIL, data),
  
  // Error logging
  logError: (error: { message: string; stack?: string; context?: string }) => {
    console.error('Renderer error:', error);
    ipcRenderer.send('log:error', error);
  },
  
  // App events
  onAppError: (callback: (error: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.APP_ERROR, (_event, error) => callback(error));
  },
  
  // External links
  openExternal: (url: string) => ipcRenderer.send('open-external', url)
});

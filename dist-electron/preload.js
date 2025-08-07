"use strict";
const electron = require("electron");
const IPC_CHANNELS = {
  // Store operations
  STORE_GET: "store:get",
  STORE_SET: "store:set",
  // Secrets management
  SECRETS_GET: "secrets:get",
  SECRETS_SET: "secrets:set",
  // File operations
  FILES_OPEN: "files:open",
  FILES_READ: "files:read",
  // Cloud services
  GDRIVE_CONNECT: "gdrive:connect",
  GDRIVE_FETCH: "gdrive:fetch",
  DROPBOX_CONNECT: "dropbox:connect",
  DROPBOX_FETCH: "dropbox:fetch",
  ONEDRIVE_CONNECT: "onedrive:connect",
  ONEDRIVE_FETCH: "onedrive:fetch",
  CLOUD_DISCONNECT: "cloud:disconnect",
  // AI operations
  AI_GENERATE: "ai:generate",
  // Export operations
  EXPORT_LETTER: "export:letter",
  // Error handling
  APP_ERROR: "app-error",
  // Auth operations
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_CHECK: "auth:check",
  // License operations
  LICENSE_ACTIVATE: "license:activate",
  LICENSE_DEACTIVATE: "license:deactivate",
  LICENSE_VALIDATE: "license:validate",
  LICENSE_INFO: "license:info",
  LICENSE_CHECK_FEATURE: "license:check-feature",
  // Subscription operations
  SUBSCRIPTION_CREATE_CHECKOUT: "subscription:create-checkout",
  SUBSCRIPTION_GET_STATUS: "subscription:get-status",
  SUBSCRIPTION_CREATE_PORTAL: "subscription:create-portal",
  // Support chatbot operations
  SUPPORT_CHAT: "support:chat",
  // Support operations
  SUPPORT_SEND_EMAIL: "support:send-email"
};
const invoke = (channel, data) => electron.ipcRenderer.invoke(channel, data);
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Store operations
  getStoreData: (key) => invoke(IPC_CHANNELS.STORE_GET, { key }),
  setStoreData: (payload) => invoke(IPC_CHANNELS.STORE_SET, payload),
  // Secrets management
  getApiKey: (provider) => invoke(IPC_CHANNELS.SECRETS_GET, provider),
  setApiKey: (key, provider) => invoke(IPC_CHANNELS.SECRETS_SET, key),
  // File operations
  openFileDialog: () => invoke(IPC_CHANNELS.FILES_OPEN),
  readFileContent: (filePath) => invoke(IPC_CHANNELS.FILES_READ, filePath),
  // Cloud services
  connectGoogleDrive: () => invoke(IPC_CHANNELS.GDRIVE_CONNECT),
  fetchGoogleDriveFiles: () => invoke(IPC_CHANNELS.GDRIVE_FETCH),
  connectDropbox: () => invoke(IPC_CHANNELS.DROPBOX_CONNECT),
  fetchDropboxFiles: () => invoke(IPC_CHANNELS.DROPBOX_FETCH),
  connectOneDrive: () => invoke(IPC_CHANNELS.ONEDRIVE_CONNECT),
  fetchOneDriveFiles: () => invoke(IPC_CHANNELS.ONEDRIVE_FETCH),
  disconnectCloudService: (service) => invoke(IPC_CHANNELS.CLOUD_DISCONNECT, service),
  // AI operations
  generateContent: (payload) => invoke(IPC_CHANNELS.AI_GENERATE, payload),
  // Export operations
  exportLetter: (data) => invoke(IPC_CHANNELS.EXPORT_LETTER, data),
  // Auth operations
  login: (credentials) => invoke(IPC_CHANNELS.AUTH_LOGIN, credentials),
  logout: () => invoke(IPC_CHANNELS.AUTH_LOGOUT),
  checkAuth: () => invoke(IPC_CHANNELS.AUTH_CHECK),
  // License operations
  activateLicense: (data) => invoke(IPC_CHANNELS.LICENSE_ACTIVATE, data),
  deactivateLicense: () => invoke(IPC_CHANNELS.LICENSE_DEACTIVATE),
  validateLicense: () => invoke(IPC_CHANNELS.LICENSE_VALIDATE),
  getLicenseInfo: () => invoke(IPC_CHANNELS.LICENSE_INFO),
  checkFeature: (feature) => invoke(IPC_CHANNELS.LICENSE_CHECK_FEATURE, feature),
  // Subscription operations
  createCheckoutSession: (data) => invoke(IPC_CHANNELS.SUBSCRIPTION_CREATE_CHECKOUT, data),
  getSubscriptionStatus: (data) => invoke(IPC_CHANNELS.SUBSCRIPTION_GET_STATUS, data),
  createPortalSession: (data) => invoke(IPC_CHANNELS.SUBSCRIPTION_CREATE_PORTAL, data),
  // Support
  sendSupportEmail: (data) => invoke(IPC_CHANNELS.SUPPORT_SEND_EMAIL, data),
  supportChat: (data) => invoke(IPC_CHANNELS.SUPPORT_CHAT, data),
  // Error logging
  logError: (error) => {
    console.error("Renderer error:", error);
    electron.ipcRenderer.send("log:error", error);
  },
  // App events
  onAppError: (callback) => {
    electron.ipcRenderer.on(IPC_CHANNELS.APP_ERROR, (_event, error) => callback(error));
  },
  // External links
  openExternal: (url) => electron.ipcRenderer.send("open-external", url)
});

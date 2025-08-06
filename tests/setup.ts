import '@testing-library/jest-dom';

// Mock electron API
global.window.electronAPI = {
  getStoreData: jest.fn(),
  setStoreData: jest.fn(),
  getApiKey: jest.fn(),
  setApiKey: jest.fn(),
  openFileDialog: jest.fn(),
  connectGoogleDrive: jest.fn(),
  fetchGoogleDriveFiles: jest.fn(),
  connectDropbox: jest.fn(),
  fetchDropboxFiles: jest.fn(),
  connectOneDrive: jest.fn(),
  fetchOneDriveFiles: jest.fn(),
  disconnectCloudService: jest.fn(),
  generateContent: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  checkAuth: jest.fn(),
  logError: jest.fn(),
  onAppError: jest.fn(),
};
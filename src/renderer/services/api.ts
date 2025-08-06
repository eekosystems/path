import { 
  LocalFile, 
  CloudFile, 
  AIGenerateRequest, 
  AIGenerateResponse,
  AuthResponse 
} from '../types';

class ApiService {
  private isElectronEnvironment() {
    return window.electronAPI !== undefined;
  }

  private ensureElectronAPI() {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI;
  }

  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const api = this.ensureElectronAPI();
    return api.login({ email, password });
  }

  async logout(): Promise<void> {
    const api = this.ensureElectronAPI();
    await api.logout();
  }

  async checkAuth(): Promise<AuthResponse> {
    const api = this.ensureElectronAPI();
    return api.checkAuth();
  }

  // Store operations
  async getStoreData<T = any>(key: string): Promise<T | null> {
    const api = this.ensureElectronAPI();
    return api.getStoreData(key);
  }

  async setStoreData(key: string, data: any): Promise<boolean> {
    const api = this.ensureElectronAPI();
    return api.setStoreData({ key, data });
  }

  // API Key management
  async getApiKey(provider?: 'openai' | 'anthropic' | 'gemini'): Promise<string | null> {
    const api = this.ensureElectronAPI();
    return api.getApiKey(provider);
  }

  async setApiKey(key: string, provider?: 'openai' | 'anthropic' | 'gemini'): Promise<boolean> {
    const api = this.ensureElectronAPI();
    return api.setApiKey(key, provider);
  }

  // File operations
  async openFileDialog(): Promise<LocalFile[]> {
    const api = this.ensureElectronAPI();
    return api.openFileDialog();
  }

  async readFileContent(filePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
    const api = this.ensureElectronAPI();
    return api.readFileContent(filePath);
  }

  // Cloud services
  async connectGoogleDrive(): Promise<boolean> {
    const api = this.ensureElectronAPI();
    const response = await api.connectGoogleDrive();
    return response.success;
  }

  async fetchGoogleDriveFiles(): Promise<CloudFile[]> {
    const api = this.ensureElectronAPI();
    const response = await api.fetchGoogleDriveFiles();
    return response.success ? response.files : [];
  }

  async connectDropbox(): Promise<boolean> {
    const api = this.ensureElectronAPI();
    const response = await api.connectDropbox();
    return response.success;
  }

  async fetchDropboxFiles(): Promise<CloudFile[]> {
    const api = this.ensureElectronAPI();
    const response = await api.fetchDropboxFiles();
    return response.success ? response.files : [];
  }

  async connectOneDrive(): Promise<boolean> {
    const api = this.ensureElectronAPI();
    const response = await api.connectOneDrive();
    return response.success;
  }

  async fetchOneDriveFiles(): Promise<CloudFile[]> {
    const api = this.ensureElectronAPI();
    const response = await api.fetchOneDriveFiles();
    return response.success ? response.files : [];
  }

  async disconnectCloudService(service: string): Promise<boolean> {
    const api = this.ensureElectronAPI();
    const response = await api.disconnectCloudService(service);
    return response.success;
  }

  // AI operations
  async generateContent(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const api = this.ensureElectronAPI();
    return api.generateContent(request);
  }

  // Export operations
  async exportLetter(data: any): Promise<{ success: boolean; error?: string; message?: string }> {
    const api = this.ensureElectronAPI();
    return api.exportLetter(data);
  }

  // Error logging
  logError(error: Error, context?: string): void {
    if (window.electronAPI) {
      window.electronAPI.logError({
        message: error.message,
        stack: error.stack,
        context
      });
    }
  }

  // Event listeners
  onAppError(callback: (error: any) => void): void {
    if (window.electronAPI) {
      window.electronAPI.onAppError(callback);
    }
  }
}

export const apiService = new ApiService();
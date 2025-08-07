import { 
  StoreGetRequest, 
  StoreSetRequest, 
  CloudServiceResponse, 
  FetchFilesResponse,
  AIGenerateRequest,
  AIGenerateResponse,
  AuthLoginRequest,
  AuthResponse,
  LocalFile,
  LicenseInfo,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  SubscriptionStatusRequest,
  SubscriptionStatusResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse
} from '../main/types/ipc';

declare global {
  interface Window {
    electronAPI: {
      // Store operations
      getStoreData: (key: string) => Promise<any>;
      setStoreData: (payload: StoreSetRequest) => Promise<boolean>;
      
      // Secrets management
      getApiKey: () => Promise<string | null>;
      setApiKey: (key: string) => Promise<boolean>;
      
      // File operations
      openFileDialog: () => Promise<LocalFile[]>;
      
      // Cloud services
      connectGoogleDrive: () => Promise<CloudServiceResponse>;
      fetchGoogleDriveFiles: () => Promise<FetchFilesResponse>;
      connectDropbox: () => Promise<CloudServiceResponse>;
      fetchDropboxFiles: () => Promise<FetchFilesResponse>;
      connectOneDrive: () => Promise<CloudServiceResponse>;
      fetchOneDriveFiles: () => Promise<FetchFilesResponse>;
      disconnectCloudService: (service: string) => Promise<CloudServiceResponse>;
      
      // AI operations
      generateContent: (payload: AIGenerateRequest) => Promise<AIGenerateResponse>;
      
      // Auth operations
      login: (credentials: AuthLoginRequest) => Promise<AuthResponse>;
      logout: () => Promise<{ success: boolean }>;
      checkAuth: () => Promise<AuthResponse>;
      
      // License operations
      activateLicense: (data: { key: string }) => Promise<{ success: boolean; isValid: boolean; error?: string; message?: string }>;
      deactivateLicense: () => Promise<{ success: boolean; message?: string; error?: string }>;
      validateLicense: () => Promise<{ isValid: boolean; firmName?: string; daysRemaining?: number }>;
      getLicenseInfo: () => Promise<LicenseInfo>;
      checkFeature: (feature: string) => Promise<{ hasFeature: boolean }>;
      
      // Subscription operations
      createCheckoutSession: (data: CreateCheckoutRequest) => Promise<CreateCheckoutResponse>;
      getSubscriptionStatus: (data: SubscriptionStatusRequest) => Promise<SubscriptionStatusResponse>;
      createPortalSession: (data: CreatePortalSessionRequest) => Promise<CreatePortalSessionResponse>;
      
      // Export operations
      exportLetter: (data: any) => Promise<{ success: boolean; message?: string; error?: string }>;
      
      // Error logging
      logError: (error: { message: string; stack?: string; context?: string }) => void;
      
      // App events
      onAppError: (callback: (error: any) => void) => void;
      
      // External links
      openExternal: (url: string) => void;
    };
  }
}

export {};
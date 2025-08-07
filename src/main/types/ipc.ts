// IPC Channel Types
export const IPC_CHANNELS = {
  // Store operations
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  
  // Secrets management
  SECRETS_GET: 'secrets:get',
  SECRETS_SET: 'secrets:set',
  
  // File operations
  FILES_OPEN: 'files:open',
  FILES_READ: 'files:read',
  FILES_DOWNLOAD_CLOUD: 'files:download-cloud',
  
  // Cloud services
  GDRIVE_CONNECT: 'gdrive:connect',
  GDRIVE_FETCH: 'gdrive:fetch',
  DROPBOX_CONNECT: 'dropbox:connect',
  DROPBOX_FETCH: 'dropbox:fetch',
  ONEDRIVE_CONNECT: 'onedrive:connect',
  ONEDRIVE_FETCH: 'onedrive:fetch',
  CLOUD_DISCONNECT: 'cloud:disconnect',
  
  // AI operations
  AI_GENERATE: 'ai:generate',
  
  // Export operations
  EXPORT_LETTER: 'export:letter',
  
  // Error handling
  APP_ERROR: 'app-error',
  
  // Auth operations
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_CHECK: 'auth:check',
  AUTH_REFRESH: 'auth:refresh',
  
  // License operations
  LICENSE_ACTIVATE: 'license:activate',
  LICENSE_VALIDATE: 'license:validate',
  LICENSE_INFO: 'license:info',
  LICENSE_START_TRIAL: 'license:start-trial',
  LICENSE_CHECK_FEATURE: 'license:check-feature',
  
  // Subscription operations
  SUBSCRIPTION_CREATE_CHECKOUT: 'subscription:create-checkout',
  SUBSCRIPTION_GET_STATUS: 'subscription:get-status',
  SUBSCRIPTION_CREATE_PORTAL: 'subscription:create-portal',
  
  // Support chatbot operations
  SUPPORT_CHAT: 'support:chat',
  
  // Support operations
  SUPPORT_SEND_EMAIL: 'support:send-email',
  SUBSCRIPTION_UPDATE: 'subscription:update'
} as const;

// Request/Response Types
export interface StoreGetRequest {
  key: string;
}

export interface StoreSetRequest {
  key: string;
  data: any;
}

export interface CloudServiceResponse {
  success: boolean;
  service?: string;
  error?: string;
}

export interface CloudFile {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  modifiedTime?: string;
  source: 'local' | 'googleDrive' | 'dropbox' | 'oneDrive';
}

export interface LocalFile {
  id: string;
  filename: string;
  filePath: string;
  size?: number;
}

export interface FetchFilesResponse {
  success: boolean;
  files: CloudFile[];
  error?: string;
}

export interface AIGenerateRequest {
  section: {
    id: number;
    title: string;
    prompt: string;
    documents: Array<LocalFile | CloudFile>;
  };
  applicantData: ApplicantData;
  selectedDocuments: Array<LocalFile | CloudFile>;
  llmModel: string;
  apiKey?: string; // Remove this in production, use stored key
}

export interface AIGenerateResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ApplicantData {
  beneficiaryName: string;
  beneficiaryNationality: string;
  currentLocation: string;
  petitionerName: string;
  petitionerType: string;
  petitionerState: string;
  petitionerAddress: string;
  visaType: string;
  industry: string;
  complexity: string;
  priorityDate: string;
  filingDate: string;
  caseNumber: string;
  attorneyName: string;
  additionalInfo: string;
  llmProvider: 'openai' | 'anthropic' | 'gemini';
  llmModel: string;
  templateVariant: string;
  customFields: Array<{
    id: number;
    label: string;
    value: string;
  }>;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  token?: string;
  error?: string;
}

export interface ErrorNotification {
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  code?: string;
}

// Subscription Types
export interface SubscriptionInfo {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired';
  planType: 'monthly' | 'annual';
  currentPeriodEnd: string;
  trialEnd?: string;
  cancelAtPeriodEnd?: boolean;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
  nextInvoice?: {
    amountDue: number;
    currency: string;
  };
}

export interface CreateCheckoutRequest {
  email: string;
  planType: 'monthly' | 'annual';
}

export interface CreateCheckoutResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export interface SubscriptionStatusRequest {
  licenseKey: string;
}

export interface SubscriptionStatusResponse {
  success: boolean;
  subscription?: SubscriptionInfo;
  error?: string;
}

export interface CreatePortalSessionRequest {
  licenseKey: string;
}

export interface CreatePortalSessionResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export interface SupportEmailRequest {
  subject: string;
  issueType: string;
  description: string;
}

export interface SupportEmailResponse {
  success: boolean;
  ticketId?: string;
  error?: string;
}

export interface LicenseInfo {
  isLicensed: boolean;
  licenseKey?: string;
  status?: string;
  expiresAt?: string;
  features?: string[];
  subscription?: SubscriptionInfo;
  activations?: number;
  maxActivations?: number;
  email?: string;
}
export interface Template {
  id: string;
  name: string;
  isCustom: boolean;
  sections: Array<{
    title: string;
    prompt: string;
  }>;
}

export interface Section {
  id: number;
  title: string;
  prompt: string;
  content: string;
  isEditing: boolean;
  isGenerating: boolean;
  documents: Array<LocalFile | CloudFile>;
}

export interface LocalFile {
  id: string;
  filename: string;
  filePath: string;
  size?: number;
}

export interface CloudFile {
  id: string;
  name: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  modifiedTime?: string;
  source: 'local' | 'googleDrive' | 'dropbox' | 'oneDrive';
  filePath?: string;
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
  customFields: CustomField[];
}

export interface CustomField {
  id: number;
  label: string;
  value: string;
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface CloudConnections {
  googleDrive: boolean;
  dropbox: boolean;
  oneDrive: boolean;
}

export interface AvailableFiles {
  local: LocalFile[];
  googleDrive: CloudFile[];
  dropbox: CloudFile[];
  oneDrive: CloudFile[];
}

export interface LoadingState {
  files: boolean;
  connect: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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
  systemPrompt?: string;
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

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo' }
    ]
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' }
    ]
  },
  gemini: {
    name: 'Google Gemini',
    models: [
      { id: 'gemini-pro', name: 'Gemini Pro' },
      { id: 'gemini-pro-vision', name: 'Gemini Pro Vision' }
    ]
  }
} as const;

export type AIProvider = keyof typeof AI_PROVIDERS;
export type AIModel = typeof AI_PROVIDERS[AIProvider]['models'][number]['id'];
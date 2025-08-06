import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  ApplicantData,
  Section,
  Template,
  LocalFile,
  CloudFile,
  CloudConnections,
  AvailableFiles,
  Notification,
  User,
  LoadingState
} from '../types';
import { GenericSection, DOCUMENT_TEMPLATES } from '../types/generic';
import { DocumentTemplate } from '../components/GenericDocumentTemplateModal';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_CHAT_SYSTEM_PROMPT } from '../constants';

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Application data
  applicantData: ApplicantData;
  sections: Section[];
  genericSections: GenericSection[];
  apiKey: string;
  systemPrompt: string;
  documentType: string;
  currentLetterTemplateId: string;
  
  // Files and cloud
  availableFiles: AvailableFiles;
  selectedDocuments: (LocalFile | CloudFile)[];
  cloudConnections: CloudConnections;
  
  // Templates
  allTemplates: Template[];
  documentTemplates: DocumentTemplate[];
  
  // UI state
  isLoading: LoadingState;
  notifications: Notification[];
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  
  // Chat settings
  chatSettings: {
    enabled: boolean;
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    saveHistory: boolean;
    chatSystemPrompt: string;
  };
  
  // Actions
  setUser: (user: User | null) => void;
  setApplicantData: (data: Partial<ApplicantData>) => void;
  updateApplicantDataField: (field: keyof ApplicantData, value: any) => void;
  setSections: (sections: Section[]) => void;
  updateSection: (id: number, updates: Partial<Section>) => void;
  addSection: (afterId?: number) => void;
  removeSection: (id: number) => void;
  setGenericSections: (sections: GenericSection[]) => void;
  setDocumentType: (type: string) => void;
  loadDocumentTemplate: (templateId: string) => void;
  setCurrentLetterTemplate: (templateId: string) => void;
  setApiKey: (key: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setAvailableFiles: (files: Partial<AvailableFiles>) => void;
  setSelectedDocuments: (docs: (LocalFile | CloudFile)[]) => void;
  addDocumentToSelection: (doc: LocalFile | CloudFile) => void;
  removeDocumentFromSelection: (id: string) => void;
  setCloudConnections: (connections: Partial<CloudConnections>) => void;
  setAllTemplates: (templates: Template[]) => void;
  setDocumentTemplates: (templates: DocumentTemplate[]) => void;
  setLoading: (loading: Partial<LoadingState>) => void;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  removeNotification: (id: number) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  updateChatSettings: (settings: Partial<AppState['chatSettings']>) => void;
  reset: () => void;
}

const defaultApplicantData: ApplicantData = {
  beneficiaryName: '',
  beneficiaryNationality: '',
  currentLocation: '',
  petitionerName: '',
  petitionerType: 'Corporation',
  petitionerState: '',
  petitionerAddress: '',
  visaType: 'default-h1b',
  industry: 'Technology',
  complexity: 'Moderate',
  priorityDate: '',
  filingDate: '',
  caseNumber: '',
  attorneyName: '',
  additionalInfo: '',
  llmProvider: 'openai',
  llmModel: 'gpt-4',
  customFields: []
};

// Create default document templates
const defaultDocumentTemplates: DocumentTemplate[] = Object.entries(DOCUMENT_TEMPLATES).map(([key, template]) => ({
  id: key,
  name: template.name,
  isCustom: false,
  sections: template.sections,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

const defaultState = {
  user: null,
  isAuthenticated: false,
  applicantData: defaultApplicantData,
  sections: [],
  genericSections: DOCUMENT_TEMPLATES.immigration.sections,
  documentType: 'immigration',
  currentLetterTemplateId: 'default-h1b',
  apiKey: '',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  availableFiles: { local: [], googleDrive: [], dropbox: [], oneDrive: [] },
  selectedDocuments: [],
  cloudConnections: { googleDrive: false, dropbox: false, oneDrive: false },
  allTemplates: [],
  documentTemplates: defaultDocumentTemplates,
  isLoading: { files: false, connect: null },
  notifications: [],
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  chatSettings: {
    enabled: true,
    position: 'bottom-right' as const,
    saveHistory: true,
    chatSystemPrompt: DEFAULT_CHAT_SYSTEM_PROMPT
  }
};

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultState,
        
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        
        setApplicantData: (data) => set((state) => ({
          applicantData: { ...state.applicantData, ...data }
        })),
        
        updateApplicantDataField: (field, value) => set((state) => ({
          applicantData: { ...state.applicantData, [field]: value }
        })),
        
        setSections: (sections) => set({ sections }),
        
        updateSection: (id, updates) => set((state) => ({
          sections: state.sections.map(s => s.id === id ? { ...s, ...updates } : s)
        })),
        
        addSection: (afterId) => set((state) => {
          const newSection: Section = {
            id: Date.now(),
            title: 'Custom Section',
            prompt: 'Enter your custom prompt...',
            content: '',
            isEditing: false,
            isGenerating: false,
            documents: []
          };
          
          if (afterId) {
            const index = state.sections.findIndex(s => s.id === afterId);
            const newSections = [...state.sections];
            newSections.splice(index + 1, 0, newSection);
            return { sections: newSections };
          }
          
          return { sections: [...state.sections, newSection] };
        }),
        
        removeSection: (id) => set((state) => ({
          sections: state.sections.filter(s => s.id !== id)
        })),
        
        setGenericSections: (genericSections) => set({ genericSections }),
        
        setDocumentType: (documentType) => set({ documentType }),
        
        loadDocumentTemplate: (templateId) => set(() => {
          const template = DOCUMENT_TEMPLATES[templateId as keyof typeof DOCUMENT_TEMPLATES];
          if (template) {
            return {
              genericSections: template.sections,
              documentType: templateId
            };
          }
          return {};
        }),
        
        setCurrentLetterTemplate: (templateId) => set((state) => {
          // Load the letter template sections
          const template = state.allTemplates.find(t => t.id === templateId);
          if (template) {
            const newSections: Section[] = template.sections.map((section, index) => ({
              id: Date.now() + index,
              title: section.title,
              prompt: section.prompt,
              content: '',
              isEditing: false,
              isGenerating: false,
              documents: []
            }));
            return {
              currentLetterTemplateId: templateId,
              sections: newSections
            };
          }
          return { currentLetterTemplateId: templateId };
        }),
        
        setApiKey: (apiKey) => set({ apiKey }),
        
        setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
        
        setAvailableFiles: (files) => set((state) => ({
          availableFiles: { ...state.availableFiles, ...files }
        })),
        
        setSelectedDocuments: (selectedDocuments) => set({ selectedDocuments }),
        
        addDocumentToSelection: (doc) => set((state) => {
          if (!state.selectedDocuments.some(d => d.id === doc.id)) {
            return { selectedDocuments: [...state.selectedDocuments, doc] };
          }
          return {};
        }),
        
        removeDocumentFromSelection: (id) => set((state) => ({
          selectedDocuments: state.selectedDocuments.filter(d => d.id !== id)
        })),
        
        setCloudConnections: (connections) => set((state) => ({
          cloudConnections: { ...state.cloudConnections, ...connections }
        })),
        
        setAllTemplates: (allTemplates) => set({ allTemplates }),
        
        setDocumentTemplates: (documentTemplates) => set({ documentTemplates }),
        
        setLoading: (loading) => set((state) => ({
          isLoading: { ...state.isLoading, ...loading }
        })),
        
        addNotification: (message, type) => set((state) => ({
          notifications: [
            { id: Date.now() + Math.random() * 1000, message, type },
            ...state.notifications
          ]
        })),
        
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        
        toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
        
        toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
        
        updateChatSettings: (settings) => set((state) => ({
          chatSettings: { ...state.chatSettings, ...settings }
        })),
        
        reset: () => set(defaultState)
      }),
      {
        name: 'clerk-app-store',
        partialize: (state) => ({
          applicantData: state.applicantData,
          sections: state.sections,
          availableFiles: state.availableFiles,
          selectedDocuments: state.selectedDocuments,
          cloudConnections: state.cloudConnections,
          allTemplates: state.allTemplates,
          documentTemplates: state.documentTemplates,
          genericSections: state.genericSections,
          currentLetterTemplateId: state.currentLetterTemplateId
        })
      }
    ),
    { name: 'ClerkApp' }
  )
);
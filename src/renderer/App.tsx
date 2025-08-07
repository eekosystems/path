import React, { useEffect, useState, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Sidebar } from './components/sidebar';
import { SectionCard } from './components/SectionCard';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { GenericDocumentTemplateModal } from './components/GenericDocumentTemplateModal';
import { NotificationContainer } from './components/Notification';
import { LicenseModal } from './components/LicenseModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { useStore } from './store';
import { apiService } from './services/api';
import { DEFAULT_TEMPLATES } from './constants';
import { LocalFile, CloudFile, Section } from './types';
import { Plus, RefreshCw, Eraser, RotateCcw, Loader2, FileDown, FileText, FileType, Eye } from 'lucide-react';
import { TooltipWrapper } from './components/common';
import { ChatWidget, ChatWidgetRef } from './components/ChatWidget';
import { SupportChatbot } from './components/SupportChatbot';

function App() {
  const store = useStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<LocalFile | CloudFile | null>(null);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const [isGenericTemplateManagerOpen, setIsGenericTemplateManagerOpen] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showSupportChat, setShowSupportChat] = useState(false);
  const chatWidgetRef = useRef<ChatWidgetRef>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + B to toggle sidebar collapse
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (store.isSidebarOpen) {
          store.toggleSidebarCollapse();
        } else {
          store.toggleSidebar();
        }
      }
      // Escape to close sidebar on mobile
      if (e.key === 'Escape' && store.isSidebarOpen && window.innerWidth < 1024) {
        store.toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [store.isSidebarOpen]);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check license first in Electron environment
        if (window.electronAPI) {
          // Check license status
          const licenseInfo = await window.electronAPI.getLicenseInfo();
          
          if (licenseInfo.isLicensed) {
            // Auto-login with license info
            store.setUser({
              id: licenseInfo.licenseKey || 'licensed-user',
              email: licenseInfo.email || 'user@clerk.app',
              name: 'Licensed User',
              role: 'user'
            });
            setIsAuthenticated(true);
          } else {
            // Show license modal for activation
            setShowLicenseModal(true);
            // Still set authenticated to true to skip login screen
            setIsAuthenticated(true);
          }
        } else {
          // Development mode in browser - skip auth
          console.warn('Running in browser mode - authentication disabled');
          setIsAuthenticated(true);
        }

        // Load saved state only in Electron environment
        if (window.electronAPI) {
          const savedState = await apiService.getStoreData('appState');
          if (savedState && savedState.sections && savedState.sections.length > 0) {
            if (savedState.applicantData) {
              store.setApplicantData(savedState.applicantData);
            }
            if (savedState.sections) {
              store.setSections(savedState.sections);
            }
            if (savedState.availableFiles) {
              store.setAvailableFiles(savedState.availableFiles);
            }
            if (savedState.selectedDocuments) {
              store.setSelectedDocuments(savedState.selectedDocuments);
            }
            if (savedState.cloudConnections) {
              store.setCloudConnections(savedState.cloudConnections);
            }
            if (savedState.allTemplates) {
              store.setAllTemplates(savedState.allTemplates);
            }
            if (savedState.documentTemplates) {
              store.setDocumentTemplates(savedState.documentTemplates);
            }
            if (savedState.genericSections) {
              store.setGenericSections(savedState.genericSections);
            }
          } else {
            // Initialize with default templates
            console.log('Initializing with default templates...');
            store.setAllTemplates(Object.values(DEFAULT_TEMPLATES));
            // Ensure we have templates before updating sections
            if (store.allTemplates.length === 0) {
              store.setAllTemplates(Object.values(DEFAULT_TEMPLATES));
            }
            updateSections('default-h1b');
          }

          // Load API keys for all providers
          const openAiKey = await apiService.getApiKey('openai');
          const anthropicKey = await apiService.getApiKey('anthropic');
          const geminiKey = await apiService.getApiKey('gemini');
          
          const keys: Record<string, string> = {};
          if (openAiKey) keys.openai = openAiKey;
          if (anthropicKey) keys.anthropic = anthropicKey;
          if (geminiKey) keys.gemini = geminiKey;
          
          setApiKeys(keys);
          
          // Set the API key for the current provider (backward compatibility)
          const currentProvider = store.applicantData.llmProvider || 'openai';
          if (keys[currentProvider]) {
            store.setApiKey(keys[currentProvider]);
          }

          // Set up error handler
          apiService.onAppError((error) => {
            store.addNotification(`Error: ${error.message}`, 'error');
          });
        } else {
          // Browser mode - initialize with defaults
          store.setAllTemplates(Object.values(DEFAULT_TEMPLATES));
          updateSections('default-h1b');
        }

        setIsLoaded(true);
        
        // Ensure sections are initialized
        if (store.sections.length === 0) {
          console.log('No sections found, initializing defaults...');
          if (store.allTemplates.length === 0) {
            store.setAllTemplates(Object.values(DEFAULT_TEMPLATES));
          }
          updateSections('default-h1b');
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        store.addNotification('Failed to initialize application', 'error');
        setIsLoaded(true);
      }
    };

    initializeApp();
  }, []);

  // Save state on changes
  useEffect(() => {
    if (isLoaded && isAuthenticated) {
      const saveState = async () => {
        const stateToSave = {
          applicantData: store.applicantData,
          sections: store.sections,
          availableFiles: store.availableFiles,
          selectedDocuments: store.selectedDocuments,
          cloudConnections: store.cloudConnections,
          allTemplates: store.allTemplates,
          documentTemplates: store.documentTemplates,
          genericSections: store.genericSections
        };
        await apiService.setStoreData('appState', stateToSave);
      };
      saveState();
    }
  }, [
    store.applicantData,
    store.sections,
    store.availableFiles,
    store.selectedDocuments,
    store.cloudConnections,
    store.allTemplates,
    store.documentTemplates,
    store.genericSections,
    isLoaded,
    isAuthenticated
  ]);

  // Handlers
  const updateSections = (templateId: string) => {
    const template = store.allTemplates.find(t => t.id === templateId);
    if (!template) {
      store.addNotification("Could not load the selected template.", "error");
      return;
    }

    const newSections: Section[] = template.sections.map((section, index) => ({
      id: Date.now() + index,
      title: section.title,
      prompt: section.prompt,
      content: "",
      isEditing: false,
      isGenerating: false,
      documents: []
    }));
    
    store.setSections(newSections);
  };


  const handleApiKeyChange = async (key: string, provider?: 'openai' | 'anthropic' | 'gemini') => {
    const selectedProvider = provider || store.applicantData.llmProvider || 'openai';
    
    // Update local state
    setApiKeys(prev => ({ ...prev, [selectedProvider]: key }));
    
    // Update store if it's the current provider
    if (selectedProvider === store.applicantData.llmProvider) {
      store.setApiKey(key);
    }
    
    try {
      const success = await apiService.setApiKey(key, selectedProvider);
      if (success) {
        store.addNotification(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API Key saved securely.`, 'success');
      } else {
        store.addNotification(`Failed to save ${selectedProvider} API key. Please try again.`, 'error');
      }
    } catch (error: any) {
      console.error('API Key save error:', error);
      store.addNotification(`API Key error: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  const handleFileUpload = async () => {
    try {
      const files = await apiService.openFileDialog();
      if (files && files.length > 0) {
        const newFiles = files.filter(f => 
          !store.availableFiles.local.some(d => d.filePath === f.filePath)
        );
        if (newFiles.length > 0) {
          store.setAvailableFiles({ 
            local: [...store.availableFiles.local, ...newFiles] 
          });
          store.addNotification(`Added ${newFiles.length} new document(s).`, 'success');
        }
      }
    } catch (error) {
      store.addNotification('Failed to upload files', 'error');
    }
  };

  const handleConnectService = async (service: string) => {
    store.setLoading({ connect: service });
    store.addNotification(`Connecting to ${service}...`, 'info');
    
    try {
      let success = false;
      
      switch (service) {
        case 'googleDrive':
          success = await apiService.connectGoogleDrive();
          break;
        case 'dropbox':
          success = await apiService.connectDropbox();
          break;
        case 'oneDrive':
          success = await apiService.connectOneDrive();
          break;
      }
      
      if (success) {
        store.setCloudConnections({ [service]: true });
        store.addNotification(`Successfully connected to ${service}!`, 'success');
        handleFetchFiles(service);
      } else {
        store.addNotification(`Failed to connect to ${service}.`, 'error');
      }
    } catch (error) {
      store.addNotification(`Failed to connect to ${service}.`, 'error');
    } finally {
      store.setLoading({ connect: null });
    }
  };

  const handleFetchFiles = async (service: string) => {
    store.setLoading({ files: true });
    
    try {
      let files: CloudFile[] = [];
      
      switch (service) {
        case 'googleDrive':
          files = await apiService.fetchGoogleDriveFiles();
          break;
        case 'dropbox':
          files = await apiService.fetchDropboxFiles();
          break;
        case 'oneDrive':
          files = await apiService.fetchOneDriveFiles();
          break;
      }
      
      store.setAvailableFiles({ [service]: files });
    } catch (error) {
      console.error(`Failed to fetch files from ${service}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      store.addNotification(`Failed to fetch files from ${service}: ${errorMessage}`, 'error');
    } finally {
      store.setLoading({ files: false });
    }
  };

  const handleDisconnectService = async (service: string) => {
    try {
      const success = await apiService.disconnectCloudService(service);
      if (success) {
        store.setCloudConnections({ [service]: false });
        store.setAvailableFiles({ [service]: [] });
        store.setSelectedDocuments(
          store.selectedDocuments.filter(doc => doc.source !== service)
        );
        store.addNotification(`Disconnected from ${service}.`, 'success');
      }
    } catch (error) {
      store.addNotification(`Failed to disconnect from ${service}.`, 'error');
    }
  };

  const generateContent = async (id: number) => {
    const currentProvider = store.applicantData.llmProvider || 'openai';
    const currentApiKey = apiKeys[currentProvider] || store.apiKey;
    
    if (!currentApiKey) {
      store.addNotification(`Please set your ${currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1)} API Key in Settings.`, 'error');
      return;
    }
    
    const section = store.sections.find(s => s.id === id);
    if (!section) return;
    
    store.updateSection(id, { isGenerating: true });
    
    const combinedDocs = [...store.selectedDocuments, ...section.documents];
    const uniqueDocs = [...new Map(combinedDocs.map(item => [item.id, item])).values()];
    
    try {
      const response = await apiService.generateContent({
        section,
        applicantData: store.applicantData,
        selectedDocuments: uniqueDocs,
        llmModel: store.applicantData.llmModel,
        systemPrompt: store.systemPrompt
      });
      
      if (response.success && response.content) {
        store.updateSection(id, { content: response.content });
        store.addNotification(`Generated content for "${section.title}" successfully.`, 'success');
      } else {
        throw new Error(response.error || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Error generating content:', error);
      store.updateSection(id, { content: `Error: ${error.message}` });
      store.addNotification(`Generation failed: ${error.message}`, 'error');
    } finally {
      store.updateSection(id, { isGenerating: false });
    }
  };

  const generateAllSections = async () => {
    const currentProvider = store.applicantData.llmProvider || 'openai';
    const currentApiKey = apiKeys[currentProvider] || store.apiKey;
    
    if (!currentApiKey) {
      store.addNotification(`Please set your ${currentProvider.charAt(0).toUpperCase() + currentProvider.slice(1)} API Key in Settings.`, 'error');
      return;
    }
    
    store.addNotification(`Starting batch generation for ${store.sections.length} sections...`, 'info');
    for (const section of store.sections) {
      await generateContent(section.id);
    }
    store.addNotification('Batch generation complete.', 'success');
  };

  const handleExportPDF = async () => {
    // Check if there's content to export
    const hasContent = store.sections.some(section => section.content.trim() !== '');
    if (!hasContent) {
      store.addNotification('No content to export. Please generate content first.', 'error');
      return;
    }
    
    try {
      store.addNotification('Exporting letter as PDF...', 'info');
      
      // Prepare the export data
      const exportData = {
        applicantData: store.applicantData,
        sections: store.sections.filter(s => s.content.trim() !== ''),
        format: 'pdf'
      };
      
      // Call the export API
      const result = await apiService.exportLetter(exportData);
      
      if (result.success) {
        const message = result.message || 'Letter exported as PDF successfully!';
        store.addNotification(message, 'success');
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      store.addNotification(`Export failed: ${error.message}`, 'error');
    }
  };

  const handleExportDOCX = async () => {
    // Check if there's content to export
    const hasContent = store.sections.some(section => section.content.trim() !== '');
    if (!hasContent) {
      store.addNotification('No content to export. Please generate content first.', 'error');
      return;
    }
    
    try {
      store.addNotification('Exporting letter as DOCX...', 'info');
      
      // Prepare the export data
      const exportData = {
        applicantData: store.applicantData,
        sections: store.sections.filter(s => s.content.trim() !== ''),
        format: 'docx'
      };
      
      // Call the export API
      const result = await apiService.exportLetter(exportData);
      
      if (result.success) {
        const message = result.message || 'Letter exported as DOCX successfully!';
        store.addNotification(message, 'success');
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      store.addNotification(`Export failed: ${error.message}`, 'error');
    }
  };

  const handleDeleteLocalFile = (fileId: string) => {
    const file = store.availableFiles.local.find(f => f.id === fileId);
    if (file) {
      store.setAvailableFiles({
        local: store.availableFiles.local.filter(f => f.id !== fileId)
      });
      store.removeDocumentFromSelection(fileId);
      store.addNotification(`Removed "${file.filename}" from available files.`, 'info');
    }
  };

  const viewDocument = (doc: LocalFile | CloudFile) => {
    setViewingDocument(doc);
    setShowDocumentViewer(true);
  };

  const handleResetSections = () => {
    store.setCurrentLetterTemplate(store.currentLetterTemplateId);
    store.addNotification('Sections have been reset to the current template.', 'info');
  };

  const handleClearAllOutputs = () => {
    store.setSections(store.sections.map(s => ({ ...s, content: '' })));
    store.addNotification('All generated content has been cleared.', 'info');
  };


  const addDocumentToSection = (sectionId: number, file: LocalFile | CloudFile) => {
    const section = store.sections.find(s => s.id === sectionId);
    if (section && !section.documents.some(d => d.id === file.id)) {
      store.updateSection(sectionId, {
        documents: [...section.documents, file]
      });
    }
  };

  const removeDocumentFromSection = (sectionId: number, docId: string) => {
    const section = store.sections.find(s => s.id === sectionId);
    if (section) {
      store.updateSection(sectionId, {
        documents: section.documents.filter(d => d.id !== docId)
      });
    }
  };

  const handleSectionChatClick = (section: Section, mode: 'planning' | 'content' = 'planning') => {
    if (chatWidgetRef.current) {
      chatWidgetRef.current.loadSection({
        id: section.id,
        title: section.title,
        content: section.content
      }, mode);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-gold-600 animate-spin" />
      </div>
    );
  }

  // Remove login screen - authentication is now handled by license
  // Users without a license will see the license modal instead

  return (
    <ErrorBoundary>
      <div className="h-screen overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100 font-sans text-navy-800">
        <NotificationContainer
          notifications={store.notifications}
          onDismiss={store.removeNotification}
        />

        <TemplateManagerModal
          isOpen={isTemplateManagerOpen}
          onClose={() => setIsTemplateManagerOpen(false)}
          allTemplates={store.allTemplates}
          onSaveTemplates={store.setAllTemplates}
          addNotification={store.addNotification}
        />
        
        <GenericDocumentTemplateModal
          isOpen={isGenericTemplateManagerOpen}
          onClose={() => setIsGenericTemplateManagerOpen(false)}
          templates={store.documentTemplates || []}
          currentSections={store.genericSections}
          onSaveTemplates={store.setDocumentTemplates}
          onLoadTemplate={store.setGenericSections}
          addNotification={store.addNotification}
        />
        
        <LicenseModal
          isOpen={showLicenseModal}
          onClose={() => setShowLicenseModal(false)}
          onSuccess={async () => {
            setShowLicenseModal(false);
            store.addNotification('License activated successfully!', 'success');
            
            // Reload license info and update user
            const licenseInfo = await window.electronAPI.getLicenseInfo();
            if (licenseInfo.isLicensed) {
              store.setUser({
                id: licenseInfo.licenseKey || 'licensed-user',
                email: licenseInfo.email || 'user@clerk.app',
                name: 'Licensed User',
                role: 'user'
              });
            }
          }}
        />

        <div className="app-layout">
          <main className="main-content">
            <Header onToggleSidebar={store.toggleSidebar} />
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-6xl mx-auto">
                  <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-navy">Document Sections</h2>
                <div className="flex items-center gap-2 animate-fade-in">
                  <button 
                    onClick={handleClearAllOutputs} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-warning-800 bg-warning-100 hover:bg-warning-200 border border-warning-200 transition-all duration-200 hover:shadow-elevation-1 active:scale-95"
                  >
                    <Eraser className="w-4 h-4" /> Clear All
                  </button>
                  <button 
                    onClick={handleResetSections} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-error-800 bg-error-100 hover:bg-error-200 border border-error-200 transition-all duration-200 hover:shadow-elevation-1 active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {store.sections.map((section, index) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    index={index}
                    availableFiles={store.availableFiles}
                    onUpdate={(field, value) => store.updateSection(section.id, { [field]: value })}
                    onRemove={() => store.removeSection(section.id)}
                    onAddAfter={() => store.addSection(section.id)}
                    onGenerate={() => generateContent(section.id)}
                    onClear={() => store.updateSection(section.id, { content: '' })}
                    onToggleEdit={() => store.updateSection(section.id, { isEditing: !section.isEditing })}
                    onAttachDoc={(file) => addDocumentToSection(section.id, file)}
                    onRemoveDoc={(docId) => removeDocumentFromSection(section.id, docId)}
                    onChatClick={() => handleSectionChatClick(section, 'planning')}
                    onContentChatClick={section.content ? () => handleSectionChatClick(section, 'content') : undefined}
                  />
                ))}
              </div>
              
              <div className="text-center mt-8 animate-fade-in">
                <button 
                  onClick={() => store.addSection()} 
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gold-600 rounded-lg font-semibold hover:shadow-elevation-3 border border-neutral-200 shadow-elevation-1 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                >
                  <Plus className="w-5 h-5" /> Add Custom Section
                </button>
              </div>
                </div>
              </div>
            
            <footer className="p-4 bg-white border-t border-neutral-200 shadow-elevation-2 sticky bottom-0 z-10">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-6xl mx-auto">
                <div className="animate-fade-in">
                  <p className="text-sm text-neutral-600 bg-neutral-50 px-3 py-1.5 rounded-lg shadow-inner-1">
                    <span className="font-medium text-navy-700">{store.sections.length}</span> sections • 
                    <span className="font-medium text-navy-700">{store.selectedDocuments.length}</span> documents in global context
                  </p>
                </div>
                <div className="flex gap-3 animate-fade-in">
                  <button 
                    onClick={generateAllSections} 
                    className="btn-primary"
                  >
                    <RefreshCw className="w-5 h-5" /> Generate All
                  </button>
                  <TooltipWrapper title="Preview Document">
                    <button 
                      onClick={() => setShowPreview(true)}
                      className="btn-secondary group"
                    >
                      <Eye className="w-5 h-5 group-hover:text-purple-600 transition-colors" />
                      Preview
                    </button>
                  </TooltipWrapper>
                  <TooltipWrapper title="Export as PDF">
                    <button 
                      onClick={handleExportPDF}
                      className="btn-secondary group"
                    >
                      <FileText className="w-5 h-5 group-hover:text-red-600 transition-colors" />
                      Export PDF
                    </button>
                  </TooltipWrapper>
                  <TooltipWrapper title="Export as Word Document">
                    <button 
                      onClick={handleExportDOCX}
                      className="btn-secondary group"
                    >
                      <FileType className="w-5 h-5 group-hover:text-blue-600 transition-colors" />
                      Export DOCX
                    </button>
                  </TooltipWrapper>
                </div>
              </div>
            </footer>
            </div>
          </main>

          <Sidebar
            isOpen={store.isSidebarOpen}
            isCollapsed={store.isSidebarCollapsed}
            onToggleSidebar={store.toggleSidebar}
            onToggleCollapse={store.toggleSidebarCollapse}
            onManageTemplates={() => setIsGenericTemplateManagerOpen(true)}
            onManageLetterTemplates={() => setIsTemplateManagerOpen(true)}
            onManageLicense={() => setShowLicenseModal(true)}
            applicantData={store.applicantData}
            updateApplicantDataField={store.updateApplicantDataField}
            availableFiles={store.availableFiles}
            selectedDocuments={store.selectedDocuments}
            cloudConnections={store.cloudConnections}
            isLoading={store.isLoading}
            handleConnectService={handleConnectService}
            handleDisconnectService={handleDisconnectService}
            handleFetchFiles={handleFetchFiles}
            handleFileUpload={handleFileUpload}
            addDocumentToSelection={store.addDocumentToSelection}
            removeDocumentFromSelection={store.removeDocumentFromSelection}
            handleDeleteLocalFile={handleDeleteLocalFile}
            viewDocument={viewDocument}
            apiKey={store.apiKey}
            handleApiKeyChange={handleApiKeyChange}
            allTemplates={store.allTemplates}
            systemPrompt={store.systemPrompt}
            setSystemPrompt={store.setSystemPrompt}
            openAiKey={apiKeys.openai}
            anthropicKey={apiKeys.anthropic}
            geminiKey={apiKeys.gemini}
            genericSections={store.genericSections}
            onUpdateGenericSections={store.setGenericSections}
            onLoadDocumentTemplate={store.loadDocumentTemplate}
            currentLetterTemplate={store.currentLetterTemplateId}
            onChangeLetterTemplate={store.setCurrentLetterTemplate}
            documentTemplates={store.documentTemplates}
            addNotification={store.addNotification}
            chatSettings={store.chatSettings}
            updateChatSettings={store.updateChatSettings}
            onOpenSupportChat={() => setShowSupportChat(true)}
          />
        </div>
        
        <ChatWidget
          ref={chatWidgetRef}
          isEnabled={store.chatSettings.enabled}
          position={store.chatSettings.position}
        />
        
        <SupportChatbot
          isOpen={showSupportChat}
          onClose={() => setShowSupportChat(false)}
          apiKey={apiKeys[store.applicantData.llmProvider || 'openai'] || store.apiKey}
          llmProvider={store.applicantData.llmProvider || 'openai'}
          llmModel={store.applicantData.llmModel}
        />

        {showDocumentViewer && viewingDocument && (
          <DocumentViewerModal 
            document={viewingDocument} 
            onClose={() => setShowDocumentViewer(false)} 
          />
        )}
        
        <DocumentPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          sections={store.sections}
          applicantData={store.applicantData}
          onExportPDF={() => {
            setShowPreview(false);
            handleExportPDF();
          }}
          onExportDOCX={() => {
            setShowPreview(false);
            handleExportDOCX();
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
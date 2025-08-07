import React, { useState } from 'react';
import { BookUser, FolderOpen, Settings, PanelRightClose, PanelLeftClose, PanelLeftOpen, FileText, Layout, ChevronDown } from 'lucide-react';
import { DocumentPanel } from './DocumentPanel';
import { SettingsPanel } from './SettingsPanel';
import { DocumentDataPanel } from './DocumentDataPanel';
import { TooltipWrapper } from '../common';
import { 
  ApplicantData, 
  LocalFile, 
  CloudFile, 
  CloudConnections, 
  AvailableFiles, 
  LoadingState,
  Template,
  CustomField
} from '../../types';
import { GenericSection } from '../../types/generic';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed?: boolean;
  onToggleSidebar: () => void;
  onToggleCollapse?: () => void;
  applicantData: ApplicantData;
  updateApplicantDataField: (field: keyof ApplicantData, value: any) => void;
  availableFiles: AvailableFiles;
  selectedDocuments: (LocalFile | CloudFile)[];
  cloudConnections: CloudConnections;
  isLoading: LoadingState;
  handleConnectService: (service: string) => void;
  handleDisconnectService: (service: string) => void;
  handleFetchFiles: (service: string) => void;
  handleFileUpload: () => void;
  addDocumentToSelection: (doc: LocalFile | CloudFile) => void;
  removeDocumentFromSelection: (id: string) => void;
  handleDeleteLocalFile: (id: string) => void;
  viewDocument: (doc: LocalFile | CloudFile) => void;
  apiKey: string;
  handleApiKeyChange: (key: string, provider?: 'openai' | 'anthropic' | 'gemini') => void;
  allTemplates: Template[];
  onManageTemplates: () => void;
  onManageLetterTemplates?: () => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  onManageLicense?: () => void;
  genericSections: GenericSection[];
  onUpdateGenericSections: (sections: GenericSection[]) => void;
  onLoadDocumentTemplate: (templateId: string) => void;
  openAiKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  currentLetterTemplate?: string;
  onChangeLetterTemplate?: (templateId: string) => void;
  documentTemplates?: any[];
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  chatSettings: {
    enabled: boolean;
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    saveHistory: boolean;
    chatSystemPrompt: string;
  };
  updateChatSettings: (settings: Partial<SidebarProps['chatSettings']>) => void;
  onOpenSupportChat?: () => void;
}

type TabId = 'details' | 'docs' | 'settings';

interface TabButtonProps {
  id: TabId;
  label: string;
  icon: React.FC<{ className?: string }>;
  activeTab: TabId;
  onClick: (id: TabId) => void;
}

const TabButton: React.FC<TabButtonProps> = ({ id, label, icon: Icon, activeTab, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-semibold transition-colors border-b-2 ${
      activeTab === id 
        ? 'text-yellow-600 border-yellow-600' 
        : 'text-gray-600 border-transparent hover:bg-yellow-50 hover:text-yellow-700'
    }`}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const { isOpen, isCollapsed, onToggleSidebar, onToggleCollapse } = props;

  const getSidebarClass = () => {
    if (!isOpen) return 'sidebar sidebar-closed';
    if (isCollapsed) return 'sidebar sidebar-collapsed';
    return 'sidebar sidebar-open';
  };

  return (
    <aside className={getSidebarClass()}>
      <div className="flex flex-col h-full relative">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          {!isCollapsed && <h2 className="text-lg font-bold text-gray-800">Controls</h2>}
          <div className="flex items-center gap-2">
            {isOpen && onToggleCollapse && (
              <TooltipWrapper title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                <button 
                  onClick={onToggleCollapse} 
                  className="p-2 rounded-md hover:bg-yellow-50 text-gray-600 hover:text-yellow-700 transition-colors hidden lg:block"
                >
                  {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                </button>
              </TooltipWrapper>
            )}
            <button 
              onClick={onToggleSidebar} 
              className="p-2 rounded-md hover:bg-yellow-50 text-gray-600 hover:text-yellow-700 transition-colors lg:hidden"
            >
              <PanelRightClose className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className={`border-b border-gray-200 flex-shrink-0 ${isCollapsed ? 'border-b-0' : ''}`}>
          <nav className={`flex ${isCollapsed ? 'flex-col py-2' : ''}`}>
            {isCollapsed ? (
              <>
                <TooltipWrapper title="Details" position="right">
                  <button
                    onClick={() => {
                      setActiveTab('details');
                      onToggleCollapse && onToggleCollapse();
                    }}
                    className={`p-3 flex items-center justify-center transition-colors ${
                      activeTab === 'details' 
                        ? 'text-yellow-600 bg-yellow-50' 
                        : 'text-gray-600 hover:bg-yellow-50 hover:text-yellow-700'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </TooltipWrapper>
                <TooltipWrapper title="Documents" position="right">
                  <button
                    onClick={() => {
                      setActiveTab('docs');
                      onToggleCollapse && onToggleCollapse();
                    }}
                    className={`p-3 flex items-center justify-center transition-colors ${
                      activeTab === 'docs' 
                        ? 'text-yellow-600 bg-yellow-50' 
                        : 'text-gray-600 hover:bg-yellow-50 hover:text-yellow-700'
                    }`}
                  >
                    <FolderOpen className="w-5 h-5" />
                  </button>
                </TooltipWrapper>
                <TooltipWrapper title="Settings" position="right">
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      onToggleCollapse && onToggleCollapse();
                    }}
                    className={`p-3 flex items-center justify-center transition-colors ${
                      activeTab === 'settings' 
                        ? 'text-yellow-600 bg-yellow-50' 
                        : 'text-gray-600 hover:bg-yellow-50 hover:text-yellow-700'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </TooltipWrapper>
              </>
            ) : (
              <>
                <TabButton 
                  id="details" 
                  label="Details" 
                  icon={FileText} 
                  activeTab={activeTab}
                  onClick={setActiveTab}
                />
                <TabButton 
                  id="docs" 
                  label="Documents" 
                  icon={FolderOpen} 
                  activeTab={activeTab}
                  onClick={setActiveTab}
                />
                <TabButton 
                  id="settings" 
                  label="Settings" 
                  icon={Settings} 
                  activeTab={activeTab}
                  onClick={setActiveTab}
                />
              </>
            )}
          </nav>
        </div>

        <div className={`flex-grow overflow-y-auto ${isCollapsed ? 'hidden' : 'sidebar-content'} scrollbar-thin`}>
          {/* Page Template Selector */}
          {!isCollapsed && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Layout className="inline w-4 h-4 mr-1" />
                Page Template
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gold-500 flex items-center justify-between"
                >
                  <span className="text-sm">
                    {props.allTemplates.find(t => t.id === props.currentLetterTemplate)?.name || 'Select Template'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showTemplateDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {props.allTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          props.onChangeLetterTemplate?.(template.id);
                          setShowTemplateDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md ${
                          props.currentLetterTemplate === template.id ? 'bg-gold-50 text-gold-700' : ''
                        }`}
                      >
                        {template.name}
                        {!template.isCustom && <span className="text-xs text-gray-500 ml-2">(Default)</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className={`${isCollapsed ? '' : 'p-6 space-y-8'}`}>
          {activeTab === 'details' && (
            <DocumentDataPanel
              sections={props.genericSections}
              onUpdateSections={props.onUpdateGenericSections}
              onLoadTemplate={props.onLoadDocumentTemplate}
              onManageTemplates={props.onManageTemplates}
              documentTemplates={props.documentTemplates}
            />
          )}
          
          {activeTab === 'docs' && (
            <DocumentPanel
              availableFiles={props.availableFiles}
              selectedDocuments={props.selectedDocuments}
              cloudConnections={props.cloudConnections}
              isLoading={props.isLoading}
              handleConnectService={props.handleConnectService}
              handleDisconnectService={props.handleDisconnectService}
              handleFetchFiles={props.handleFetchFiles}
              handleFileUpload={props.handleFileUpload}
              addDocumentToSelection={props.addDocumentToSelection}
              removeDocumentFromSelection={props.removeDocumentFromSelection}
              handleDeleteLocalFile={props.handleDeleteLocalFile}
              viewDocument={props.viewDocument}
            />
          )}
          
          {activeTab === 'settings' && (
            <SettingsPanel
              apiKey={props.apiKey}
              handleApiKeyChange={props.handleApiKeyChange}
              applicantData={props.applicantData}
              updateApplicantDataField={props.updateApplicantDataField}
              systemPrompt={props.systemPrompt}
              setSystemPrompt={props.setSystemPrompt}
              onManageLicense={props.onManageLicense}
              onManageLetterTemplates={props.onManageLetterTemplates}
              openAiKey={props.openAiKey}
              anthropicKey={props.anthropicKey}
              geminiKey={props.geminiKey}
              addNotification={props.addNotification}
              chatSettings={props.chatSettings}
              updateChatSettings={props.updateChatSettings}
              onOpenSupportChat={props.onOpenSupportChat}
            />
          )}
          </div>
        </div>
      </div>
    </aside>
  );
};
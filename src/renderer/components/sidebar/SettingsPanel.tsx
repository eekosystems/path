import React, { useState } from 'react';
import { KeyRound, Brain, Edit3, Save, X, Shield, FileText, Sparkles, MessageCircle } from 'lucide-react';
import { FormSection, FormInput, FormSelect } from '../common';
import { ApplicantData, AI_PROVIDERS } from '../../types';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_CHAT_SYSTEM_PROMPT } from '../../constants';

interface SettingsPanelProps {
  apiKey: string;
  handleApiKeyChange: (key: string, provider?: 'openai' | 'anthropic' | 'gemini') => void;
  applicantData: ApplicantData;
  updateApplicantDataField: (field: keyof ApplicantData, value: any) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  onManageLicense?: () => void;
  onManageLetterTemplates?: () => void;
  openAiKey?: string;
  anthropicKey?: string;
  geminiKey?: string;
  addNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  chatSettings: {
    enabled: boolean;
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    saveHistory: boolean;
    chatSystemPrompt: string;
  };
  updateChatSettings: (settings: Partial<SettingsPanelProps['chatSettings']>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  apiKey,
  handleApiKeyChange,
  applicantData,
  updateApplicantDataField,
  systemPrompt,
  setSystemPrompt,
  onManageLicense,
  onManageLetterTemplates,
  openAiKey,
  anthropicKey,
  geminiKey,
  addNotification,
  chatSettings,
  updateChatSettings
}) => {
  
  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  
  // Chat system prompt editing state
  const [isEditingChatPrompt, setIsEditingChatPrompt] = useState(false);
  const [tempChatPrompt, setTempChatPrompt] = useState(chatSettings.chatSystemPrompt);
  
  // Prompt generation state
  const [showPromptGenerator, setShowPromptGenerator] = useState<'main' | 'chat' | null>(null);
  const [promptGeneratorInput, setPromptGeneratorInput] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);

  const generatePrompt = async () => {
    if (!promptGeneratorInput.trim()) return;
    
    setIsGeneratingPrompt(true);
    try {
      const isMainPrompt = showPromptGenerator === 'main';
      const promptRequest = isMainPrompt
        ? `Generate a system prompt that defines an AI assistant specialized in drafting ${promptGeneratorInput}. The prompt should establish the assistant's role, expertise, and behavior when generating professional content.`
        : `Generate a system prompt that defines a chat assistant specialized in helping users with ${promptGeneratorInput}. The prompt should establish the assistant's role, expertise, and conversational behavior.`;

      const response = await window.electronAPI.generateContent({
        prompt: promptRequest,
        systemPrompt: `You are an expert at creating effective AI system prompts. Generate a clear, detailed system prompt based on the user's requirements. 

IMPORTANT: 
- Start by defining what the AI assistant IS (e.g., "You are a professional [type] drafting assistant...")
- Do NOT include any self-referential statements like "As an AI developed by..." or "I am a language model..."
- Write in second-person addressing the AI (e.g., "You are...", "Your role is to...")
- Structure the prompt with clear sections like "IMPORTANT INSTRUCTIONS:", "OUTPUT REQUIREMENTS:", etc.
- Focus on establishing the assistant's expertise, role, and behavioral guidelines
- Include specific guidelines for accuracy, citation, and professional standards
- Make it clear this is an AI assistant helping users, not instructions for humans

Respond with ONLY the system prompt text, no explanations or meta-commentary.`,
        applicantData: {
          beneficiaryName: 'N/A',
          beneficiaryNationality: 'N/A',
          currentLocation: 'N/A',
          petitionerName: 'N/A',
          petitionerType: 'company',
          petitionerState: 'N/A',
          petitionerAddress: 'N/A',
          visaType: 'N/A',
          industry: 'N/A',
          complexity: 'standard',
          priorityDate: '',
          filingDate: '',
          caseNumber: '',
          attorneyName: '',
          additionalInfo: '',
          llmProvider: applicantData.llmProvider || 'openai',
          llmModel: applicantData.llmModel,
          customFields: []
        },
        section: { 
          id: Date.now(), 
          title: 'Prompt Generation', 
          prompt: promptRequest, 
          content: '',
          documents: []
        },
        selectedDocuments: [],
        llmModel: applicantData.llmModel
      });

      if (response.success && response.content) {
        if (isMainPrompt) {
          setTempSystemPrompt(response.content);
          setIsEditingSystemPrompt(true);
        } else {
          setTempChatPrompt(response.content);
          setIsEditingChatPrompt(true);
        }
        setShowPromptGenerator(null);
        setPromptGeneratorInput('');
        addNotification('Prompt generated successfully!', 'success');
      } else {
        throw new Error(response.error || 'Failed to generate prompt');
      }
    } catch (error) {
      console.error('Prompt generation error:', error);
      addNotification('Failed to generate prompt. Please try again.', 'error');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };


  return (
    <div className="space-y-6">
      <FormSection title="API & Model" icon={KeyRound} collapsible defaultExpanded={false}>
        <FormSelect
          label="AI Provider"
          value={applicantData.llmProvider || 'openai'}
          onChange={(e) => {
            const provider = e.target.value as 'openai' | 'anthropic' | 'gemini';
            updateApplicantDataField('llmProvider', provider);
            // Update model to first model of selected provider
            const firstModel = AI_PROVIDERS[provider].models[0].id;
            updateApplicantDataField('llmModel', firstModel);
          }}
        >
          {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
            <option key={key} value={key}>{provider.name}</option>
          ))}
        </FormSelect>
        
        <FormSelect
          label="Model"
          value={applicantData.llmModel}
          onChange={(e) => updateApplicantDataField('llmModel', e.target.value)}
        >
          {AI_PROVIDERS[applicantData.llmProvider || 'openai'].models.map(model => (
            <option key={model.id} value={model.id}>{model.name}</option>
          ))}
        </FormSelect>
        
        {applicantData.llmProvider === 'openai' && (
          <FormInput
            label="OpenAI API Key"
            type="password"
            placeholder="sk-..."
            value={openAiKey || apiKey || ''}
            onChange={(e) => handleApiKeyChange(e.target.value, 'openai')}
          />
        )}
        
        {applicantData.llmProvider === 'anthropic' && (
          <FormInput
            label="Anthropic API Key"
            type="password"
            placeholder="sk-ant-..."
            value={anthropicKey || ''}
            onChange={(e) => handleApiKeyChange(e.target.value, 'anthropic')}
          />
        )}
        
        {applicantData.llmProvider === 'gemini' && (
          <FormInput
            label="Gemini API Key"
            type="password"
            placeholder="Your Gemini API key..."
            value={geminiKey || ''}
            onChange={(e) => handleApiKeyChange(e.target.value, 'gemini')}
          />
        )}
      </FormSection>
      
      <FormSection title="AI System Prompt" icon={Brain} collapsible defaultExpanded={false}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Customize the AI's behavior and instructions
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPromptGenerator('main');
                  setPromptGeneratorInput('');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded transition"
              >
                <Sparkles className="w-3 h-3" /> Generate
              </button>
              {!isEditingSystemPrompt ? (
                <button
                  onClick={() => {
                    setIsEditingSystemPrompt(true);
                    setTempSystemPrompt(systemPrompt);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gold-600 hover:text-gold-700 bg-gold-50 hover:bg-gold-100 rounded transition"
                >
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSystemPrompt(tempSystemPrompt);
                    setIsEditingSystemPrompt(false);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 rounded transition"
                >
                  <Save className="w-3 h-3" /> Save
                </button>
                <button
                  onClick={() => {
                    setTempSystemPrompt(systemPrompt);
                    setIsEditingSystemPrompt(false);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
              )}
            </div>
          </div>
          
          {isEditingSystemPrompt ? (
            <textarea
              value={tempSystemPrompt}
              onChange={(e) => setTempSystemPrompt(e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-vertical"
              rows={10}
              placeholder="Enter system prompt..."
            />
          ) : (
            <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                {systemPrompt}
              </pre>
            </div>
          )}
          
          {isEditingSystemPrompt && (
            <button
              onClick={() => {
                setTempSystemPrompt(DEFAULT_SYSTEM_PROMPT);
              }}
              className="w-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition"
            >
              Reset to Default
            </button>
          )}
        </div>
      </FormSection>
      
      {onManageLetterTemplates && (
        <FormSection title="Letter Templates" icon={FileText} collapsible defaultExpanded={false}>
          <button
            onClick={onManageLetterTemplates}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gold-600 text-white rounded-md text-sm font-semibold hover:bg-gold-700 transition"
          >
            <FileText className="w-4 h-4" /> Manage Letter Templates
          </button>
        </FormSection>
      )}
      
      <FormSection title="AI Chat Assistant" icon={MessageCircle} collapsible defaultExpanded={false}>
        <div className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chatSettings.enabled}
                onChange={(e) => updateChatSettings({ enabled: e.target.checked })}
                className="rounded border-gray-300 text-gold-600 focus:ring-gold-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable Chat Assistant</span>
            </label>
            
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chatSettings.saveHistory}
                onChange={(e) => updateChatSettings({ saveHistory: e.target.checked })}
                disabled={!chatSettings.enabled}
                className="rounded border-gray-300 text-gold-600 focus:ring-gold-500 disabled:opacity-50"
              />
              <span className="text-sm font-medium text-gray-700">Save chat history</span>
            </label>
          </div>
          
          <FormSelect
            label="Chat position"
            value={chatSettings.position}
            onChange={(e) => updateChatSettings({ position: e.target.value as any })}
            disabled={!chatSettings.enabled}
          >
            <option value="bottom-right">Bottom Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="top-right">Top Right</option>
            <option value="top-left">Top Left</option>
          </FormSelect>
          
          
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <p className="font-medium mb-1">Keyboard shortcut:</p>
            <p>Press <kbd className="px-1 py-0.5 bg-white border rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-white border rounded text-xs">/</kbd> to toggle chat</p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Chat System Prompt
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPromptGenerator('chat');
                    setPromptGeneratorInput('');
                  }}
                  disabled={!chatSettings.enabled}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3 h-3" /> Generate
                </button>
                {!isEditingChatPrompt ? (
                  <button
                    onClick={() => {
                      setIsEditingChatPrompt(true);
                      setTempChatPrompt(chatSettings.chatSystemPrompt);
                    }}
                    disabled={!chatSettings.enabled}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gold-600 hover:text-gold-700 bg-gold-50 hover:bg-gold-100 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      updateChatSettings({ chatSystemPrompt: tempChatPrompt });
                      setIsEditingChatPrompt(false);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 rounded transition"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                  <button
                    onClick={() => {
                      setTempChatPrompt(chatSettings.chatSystemPrompt);
                      setIsEditingChatPrompt(false);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray-600">
              Customize how the AI assistant responds to help with your specific document type
            </p>
            
            {isEditingChatPrompt ? (
              <textarea
                value={tempChatPrompt}
                onChange={(e) => setTempChatPrompt(e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-vertical"
                rows={6}
                placeholder="Enter chat system prompt..."
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                  {chatSettings.chatSystemPrompt}
                </pre>
              </div>
            )}
            
            {isEditingChatPrompt && (
              <button
                onClick={() => {
                  setTempChatPrompt(DEFAULT_CHAT_SYSTEM_PROMPT);
                }}
                className="w-full px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition"
              >
                Reset to Default
              </button>
            )}
          </div>
        </div>
      </FormSection>
      
      {onManageLicense && (
        <FormSection title="License" icon={Shield} collapsible defaultExpanded={false}>
          <button
            onClick={onManageLicense}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 transition"
          >
            <Shield className="w-4 h-4" /> Manage License
          </button>
        </FormSection>
      )}
      
      {/* Prompt Generator Modal */}
      {showPromptGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Generate {showPromptGenerator === 'main' ? 'System' : 'Chat'} Prompt
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {showPromptGenerator === 'main' 
                ? 'What type of document do you want to create?'
                : 'What kind of assistance do you want the chat to provide?'}
            </p>
            <input
              type="text"
              value={promptGeneratorInput}
              onChange={(e) => setPromptGeneratorInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isGeneratingPrompt) {
                  generatePrompt();
                }
              }}
              placeholder={showPromptGenerator === 'main' 
                ? 'e.g., employment contracts, rental agreements, business proposals'
                : 'e.g., help improve legal documents, explain contract terms'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowPromptGenerator(null);
                  setPromptGeneratorInput('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              >
                Cancel
              </button>
              <button
                onClick={generatePrompt}
                disabled={!promptGeneratorInput.trim() || isGeneratingPrompt}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGeneratingPrompt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
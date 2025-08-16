import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, Send, Loader2, Sparkles, FileText, Lightbulb, CheckCircle, RotateCcw } from 'lucide-react';
import { useStore } from '../store';
import { TooltipWrapper } from './common';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    sectionTitle?: string;
    sectionId?: number;
  };
}

interface ChatWidgetProps {
  isEnabled: boolean;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export interface ChatWidgetRef {
  loadSection: (section: { id: number; title: string; content: string }, mode?: 'planning' | 'content') => void;
}

const sizeClasses = {
  small: 'w-96 h-[500px]',
  medium: 'w-[500px] h-[600px]',
  large: 'w-[600px] h-[700px]'
};

const positionClasses = {
  'bottom-right': 'bottom-[49px] right-[34px]',
  'bottom-left': 'bottom-[49px] left-[34px]',
  'top-right': 'top-20 right-[34px]',
  'top-left': 'top-20 left-[34px]'
};

export const ChatWidget = forwardRef<ChatWidgetRef, ChatWidgetProps>(({
  isEnabled,
  position = 'bottom-right'
}, ref) => {
  const store = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('small');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const [currentSectionContext, setCurrentSectionContext] = useState<{ id: number; title: string; content: string; mode: 'planning' | 'content' } | null>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    loadSection: (section: { id: number; title: string; content: string }, mode: 'planning' | 'content' = 'planning') => {
      // Open chat if not already open
      setIsOpen(true);
      
      // Store the section context with mode
      setCurrentSectionContext({ ...section, mode });
      
      // Add a system message based on mode
      const message = mode === 'planning' 
        ? `I'm ready to help you plan the "${section.title}" section. What would you like to include in this section? I can help you brainstorm ideas, structure your prompt, or suggest what information to cover.`
        : `I'm now analyzing the content from the "${section.title}" section. I can help you improve it, check for completeness, or suggest enhancements.`;
      
      const systemMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: message,
        timestamp: new Date(),
        context: {
          sectionTitle: section.title,
          sectionId: section.id
        }
      };
      
      setMessages(prev => [...prev, systemMessage]);
      
      // Ensure the new message is visible by scrolling to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 100);
    }
  }), []);

  // Load saved state
  useEffect(() => {
    const savedState = localStorage.getItem('chatWidgetState');
    if (savedState) {
      const { isOpen: savedIsOpen, messages: savedMessages, size: savedSize } = JSON.parse(savedState);
      setMessages(savedMessages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      setSize(savedSize || 'small');
      setIsOpen(savedIsOpen);
    }
  }, []);

  // Save state changes
  useEffect(() => {
    localStorage.setItem('chatWidgetState', JSON.stringify({ isOpen, messages, size }));
  }, [isOpen, messages, size]);

  // Smart scroll - only auto-scroll if user is near the bottom
  useEffect(() => {
    const messagesContainer = messagesEndRef.current?.parentElement;
    if (!messagesContainer) return;
    
    // Check if user is near the bottom (within 100px)
    const isNearBottom = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100;
    
    // Only auto-scroll if user is already near the bottom or if it's a user message
    const lastMessage = messages[messages.length - 1];
    if (isNearBottom || (lastMessage && lastMessage.role === 'user')) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(!isOpen);
        if (!isOpen) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  if (!isEnabled) return null;


  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Check if electronAPI is available
      if (!window.electronAPI) {
        throw new Error('Chat is only available in the desktop app');
      }

      // Build context for AI using the customizable chat system prompt
      let systemContext = store.chatSettings.chatSystemPrompt || "You are a helpful AI assistant for document preparation. ";
      
      // Include section context if available
      let fullPrompt = userMessage.content;
      if (currentSectionContext) {
        if (currentSectionContext.mode === 'planning') {
          systemContext += `\n\nThe user is planning the "${currentSectionContext.title}" section. Help them brainstorm ideas, structure their prompt, and decide what to include. Focus on planning and preparation, not analyzing existing content.`;
          fullPrompt = `I'm planning the "${currentSectionContext.title}" section. ${userMessage.content}`;
        } else {
          systemContext += `\n\nThe user has generated content for the "${currentSectionContext.title}" section and wants to analyze/improve it.`;
          fullPrompt = `Context - Section: ${currentSectionContext.title}\nGenerated Content:\n${currentSectionContext.content}\n\nUser question: ${userMessage.content}`;
        }
      }

      console.log('Sending chat request with:', {
        prompt: fullPrompt,
        systemPrompt: systemContext,
        llmModel: store.applicantData.llmModel,
        provider: store.applicantData.llmProvider,
        beneficiaryName: store.applicantData.beneficiaryName,
        petitionerName: store.applicantData.petitionerName,
        beneficiaryNationality: store.applicantData.beneficiaryNationality,
        fullApplicantData: store.applicantData
      });

      const response = await window.electronAPI.generateContent({
        prompt: fullPrompt,
        systemPrompt: systemContext,
        applicantData: store.applicantData,
        section: { 
          id: Date.now(), // Add required id field
          title: 'Chat', 
          prompt: fullPrompt, 
          content: '',
          documents: [] // Add required documents field
        },
        selectedDocuments: [],
        llmModel: store.applicantData.llmModel
      });

      if (response.success && response.content) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || 'Failed to generate response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide more helpful error messages
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('Missing API key')) {
        const provider = store.applicantData.llmProvider || 'openai';
        userFriendlyMessage = `Please set your ${provider.charAt(0).toUpperCase() + provider.slice(1)} API key in Settings to use the chat assistant.`;
      } else if (errorMessage.includes('Case Details')) {
        userFriendlyMessage = 'Please fill in the Case Details (Beneficiary Name, Nationality, and Petitioner Name) before using the chat assistant.';
      }
      
      // Add error message to chat
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: userFriendlyMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      
      store.addNotification(userFriendlyMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    let prompt = '';
    
    switch (action) {
      case 'improve':
        prompt = currentSectionContext 
          ? `Please improve the writing in this section. Make it more professional and compelling.`
          : 'Please help me improve my current writing.';
        break;
      case 'ideas':
        prompt = currentSectionContext
          ? `What key points should I include in this section? Give me some ideas.`
          : 'I need ideas for my document. What should I focus on?';
        break;
      case 'explain':
        prompt = currentSectionContext
          ? 'Can you explain the terms and requirements for this section?'
          : 'Can you explain common document terms and requirements?';
        break;
      case 'check':
        prompt = currentSectionContext
          ? `Please review this section and check if it meets the requirements.`
          : 'What are the key requirements I should ensure my document meets?';
        break;
    }
    
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
      store.addNotification('Chat history cleared', 'info');
    }
  };

  return (
    <>
      {/* Chat bubble */}
      {!isOpen && (
        <TooltipWrapper title="AI Assistant (Ctrl+/)">
          <button
            onClick={() => {
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 100);
            }}
            className={`fixed ${positionClasses[position]} z-50 w-14 h-14 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center group`}
          >
            <MessageCircle className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </button>
        </TooltipWrapper>
      )}

      {/* Chat window */}
      {isOpen && (
        <div ref={chatWindowRef} className={`fixed ${positionClasses[position]} ${sizeClasses[size]} bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 animate-slideIn`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gold-500 to-gold-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                {currentSectionContext && (
                  <p className="text-xs text-gold-100 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {currentSectionContext.title} ({currentSectionContext.mode === 'planning' ? 'Planning' : 'Analyzing'})
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentSectionContext && (
                <TooltipWrapper title="Clear section context">
                  <button
                    onClick={() => {
                      setCurrentSectionContext(null);
                      const msg: Message = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: 'Section context cleared. I\'m now in general document assistance mode.',
                        timestamp: new Date()
                      };
                      setMessages(prev => [...prev, msg]);
                    }}
                    className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </TooltipWrapper>
              )}
              <TooltipWrapper title="Clear chat">
                <button
                  onClick={clearChat}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </TooltipWrapper>
              <TooltipWrapper title={size === 'small' ? 'Expand' : 'Shrink'}>
                <button
                  onClick={() => setSize(size === 'small' ? 'medium' : size === 'medium' ? 'large' : 'small')}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                >
                  {size === 'large' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </TooltipWrapper>
              <TooltipWrapper title="Minimize">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </TooltipWrapper>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Hi! I'm your AI assistant. Ask me anything about immigration documents or get help with your current section.</p>
                <p className="text-xs mt-2 text-gray-400">Press Ctrl+/ to toggle this chat</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  {message.context && message.role === 'user' && (
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {message.context.sectionTitle}
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-gold-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions */}
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-wrap">
            <button
              onClick={() => handleQuickAction('improve')}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Improve
            </button>
            <button
              onClick={() => handleQuickAction('ideas')}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1"
            >
              <Lightbulb className="w-3 h-3" /> Ideas
            </button>
            <button
              onClick={() => handleQuickAction('explain')}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1"
            >
              <FileText className="w-3 h-3" /> Explain
            </button>
            <button
              onClick={() => handleQuickAction('check')}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1"
            >
              <CheckCircle className="w-3 h-3" /> Check
            </button>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className="px-3 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 self-end"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
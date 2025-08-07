import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  HelpCircle,
  Book,
  Zap,
  AlertCircle,
  ChevronDown,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface SupportChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  llmProvider: 'openai' | 'anthropic' | 'gemini';
  llmModel: string;
}

const QUICK_ACTIONS = [
  { icon: Book, label: "Getting Started", query: "How do I get started with DocWriter?" },
  { icon: Zap, label: "API Setup", query: "How do I set up my API key?" },
  { icon: AlertCircle, label: "Troubleshooting", query: "My document generation is not working" },
  { icon: HelpCircle, label: "Features", query: "What features does DocWriter have?" },
];

const INITIAL_MESSAGE: Message = {
  id: 'initial',
  role: 'assistant',
  content: "👋 Hi! I'm your DocWriter Support Assistant. I can help you with:\n\n• Setting up and using DocWriter\n• Troubleshooting issues\n• Understanding features\n• Best practices for document generation\n\nHow can I help you today?",
  timestamp: new Date(),
  suggestions: [
    "How do I generate a document?",
    "How do I connect cloud storage?",
    "What AI models are supported?",
    "How do I use templates?"
  ]
};

export const SupportChatbot: React.FC<SupportChatbotProps> = ({
  isOpen,
  onClose,
  apiKey,
  llmProvider,
  llmModel
}) => {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the support chatbot API
      const response = await window.electronAPI.supportChat({
        message: textToSend,
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        llmProvider,
        llmModel
      });

      if (response.success && response.content) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(),
          suggestions: response.suggestions
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Support chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again or contact support directly at support@eeko.systems',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80' : 'w-96'
    }`}>
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col" 
           style={{ height: isMinimized ? '60px' : '600px', maxHeight: '80vh' }}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gold-600 to-gold-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">DocWriter Support</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/20 rounded transition"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Quick Actions */}
            {messages.length === 1 && (
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Quick Actions:</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleSend(action.query)}
                      className="flex items-center gap-2 p-2 text-xs bg-white hover:bg-gold-50 border border-gray-200 hover:border-gold-300 rounded transition"
                    >
                      <action.icon className="w-3 h-3 text-gold-600" />
                      <span className="text-left">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-gold-600 text-white'
                        : message.role === 'system'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    
                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs opacity-75 mb-2">Suggested questions:</p>
                        <div className="space-y-1">
                          {message.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSend(suggestion)}
                              className="block w-full text-left text-xs p-2 bg-white/20 hover:bg-white/30 rounded transition"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="text-xs opacity-75 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-3">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-none"
                  rows={2}
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="px-3 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
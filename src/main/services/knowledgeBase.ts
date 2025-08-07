// Knowledge base for the DocWriter application support chatbot
export const DOCWRITER_KNOWLEDGE_BASE = {
  appInfo: {
    name: "DocWriter",
    version: "1.0.1",
    description: "AI-powered document generator for immigration attorneys",
    developer: "Eeko Systems",
    supportEmail: "support@eeko.systems"
  },
  
  features: {
    aiGeneration: {
      title: "AI Document Generation",
      description: "Generate professional immigration letters using AI",
      details: [
        "Supports OpenAI GPT, Anthropic Claude, and Google Gemini models",
        "Custom prompts for each section",
        "Context-aware generation using uploaded documents",
        "Multiple model selection options",
        "Regenerate individual sections"
      ],
      howTo: [
        "1. Enter case details in the sidebar",
        "2. Add sections using the '+' button",
        "3. Upload relevant documents for context",
        "4. Click 'Generate' on each section",
        "5. Edit and refine the generated content"
      ]
    },
    
    documentManagement: {
      title: "Document Management",
      description: "Manage local and cloud documents",
      details: [
        "Upload PDF, DOCX, TXT, and MD files",
        "Connect to Google Drive, Dropbox, and OneDrive",
        "Attach documents to specific sections",
        "Preview documents before generation"
      ],
      howTo: [
        "Local files: Click 'Upload Local Files' button",
        "Cloud storage: Click cloud provider button and authenticate",
        "Attach to section: Select documents in the section card",
        "Preview: Click the eye icon on any document"
      ]
    },
    
    templates: {
      title: "Letter Templates",
      description: "Pre-built and custom templates",
      details: [
        "H-1B Specialty Occupation templates",
        "Green Card/PERM templates",
        "Custom template creation",
        "Generic document templates",
        "Section management within templates"
      ],
      howTo: [
        "Access templates: Click 'Letter Templates' button",
        "Create custom: Click '+' in template manager",
        "Apply template: Select and click 'Apply'",
        "Edit template: Modify sections and save"
      ]
    },
    
    export: {
      title: "Export Options",
      description: "Export documents in multiple formats",
      details: [
        "PDF export with formatting",
        "DOCX (Word) export",
        "Preview before export",
        "Include case details in export"
      ],
      howTo: [
        "1. Complete all sections",
        "2. Click 'Export' button in header",
        "3. Choose format (PDF or DOCX)",
        "4. Select location to save"
      ]
    },
    
    chatAssistant: {
      title: "AI Chat Assistant",
      description: "Interactive AI assistant for help",
      details: [
        "Context-aware responses",
        "Document improvement suggestions",
        "Legal writing assistance",
        "Keyboard shortcut: Ctrl+/"
      ],
      howTo: [
        "Enable in Settings > AI Chat Assistant",
        "Click chat bubble or press Ctrl+/",
        "Ask questions about your document",
        "Get suggestions for improvements"
      ]
    }
  },
  
  commonIssues: {
    apiKey: {
      problem: "API key not working",
      solutions: [
        "Verify key starts with correct prefix (sk- for OpenAI, sk-ant- for Anthropic)",
        "Check for extra spaces or characters",
        "Ensure key hasn't expired",
        "Try generating a new key from provider",
        "Select correct AI provider in settings"
      ]
    },
    
    generation: {
      problem: "Content generation fails",
      solutions: [
        "Check API key is entered correctly",
        "Verify internet connection",
        "Try a different AI model",
        "Reduce document size if too large",
        "Check rate limits haven't been exceeded"
      ]
    },
    
    cloudStorage: {
      problem: "Can't connect to cloud storage",
      solutions: [
        "Re-authenticate with cloud provider",
        "Check browser allows popups for OAuth",
        "Verify cloud account has proper permissions",
        "Try disconnecting and reconnecting",
        "Check internet connectivity"
      ]
    },
    
    export: {
      problem: "Export not working",
      solutions: [
        "Ensure all sections have content",
        "Check disk space availability",
        "Try different export format",
        "Close other applications using the file",
        "Verify write permissions for save location"
      ]
    },
    
    performance: {
      problem: "Application running slowly",
      solutions: [
        "Close unused sections",
        "Reduce number of attached documents",
        "Clear browser cache (if web version)",
        "Restart the application",
        "Check system resources"
      ]
    }
  },
  
  shortcuts: {
    keyboard: [
      { key: "Ctrl+B", action: "Toggle sidebar" },
      { key: "Ctrl+/", action: "Toggle chat assistant" },
      { key: "Ctrl+S", action: "Save current work" },
      { key: "Ctrl+Z", action: "Undo last change" },
      { key: "Ctrl+Y", action: "Redo last change" },
      { key: "Escape", action: "Close modal/sidebar" }
    ]
  },
  
  gettingStarted: {
    steps: [
      {
        step: 1,
        title: "Set up API key",
        description: "Go to Settings and enter your AI provider API key"
      },
      {
        step: 2,
        title: "Enter case details",
        description: "Fill in applicant and case information in the sidebar"
      },
      {
        step: 3,
        title: "Choose or create template",
        description: "Select a pre-built template or create custom sections"
      },
      {
        step: 4,
        title: "Upload supporting documents",
        description: "Add relevant documents for context"
      },
      {
        step: 5,
        title: "Generate content",
        description: "Click generate on each section to create content"
      },
      {
        step: 6,
        title: "Review and edit",
        description: "Edit generated content as needed"
      },
      {
        step: 7,
        title: "Export document",
        description: "Export as PDF or DOCX when complete"
      }
    ]
  },
  
  licensing: {
    info: "DocWriter requires a valid license for full functionality",
    features: [
      "Unlimited document generation",
      "All AI provider access",
      "Cloud storage integration",
      "Priority support",
      "Regular updates"
    ],
    activation: "Enter license key in the license modal on first launch"
  },
  
  security: {
    features: [
      "Encrypted API key storage",
      "Secure cloud authentication",
      "Sandboxed application environment",
      "No data sent to third parties except AI providers",
      "Local data encryption"
    ]
  }
};

// Function to search knowledge base
export function searchKnowledgeBase(query: string): any[] {
  const results: any[] = [];
  const searchTerms = query.toLowerCase().split(' ');
  
  // Helper function to search object recursively
  function searchObject(obj: any, path: string = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase();
        if (searchTerms.some(term => lowerValue.includes(term))) {
          results.push({
            path: currentPath,
            content: value,
            relevance: searchTerms.filter(term => lowerValue.includes(term)).length
          });
        }
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'string') {
            const lowerItem = item.toLowerCase();
            if (searchTerms.some(term => lowerItem.includes(term))) {
              results.push({
                path: `${currentPath}[${index}]`,
                content: item,
                relevance: searchTerms.filter(term => lowerItem.includes(term)).length
              });
            }
          } else if (typeof item === 'object') {
            searchObject(item, `${currentPath}[${index}]`);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        searchObject(value, currentPath);
      }
    }
  }
  
  searchObject(DOCWRITER_KNOWLEDGE_BASE);
  
  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);
  
  return results.slice(0, 10); // Return top 10 results
}

// Context builder for AI responses
export function buildSupportContext(query: string): string {
  const searchResults = searchKnowledgeBase(query);
  
  let context = `You are the DocWriter Support Assistant, an AI helper for the DocWriter application - an AI-powered document generator for immigration attorneys.

Application Overview:
${DOCWRITER_KNOWLEDGE_BASE.appInfo.description}
Version: ${DOCWRITER_KNOWLEDGE_BASE.appInfo.version}
Developer: ${DOCWRITER_KNOWLEDGE_BASE.appInfo.developer}

Key Features:
`;

  // Add relevant features based on query
  const features = Object.values(DOCWRITER_KNOWLEDGE_BASE.features);
  features.forEach(feature => {
    context += `\n- ${feature.title}: ${feature.description}`;
  });

  // Add relevant search results
  if (searchResults.length > 0) {
    context += '\n\nRelevant Information Based on Query:';
    searchResults.slice(0, 5).forEach(result => {
      context += `\n- ${result.content}`;
    });
  }

  // Add common issues if query seems to be about problems
  const problemKeywords = ['not working', 'error', 'fail', 'issue', 'problem', 'cant', "can't", 'unable'];
  if (problemKeywords.some(keyword => query.toLowerCase().includes(keyword))) {
    context += '\n\nCommon Issues and Solutions:';
    Object.values(DOCWRITER_KNOWLEDGE_BASE.commonIssues).forEach(issue => {
      context += `\n${issue.problem}:`;
      issue.solutions.forEach(solution => {
        context += `\n  - ${solution}`;
      });
    });
  }

  return context;
}
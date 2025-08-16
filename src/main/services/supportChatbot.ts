import { OpenAI } from 'openai';
import log from '../log';
import { buildSupportContext, searchKnowledgeBase, DOCWRITER_KNOWLEDGE_BASE } from './knowledgeBase';
import { anthropicApiService } from './anthropicApi';
import { geminiApiService } from './geminiApi';

export interface SupportChatRequest {
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  llmProvider: 'openai' | 'anthropic' | 'gemini';
  llmModel: string;
}

export interface SupportChatResponse {
  success: boolean;
  content?: string;
  suggestions?: string[];
  error?: string;
}

class SupportChatbotService {
  private readonly SUPPORT_SYSTEM_PROMPT = `You are the DocWriter Support Assistant, a helpful and knowledgeable AI assistant specifically trained to help users with the DocWriter application.

IMPORTANT INSTRUCTIONS:
- You have extensive knowledge about DocWriter, an AI-powered document generator for immigration attorneys
- Be friendly, professional, and concise in your responses
- Focus on solving the user's specific problem or answering their question
- Provide step-by-step instructions when appropriate
- If you don't know something specific about DocWriter, say so and suggest contacting support@eeko.systems
- Always be accurate about DocWriter's features and capabilities
- Use the provided context to give accurate, helpful responses

RESPONSE GUIDELINES:
- Keep responses concise but complete
- Use bullet points or numbered lists for clarity
- Include specific menu paths or button names when giving instructions
- Suggest related features or tips when relevant
- Be empathetic if the user is experiencing issues

NEVER:
- Make up features that don't exist
- Provide legal advice
- Share sensitive information
- Recommend unofficial workarounds that could compromise security`;

  async generateResponse(
    request: SupportChatRequest,
    apiKey: string
  ): Promise<SupportChatResponse> {
    try {
      // Build context from knowledge base
      const context = buildSupportContext(request.message);
      
      // Prepare conversation history
      const messages: any[] = [
        {
          role: 'system',
          content: `${this.SUPPORT_SYSTEM_PROMPT}\n\nCONTEXT ABOUT DOCWRITER:\n${context}`
        }
      ];

      // Add conversation history if provided
      if (request.conversationHistory && request.conversationHistory.length > 0) {
        // Limit history to last 10 messages to avoid token limits
        const recentHistory = request.conversationHistory.slice(-10);
        messages.push(...recentHistory.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })));
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: request.message
      });

      let responseContent = '';
      
      // Generate response based on provider
      switch (request.llmProvider) {
        case 'anthropic': {
          const response = await anthropicApiService.generateContent(
            apiKey,
            request.llmModel,
            messages,
            1000
          );
          responseContent = response;
          break;
        }
        
        case 'gemini': {
          const response = await geminiApiService.generateContent(
            apiKey,
            request.llmModel,
            messages,
            1000
          );
          responseContent = response;
          break;
        }
        
        case 'openai':
        default: {
          const openai = new OpenAI({ apiKey });
          const completion = await openai.chat.completions.create({
            model: request.llmModel || 'gpt-4',
            messages,
            max_tokens: 1000,
            temperature: 0.7
          });
          
          responseContent = completion.choices[0]?.message?.content || '';
          break;
        }
      }

      if (!responseContent) {
        throw new Error('No response generated');
      }

      // Generate contextual suggestions based on the user's question
      const suggestions = this.generateSuggestions(request.message, responseContent);

      return {
        success: true,
        content: responseContent,
        suggestions
      };
      
    } catch (error) {
      log.error('Support chatbot error:', error);
      
      // Provide fallback response with knowledge base search
      const searchResults = searchKnowledgeBase(request.message);
      
      if (searchResults.length > 0) {
        const fallbackContent = this.generateFallbackResponse(request.message, searchResults);
        return {
          success: true,
          content: fallbackContent,
          suggestions: this.getDefaultSuggestions(request.message)
        };
      }
      
      return {
        success: false,
        error: 'I apologize, but I encountered an error while processing your request. Please try again or contact support@eeko.systems for assistance.'
      };
    }
  }

  private generateSuggestions(userMessage: string, response: string): string[] {
    const suggestions: string[] = [];
    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = response.toLowerCase();

    // Context-aware suggestions based on topic
    if (lowerMessage.includes('api') || lowerMessage.includes('key')) {
      suggestions.push('How do I test if my API key is working?');
      suggestions.push('What API providers are supported?');
    }
    
    if (lowerMessage.includes('template')) {
      suggestions.push('How do I create a custom template?');
      suggestions.push('Can I share templates with my team?');
    }
    
    if (lowerMessage.includes('generate') || lowerMessage.includes('document')) {
      suggestions.push('How can I improve generation quality?');
      suggestions.push('What file formats can I export?');
    }
    
    if (lowerMessage.includes('error') || lowerMessage.includes('problem')) {
      suggestions.push('How do I view error logs?');
      suggestions.push('How can I contact support?');
    }
    
    if (lowerMessage.includes('cloud') || lowerMessage.includes('storage')) {
      suggestions.push('Which cloud providers are supported?');
      suggestions.push('Is my data secure in the cloud?');
    }

    // Add general suggestions if we don't have enough specific ones
    if (suggestions.length < 2) {
      suggestions.push(...this.getDefaultSuggestions(userMessage));
    }

    // Limit to 4 suggestions and remove duplicates
    return [...new Set(suggestions)].slice(0, 4);
  }

  private getDefaultSuggestions(userMessage: string): string[] {
    const isNewUser = userMessage.toLowerCase().includes('start') || 
                     userMessage.toLowerCase().includes('begin') ||
                     userMessage.toLowerCase().includes('new');
    
    if (isNewUser) {
      return [
        'What are the main features?',
        'How do I set up my first document?',
        'What are keyboard shortcuts?',
        'How do I use templates?'
      ];
    }

    return [
      'How do I generate better content?',
      'What are common issues and fixes?',
      'How do I export my document?',
      'Can you explain the chat assistant?'
    ];
  }

  private generateFallbackResponse(query: string, searchResults: any[]): string {
    let response = "I found some relevant information in the DocWriter documentation:\n\n";
    
    // Group results by topic
    const grouped = new Map<string, string[]>();
    
    searchResults.slice(0, 5).forEach(result => {
      const topic = result.path.split('.')[0];
      if (!grouped.has(topic)) {
        grouped.set(topic, []);
      }
      grouped.get(topic)!.push(result.content);
    });
    
    // Format grouped results
    grouped.forEach((contents, topic) => {
      const formattedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
      response += `**${formattedTopic}:**\n`;
      contents.forEach(content => {
        response += `• ${content}\n`;
      });
      response += '\n';
    });
    
    response += "\nIf this doesn't answer your question, please contact support@eeko.systems for personalized assistance.";
    
    return response;
  }

  async testConnection(apiKey: string, provider: 'openai' | 'anthropic' | 'gemini'): Promise<boolean> {
    try {
      const testRequest: SupportChatRequest = {
        message: 'Hello',
        llmProvider: provider,
        llmModel: provider === 'openai' ? 'gpt-3.5-turbo' : 
                  provider === 'anthropic' ? 'claude-3-5-haiku-20241022' : 
                  'gemini-1.5-flash'
      };
      
      const response = await this.generateResponse(testRequest, apiKey);
      return response.success;
    } catch (error) {
      log.error('Support chatbot connection test failed:', error);
      return false;
    }
  }
}

export const supportChatbotService = new SupportChatbotService();
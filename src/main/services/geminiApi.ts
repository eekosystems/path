import { GoogleGenerativeAI } from '@google/generative-ai';
import log from '../log';

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface GeminiGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

class GeminiApiService {
  private genAI: GoogleGenerativeAI | null = null;
  private currentModel: string = 'gemini-1.5-flash';

  initialize(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('Gemini API key is required');
    }

    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.currentModel = config.model || 'gemini-1.5-flash';

    log.info('Gemini API initialized');
  }

  async generateContent(options: GeminiGenerateOptions): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API not initialized');
    }

    try {
      const { prompt, systemPrompt, temperature = 0.7 } = options;

      log.info('Generating content with Gemini', { 
        promptLength: prompt.length,
        model: this.currentModel
      });

      const model = this.genAI.getGenerativeModel({ 
        model: this.currentModel,
        generationConfig: {
          temperature,
          topK: 1,
          topP: 1,
          maxOutputTokens: options.maxTokens || 4000,
        },
      });

      // Combine system prompt and user prompt for Gemini
      const fullPrompt = systemPrompt 
        ? `${systemPrompt}\n\n${prompt}`
        : prompt;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const content = response.text();

      log.info('Gemini content generated successfully', { 
        contentLength: content.length 
      });

      return content;
    } catch (error: any) {
      log.error('Gemini API error', error);
      
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error('Invalid Gemini API key');
      } else if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
        throw new Error('Gemini API rate limit exceeded');
      } else if (error.message?.includes('SAFETY')) {
        throw new Error('Content was blocked by Gemini safety filters');
      }
      
      throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`);
    }
  }

  isInitialized(): boolean {
    return this.genAI !== null;
  }

  setModel(model: string) {
    this.currentModel = model;
  }
}

export const geminiApiService = new GeminiApiService();
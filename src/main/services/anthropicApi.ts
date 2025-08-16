import Anthropic from '@anthropic-ai/sdk';
import log from '../log';

export interface AnthropicConfig {
  apiKey: string;
  model: string;
}

export interface AnthropicGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

class AnthropicApiService {
  private client: Anthropic | null = null;
  private currentModel: string = 'claude-3-5-sonnet-20241022';

  initialize(config: AnthropicConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    this.currentModel = config.model || 'claude-3-5-sonnet-20241022';
    log.info('Anthropic API initialized');
  }

  async generateContent(options: AnthropicGenerateOptions): Promise<string> {
    if (!this.client) {
      throw new Error('Anthropic API not initialized');
    }

    try {
      const { prompt, systemPrompt, maxTokens = 4000, temperature = 0.7 } = options;

      log.info('Generating content with Anthropic', { 
        promptLength: prompt.length,
        model: this.currentModel
      });

      const response = await this.client.messages.create({
        model: this.currentModel,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt || 'You are a professional immigration letter writer assistant.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      log.info('Anthropic content generated successfully', { 
        contentLength: content.length 
      });

      return content;
    } catch (error: any) {
      log.error('Anthropic API error', error);
      
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key');
      } else if (error.status === 429) {
        throw new Error('Anthropic API rate limit exceeded');
      } else if (error.status === 400) {
        throw new Error('Invalid request to Anthropic API');
      }
      
      throw new Error(`Anthropic API error: ${error.message || 'Unknown error'}`);
    }
  }

  isInitialized(): boolean {
    return this.client !== null;
  }
}

export const anthropicApiService = new AnthropicApiService();
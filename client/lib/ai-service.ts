export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIServiceConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  finish_reason: string;
}

export interface StreamingResponse {
  content: string;
  done: boolean;
}

/**
 * AI Service
 * Handles integration with OpenAI, Claude, and other AI providers
 */
export class AIService {
  private openaiApiKey: string;
  private claudeApiKey: string;
  private baseUrls = {
    openai: 'https://api.openai.com/v1',
    claude: 'https://api.anthropic.com/v1',
  };

  constructor() {
    // In production, these would come from environment variables
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.claudeApiKey = import.meta.env.VITE_CLAUDE_API_KEY || '';
  }

  /**
   * Generate chat completion
   */
  async generateChatCompletion(
    messages: ChatMessage[],
    config: AIServiceConfig
  ): Promise<AIResponse> {
    try {
      if (config.model.startsWith('gpt')) {
        return await this.callOpenAI(messages, config);
      } else if (config.model.startsWith('claude')) {
        return await this.callClaude(messages, config);
      } else {
        throw new Error(`Unsupported model: ${config.model}`);
      }
    } catch (error) {
      console.error('Error generating chat completion:', error);
      throw error;
    }
  }

  /**
   * Generate streaming chat completion
   */
  async generateStreamingCompletion(
    messages: ChatMessage[],
    config: AIServiceConfig,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    try {
      if (config.model.startsWith('gpt')) {
        await this.streamOpenAI(messages, config, onChunk);
      } else if (config.model.startsWith('claude')) {
        await this.streamClaude(messages, config, onChunk);
      } else {
        throw new Error(`Unsupported model for streaming: ${config.model}`);
      }
    } catch (error) {
      console.error('Error generating streaming completion:', error);
      throw error;
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    messages: ChatMessage[],
    config: AIServiceConfig
  ): Promise<AIResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseUrls.openai}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      usage: data.usage,
      model: data.model,
      finish_reason: choice.finish_reason,
    };
  }

  /**
   * Call Claude API
   */
  private async callClaude(
    messages: ChatMessage[],
    config: AIServiceConfig
  ): Promise<AIResponse> {
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    // Convert messages format for Claude
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.baseUrls.claude}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.claudeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        system: systemMessage?.content,
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: data.usage,
      model: data.model,
      finish_reason: data.stop_reason,
    };
  }

  /**
   * Stream OpenAI response
   */
  private async streamOpenAI(
    messages: ChatMessage[],
    config: AIServiceConfig,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseUrls.openai}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onChunk({ content: '', done: true });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onChunk({ content: '', done: true });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              
              if (content) {
                onChunk({ content, done: false });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Stream Claude response
   */
  private async streamClaude(
    messages: ChatMessage[],
    config: AIServiceConfig,
    onChunk: (chunk: StreamingResponse) => void
  ): Promise<void> {
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    // Convert messages format for Claude
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.baseUrls.claude}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.claudeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        system: systemMessage?.content,
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onChunk({ content: '', done: true });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content_block_delta') {
                const content = parsed.delta?.text || '';
                if (content) {
                  onChunk({ content, done: false });
                }
              } else if (parsed.type === 'message_stop') {
                onChunk({ content: '', done: true });
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(text: string, model: string = 'text-embedding-ada-002'): Promise<number[]> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseUrls.openai}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI Embeddings API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Check if model is available
   */
  isModelAvailable(model: string): boolean {
    const availableModels = [
      'gpt-4',
      'gpt-4-turbo-preview',
      'gpt-3.5-turbo',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];

    return availableModels.includes(model);
  }

  /**
   * Get model pricing (tokens per dollar)
   */
  getModelPricing(model: string): { input: number; output: number } {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    };

    return pricing[model] || { input: 0, output: 0 };
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.getModelPricing(model);
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
  }

  /**
   * Test AI service connection
   */
  async testConnection(model: string = 'gpt-3.5-turbo'): Promise<boolean> {
    try {
      const testMessages: ChatMessage[] = [
        { role: 'user', content: 'Hello, this is a test message.' }
      ];

      const response = await this.generateChatCompletion(testMessages, {
        model,
        temperature: 0.7,
        max_tokens: 50,
      });

      return !!response.content;
    } catch (error) {
      console.error('AI service connection test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
export const aiService = new AIService();
/**
 * Enhanced AI Service
 * Intelligent routing between OpenAI and Claude APIs with fallback support
 */

import { aiService } from './ai-service';

type AIProvider = 'openai' | 'claude' | 'auto';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  metadata?: {
    responseTime: number;
    fallbackUsed: boolean;
  };
}

interface AIServiceConfig {
  provider: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableFallback?: boolean;
  timeout?: number;
}

class EnhancedAIService {
  private defaultConfig: AIServiceConfig = {
    provider: 'auto',
    temperature: 0.7,
    maxTokens: 4096,
    enableFallback: true,
    timeout: 30000
  };

  /**
   * Generate AI response with intelligent provider selection
   */
  async generateResponse(
    messages: AIMessage[],
    config: Partial<AIServiceConfig> = {}
  ): Promise<AIResponse> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    let fallbackUsed = false;

    // Determine which provider to use
    const provider = this.selectProvider(finalConfig.provider, messages);

    try {
      // Try primary provider
      const response = await this.callProvider(provider, messages, finalConfig);
      
      return {
        ...response,
        metadata: {
          responseTime: Date.now() - startTime,
          fallbackUsed
        }
      };
    } catch (error) {
      console.warn(`Primary provider ${provider} failed:`, error);
      
      // Try fallback if enabled
      if (finalConfig.enableFallback) {
        const fallbackProvider = provider === 'openai' ? 'openai' : 'openai'; // Only OpenAI available for now
        
        try {
          const response = await this.callProvider(fallbackProvider, messages, finalConfig);
          fallbackUsed = true;
          
          return {
            ...response,
            metadata: {
              responseTime: Date.now() - startTime,
              fallbackUsed
            }
          };
        } catch (fallbackError) {
          console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
          throw new Error(`AI provider failed. Primary: ${error}. Fallback: ${fallbackError}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Generate streaming AI response
   */
  async *generateStreamingResponse(
    messages: AIMessage[],
    config: Partial<AIServiceConfig> = {}
  ): AsyncGenerator<{ content: string; provider: AIProvider; done?: boolean }, void, unknown> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const provider = this.selectProvider(finalConfig.provider, messages);

    try {
      if (provider === 'openai') {
        // Use OpenAI streaming
        const openAIMessages = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        const stream = await aiService.streamChatCompletion(
          openAIMessages,
          finalConfig.model || 'gpt-4',
          finalConfig.temperature,
          finalConfig.maxTokens
        );

        for await (const chunk of stream) {
          if (chunk.choices[0]?.delta?.content) {
            yield {
              content: chunk.choices[0].delta.content,
              provider: 'openai'
            };
          }
        }
      }

      yield { content: '', provider, done: true };
    } catch (error) {
      console.error(`Streaming failed for provider ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Select the best provider based on configuration and context
   */
  private selectProvider(configProvider: AIProvider, messages: AIMessage[]): 'openai' {
    // For now, only OpenAI is available
    return 'openai';
  }

  /**
   * Call specific AI provider
   */
  private async callProvider(
    provider: 'openai',
    messages: AIMessage[],
    config: AIServiceConfig
  ): Promise<AIResponse> {
    const openAIMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await aiService.generateChatCompletion(
      openAIMessages,
      config.model || 'gpt-4',
      config.temperature,
      config.maxTokens
    );

    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage;

    return {
      content,
      provider: 'openai',
      model: config.model || 'gpt-4',
      usage: usage ? {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        cost: this.calculateOpenAICost(usage.prompt_tokens, usage.completion_tokens, config.model || 'gpt-4')
      } : undefined
    };
  }

  /**
   * Calculate OpenAI cost
   */
  private calculateOpenAICost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
    };

    const modelPricing = pricing[model] || pricing['gpt-4'];
    return (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output;
  }

  /**
   * Get available models for all providers
   */
  getAvailableModels(): Record<AIProvider, string[]> {
    return {
      openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      claude: [], // Not implemented yet
      auto: [] // Auto doesn't have specific models
    };
  }

  /**
   * Test all available providers
   */
  async testProviders(): Promise<Record<string, { success: boolean; error?: string; responseTime?: number }>> {
    const results: Record<string, any> = {};

    // Test OpenAI
    const startTime = Date.now();
    try {
      await aiService.generateChatCompletion(
        [{ role: 'user', content: 'Hello, please respond with just "Hello!"' }],
        'gpt-3.5-turbo',
        0.1,
        10
      );
      results.openai = {
        success: true,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      results.openai = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Claude not implemented yet
    results.claude = {
      success: false,
      error: 'Claude integration not implemented'
    };

    return results;
  }

  /**
   * Get provider statistics
   */
  getProviderStats(): {
    available: string[];
    recommended: string;
    capabilities: Record<string, string[]>;
  } {
    return {
      available: ['openai'],
      recommended: 'openai',
      capabilities: {
        openai: ['Fast responses', 'Code generation', 'Function calling', 'JSON mode'],
        claude: ['Long context', 'Creative writing', 'Analysis', 'Vision (Claude 3)'],
        auto: ['Intelligent routing', 'Automatic fallback', 'Cost optimization']
      }
    };
  }
}

// Export singleton instance
export const enhancedAIService = new EnhancedAIService();
export default enhancedAIService;

// Export types
export type { AIProvider, AIMessage, AIResponse, AIServiceConfig };
import { aiService, type ChatMessage, type StreamingResponse } from './ai-service';
import { conversationContextManager } from './conversation-context';
import { supabase } from './agent-runtime';

export interface StreamingChatConfig {
  conversationId: string;
  onChunk: (chunk: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

export interface ChatStreamManager {
  start(): Promise<void>;
  stop(): void;
  isStreaming(): boolean;
}

/**
 * Streaming Chat Service
 * Handles real-time streaming responses for chat conversations
 */
export class StreamingChatService {
  private activeStreams: Map<string, AbortController> = new Map();

  /**
   * Start streaming response for a conversation
   */
  async startStreaming(
    conversationId: string,
    userMessage: string,
    config: StreamingChatConfig
  ): Promise<ChatStreamManager> {
    try {
      // Create abort controller for this stream
      const abortController = new AbortController();
      this.activeStreams.set(conversationId, abortController);

      let isStreaming = true;
      let fullResponse = '';

      const manager: ChatStreamManager = {
        start: async () => {
          try {
            // Get conversation context
            const context = await conversationContextManager.getContext(conversationId);
            if (!context) {
              throw new Error('Conversation context not found');
            }

            // Get context window for AI
            const contextWindow = await conversationContextManager.getContextWindow(conversationId);
            if (!contextWindow) {
              throw new Error('Failed to get context window');
            }

            // Prepare messages for AI
            const conversationHistory = contextWindow.messages.map(msg => ({
              role: msg.role === 'agent' ? 'assistant' as const : 'user' as const,
              content: msg.content,
            }));

            // Add the new user message
            conversationHistory.push({
              role: 'user' as const,
              content: userMessage,
            });

            // Add system message
            const systemMessage: ChatMessage = {
              role: 'system',
              content: `${context.agent.personality}\n\nInstructions: ${context.agent.instructions}`,
            };

            const messages = [systemMessage, ...conversationHistory];

            // Start streaming
            await aiService.generateStreamingCompletion(
              messages,
              {
                model: context.agent.settings.model,
                temperature: context.agent.settings.temperature,
                max_tokens: context.agent.settings.max_tokens,
                stream: true,
              },
              (chunk: StreamingResponse) => {
                if (abortController.signal.aborted) {
                  return;
                }

                if (chunk.done) {
                  isStreaming = false;
                  this.activeStreams.delete(conversationId);
                  config.onComplete(fullResponse);
                  
                  // Save the complete response to database
                  this.saveStreamedResponse(conversationId, fullResponse);
                } else {
                  fullResponse += chunk.content;
                  config.onChunk(chunk.content);
                }
              }
            );

          } catch (error) {
            isStreaming = false;
            this.activeStreams.delete(conversationId);
            config.onError(error instanceof Error ? error : new Error('Unknown streaming error'));
          }
        },

        stop: () => {
          abortController.abort();
          isStreaming = false;
          this.activeStreams.delete(conversationId);
        },

        isStreaming: () => isStreaming,
      };

      return manager;

    } catch (error) {
      console.error('Error starting streaming chat:', error);
      throw error;
    }
  }

  /**
   * Stop streaming for a conversation
   */
  stopStreaming(conversationId: string): void {
    const abortController = this.activeStreams.get(conversationId);
    if (abortController) {
      abortController.abort();
      this.activeStreams.delete(conversationId);
    }
  }

  /**
   * Check if conversation is currently streaming
   */
  isStreaming(conversationId: string): boolean {
    return this.activeStreams.has(conversationId);
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  /**
   * Stop all active streams
   */
  stopAllStreams(): void {
    for (const [conversationId, abortController] of this.activeStreams.entries()) {
      abortController.abort();
    }
    this.activeStreams.clear();
  }

  /**
   * Save streamed response to database
   */
  private async saveStreamedResponse(conversationId: string, response: string): Promise<void> {
    try {
      // Add agent message to database
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'agent',
          content: response,
          type: 'text',
          metadata: { streamed: true },
        });

      // Update conversation context
      const context = await conversationContextManager.getContext(conversationId);
      if (context) {
        const agentMessage = {
          id: `temp_${Date.now()}`,
          conversation_id: conversationId,
          role: 'agent' as const,
          content: response,
          type: 'text' as const,
          metadata: { streamed: true },
          created_at: new Date().toISOString(),
        };

        await conversationContextManager.updateContext(conversationId, agentMessage);
      }

      // Update conversation activity
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error saving streamed response:', error);
    }
  }

  /**
   * Create a simple streaming chat interface
   */
  createStreamingInterface(conversationId: string): {
    sendMessage: (message: string) => Promise<void>;
    onMessage: (callback: (chunk: string, isComplete: boolean) => void) => void;
    onError: (callback: (error: Error) => void) => void;
    stop: () => void;
  } {
    let messageCallback: ((chunk: string, isComplete: boolean) => void) | null = null;
    let errorCallback: ((error: Error) => void) | null = null;

    return {
      sendMessage: async (message: string) => {
        try {
          const manager = await this.startStreaming(conversationId, message, {
            conversationId,
            onChunk: (chunk: string) => {
              messageCallback?.(chunk, false);
            },
            onComplete: (fullResponse: string) => {
              messageCallback?.(fullResponse, true);
            },
            onError: (error: Error) => {
              errorCallback?.(error);
            },
          });

          await manager.start();
        } catch (error) {
          errorCallback?.(error instanceof Error ? error : new Error('Unknown error'));
        }
      },

      onMessage: (callback: (chunk: string, isComplete: boolean) => void) => {
        messageCallback = callback;
      },

      onError: (callback: (error: Error) => void) => {
        errorCallback = callback;
      },

      stop: () => {
        this.stopStreaming(conversationId);
      },
    };
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats() {
    return {
      active_streams: this.activeStreams.size,
      stream_ids: Array.from(this.activeStreams.keys()),
    };
  }
}

// Create singleton instance
export const streamingChatService = new StreamingChatService();
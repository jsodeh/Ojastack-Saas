import { supabase } from './agent-runtime';
import type { Agent, Conversation, Message } from './agent-runtime';

export interface ConversationContext {
  conversation: Conversation;
  agent: Agent;
  messages: Message[];
  summary: string;
  intent: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  customer_info: any;
  metadata: any;
}

export interface ContextWindow {
  messages: Message[];
  tokenCount: number;
  maxTokens: number;
}

/**
 * Conversation Context Manager
 * Manages conversation memory, context windows, and conversation state
 */
export class ConversationContextManager {
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly MAX_CONTEXT_MESSAGES = 20;
  private readonly MAX_CONTEXT_TOKENS = 4000; // Conservative limit for context window

  /**
   * Get or create conversation context
   */
  async getContext(conversationId: string): Promise<ConversationContext | null> {
    try {
      // Check if context is already loaded
      let context = this.contexts.get(conversationId);
      if (context) {
        return context;
      }

      // Load context from database
      context = await this.loadContextFromDatabase(conversationId);
      if (context) {
        this.contexts.set(conversationId, context);
      }

      return context;
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return null;
    }
  }

  /**
   * Update conversation context with new message
   */
  async updateContext(conversationId: string, message: Message): Promise<void> {
    try {
      const context = await this.getContext(conversationId);
      if (!context) {
        console.error('Context not found for conversation:', conversationId);
        return;
      }

      // Add message to context
      context.messages.push(message);

      // Trim context if it gets too long
      await this.trimContext(context);

      // Update conversation metadata
      await this.updateConversationMetadata(context);

      // Update cached context
      this.contexts.set(conversationId, context);

    } catch (error) {
      console.error('Error updating conversation context:', error);
    }
  }

  /**
   * Get context window for AI processing
   */
  async getContextWindow(conversationId: string): Promise<ContextWindow | null> {
    try {
      const context = await this.getContext(conversationId);
      if (!context) {
        return null;
      }

      // Get recent messages within token limit
      const messages = await this.getMessagesWithinTokenLimit(
        context.messages,
        this.MAX_CONTEXT_TOKENS
      );

      return {
        messages,
        tokenCount: this.estimateTokenCount(messages),
        maxTokens: this.MAX_CONTEXT_TOKENS,
      };

    } catch (error) {
      console.error('Error getting context window:', error);
      return null;
    }
  }

  /**
   * Generate conversation summary
   */
  async generateSummary(conversationId: string): Promise<string> {
    try {
      const context = await this.getContext(conversationId);
      if (!context || context.messages.length === 0) {
        return '';
      }

      // Get key messages for summary
      const keyMessages = context.messages
        .filter(m => m.role === 'user' || m.role === 'agent')
        .slice(-10); // Last 10 messages

      if (keyMessages.length === 0) {
        return '';
      }

      // Create summary based on message content
      const userMessages = keyMessages.filter(m => m.role === 'user');
      const agentMessages = keyMessages.filter(m => m.role === 'agent');

      const summary = `Conversation with ${context.conversation.customer_name || 'customer'} via ${context.conversation.channel}. ` +
        `${userMessages.length} user messages, ${agentMessages.length} agent responses. ` +
        `Status: ${context.conversation.status}. ` +
        `Started: ${new Date(context.conversation.created_at).toLocaleDateString()}.`;

      // Update context summary
      context.summary = summary;
      this.contexts.set(conversationId, context);

      // Save to database
      await supabase
        .from('conversations')
        .update({ metadata: { ...context.conversation.metadata, summary } })
        .eq('id', conversationId);

      return summary;

    } catch (error) {
      console.error('Error generating conversation summary:', error);
      return '';
    }
  }

  /**
   * Detect conversation intent
   */
  async detectIntent(conversationId: string): Promise<string> {
    try {
      const context = await this.getContext(conversationId);
      if (!context || context.messages.length === 0) {
        return 'unknown';
      }

      // Simple intent detection based on keywords
      const userMessages = context.messages
        .filter(m => m.role === 'user')
        .map(m => m.content.toLowerCase())
        .join(' ');

      // Define intent patterns
      const intentPatterns = {
        support: ['help', 'problem', 'issue', 'error', 'bug', 'not working'],
        sales: ['buy', 'purchase', 'price', 'cost', 'order', 'payment'],
        information: ['what', 'how', 'when', 'where', 'why', 'tell me'],
        complaint: ['complain', 'unhappy', 'disappointed', 'terrible', 'awful'],
        compliment: ['great', 'excellent', 'amazing', 'love', 'perfect'],
      };

      // Find matching intent
      for (const [intent, keywords] of Object.entries(intentPatterns)) {
        if (keywords.some(keyword => userMessages.includes(keyword))) {
          context.intent = intent;
          this.contexts.set(conversationId, context);
          
          // Update database
          await supabase
            .from('conversations')
            .update({ intent })
            .eq('id', conversationId);

          return intent;
        }
      }

      return 'general';

    } catch (error) {
      console.error('Error detecting conversation intent:', error);
      return 'unknown';
    }
  }

  /**
   * Analyze conversation sentiment
   */
  async analyzeSentiment(conversationId: string): Promise<'positive' | 'neutral' | 'negative'> {
    try {
      const context = await this.getContext(conversationId);
      if (!context || context.messages.length === 0) {
        return 'neutral';
      }

      // Simple sentiment analysis based on keywords
      const userMessages = context.messages
        .filter(m => m.role === 'user')
        .map(m => m.content.toLowerCase())
        .join(' ');

      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'perfect', 'happy', 'satisfied'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated', 'disappointed', 'problem'];

      const positiveCount = positiveWords.filter(word => userMessages.includes(word)).length;
      const negativeCount = negativeWords.filter(word => userMessages.includes(word)).length;

      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
      
      if (positiveCount > negativeCount) {
        sentiment = 'positive';
      } else if (negativeCount > positiveCount) {
        sentiment = 'negative';
      }

      // Update context and database
      context.sentiment = sentiment;
      this.contexts.set(conversationId, context);

      await supabase
        .from('conversations')
        .update({ sentiment })
        .eq('id', conversationId);

      return sentiment;

    } catch (error) {
      console.error('Error analyzing conversation sentiment:', error);
      return 'neutral';
    }
  }

  /**
   * Clear context from memory
   */
  clearContext(conversationId: string): void {
    this.contexts.delete(conversationId);
  }

  /**
   * Get context statistics
   */
  getContextStats() {
    return {
      loaded_contexts: this.contexts.size,
      max_context_messages: this.MAX_CONTEXT_MESSAGES,
      max_context_tokens: this.MAX_CONTEXT_TOKENS,
    };
  }

  /**
   * Load context from database
   */
  private async loadContextFromDatabase(conversationId: string): Promise<ConversationContext | null> {
    try {
      // Get conversation details
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        console.error('Error loading conversation:', convError);
        return null;
      }

      // Get agent details
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', conversation.agent_id)
        .single();

      if (agentError || !agent) {
        console.error('Error loading agent:', agentError);
        return null;
      }

      // Get conversation messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(this.MAX_CONTEXT_MESSAGES);

      if (msgError) {
        console.error('Error loading messages:', msgError);
        return null;
      }

      return {
        conversation,
        agent,
        messages: messages || [],
        summary: conversation.metadata?.summary || '',
        intent: conversation.intent || 'unknown',
        sentiment: conversation.sentiment || 'neutral',
        customer_info: conversation.metadata?.customer_info || {},
        metadata: conversation.metadata || {},
      };

    } catch (error) {
      console.error('Error loading context from database:', error);
      return null;
    }
  }

  /**
   * Trim context to stay within limits
   */
  private async trimContext(context: ConversationContext): Promise<void> {
    if (context.messages.length <= this.MAX_CONTEXT_MESSAGES) {
      return;
    }

    // Keep system messages and recent messages
    const systemMessages = context.messages.filter(m => m.role === 'system');
    const recentMessages = context.messages
      .filter(m => m.role !== 'system')
      .slice(-this.MAX_CONTEXT_MESSAGES + systemMessages.length);

    context.messages = [...systemMessages, ...recentMessages];
  }

  /**
   * Get messages within token limit
   */
  private async getMessagesWithinTokenLimit(messages: Message[], maxTokens: number): Promise<Message[]> {
    const result: Message[] = [];
    let tokenCount = 0;

    // Add messages from most recent, staying within token limit
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = this.estimateTokenCount([message]);
      
      if (tokenCount + messageTokens > maxTokens && result.length > 0) {
        break;
      }

      result.unshift(message);
      tokenCount += messageTokens;
    }

    return result;
  }

  /**
   * Estimate token count for messages
   */
  private estimateTokenCount(messages: Message[]): number {
    // Rough estimation: 1 token ≈ 4 characters
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }

  /**
   * Update conversation metadata
   */
  private async updateConversationMetadata(context: ConversationContext): Promise<void> {
    try {
      const metadata = {
        ...context.metadata,
        message_count: context.messages.length,
        last_message_at: new Date().toISOString(),
        summary: context.summary,
      };

      await supabase
        .from('conversations')
        .update({ 
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', context.conversation.id);

    } catch (error) {
      console.error('Error updating conversation metadata:', error);
    }
  }
}

// Create singleton instance
export const conversationContextManager = new ConversationContextManager();
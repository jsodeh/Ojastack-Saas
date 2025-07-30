import { agentRuntime, type Agent, type Conversation, type Message } from './agent-runtime';
import { agentService } from './agent-service';

export interface IncomingMessage {
  agent_id: string;
  customer_id: string;
  channel: 'whatsapp' | 'slack' | 'web' | 'email';
  content: string;
  type: 'text' | 'audio' | 'image' | 'file';
  metadata?: any;
  customer_name?: string;
  customer_phone?: string;
}

export interface OutgoingMessage {
  conversation_id: string;
  content: string;
  type: 'text' | 'audio' | 'image' | 'file';
  metadata?: any;
}

export interface ChannelAdapter {
  sendMessage(message: OutgoingMessage): Promise<boolean>;
  formatMessage(content: string, type: string): any;
  validateMessage(message: IncomingMessage): boolean;
}

/**
 * Message Router
 * Routes messages between channels and agents, handles conversation flow
 */
export class MessageRouter {
  private channelAdapters: Map<string, ChannelAdapter> = new Map();
  private activeConversations: Map<string, string> = new Map(); // customer_id -> conversation_id

  constructor() {
    this.initializeRouter();
  }

  /**
   * Initialize the message router
   */
  private initializeRouter() {
    console.log('🔀 Initializing Message Router...');
    
    // Register default channel adapters
    this.registerChannelAdapter('web', new WebChannelAdapter());
    this.registerChannelAdapter('whatsapp', new WhatsAppChannelAdapter());
    this.registerChannelAdapter('slack', new SlackChannelAdapter());
    this.registerChannelAdapter('email', new EmailChannelAdapter());
    
    console.log('✅ Message Router initialized');
  }

  /**
   * Register a channel adapter
   */
  registerChannelAdapter(channel: string, adapter: ChannelAdapter) {
    this.channelAdapters.set(channel, adapter);
    console.log(`📡 Registered channel adapter: ${channel}`);
  }

  /**
   * Route incoming message to appropriate agent
   */
  async routeIncomingMessage(message: IncomingMessage): Promise<boolean> {
    try {
      console.log(`📨 Routing message from ${message.channel} for agent ${message.agent_id}`);

      // Validate message
      const adapter = this.channelAdapters.get(message.channel);
      if (!adapter || !adapter.validateMessage(message)) {
        console.error('Invalid message or unsupported channel:', message.channel);
        return false;
      }

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(message);
      if (!conversation) {
        console.error('Failed to get or create conversation');
        return false;
      }

      // Add user message to conversation
      const userMessage = await agentService.addMessage(
        conversation.id,
        'user',
        message.content,
        message.type,
        message.metadata
      );

      if (!userMessage) {
        console.error('Failed to add user message');
        return false;
      }

      console.log(`✅ Message routed successfully to conversation: ${conversation.id}`);
      return true;

    } catch (error) {
      console.error('Error routing incoming message:', error);
      return false;
    }
  }

  /**
   * Route outgoing message to appropriate channel
   */
  async routeOutgoingMessage(message: OutgoingMessage, channel: string): Promise<boolean> {
    try {
      console.log(`📤 Routing outgoing message to ${channel}`);

      const adapter = this.channelAdapters.get(channel);
      if (!adapter) {
        console.error('Unsupported channel for outgoing message:', channel);
        return false;
      }

      const success = await adapter.sendMessage(message);
      
      if (success) {
        console.log(`✅ Message sent successfully via ${channel}`);
      } else {
        console.error(`❌ Failed to send message via ${channel}`);
      }

      return success;

    } catch (error) {
      console.error('Error routing outgoing message:', error);
      return false;
    }
  }

  /**
   * Get existing conversation or create new one
   */
  private async getOrCreateConversation(message: IncomingMessage): Promise<Conversation | null> {
    try {
      // Check for existing active conversation
      const customerKey = `${message.customer_id}_${message.agent_id}_${message.channel}`;
      let conversationId = this.activeConversations.get(customerKey);

      if (conversationId) {
        // Get existing conversation
        const { data: conversation } = await agentRuntime.supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('status', 'active')
          .single();

        if (conversation) {
          return conversation;
        }
      }

      // Create new conversation
      const conversation = await agentService.createConversation({
        agent_id: message.agent_id,
        customer_id: message.customer_id,
        channel: message.channel,
        customer_name: message.customer_name,
        customer_phone: message.customer_phone,
        metadata: message.metadata,
      });

      if (conversation) {
        this.activeConversations.set(customerKey, conversation.id);
      }

      return conversation;

    } catch (error) {
      console.error('Error getting or creating conversation:', error);
      return null;
    }
  }

  /**
   * Handle conversation completion
   */
  async completeConversation(conversationId: string): Promise<boolean> {
    try {
      const { error } = await agentRuntime.supabase
        .from('conversations')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error completing conversation:', error);
        return false;
      }

      // Remove from active conversations
      for (const [key, id] of this.activeConversations.entries()) {
        if (id === conversationId) {
          this.activeConversations.delete(key);
          break;
        }
      }

      console.log(`✅ Conversation completed: ${conversationId}`);
      return true;

    } catch (error) {
      console.error('Error completing conversation:', error);
      return false;
    }
  }

  /**
   * Handle conversation escalation
   */
  async escalateConversation(conversationId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await agentRuntime.supabase
        .from('conversations')
        .update({ 
          status: 'escalated',
          escalation_requested: true,
          escalation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('Error escalating conversation:', error);
        return false;
      }

      console.log(`🚨 Conversation escalated: ${conversationId} - ${reason}`);
      return true;

    } catch (error) {
      console.error('Error escalating conversation:', error);
      return false;
    }
  }

  /**
   * Get router statistics
   */
  getRouterStats() {
    return {
      registeredChannels: Array.from(this.channelAdapters.keys()),
      activeConversations: this.activeConversations.size,
      channelAdapters: this.channelAdapters.size,
    };
  }
}

/**
 * Web Channel Adapter
 */
class WebChannelAdapter implements ChannelAdapter {
  async sendMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      // In a real implementation, this would send via WebSocket or Server-Sent Events
      console.log('📱 Sending web message:', message.content);
      
      // Simulate sending message
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Error sending web message:', error);
      return false;
    }
  }

  formatMessage(content: string, type: string): any {
    return {
      text: content,
      type,
      timestamp: new Date().toISOString(),
    };
  }

  validateMessage(message: IncomingMessage): boolean {
    return !!(message.content && message.customer_id && message.agent_id);
  }
}

/**
 * WhatsApp Channel Adapter
 */
class WhatsAppChannelAdapter implements ChannelAdapter {
  async sendMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      // In a real implementation, this would call WhatsApp Business API
      console.log('📱 Sending WhatsApp message:', message.content);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  formatMessage(content: string, type: string): any {
    return {
      messaging_product: 'whatsapp',
      to: 'customer_phone_number',
      type: 'text',
      text: { body: content },
    };
  }

  validateMessage(message: IncomingMessage): boolean {
    return !!(message.content && message.customer_phone && message.agent_id);
  }
}

/**
 * Slack Channel Adapter
 */
class SlackChannelAdapter implements ChannelAdapter {
  async sendMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      // In a real implementation, this would call Slack API
      console.log('💬 Sending Slack message:', message.content);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 150));
      
      return true;
    } catch (error) {
      console.error('Error sending Slack message:', error);
      return false;
    }
  }

  formatMessage(content: string, type: string): any {
    return {
      channel: 'customer_channel',
      text: content,
      as_user: false,
      username: 'AI Agent',
    };
  }

  validateMessage(message: IncomingMessage): boolean {
    return !!(message.content && message.customer_id && message.agent_id);
  }
}

/**
 * Email Channel Adapter
 */
class EmailChannelAdapter implements ChannelAdapter {
  async sendMessage(message: OutgoingMessage): Promise<boolean> {
    try {
      // In a real implementation, this would send via email service
      console.log('📧 Sending email message:', message.content);
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return true;
    } catch (error) {
      console.error('Error sending email message:', error);
      return false;
    }
  }

  formatMessage(content: string, type: string): any {
    return {
      to: 'customer@example.com',
      subject: 'Response from AI Agent',
      html: `<p>${content}</p>`,
      text: content,
    };
  }

  validateMessage(message: IncomingMessage): boolean {
    return !!(message.content && message.customer_id && message.agent_id);
  }
}

// Create singleton instance
export const messageRouter = new MessageRouter();
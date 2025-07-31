/**
 * Communication Channels Manager
 * Unified interface for managing multiple communication channels
 */

import { enhancedWhatsAppService, type WhatsAppMessage } from './whatsapp-enhanced';
import { slackService, type SlackMessage } from './slack-service';
import { teamsService, type TeamsMessage } from './teams-service';

type ChannelType = 'whatsapp' | 'slack' | 'teams' | 'discord';

interface UnifiedMessage {
  id: string;
  channel: ChannelType;
  conversationId: string;
  from: {
    id: string;
    name: string;
    email?: string;
  };
  to: {
    id: string;
    name: string;
  };
  content: {
    text?: string;
    media?: {
      type: 'image' | 'audio' | 'video' | 'document';
      url: string;
      caption?: string;
    };
    interactive?: {
      type: 'buttons' | 'list' | 'card';
      data: any;
    };
  };
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
}

interface ChannelConfig {
  type: ChannelType;
  enabled: boolean;
  credentials: Record<string, string>;
  features: {
    multimedia: boolean;
    interactive: boolean;
    groupChat: boolean;
    voiceCall: boolean;
    videoCall: boolean;
    fileSharing: boolean;
    scheduling: boolean;
  };
  limits: {
    messageLength: number;
    fileSize: number;
    dailyMessages: number;
  };
}

interface ChannelStats {
  channel: ChannelType;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageResponseTime: number;
  activeConversations: number;
  lastActivity: Date;
  errorRate: number;
}

interface ConversationContext {
  id: string;
  channel: ChannelType;
  participants: Array<{
    id: string;
    name: string;
    role: 'user' | 'agent' | 'bot';
  }>;
  messages: UnifiedMessage[];
  metadata: {
    startTime: Date;
    lastActivity: Date;
    tags: string[];
    priority: 'low' | 'medium' | 'high';
    status: 'active' | 'paused' | 'closed';
  };
  agentId?: string;
  workflowId?: string;
}

class CommunicationChannelsManager {
  private channels: Map<ChannelType, ChannelConfig> = new Map();
  private conversations: Map<string, ConversationContext> = new Map();
  private messageHandlers: Map<ChannelType, (message: UnifiedMessage) => Promise<void>> = new Map();
  private stats: Map<ChannelType, ChannelStats> = new Map();

  constructor() {
    this.initializeChannels();
    this.setupMessageHandlers();
  }

  /**
   * Initialize channel configurations
   */
  private initializeChannels(): void {
    // WhatsApp configuration
    this.channels.set('whatsapp', {
      type: 'whatsapp',
      enabled: enhancedWhatsAppService.isAvailable(),
      credentials: {
        accessToken: import.meta.env.WHATSAPP_ACCESS_TOKEN || '',
        phoneNumberId: import.meta.env.WHATSAPP_PHONE_NUMBER_ID || ''
      },
      features: {
        multimedia: true,
        interactive: true,
        groupChat: true,
        voiceCall: false,
        videoCall: false,
        fileSharing: true,
        scheduling: false
      },
      limits: {
        messageLength: 4096,
        fileSize: 16 * 1024 * 1024, // 16MB
        dailyMessages: 1000
      }
    });

    // Slack configuration
    this.channels.set('slack', {
      type: 'slack',
      enabled: slackService.isAvailable(),
      credentials: {
        botToken: import.meta.env.VITE_SLACK_BOT_TOKEN || '',
        appToken: import.meta.env.VITE_SLACK_APP_TOKEN || ''
      },
      features: {
        multimedia: true,
        interactive: true,
        groupChat: true,
        voiceCall: true,
        videoCall: true,
        fileSharing: true,
        scheduling: true
      },
      limits: {
        messageLength: 40000,
        fileSize: 1024 * 1024 * 1024, // 1GB
        dailyMessages: 10000
      }
    });

    // Teams configuration
    this.channels.set('teams', {
      type: 'teams',
      enabled: teamsService.isAvailable(),
      credentials: {
        botId: import.meta.env.VITE_TEAMS_BOT_ID || '',
        clientId: import.meta.env.VITE_TEAMS_CLIENT_ID || ''
      },
      features: {
        multimedia: true,
        interactive: true,
        groupChat: true,
        voiceCall: true,
        videoCall: true,
        fileSharing: true,
        scheduling: true
      },
      limits: {
        messageLength: 28000,
        fileSize: 250 * 1024 * 1024, // 250MB
        dailyMessages: 5000
      }
    });

    // Initialize stats
    this.channels.forEach((config, type) => {
      this.stats.set(type, {
        channel: type,
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        averageResponseTime: 0,
        activeConversations: 0,
        lastActivity: new Date(),
        errorRate: 0
      });
    });
  }

  /**
   * Setup message handlers for each channel
   */
  private setupMessageHandlers(): void {
    this.messageHandlers.set('whatsapp', async (message) => {
      await this.processMessage(message);
    });

    this.messageHandlers.set('slack', async (message) => {
      await this.processMessage(message);
    });

    this.messageHandlers.set('teams', async (message) => {
      await this.processMessage(message);
    });
  }

  /**
   * Send message through specified channel
   */
  async sendMessage(
    channel: ChannelType,
    conversationId: string,
    content: UnifiedMessage['content'],
    options: {
      replyToId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<UnifiedMessage> {
    const channelConfig = this.channels.get(channel);
    if (!channelConfig || !channelConfig.enabled) {
      throw new Error(`Channel ${channel} is not available`);
    }

    const startTime = Date.now();

    try {
      let sentMessage: UnifiedMessage;

      switch (channel) {
        case 'whatsapp':
          sentMessage = await this.sendWhatsAppMessage(conversationId, content, options);
          break;
        case 'slack':
          sentMessage = await this.sendSlackMessage(conversationId, content, options);
          break;
        case 'teams':
          sentMessage = await this.sendTeamsMessage(conversationId, content, options);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      // Update stats
      const stats = this.stats.get(channel)!;
      stats.totalMessages++;
      stats.successfulMessages++;
      stats.lastActivity = new Date();
      
      const responseTime = Date.now() - startTime;
      stats.averageResponseTime = 
        (stats.averageResponseTime * (stats.totalMessages - 1) + responseTime) / stats.totalMessages;

      // Add to conversation
      this.addMessageToConversation(conversationId, sentMessage);

      return sentMessage;
    } catch (error) {
      // Update error stats
      const stats = this.stats.get(channel)!;
      stats.totalMessages++;
      stats.failedMessages++;
      stats.errorRate = stats.failedMessages / stats.totalMessages;

      console.error(`Failed to send message via ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Send multimedia message
   */
  async sendMediaMessage(
    channel: ChannelType,
    conversationId: string,
    mediaType: 'image' | 'audio' | 'video' | 'document',
    mediaUrl: string,
    caption?: string
  ): Promise<UnifiedMessage> {
    return this.sendMessage(channel, conversationId, {
      media: {
        type: mediaType,
        url: mediaUrl,
        caption
      }
    });
  }

  /**
   * Send interactive message (buttons, cards, etc.)
   */
  async sendInteractiveMessage(
    channel: ChannelType,
    conversationId: string,
    text: string,
    interactive: UnifiedMessage['content']['interactive']
  ): Promise<UnifiedMessage> {
    const channelConfig = this.channels.get(channel);
    if (!channelConfig?.features.interactive) {
      throw new Error(`Channel ${channel} does not support interactive messages`);
    }

    return this.sendMessage(channel, conversationId, {
      text,
      interactive
    });
  }

  /**
   * Get conversation history
   */
  getConversation(conversationId: string): ConversationContext | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Create new conversation
   */
  createConversation(
    channel: ChannelType,
    conversationId: string,
    participants: ConversationContext['participants'],
    agentId?: string
  ): ConversationContext {
    const conversation: ConversationContext = {
      id: conversationId,
      channel,
      participants,
      messages: [],
      metadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        tags: [],
        priority: 'medium',
        status: 'active'
      },
      agentId
    };

    this.conversations.set(conversationId, conversation);
    
    // Update active conversations count
    const stats = this.stats.get(channel)!;
    stats.activeConversations++;

    return conversation;
  }

  /**
   * Close conversation
   */
  closeConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.metadata.status = 'closed';
      
      // Update active conversations count
      const stats = this.stats.get(conversation.channel)!;
      stats.activeConversations = Math.max(0, stats.activeConversations - 1);
    }
  }

  /**
   * Get channel statistics
   */
  getChannelStats(channel?: ChannelType): ChannelStats | ChannelStats[] {
    if (channel) {
      return this.stats.get(channel) || this.createEmptyStats(channel);
    }
    
    return Array.from(this.stats.values());
  }

  /**
   * Get available channels
   */
  getAvailableChannels(): ChannelConfig[] {
    return Array.from(this.channels.values()).filter(config => config.enabled);
  }

  /**
   * Test channel connection
   */
  async testChannel(channel: ChannelType): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      switch (channel) {
        case 'whatsapp':
          return await enhancedWhatsAppService.testConnection();
        case 'slack':
          return await slackService.testConnection();
        case 'teams':
          return await teamsService.testConnection();
        default:
          return { success: false, error: `Unsupported channel: ${channel}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test all channels
   */
  async testAllChannels(): Promise<Record<ChannelType, { success: boolean; error?: string; details?: any }>> {
    const results: any = {};
    
    for (const [channel] of this.channels) {
      results[channel] = await this.testChannel(channel);
    }

    return results;
  }

  /**
   * Get conversation analytics
   */
  getAnalytics(): {
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    channelDistribution: Record<ChannelType, number>;
    averageResponseTime: number;
    errorRate: number;
  } {
    const stats = Array.from(this.stats.values());
    
    const totalMessages = stats.reduce((sum, s) => sum + s.totalMessages, 0);
    const totalConversations = this.conversations.size;
    const activeConversations = Array.from(this.conversations.values())
      .filter(c => c.metadata.status === 'active').length;

    const channelDistribution: any = {};
    stats.forEach(s => {
      channelDistribution[s.channel] = s.totalMessages;
    });

    const averageResponseTime = stats.reduce((sum, s) => sum + s.averageResponseTime, 0) / stats.length;
    const errorRate = stats.reduce((sum, s) => sum + s.errorRate, 0) / stats.length;

    return {
      totalConversations,
      activeConversations,
      totalMessages,
      channelDistribution,
      averageResponseTime,
      errorRate
    };
  }

  /**
   * Handle incoming webhook from any channel
   */
  async handleWebhook(channel: ChannelType, payload: any): Promise<UnifiedMessage[]> {
    const messages: UnifiedMessage[] = [];

    try {
      switch (channel) {
        case 'whatsapp':
          const whatsappMessages = await enhancedWhatsAppService.processWebhook(payload);
          messages.push(...whatsappMessages.map(msg => this.convertWhatsAppMessage(msg)));
          break;
        case 'slack':
          // Handle Slack webhook
          if (payload.type === 'event_callback' && payload.event) {
            const slackMessage = this.convertSlackEvent(payload.event);
            if (slackMessage) {
              messages.push(slackMessage);
            }
          }
          break;
        case 'teams':
          // Handle Teams webhook
          const teamsMessage = await teamsService.handleActivity(payload);
          if (teamsMessage) {
            messages.push(this.convertTeamsMessage(teamsMessage));
          }
          break;
      }

      // Process each message
      for (const message of messages) {
        const handler = this.messageHandlers.get(channel);
        if (handler) {
          await handler(message);
        }
      }
    } catch (error) {
      console.error(`Failed to handle ${channel} webhook:`, error);
    }

    return messages;
  }

  // Private methods

  /**
   * Send WhatsApp message
   */
  private async sendWhatsAppMessage(
    conversationId: string,
    content: UnifiedMessage['content'],
    options: any
  ): Promise<UnifiedMessage> {
    let whatsappMessage: WhatsAppMessage;

    if (content.text) {
      whatsappMessage = await enhancedWhatsAppService.sendTextMessage(conversationId, content.text);
    } else if (content.media) {
      // This would require media upload first
      throw new Error('Media messages not yet implemented for WhatsApp');
    } else if (content.interactive?.type === 'buttons') {
      const buttons = content.interactive.data.buttons || [];
      whatsappMessage = await enhancedWhatsAppService.sendButtonMessage(
        conversationId,
        content.interactive.data.text || '',
        buttons
      );
    } else {
      throw new Error('Unsupported message content for WhatsApp');
    }

    return this.convertWhatsAppMessage(whatsappMessage);
  }

  /**
   * Send Slack message
   */
  private async sendSlackMessage(
    conversationId: string,
    content: UnifiedMessage['content'],
    options: any
  ): Promise<UnifiedMessage> {
    let slackMessage: SlackMessage;

    if (content.interactive?.type === 'buttons') {
      const actions = content.interactive.data.actions || [];
      slackMessage = await slackService.sendInteractiveMessage(
        conversationId,
        content.text || '',
        actions
      );
    } else {
      slackMessage = await slackService.sendMessage(
        conversationId,
        content.text || '',
        {}
      );
    }

    return this.convertSlackMessage(slackMessage);
  }

  /**
   * Send Teams message
   */
  private async sendTeamsMessage(
    conversationId: string,
    content: UnifiedMessage['content'],
    options: any
  ): Promise<UnifiedMessage> {
    let teamsMessage: TeamsMessage;

    if (content.interactive?.type === 'card') {
      teamsMessage = await teamsService.sendAdaptiveCard(
        conversationId,
        content.interactive.data,
        content.text
      );
    } else {
      teamsMessage = await teamsService.sendMessage(
        conversationId,
        content.text || ''
      );
    }

    return this.convertTeamsMessage(teamsMessage);
  }

  /**
   * Convert WhatsApp message to unified format
   */
  private convertWhatsAppMessage(message: WhatsAppMessage): UnifiedMessage {
    return {
      id: message.id,
      channel: 'whatsapp',
      conversationId: message.from,
      from: {
        id: message.from,
        name: message.from
      },
      to: {
        id: message.to,
        name: message.to
      },
      content: {
        text: message.content.text,
        media: message.content.media ? {
          type: 'image', // Simplified
          url: message.content.media.url || '',
          caption: message.content.media.caption
        } : undefined
      },
      timestamp: message.timestamp,
      status: message.status || 'sent'
    };
  }

  /**
   * Convert Slack message to unified format
   */
  private convertSlackMessage(message: SlackMessage): UnifiedMessage {
    return {
      id: message.ts,
      channel: 'slack',
      conversationId: message.channel,
      from: {
        id: message.user,
        name: message.user
      },
      to: {
        id: message.channel,
        name: message.channel
      },
      content: {
        text: message.text
      },
      timestamp: new Date(parseFloat(message.ts) * 1000).toISOString(),
      status: 'sent'
    };
  }

  /**
   * Convert Teams message to unified format
   */
  private convertTeamsMessage(message: TeamsMessage): UnifiedMessage {
    return {
      id: message.id,
      channel: 'teams',
      conversationId: message.conversation.id,
      from: {
        id: message.from.id,
        name: message.from.name
      },
      to: {
        id: message.conversation.id,
        name: message.conversation.id
      },
      content: {
        text: message.text
      },
      timestamp: message.timestamp,
      status: 'sent'
    };
  }

  /**
   * Convert Slack event to unified message
   */
  private convertSlackEvent(event: any): UnifiedMessage | null {
    if (event.type === 'message' && event.text) {
      return {
        id: event.ts,
        channel: 'slack',
        conversationId: event.channel,
        from: {
          id: event.user,
          name: event.user
        },
        to: {
          id: event.channel,
          name: event.channel
        },
        content: {
          text: event.text
        },
        timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
        status: 'delivered'
      };
    }
    return null;
  }

  /**
   * Process incoming message
   */
  private async processMessage(message: UnifiedMessage): Promise<void> {
    // Add to conversation
    this.addMessageToConversation(message.conversationId, message);

    // Update stats
    const stats = this.stats.get(message.channel)!;
    stats.totalMessages++;
    stats.lastActivity = new Date();

    // Here you would typically:
    // 1. Route to appropriate agent
    // 2. Trigger workflows
    // 3. Generate AI responses
    // 4. Update conversation context
  }

  /**
   * Add message to conversation
   */
  private addMessageToConversation(conversationId: string, message: UnifiedMessage): void {
    let conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      // Create new conversation
      conversation = this.createConversation(
        message.channel,
        conversationId,
        [
          {
            id: message.from.id,
            name: message.from.name,
            role: 'user'
          }
        ]
      );
    }

    conversation.messages.push(message);
    conversation.metadata.lastActivity = new Date();
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(channel: ChannelType): ChannelStats {
    return {
      channel,
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
      averageResponseTime: 0,
      activeConversations: 0,
      lastActivity: new Date(),
      errorRate: 0
    };
  }
}

// Export singleton instance
export const communicationChannelsManager = new CommunicationChannelsManager();
export default communicationChannelsManager;

// Export types
export type {
  ChannelType,
  UnifiedMessage,
  ChannelConfig,
  ChannelStats,
  ConversationContext
};
/**
 * Channel Integrator
 * Manages integration with various communication channels
 */

import { supabase } from './supabase';

export interface ChannelConfig {
  id?: string;
  type: 'whatsapp' | 'slack' | 'webchat' | 'api' | 'webhook';
  name: string;
  description?: string;
  enabled: boolean;
  configuration: Record<string, any>;
  authentication?: Record<string, any>;
  testResults?: {
    status: 'pending' | 'success' | 'error';
    message: string;
    timestamp: string;
  };
}

export interface ChannelTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface ChannelMessage {
  id: string;
  channelId: string;
  channelType: string;
  direction: 'inbound' | 'outbound';
  content: {
    type: 'text' | 'image' | 'audio' | 'video' | 'file';
    data: any;
    metadata?: Record<string, any>;
  };
  sender: {
    id: string;
    name?: string;
    avatar?: string;
  };
  recipient: {
    id: string;
    name?: string;
  };
  timestamp: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
}

export interface WebhookEvent {
  id: string;
  channelId: string;
  channelType: string;
  eventType: string;
  payload: any;
  timestamp: string;
  processed: boolean;
  processingError?: string;
}

export class ChannelIntegrator {
  private static instance: ChannelIntegrator;
  private channels: Map<string, ChannelConfig> = new Map();
  private webhookHandlers: Map<string, (event: WebhookEvent) => Promise<void>> = new Map();

  static getInstance(): ChannelIntegrator {
    if (!ChannelIntegrator.instance) {
      ChannelIntegrator.instance = new ChannelIntegrator();
    }
    return ChannelIntegrator.instance;
  }

  constructor() {
    this.initializeWebhookHandlers();
  }

  /**
   * Test channel connection
   */
  async testChannelConnection(userId: string, config: ChannelConfig): Promise<ChannelTestResult> {
    try {
      switch (config.type) {
        case 'whatsapp':
          return await this.testWhatsAppConnection(config);
        case 'slack':
          return await this.testSlackConnection(config);
        case 'webchat':
          return await this.testWebChatConnection(config);
        case 'api':
          return await this.testApiConnection(config);
        case 'webhook':
          return await this.testWebhookConnection(config);
        default:
          return {
            success: false,
            message: `Unsupported channel type: ${config.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Connection test failed',
        details: error
      };
    }
  }

  /**
   * Save channel configuration
   */
  async saveChannelConfig(userId: string, config: ChannelConfig): Promise<ChannelConfig | null> {
    try {
      const channelData = {
        id: config.id || crypto.randomUUID(),
        user_id: userId,
        type: config.type,
        name: config.name,
        description: config.description,
        enabled: config.enabled,
        configuration: config.configuration,
        authentication: config.authentication,
        test_results: config.testResults
      };

      const { data, error } = config.id
        ? await supabase
            .from('channel_configs')
            .update(channelData)
            .eq('id', config.id)
            .eq('user_id', userId)
            .select()
            .single()
        : await supabase
            .from('channel_configs')
            .insert(channelData)
            .select()
            .single();

      if (error) throw error;

      const savedConfig = this.transformChannelData(data);
      this.channels.set(savedConfig.id!, savedConfig);
      
      return savedConfig;
    } catch (error) {
      console.error('Failed to save channel config:', error);
      return null;
    }
  }

  /**
   * Get user channel configurations
   */
  async getUserChannels(userId: string): Promise<ChannelConfig[]> {
    try {
      const { data, error } = await supabase
        .from('channel_configs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformChannelData);
    } catch (error) {
      console.error('Failed to get user channels:', error);
      return [];
    }
  }

  /**
   * Get channel by ID
   */
  async getChannel(channelId: string): Promise<ChannelConfig | null> {
    // Check cache first
    let channel = this.channels.get(channelId);
    if (channel) {
      return channel;
    }

    // Load from database
    try {
      const { data, error } = await supabase
        .from('channel_configs')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error || !data) {
        return null;
      }

      channel = this.transformChannelData(data);
      this.channels.set(channelId, channel);
      
      return channel;
    } catch (error) {
      console.error('Failed to get channel:', error);
      return null;
    }
  }

  /**
   * Delete channel configuration
   */
  async deleteChannel(userId: string, channelId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('channel_configs')
        .delete()
        .eq('id', channelId)
        .eq('user_id', userId);

      if (error) throw error;

      this.channels.delete(channelId);
      return true;
    } catch (error) {
      console.error('Failed to delete channel:', error);
      return false;
    }
  }

  /**
   * Send message through channel
   */
  async sendMessage(channelId: string, message: Omit<ChannelMessage, 'id' | 'timestamp' | 'status'>): Promise<ChannelMessage | null> {
    const channel = await this.getChannel(channelId);
    if (!channel || !channel.enabled) {
      return null;
    }

    const channelMessage: ChannelMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    try {
      switch (channel.type) {
        case 'whatsapp':
          await this.sendWhatsAppMessage(channel, channelMessage);
          break;
        case 'slack':
          await this.sendSlackMessage(channel, channelMessage);
          break;
        case 'webchat':
          await this.sendWebChatMessage(channel, channelMessage);
          break;
        case 'api':
          await this.sendApiMessage(channel, channelMessage);
          break;
        case 'webhook':
          await this.sendWebhookMessage(channel, channelMessage);
          break;
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`);
      }

      channelMessage.status = 'sent';
      
      // Save message to database
      await this.saveMessage(channelMessage);
      
      return channelMessage;
    } catch (error) {
      channelMessage.status = 'failed';
      channelMessage.error = error.message;
      
      await this.saveMessage(channelMessage);
      
      return channelMessage;
    }
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(channelId: string, payload: any): Promise<void> {
    const channel = await this.getChannel(channelId);
    if (!channel || !channel.enabled) {
      return;
    }

    const webhookEvent: WebhookEvent = {
      id: crypto.randomUUID(),
      channelId,
      channelType: channel.type,
      eventType: this.extractEventType(channel.type, payload),
      payload,
      timestamp: new Date().toISOString(),
      processed: false
    };

    try {
      // Save webhook event
      await this.saveWebhookEvent(webhookEvent);

      // Process webhook
      const handler = this.webhookHandlers.get(channel.type);
      if (handler) {
        await handler(webhookEvent);
        webhookEvent.processed = true;
      }

      // Update webhook event status
      await this.updateWebhookEvent(webhookEvent.id, { processed: true });
    } catch (error) {
      console.error('Failed to handle webhook:', error);
      webhookEvent.processingError = error.message;
      await this.updateWebhookEvent(webhookEvent.id, { 
        processed: false, 
        processingError: error.message 
      });
    }
  }

  /**
   * Test WhatsApp connection
   */
  private async testWhatsAppConnection(config: ChannelConfig): Promise<ChannelTestResult> {
    const { phoneNumberId, businessAccountId } = config.configuration;
    const { accessToken } = config.authentication || {};

    if (!phoneNumberId || !businessAccountId || !accessToken) {
      return {
        success: false,
        message: 'Missing required WhatsApp configuration'
      };
    }

    try {
      // Test API call to WhatsApp Business API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: `Successfully connected to WhatsApp Business phone number: ${data.display_phone_number || phoneNumberId}`,
          details: data
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          message: error.error?.message || 'WhatsApp API connection failed',
          details: error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error connecting to WhatsApp API',
        details: error
      };
    }
  }

  /**
   * Test Slack connection
   */
  private async testSlackConnection(config: ChannelConfig): Promise<ChannelTestResult> {
    const { botToken } = config.authentication || {};

    if (!botToken) {
      return {
        success: false,
        message: 'Missing Slack bot token'
      };
    }

    try {
      // Test API call to Slack
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.ok) {
        return {
          success: true,
          message: `Successfully connected to Slack workspace: ${data.team}`,
          details: data
        };
      } else {
        return {
          success: false,
          message: data.error || 'Slack API connection failed',
          details: data
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error connecting to Slack API',
        details: error
      };
    }
  }

  /**
   * Test WebChat connection
   */
  private async testWebChatConnection(config: ChannelConfig): Promise<ChannelTestResult> {
    // WebChat doesn't require external API testing
    return {
      success: true,
      message: 'Web chat widget configuration is valid'
    };
  }

  /**
   * Test API connection
   */
  private async testApiConnection(config: ChannelConfig): Promise<ChannelTestResult> {
    const { baseUrl } = config.configuration;
    const { type, token, username, password, keyName, keyValue } = config.authentication || {};

    if (!baseUrl) {
      return {
        success: false,
        message: 'Missing API base URL'
      };
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add authentication headers
      if (type === 'bearer' && token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (type === 'basic' && username && password) {
        headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
      } else if (type === 'apikey' && keyName && keyValue) {
        headers[keyName] = keyValue;
      }

      // Test API endpoint
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        return {
          success: true,
          message: 'API endpoint is accessible and authentication is valid'
        };
      } else {
        return {
          success: false,
          message: `API returned status ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error connecting to API endpoint',
        details: error
      };
    }
  }

  /**
   * Test Webhook connection
   */
  private async testWebhookConnection(config: ChannelConfig): Promise<ChannelTestResult> {
    const { url, method = 'POST' } = config.configuration;

    if (!url) {
      return {
        success: false,
        message: 'Missing webhook URL'
      };
    }

    try {
      // Send test webhook
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test webhook from Ojastack'
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ojastack-Webhook-Test/1.0'
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Webhook endpoint is accessible and responding correctly'
        };
      } else {
        return {
          success: false,
          message: `Webhook returned status ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network error connecting to webhook endpoint',
        details: error
      };
    }
  }

  /**
   * Send WhatsApp message
   */
  private async sendWhatsAppMessage(channel: ChannelConfig, message: ChannelMessage): Promise<void> {
    const { phoneNumberId } = channel.configuration;
    const { accessToken } = channel.authentication || {};

    const payload = {
      messaging_product: 'whatsapp',
      to: message.recipient.id,
      type: message.content.type,
      [message.content.type]: message.content.data
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'WhatsApp message send failed');
    }
  }

  /**
   * Send Slack message
   */
  private async sendSlackMessage(channel: ChannelConfig, message: ChannelMessage): Promise<void> {
    const { botToken } = channel.authentication || {};

    const payload = {
      channel: message.recipient.id,
      text: message.content.data.text || message.content.data,
      username: channel.configuration.botName || 'Assistant'
    };

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Slack message send failed');
    }
  }

  /**
   * Send WebChat message
   */
  private async sendWebChatMessage(channel: ChannelConfig, message: ChannelMessage): Promise<void> {
    // WebChat messages are handled through WebSocket or Server-Sent Events
    // This would integrate with your real-time messaging system
    console.log('Sending WebChat message:', message);
  }

  /**
   * Send API message
   */
  private async sendApiMessage(channel: ChannelConfig, message: ChannelMessage): Promise<void> {
    const { baseUrl, version } = channel.configuration;
    const { type, token, username, password, keyName, keyValue } = channel.authentication || {};

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Add authentication headers
    if (type === 'bearer' && token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (type === 'basic' && username && password) {
      headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
    } else if (type === 'apikey' && keyName && keyValue) {
      headers[keyName] = keyValue;
    }

    const url = version ? `${baseUrl}/${version}/messages` : `${baseUrl}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`API message send failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Webhook message
   */
  private async sendWebhookMessage(channel: ChannelConfig, message: ChannelMessage): Promise<void> {
    const { url, method = 'POST', contentType = 'application/json' } = channel.configuration;

    const headers: Record<string, string> = {
      'Content-Type': contentType
    };

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Webhook message send failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Save message to database
   */
  private async saveMessage(message: ChannelMessage): Promise<void> {
    try {
      await supabase
        .from('channel_messages')
        .insert({
          id: message.id,
          channel_id: message.channelId,
          channel_type: message.channelType,
          direction: message.direction,
          content: message.content,
          sender: message.sender,
          recipient: message.recipient,
          timestamp: message.timestamp,
          status: message.status,
          error: message.error
        });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  }

  /**
   * Save webhook event to database
   */
  private async saveWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      await supabase
        .from('webhook_events')
        .insert({
          id: event.id,
          channel_id: event.channelId,
          channel_type: event.channelType,
          event_type: event.eventType,
          payload: event.payload,
          timestamp: event.timestamp,
          processed: event.processed,
          processing_error: event.processingError
        });
    } catch (error) {
      console.error('Failed to save webhook event:', error);
    }
  }

  /**
   * Update webhook event
   */
  private async updateWebhookEvent(eventId: string, updates: Partial<WebhookEvent>): Promise<void> {
    try {
      await supabase
        .from('webhook_events')
        .update(updates)
        .eq('id', eventId);
    } catch (error) {
      console.error('Failed to update webhook event:', error);
    }
  }

  /**
   * Extract event type from webhook payload
   */
  private extractEventType(channelType: string, payload: any): string {
    switch (channelType) {
      case 'whatsapp':
        return payload.entry?.[0]?.changes?.[0]?.field || 'unknown';
      case 'slack':
        return payload.type || 'unknown';
      default:
        return payload.event_type || payload.type || 'unknown';
    }
  }

  /**
   * Initialize webhook handlers
   */
  private initializeWebhookHandlers(): void {
    // WhatsApp webhook handler
    this.webhookHandlers.set('whatsapp', async (event: WebhookEvent) => {
      const { payload } = event;
      
      if (payload.entry?.[0]?.changes?.[0]?.value?.messages) {
        const messages = payload.entry[0].changes[0].value.messages;
        
        for (const msg of messages) {
          const channelMessage: ChannelMessage = {
            id: crypto.randomUUID(),
            channelId: event.channelId,
            channelType: event.channelType,
            direction: 'inbound',
            content: {
              type: msg.type,
              data: msg[msg.type],
              metadata: msg
            },
            sender: {
              id: msg.from,
              name: payload.entry[0].changes[0].value.contacts?.[0]?.profile?.name
            },
            recipient: {
              id: payload.entry[0].changes[0].value.metadata.phone_number_id
            },
            timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
            status: 'delivered'
          };

          await this.saveMessage(channelMessage);
        }
      }
    });

    // Slack webhook handler
    this.webhookHandlers.set('slack', async (event: WebhookEvent) => {
      const { payload } = event;
      
      if (payload.type === 'message' && !payload.bot_id) {
        const channelMessage: ChannelMessage = {
          id: crypto.randomUUID(),
          channelId: event.channelId,
          channelType: event.channelType,
          direction: 'inbound',
          content: {
            type: 'text',
            data: { text: payload.text },
            metadata: payload
          },
          sender: {
            id: payload.user,
            name: payload.username
          },
          recipient: {
            id: payload.channel
          },
          timestamp: new Date(parseFloat(payload.ts) * 1000).toISOString(),
          status: 'delivered'
        };

        await this.saveMessage(channelMessage);
      }
    });
  }

  /**
   * Transform database data to ChannelConfig
   */
  private transformChannelData(data: any): ChannelConfig {
    return {
      id: data.id,
      type: data.type,
      name: data.name,
      description: data.description,
      enabled: data.enabled,
      configuration: data.configuration || {},
      authentication: data.authentication || {},
      testResults: data.test_results
    };
  }
}

export default ChannelIntegrator;
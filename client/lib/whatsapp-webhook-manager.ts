/**
 * WhatsApp Webhook Manager
 * Manages user-specific webhooks for dynamic message routing
 */

import { supabase } from './supabase';
import { whatsappCredentialManager } from './whatsapp-credential-manager';

export interface WebhookConfiguration {
  id: string;
  user_id: string;
  credential_id: string;
  webhook_url: string;
  webhook_token: string;
  phone_number_id: string;
  status: 'active' | 'pending' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive';
  content: any;
  phone_number_id: string;
}

export interface MessageRoutingResult {
  success: boolean;
  agent_id?: string;
  conversation_id?: string;
  error?: string;
}

export class WhatsAppWebhookManager {
  private static instance: WhatsAppWebhookManager;
  private baseUrl = 'https://graph.facebook.com/v18.0';
  private siteUrl = process.env.SITE_URL || 'https://ojastack.tech';

  static getInstance(): WhatsAppWebhookManager {
    if (!WhatsAppWebhookManager.instance) {
      WhatsAppWebhookManager.instance = new WhatsAppWebhookManager();
    }
    return WhatsAppWebhookManager.instance;
  }

  /**
   * Generate unique webhook URL for user/credential combination
   */
  generateWebhookUrl(userId: string, credentialId: string): string {
    // Create a unique identifier combining user and credential
    const identifier = btoa(`${userId}:${credentialId}`).replace(/[+/=]/g, '');
    return `${this.siteUrl}/.netlify/functions/whatsapp-webhook?id=${identifier}`;
  }

  /**
   * Configure webhook with WhatsApp Business API
   */
  async configureWebhook(credentialId: string): Promise<WebhookConfiguration> {
    try {
      // Get credential with decrypted token
      const credentialData = await whatsappCredentialManager.getCredentialWithDecryptedToken(credentialId);
      if (!credentialData) {
        throw new Error('Credential not found');
      }

      const { credential, decrypted_token } = credentialData;

      // Generate webhook URL and token
      const webhookUrl = this.generateWebhookUrl(credential.user_id, credentialId);
      const webhookToken = this.generateWebhookToken();

      // Configure webhook with WhatsApp API
      const configureResponse = await this.setWhatsAppWebhook(
        credential.phone_number_id,
        webhookUrl,
        credential.webhook_verify_token,
        decrypted_token
      );

      if (!configureResponse.success) {
        throw new Error(configureResponse.error);
      }

      // Store webhook configuration in database
      const { data, error } = await supabase
        .from('whatsapp_webhooks')
        .insert({
          user_id: credential.user_id,
          credential_id: credentialId,
          webhook_url: webhookUrl,
          webhook_token: webhookToken,
          phone_number_id: credential.phone_number_id,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`Webhook configured for credential: ${credentialId}`);
      return data;
    } catch (error) {
      console.error('Failed to configure webhook:', error);
      throw new Error(`Failed to configure webhook: ${error.message}`);
    }
  }

  /**
   * Update webhook configuration
   */
  async updateWebhookConfiguration(
    webhookId: string, 
    config: Partial<WebhookConfiguration>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('whatsapp_webhooks')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhookId);

      if (error) {
        throw error;
      }

      console.log(`Webhook configuration updated: ${webhookId}`);
    } catch (error) {
      console.error('Failed to update webhook configuration:', error);
      throw new Error(`Failed to update webhook configuration: ${error.message}`);
    }
  }

  /**
   * Remove webhook configuration
   */
  async removeWebhook(webhookId: string): Promise<void> {
    try {
      // Get webhook details first
      const { data: webhook, error: fetchError } = await supabase
        .from('whatsapp_webhooks')
        .select('*, whatsapp_credentials(*)')
        .eq('id', webhookId)
        .single();

      if (fetchError || !webhook) {
        throw new Error('Webhook not found');
      }

      // Get decrypted token for API call
      const credentialData = await whatsappCredentialManager.getCredentialWithDecryptedToken(
        webhook.credential_id
      );

      if (credentialData) {
        // Remove webhook from WhatsApp API
        await this.removeWhatsAppWebhook(
          webhook.phone_number_id,
          credentialData.decrypted_token
        );
      }

      // Delete from database
      const { error } = await supabase
        .from('whatsapp_webhooks')
        .delete()
        .eq('id', webhookId);

      if (error) {
        throw error;
      }

      console.log(`Webhook removed: ${webhookId}`);
    } catch (error) {
      console.error('Failed to remove webhook:', error);
      throw new Error(`Failed to remove webhook: ${error.message}`);
    }
  }

  /**
   * Route incoming message to appropriate agent
   */
  async routeIncomingMessage(webhookUrl: string, message: WhatsAppMessage): Promise<MessageRoutingResult> {
    try {
      // Extract user and credential ID from webhook URL
      const urlParams = new URL(webhookUrl).searchParams;
      const identifier = urlParams.get('id');
      
      if (!identifier) {
        throw new Error('Invalid webhook URL format');
      }

      // Decode user and credential ID
      const decoded = atob(identifier);
      const [userId, credentialId] = decoded.split(':');

      if (!userId || !credentialId) {
        throw new Error('Invalid webhook identifier');
      }

      // Find target agent for this phone number and user
      const agentId = await this.identifyTargetAgent(message.phone_number_id, userId);
      
      if (!agentId) {
        return {
          success: false,
          error: 'No agent configured for this phone number'
        };
      }

      // Store message in database
      await this.storeIncomingMessage(message, agentId, credentialId);

      // Route to agent runtime for processing
      await this.forwardToAgentRuntime(agentId, message);

      return {
        success: true,
        agent_id: agentId
      };
    } catch (error) {
      console.error('Message routing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Identify target agent for incoming message
   */
  async identifyTargetAgent(phoneNumberId: string, userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('agent_whatsapp_configs')
        .select('agent_id, agents!inner(*)')
        .eq('phone_number_id', phoneNumberId)
        .eq('enabled', true)
        .eq('agents.user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.agent_id;
    } catch (error) {
      console.error('Failed to identify target agent:', error);
      return null;
    }
  }

  /**
   * Get webhook configuration by URL
   */
  async getWebhookByUrl(webhookUrl: string): Promise<WebhookConfiguration | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_webhooks')
        .select('*')
        .eq('webhook_url', webhookUrl)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get webhook by URL:', error);
      return null;
    }
  }

  /**
   * Get all webhooks for a user
   */
  async getUserWebhooks(userId: string): Promise<WebhookConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_webhooks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get user webhooks:', error);
      return [];
    }
  }

  /**
   * Set webhook URL with WhatsApp Business API
   */
  private async setWhatsAppWebhook(
    phoneNumberId: string,
    webhookUrl: string,
    verifyToken: string,
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${phoneNumberId}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscribed_fields: ['messages', 'message_deliveries', 'message_reads', 'message_reactions']
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `API Error: ${response.status}`
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set webhook: ${error.message}`
      };
    }
  }

  /**
   * Remove webhook from WhatsApp Business API
   */
  private async removeWhatsAppWebhook(
    phoneNumberId: string,
    accessToken: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${phoneNumberId}/subscribed_apps`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `API Error: ${response.status}`
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove webhook: ${error.message}`
      };
    }
  }

  /**
   * Store incoming message in database
   */
  private async storeIncomingMessage(
    message: WhatsAppMessage,
    agentId: string,
    credentialId: string
  ): Promise<void> {
    try {
      await supabase
        .from('whatsapp_messages')
        .insert({
          agent_id: agentId,
          credential_id: credentialId,
          whatsapp_message_id: message.id,
          from_phone: message.from,
          to_phone: message.to,
          direction: 'inbound',
          message_type: message.type,
          content: message.content,
          timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
        });
    } catch (error) {
      console.error('Failed to store incoming message:', error);
      // Don't throw here to avoid breaking message processing
    }
  }

  /**
   * Forward message to agent runtime for processing
   */
  private async forwardToAgentRuntime(agentId: string, message: WhatsAppMessage): Promise<void> {
    try {
      // Import agent runtime dynamically to avoid circular dependencies
      const { agentRuntime } = await import('./agent-runtime');
      
      // Process the message through the agent
      await agentRuntime.processWhatsAppMessage(agentId, message);
    } catch (error) {
      console.error('Failed to forward message to agent runtime:', error);
      throw error;
    }
  }

  /**
   * Generate secure webhook token
   */
  private generateWebhookToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/[+/]/g, '')
      .substring(0, 32);
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(userId?: string): Promise<{
    total_webhooks: number;
    active_webhooks: number;
    failed_webhooks: number;
    last_activity: string | null;
  }> {
    try {
      let query = supabase.from('whatsapp_webhooks').select('status, updated_at');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return {
        total_webhooks: data?.length || 0,
        active_webhooks: data?.filter(w => w.status === 'active').length || 0,
        failed_webhooks: data?.filter(w => w.status === 'failed').length || 0,
        last_activity: data?.reduce((latest, current) => {
          if (!current.updated_at) return latest;
          if (!latest) return current.updated_at;
          return current.updated_at > latest ? current.updated_at : latest;
        }, null as string | null)
      };
    } catch (error) {
      console.error('Failed to get webhook stats:', error);
      return {
        total_webhooks: 0,
        active_webhooks: 0,
        failed_webhooks: 0,
        last_activity: null
      };
    }
  }
}

// Export singleton instance
export const whatsappWebhookManager = WhatsAppWebhookManager.getInstance();
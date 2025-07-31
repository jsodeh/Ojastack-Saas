/**
 * Enhanced WhatsApp Business API Integration
 * Advanced WhatsApp features using user-provided credentials
 * No platform-level credentials required
 */

import { whatsappCredentialManager, type WhatsAppCredentials } from './whatsapp-credential-manager';
import { encryptionService } from './encryption-service';

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  businessAccountId: string;
  displayName: string;
}

interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive' | 'template';
  content: {
    text?: string;
    media?: {
      id: string;
      url?: string;
      caption?: string;
      filename?: string;
      mimeType?: string;
    };
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
    contacts?: Array<{
      name: { formatted_name: string; first_name?: string; last_name?: string };
      phones?: Array<{ phone: string; type?: string }>;
      emails?: Array<{ email: string; type?: string }>;
    }>;
    interactive?: {
      type: 'button' | 'list';
      header?: { type: 'text' | 'image' | 'video' | 'document'; text?: string; media?: any };
      body: { text: string };
      footer?: { text: string };
      action: {
        buttons?: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
        sections?: Array<{
          title: string;
          rows: Array<{ id: string; title: string; description?: string }>;
        }>;
      };
    };
  };
  context?: {
    message_id: string;
  };
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  error?: {
    code: number;
    title: string;
    message: string;
  };
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    example?: {
      header_text?: string[];
      body_text?: string[][];
    };
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

interface WhatsAppContact {
  wa_id: string;
  profile: {
    name: string;
  };
  last_seen?: string;
  status?: 'online' | 'offline';
  labels?: string[];
  custom_fields?: Record<string, any>;
}

interface WhatsAppAnalytics {
  conversation_analytics: {
    conversation_directions: Array<{
      direction: 'business_initiated' | 'user_initiated';
      conversation_type: 'regular' | 'free_tier' | 'free_entry_point';
      count: number;
    }>;
    conversation_types: Array<{
      conversation_type: string;
      count: number;
    }>;
  };
  phone_number_analytics: {
    country_codes: Array<{
      country_code: string;
      count: number;
    }>;
  };
}

class EnhancedWhatsAppService {
  private baseUrl = 'https://graph.facebook.com/v18.0';
  private messageQueue: Map<string, WhatsAppMessage[]> = new Map();
  private contactCache: Map<string, WhatsAppContact> = new Map();
  private templates: Map<string, WhatsAppTemplate> = new Map();

  constructor() {
    // No platform-level configuration needed
    console.log('Enhanced WhatsApp Service initialized with user-credential support');
  }

  /**
   * Get user's WhatsApp configuration
   */
  private async getUserConfig(userId: string, credentialId: string): Promise<WhatsAppConfig | null> {
    try {
      const credentialData = await whatsappCredentialManager.getCredentialWithDecryptedToken(credentialId);
      if (!credentialData) {
        return null;
      }

      const { credential, decrypted_token } = credentialData;
      
      return {
        accessToken: decrypted_token,
        phoneNumberId: credential.phone_number_id,
        webhookVerifyToken: credential.webhook_verify_token,
        businessAccountId: credential.business_account_id,
        displayName: credential.display_name
      };
    } catch (error) {
      console.error('Failed to get user WhatsApp config:', error);
      return null;
    }
  }

  /**
   * Check if WhatsApp service is available for a user
   */
  async isAvailable(userId: string, credentialId: string): Promise<boolean> {
    const config = await this.getUserConfig(userId, credentialId);
    return !!(config?.accessToken && config?.phoneNumberId);
  }

  /**
   * Send text message
   */
  async sendTextMessage(
    userId: string, 
    credentialId: string, 
    to: string, 
    text: string, 
    context?: { message_id: string }
  ): Promise<WhatsAppMessage> {
    const messageData = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
      ...(context && { context })
    };

    return this.sendMessage(userId, credentialId, messageData);
  }

  /**
   * Send multimedia message (image, audio, video, document)
   */
  async sendMediaMessage(
    userId: string,
    credentialId: string,
    to: string,
    mediaType: 'image' | 'audio' | 'video' | 'document',
    mediaId: string,
    caption?: string,
    filename?: string
  ): Promise<WhatsAppMessage> {
    const messageData = {
      messaging_product: 'whatsapp',
      to,
      type: mediaType,
      [mediaType]: {
        id: mediaId,
        ...(caption && { caption }),
        ...(filename && { filename })
      }
    };

    return this.sendMessage(messageData);
  }

  /**
   * Send location message
   */
  async sendLocationMessage(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<WhatsAppMessage> {
    const messageData = {
      messaging_product: 'whatsapp',
      to,
      type: 'location',
      location: {
        latitude,
        longitude,
        ...(name && { name }),
        ...(address && { address })
      }
    };

    return this.sendMessage(messageData);
  }

  /**
   * Send contact message
   */
  async sendContactMessage(to: string, contacts: WhatsAppMessage['content']['contacts']): Promise<WhatsAppMessage> {
    const messageData = {
      messaging_product: 'whatsapp',
      to,
      type: 'contacts',
      contacts
    };

    return this.sendMessage(messageData);
  }

  /**
   * Send interactive button message
   */
  async sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string
  ): Promise<WhatsAppMessage> {
    const messageData = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        ...(headerText && { header: { type: 'text', text: headerText } }),
        body: { text: bodyText },
        ...(footerText && { footer: { text: footerText } }),
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title }
          }))
        }
      }
    };

    return this.sendMessage(messageData);
  }

  /**
   * Send interactive list message
   */
  async sendListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    headerText?: string,
    footerText?: string
  ): Promise<WhatsAppMessage> {
    const messageData = {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(headerText && { header: { type: 'text', text: headerText } }),
        body: { text: bodyText },
        ...(footerText && { footer: { text: footerText } }),
        action: {
          button: buttonText,
          sections
        }
      }
    };

    return this.sendMessage(messageData);
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    parameters?: {
      header?: string[];
      body?: string[];
    }
  ): Promise<WhatsAppMessage> {
    const components = [];

    if (parameters?.header) {
      components.push({
        type: 'header',
        parameters: parameters.header.map(param => ({ type: 'text', text: param }))
      });
    }

    if (parameters?.body) {
      components.push({
        type: 'body',
        parameters: parameters.body.map(param => ({ type: 'text', text: param }))
      });
    }

    const messageData = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length > 0 && { components })
      }
    };

    return this.sendMessage(messageData);
  }

  /**
   * Upload media file
   */
  async uploadMedia(file: File, type: 'image' | 'audio' | 'video' | 'document'): Promise<{ id: string }> {
    if (!this.isAvailable()) {
      throw new Error('WhatsApp service not available');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('messaging_product', 'whatsapp');

    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Media upload failed: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return { id: data.id };
    } catch (error) {
      console.error('Failed to upload media:', error);
      throw error;
    }
  }

  /**
   * Download media file
   */
  async downloadMedia(mediaId: string): Promise<{ url: string; mimeType: string; sha256: string }> {
    if (!this.isAvailable()) {
      throw new Error('WhatsApp service not available');
    }

    try {
      // First, get media URL
      const response = await fetch(`${this.baseUrl}/${mediaId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get media URL: ${response.statusText}`);
      }

      const mediaData = await response.json();
      return {
        url: mediaData.url,
        mimeType: mediaData.mime_type,
        sha256: mediaData.sha256
      };
    } catch (error) {
      console.error('Failed to download media:', error);
      throw error;
    }
  }

  /**
   * Get message templates
   */
  async getMessageTemplates(): Promise<WhatsAppTemplate[]> {
    if (!this.isAvailable()) {
      throw new Error('WhatsApp service not available');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.businessAccountId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get templates: ${response.statusText}`);
      }

      const data = await response.json();
      const templates = data.data || [];
      
      // Cache templates
      templates.forEach((template: WhatsAppTemplate) => {
        this.templates.set(template.name, template);
      });

      return templates;
    } catch (error) {
      console.error('Failed to get message templates:', error);
      throw error;
    }
  }

  /**
   * Create message template
   */
  async createMessageTemplate(template: {
    name: string;
    category: WhatsAppTemplate['category'];
    language: string;
    components: WhatsAppTemplate['components'];
  }): Promise<WhatsAppTemplate> {
    if (!this.isAvailable()) {
      throw new Error('WhatsApp service not available');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.businessAccountId}/message_templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(template)
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Template creation failed: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to create message template:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('WhatsApp service not available');
    }

    try {
      await fetch(`${this.baseUrl}/${this.config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  /**
   * Get contact information
   */
  async getContact(phoneNumber: string): Promise<WhatsAppContact | null> {
    // Check cache first
    if (this.contactCache.has(phoneNumber)) {
      return this.contactCache.get(phoneNumber)!;
    }

    if (!this.isAvailable()) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${phoneNumber}?fields=name,profile_pic`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`
          }
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const contact: WhatsAppContact = {
        wa_id: phoneNumber,
        profile: {
          name: data.name || 'Unknown'
        }
      };

      // Cache contact
      this.contactCache.set(phoneNumber, contact);
      return contact;
    } catch (error) {
      console.error('Failed to get contact:', error);
      return null;
    }
  }

  /**
   * Get business analytics
   */
  async getAnalytics(
    start: string,
    end: string,
    granularity: 'HOUR' | 'DAY' | 'MONTH' = 'DAY'
  ): Promise<WhatsAppAnalytics> {
    if (!this.isAvailable()) {
      throw new Error('WhatsApp service not available');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/analytics?start=${start}&end=${end}&granularity=${granularity}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }

  /**
   * Handle webhook verification
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(body: any): Promise<WhatsAppMessage[]> {
    const messages: WhatsAppMessage[] = [];

    try {
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const value = change.value;

              // Process incoming messages
              if (value.messages) {
                for (const message of value.messages) {
                  const processedMessage = await this.processIncomingMessage(message, value.contacts?.[0]);
                  messages.push(processedMessage);
                }
              }

              // Process message statuses
              if (value.statuses) {
                for (const status of value.statuses) {
                  await this.processMessageStatus(status);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to process webhook:', error);
    }

    return messages;
  }

  /**
   * Get conversation history
   */
  getConversationHistory(phoneNumber: string): WhatsAppMessage[] {
    return this.messageQueue.get(phoneNumber) || [];
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(phoneNumber: string): void {
    this.messageQueue.delete(phoneNumber);
  }

  /**
   * Test WhatsApp connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'WhatsApp credentials not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.config.phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error?.message || 'Connection failed' };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Private methods

  /**
   * Send message via WhatsApp API using user credentials
   */
  private async sendMessage(userId: string, credentialId: string, messageData: any): Promise<WhatsAppMessage> {
    const config = await this.getUserConfig(userId, credentialId);
    if (!config) {
      throw new Error('WhatsApp credentials not found or invalid');
    }

    try {
      const response = await fetch(`${this.baseUrl}/${config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Message send failed: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Create message object
      const message: WhatsAppMessage = {
        id: data.messages[0].id,
        from: config.phoneNumberId,
        to: messageData.to,
        timestamp: new Date().toISOString(),
        type: messageData.type,
        content: this.extractMessageContent(messageData),
        status: 'sent'
      };

      // Add to conversation history
      this.addToConversationHistory(messageData.to, message);

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Process incoming message
   */
  private async processIncomingMessage(message: any, contact?: any): Promise<WhatsAppMessage> {
    const processedMessage: WhatsAppMessage = {
      id: message.id,
      from: message.from,
      to: this.config.phoneNumberId,
      timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
      type: message.type,
      content: this.extractIncomingMessageContent(message),
      status: 'delivered'
    };

    // Add contact to cache if provided
    if (contact) {
      this.contactCache.set(message.from, {
        wa_id: contact.wa_id,
        profile: contact.profile
      });
    }

    // Add to conversation history
    this.addToConversationHistory(message.from, processedMessage);

    // Mark as read
    await this.markMessageAsRead(message.id);

    return processedMessage;
  }

  /**
   * Process message status update
   */
  private async processMessageStatus(status: any): Promise<void> {
    // Update message status in conversation history
    const conversations = Array.from(this.messageQueue.values());
    for (const messages of conversations) {
      const message = messages.find(m => m.id === status.id);
      if (message) {
        message.status = status.status;
        break;
      }
    }
  }

  /**
   * Extract message content from outgoing message data
   */
  private extractMessageContent(messageData: any): WhatsAppMessage['content'] {
    const content: WhatsAppMessage['content'] = {};

    switch (messageData.type) {
      case 'text':
        content.text = messageData.text.body;
        break;
      case 'image':
      case 'audio':
      case 'video':
      case 'document':
        content.media = {
          id: messageData[messageData.type].id,
          caption: messageData[messageData.type].caption,
          filename: messageData[messageData.type].filename
        };
        break;
      case 'location':
        content.location = messageData.location;
        break;
      case 'contacts':
        content.contacts = messageData.contacts;
        break;
      case 'interactive':
        content.interactive = messageData.interactive;
        break;
    }

    return content;
  }

  /**
   * Extract content from incoming message
   */
  private extractIncomingMessageContent(message: any): WhatsAppMessage['content'] {
    const content: WhatsAppMessage['content'] = {};

    switch (message.type) {
      case 'text':
        content.text = message.text.body;
        break;
      case 'image':
      case 'audio':
      case 'video':
      case 'document':
        content.media = {
          id: message[message.type].id,
          caption: message[message.type].caption,
          filename: message[message.type].filename,
          mimeType: message[message.type].mime_type
        };
        break;
      case 'location':
        content.location = message.location;
        break;
      case 'contacts':
        content.contacts = message.contacts;
        break;
      case 'interactive':
        if (message.interactive.type === 'button_reply') {
          content.text = message.interactive.button_reply.title;
        } else if (message.interactive.type === 'list_reply') {
          content.text = message.interactive.list_reply.title;
        }
        break;
    }

    return content;
  }

  /**
   * Add message to conversation history
   */
  private addToConversationHistory(phoneNumber: string, message: WhatsAppMessage): void {
    if (!this.messageQueue.has(phoneNumber)) {
      this.messageQueue.set(phoneNumber, []);
    }
    
    const messages = this.messageQueue.get(phoneNumber)!;
    messages.push(message);
    
    // Keep only last 100 messages per conversation
    if (messages.length > 100) {
      messages.splice(0, messages.length - 100);
    }
  }
}

// Export singleton instance
export const enhancedWhatsAppService = new EnhancedWhatsAppService();
export default enhancedWhatsAppService;

// Export types
export type {
  WhatsAppMessage,
  WhatsAppTemplate,
  WhatsAppContact,
  WhatsAppAnalytics
};
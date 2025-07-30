// WhatsApp Business API Deployment System

export interface WhatsAppDeployment {
  id: string;
  user_id: string;
  agent_id: string;
  business_phone_number: string;
  display_name: string;
  access_token: string;
  webhook_verify_token: string;
  business_account_id: string;
  webhook_url: string;
  status: 'pending' | 'active' | 'error' | 'suspended';
  created_at: string;
  last_message_at?: string;
}

export class WhatsAppDeploymentService {
  private baseUrl = 'https://graph.facebook.com/v18.0';

  // Step 1: Validate WhatsApp Business credentials
  async validateCredentials(credentials: WhatsAppCredentials): Promise<ValidationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/${credentials.business_account_id}`, {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });

      if (!response.ok) {
        return { valid: false, error: 'Invalid credentials' };
      }

      const data = await response.json();
      return { 
        valid: true, 
        businessInfo: {
          name: data.name,
          phone_numbers: data.phone_numbers
        }
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Step 2: Configure webhook for the business phone number
  async configureWebhook(deployment: WhatsAppDeployment): Promise<WebhookResult> {
    try {
      // Generate unique webhook URL for this deployment
      const webhookUrl = `${process.env.SITE_URL}/api/webhooks/whatsapp/${deployment.id}`;
      
      // Set webhook URL in WhatsApp Business API
      const response = await fetch(`${this.baseUrl}/${deployment.business_account_id}/subscribed_apps`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deployment.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscribed_fields: ['messages', 'message_deliveries', 'message_reads', 'message_reactions']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to configure webhook');
      }

      return { success: true, webhookUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Step 3: Deploy agent to WhatsApp
  async deployAgent(agentId: string, whatsappConfig: WhatsAppConfig): Promise<WhatsAppDeployment> {
    try {
      // 1. Validate credentials
      const validation = await this.validateCredentials(whatsappConfig);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 2. Create deployment record
      const deployment: WhatsAppDeployment = {
        id: `wa_${Date.now()}`,
        user_id: whatsappConfig.user_id,
        agent_id: agentId,
        business_phone_number: whatsappConfig.phone_number,
        display_name: validation.businessInfo.name,
        access_token: whatsappConfig.access_token,
        webhook_verify_token: this.generateVerifyToken(),
        business_account_id: whatsappConfig.business_account_id,
        webhook_url: '',
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // 3. Configure webhook
      const webhookResult = await this.configureWebhook(deployment);
      if (!webhookResult.success) {
        throw new Error(webhookResult.error);
      }

      deployment.webhook_url = webhookResult.webhookUrl;
      deployment.status = 'active';

      // 4. Store in database
      await this.saveDeployment(deployment);

      // 5. Send welcome message (optional)
      await this.sendWelcomeMessage(deployment);

      return deployment;
    } catch (error) {
      console.error('WhatsApp deployment failed:', error);
      throw error;
    }
  }

  // Handle incoming WhatsApp messages
  async handleIncomingMessage(webhookData: WhatsAppWebhookData): Promise<void> {
    try {
      const { entry } = webhookData;
      
      for (const change of entry[0].changes) {
        if (change.field === 'messages') {
          const message = change.value.messages[0];
          const contact = change.value.contacts[0];
          
          // Find deployment for this phone number
          const deployment = await this.findDeploymentByPhoneNumber(
            change.value.metadata.phone_number_id
          );

          if (!deployment) {
            console.error('No deployment found for phone number');
            return;
          }

          // Process message with agent
          await this.processMessageWithAgent(deployment, message, contact);
        }
      }
    } catch (error) {
      console.error('Error handling WhatsApp message:', error);
    }
  }

  // Process message with the assigned agent
  private async processMessageWithAgent(
    deployment: WhatsAppDeployment,
    message: WhatsAppMessage,
    contact: WhatsAppContact
  ): Promise<void> {
    try {
      // Get agent configuration
      const agent = await this.getAgent(deployment.agent_id);
      
      // Create or get conversation context
      const context = await this.getOrCreateConversation(
        deployment.agent_id,
        contact.wa_id,
        'whatsapp'
      );

      // Process message based on type
      let response: string;
      
      if (message.type === 'text') {
        // Process text message
        const conversationalAI = new ConversationalAI(
          process.env.OPENAI_API_KEY,
          process.env.ELEVENLABS_API_KEY
        );
        
        const result = await conversationalAI.processTextMessage(
          message.text.body,
          context,
          agent
        );
        
        response = result.response;
        
        // Handle escalation if needed
        if (result.needsEscalation) {
          await this.handleEscalation(deployment, context);
        }
      } else if (message.type === 'audio') {
        // Process voice message
        const audioBlob = await this.downloadWhatsAppMedia(message.audio.id, deployment.access_token);
        
        const conversationalAI = new ConversationalAI(
          process.env.OPENAI_API_KEY,
          process.env.ELEVENLABS_API_KEY
        );
        
        const result = await conversationalAI.processVoiceMessage(
          audioBlob,
          context,
          agent
        );
        
        response = result.response;
        
        // Send voice response if agent is configured for voice
        if (agent.voice_settings && result.audioBuffer) {
          await this.sendVoiceMessage(deployment, contact.wa_id, result.audioBuffer);
          return;
        }
      } else {
        response = "I can help you with text and voice messages. Please send me a message!";
      }

      // Send text response
      await this.sendTextMessage(deployment, contact.wa_id, response);
      
      // Update conversation
      await this.updateConversation(context, message, response);
      
    } catch (error) {
      console.error('Error processing message with agent:', error);
      
      // Send error message to customer
      await this.sendTextMessage(
        deployment,
        contact.wa_id,
        "I'm sorry, I'm experiencing technical difficulties. Please try again in a moment."
      );
    }
  }

  // Send text message via WhatsApp API
  async sendTextMessage(deployment: WhatsAppDeployment, to: string, message: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${deployment.business_phone_number}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deployment.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: message }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      console.log('Message sent successfully to', to);
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }

  // Send voice message via WhatsApp API
  async sendVoiceMessage(deployment: WhatsAppDeployment, to: string, audioBuffer: ArrayBuffer): Promise<void> {
    try {
      // 1. Upload audio to WhatsApp
      const mediaId = await this.uploadAudioToWhatsApp(audioBuffer, deployment.access_token);
      
      // 2. Send audio message
      const response = await fetch(`${this.baseUrl}/${deployment.business_phone_number}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deployment.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'audio',
          audio: { id: mediaId }
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send voice message: ${response.statusText}`);
      }

      console.log('Voice message sent successfully to', to);
    } catch (error) {
      console.error('Error sending WhatsApp voice message:', error);
      throw error;
    }
  }

  // Helper methods
  private generateVerifyToken(): string {
    return `verify_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async saveDeployment(deployment: WhatsAppDeployment): Promise<void> {
    // Save to Supabase
    const { error } = await supabase
      .from('whatsapp_deployments')
      .insert(deployment);
    
    if (error) throw error;
  }

  private async findDeploymentByPhoneNumber(phoneNumberId: string): Promise<WhatsAppDeployment | null> {
    const { data, error } = await supabase
      .from('whatsapp_deployments')
      .select('*')
      .eq('business_phone_number', phoneNumberId)
      .eq('status', 'active')
      .single();
    
    return error ? null : data;
  }

  private async getAgent(agentId: string): Promise<AgentConfig> {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (error) throw error;
    return data;
  }

  private async getOrCreateConversation(agentId: string, customerId: string, channel: string): Promise<ConversationContext> {
    // Implementation for conversation management
    return {
      conversationId: `conv_${Date.now()}`,
      agentId,
      customerId,
      history: [],
      metadata: {}
    };
  }

  private async downloadWhatsAppMedia(mediaId: string, accessToken: string): Promise<Blob> {
    // Download media from WhatsApp API
    const response = await fetch(`${this.baseUrl}/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return await response.blob();
  }

  private async uploadAudioToWhatsApp(audioBuffer: ArrayBuffer, accessToken: string): Promise<string> {
    // Upload audio to WhatsApp and return media ID
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }));
    formData.append('type', 'audio/ogg');
    formData.append('messaging_product', 'whatsapp');

    const response = await fetch(`${this.baseUrl}/media`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: formData
    });

    const data = await response.json();
    return data.id;
  }

  private async sendWelcomeMessage(deployment: WhatsAppDeployment): Promise<void> {
    // Optional: Send a welcome message when agent is deployed
    console.log(`Agent deployed to WhatsApp: ${deployment.business_phone_number}`);
  }

  private async handleEscalation(deployment: WhatsAppDeployment, context: ConversationContext): Promise<void> {
    // Handle escalation to human agent
    console.log('Escalation requested for conversation:', context.conversationId);
  }

  private async updateConversation(context: ConversationContext, message: any, response: string): Promise<void> {
    // Update conversation in database
    console.log('Conversation updated:', context.conversationId);
  }
}

// Type definitions
interface WhatsAppCredentials {
  phone_number: string;
  access_token: string;
  business_account_id: string;
  user_id: string;
}

interface WhatsAppConfig extends WhatsAppCredentials {}

interface ValidationResult {
  valid: boolean;
  error?: string;
  businessInfo?: {
    name: string;
    phone_numbers: any[];
  };
}

interface WebhookResult {
  success: boolean;
  error?: string;
  webhookUrl?: string;
}

interface WhatsAppWebhookData {
  entry: Array<{
    changes: Array<{
      field: string;
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string };
        messages: WhatsAppMessage[];
        contacts: WhatsAppContact[];
      };
    }>;
  }>;
}

interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'audio' | 'image' | 'document';
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string };
}

interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}
/**
 * WhatsApp Node
 * Workflow node for sending WhatsApp messages and handling responses
 */

import { BaseNode, NodeExecutionContext, NodeExecutionResult } from './base-node';
import { enhancedWhatsAppService } from '../whatsapp-enhanced';

export interface WhatsAppNodeConfig {
  messageType: 'text' | 'template' | 'interactive' | 'media' | 'location' | 'contact';
  
  // Text message config
  text?: {
    content: string;
    useVariables: boolean;
  };
  
  // Template message config
  template?: {
    name: string;
    language: string;
    parameters: {
      header?: string[];
      body?: string[];
    };
  };
  
  // Interactive message config
  interactive?: {
    type: 'button' | 'list';
    header?: {
      type: 'text' | 'image' | 'video' | 'document';
      content: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons?: Array<{
        id: string;
        title: string;
      }>;
      sections?: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
  
  // Media message config
  media?: {
    type: 'image' | 'audio' | 'video' | 'document';
    mediaId: string;
    caption?: string;
    filename?: string;
  };
  
  // Location message config
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  
  // Contact message config
  contact?: {
    contacts: Array<{
      name: {
        formatted_name: string;
        first_name?: string;
        last_name?: string;
      };
      phones?: Array<{
        phone: string;
        type?: string;
      }>;
      emails?: Array<{
        email: string;
        type?: string;
      }>;
    }>;
  };
  
  // Response handling
  waitForResponse: boolean;
  responseTimeout: number; // milliseconds
  responseVariable: string;
  
  // Error handling
  continueOnError: boolean;
  retryCount: number;
  retryDelay: number;
}

export class WhatsAppNode extends BaseNode {
  type = 'whatsapp';
  name = 'WhatsApp Message';
  description = 'Send WhatsApp messages and handle responses';
  category = 'communication';
  
  config: WhatsAppNodeConfig = {
    messageType: 'text',
    text: {
      content: 'Hello! How can I help you today?',
      useVariables: true
    },
    waitForResponse: false,
    responseTimeout: 30000,
    responseVariable: 'whatsapp_response',
    continueOnError: false,
    retryCount: 0,
    retryDelay: 1000
  };

  constructor(id: string, position: { x: number; y: number }) {
    super(id, position);
    
    this.inputs = [
      {
        id: 'trigger',
        name: 'Trigger',
        type: 'flow',
        required: true
      },
      {
        id: 'data',
        name: 'Data',
        type: 'data',
        required: false
      }
    ];

    this.outputs = [
      {
        id: 'success',
        name: 'Success',
        type: 'flow'
      },
      {
        id: 'response',
        name: 'Response Received',
        type: 'flow'
      },
      {
        id: 'timeout',
        name: 'Timeout',
        type: 'flow'
      },
      {
        id: 'error',
        name: 'Error',
        type: 'flow'
      }
    ];
  }

  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    try {
      const { data, variables } = context;
      
      // Get WhatsApp context from workflow execution
      const whatsappContext = context.metadata?.whatsapp;
      if (!whatsappContext) {
        throw new Error('WhatsApp context not found in execution metadata');
      }

      const { phoneNumber, userId, credentialId } = whatsappContext;

      // Check if WhatsApp service is available
      const isAvailable = await enhancedWhatsAppService.isAvailable(userId, credentialId);
      if (!isAvailable) {
        throw new Error('WhatsApp service not available');
      }

      let result: any = null;
      let attempts = 0;
      const maxAttempts = this.config.retryCount + 1;

      while (attempts < maxAttempts) {
        try {
          // Send message based on type
          switch (this.config.messageType) {
            case 'text':
              result = await this.sendTextMessage(phoneNumber, userId, credentialId, data, variables);
              break;
            case 'template':
              result = await this.sendTemplateMessage(phoneNumber, userId, credentialId, data, variables);
              break;
            case 'interactive':
              result = await this.sendInteractiveMessage(phoneNumber, userId, credentialId, data, variables);
              break;
            case 'media':
              result = await this.sendMediaMessage(phoneNumber, userId, credentialId, data, variables);
              break;
            case 'location':
              result = await this.sendLocationMessage(phoneNumber, userId, credentialId, data, variables);
              break;
            case 'contact':
              result = await this.sendContactMessage(phoneNumber, userId, credentialId, data, variables);
              break;
            default:
              throw new Error(`Unsupported message type: ${this.config.messageType}`);
          }

          break; // Success, exit retry loop

        } catch (error) {
          attempts++;
          
          if (attempts >= maxAttempts) {
            if (this.config.continueOnError) {
              return {
                success: true,
                data: { ...data, error: error.message },
                nextNodes: ['error'],
                logs: [{
                  level: 'warn',
                  message: `WhatsApp message failed but continuing: ${error.message}`,
                  timestamp: new Date().toISOString()
                }]
              };
            } else {
              throw error;
            }
          }

          // Wait before retry
          if (this.config.retryDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          }
        }
      }

      // Handle response waiting
      if (this.config.waitForResponse) {
        const response = await this.waitForResponse(phoneNumber, this.config.responseTimeout);
        
        if (response) {
          // Store response in variables
          const updatedVariables = {
            ...variables,
            [this.config.responseVariable]: response
          };

          return {
            success: true,
            data: { ...data, whatsapp_response: response },
            variables: updatedVariables,
            nextNodes: ['response'],
            logs: [{
              level: 'info',
              message: 'WhatsApp message sent and response received',
              timestamp: new Date().toISOString()
            }]
          };
        } else {
          // Timeout waiting for response
          return {
            success: true,
            data: data,
            nextNodes: ['timeout'],
            logs: [{
              level: 'warn',
              message: `Timeout waiting for WhatsApp response after ${this.config.responseTimeout}ms`,
              timestamp: new Date().toISOString()
            }]
          };
        }
      }

      // Success without waiting for response
      return {
        success: true,
        data: { ...data, whatsapp_message: result },
        nextNodes: ['success'],
        logs: [{
          level: 'info',
          message: `WhatsApp ${this.config.messageType} message sent successfully`,
          timestamp: new Date().toISOString()
        }]
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: context.data,
        nextNodes: ['error'],
        logs: [{
          level: 'error',
          message: `WhatsApp node execution failed: ${error.message}`,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  private async sendTextMessage(
    phoneNumber: string,
    userId: string,
    credentialId: string,
    data: any,
    variables: Record<string, any>
  ): Promise<any> {
    if (!this.config.text) {
      throw new Error('Text message configuration not found');
    }

    let content = this.config.text.content;

    // Replace variables in content if enabled
    if (this.config.text.useVariables) {
      content = this.replaceVariables(content, { ...data, ...variables });
    }

    return await enhancedWhatsAppService.sendTextMessage(
      userId,
      credentialId,
      phoneNumber,
      content
    );
  }

  private async sendTemplateMessage(
    phoneNumber: string,
    userId: string,
    credentialId: string,
    data: any,
    variables: Record<string, any>
  ): Promise<any> {
    if (!this.config.template) {
      throw new Error('Template message configuration not found');
    }

    const parameters: any = {};

    // Process header parameters
    if (this.config.template.parameters.header) {
      parameters.header = this.config.template.parameters.header.map(param =>
        this.replaceVariables(param, { ...data, ...variables })
      );
    }

    // Process body parameters
    if (this.config.template.parameters.body) {
      parameters.body = this.config.template.parameters.body.map(param =>
        this.replaceVariables(param, { ...data, ...variables })
      );
    }

    return await enhancedWhatsAppService.sendTemplateMessage(
      phoneNumber,
      this.config.template.name,
      this.config.template.language,
      parameters
    );
  }

  private async sendInteractiveMessage(
    phoneNumber: string,
    userId: string,
    credentialId: string,
    data: any,
    variables: Record<string, any>
  ): Promise<any> {
    if (!this.config.interactive) {
      throw new Error('Interactive message configuration not found');
    }

    const interactive = this.config.interactive;
    const bodyText = this.replaceVariables(interactive.body.text, { ...data, ...variables });

    if (interactive.type === 'button') {
      return await enhancedWhatsAppService.sendButtonMessage(
        phoneNumber,
        bodyText,
        interactive.action.buttons || [],
        interactive.header ? this.replaceVariables(interactive.header.content, { ...data, ...variables }) : undefined,
        interactive.footer ? this.replaceVariables(interactive.footer.text, { ...data, ...variables }) : undefined
      );
    } else if (interactive.type === 'list') {
      return await enhancedWhatsAppService.sendListMessage(
        phoneNumber,
        bodyText,
        'Select an option',
        interactive.action.sections || [],
        interactive.header ? this.replaceVariables(interactive.header.content, { ...data, ...variables }) : undefined,
        interactive.footer ? this.replaceVariables(interactive.footer.text, { ...data, ...variables }) : undefined
      );
    }

    throw new Error(`Unsupported interactive message type: ${interactive.type}`);
  }

  private async sendMediaMessage(
    phoneNumber: string,
    userId: string,
    credentialId: string,
    data: any,
    variables: Record<string, any>
  ): Promise<any> {
    if (!this.config.media) {
      throw new Error('Media message configuration not found');
    }

    const caption = this.config.media.caption 
      ? this.replaceVariables(this.config.media.caption, { ...data, ...variables })
      : undefined;

    return await enhancedWhatsAppService.sendMediaMessage(
      userId,
      credentialId,
      phoneNumber,
      this.config.media.type,
      this.config.media.mediaId,
      caption,
      this.config.media.filename
    );
  }

  private async sendLocationMessage(
    phoneNumber: string,
    userId: string,
    credentialId: string,
    data: any,
    variables: Record<string, any>
  ): Promise<any> {
    if (!this.config.location) {
      throw new Error('Location message configuration not found');
    }

    return await enhancedWhatsAppService.sendLocationMessage(
      phoneNumber,
      this.config.location.latitude,
      this.config.location.longitude,
      this.config.location.name,
      this.config.location.address
    );
  }

  private async sendContactMessage(
    phoneNumber: string,
    userId: string,
    credentialId: string,
    data: any,
    variables: Record<string, any>
  ): Promise<any> {
    if (!this.config.contact) {
      throw new Error('Contact message configuration not found');
    }

    return await enhancedWhatsAppService.sendContactMessage(
      phoneNumber,
      this.config.contact.contacts
    );
  }

  private async waitForResponse(phoneNumber: string, timeout: number): Promise<any> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkForResponse = () => {
        // In a real implementation, this would check for new messages
        // For now, we'll simulate a timeout
        if (Date.now() - startTime >= timeout) {
          resolve(null);
          return;
        }

        // Check again in 1 second
        setTimeout(checkForResponse, 1000);
      };

      checkForResponse();
    });
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate message type configuration
    switch (this.config.messageType) {
      case 'text':
        if (!this.config.text?.content) {
          errors.push('Text content is required for text messages');
        }
        break;
      case 'template':
        if (!this.config.template?.name) {
          errors.push('Template name is required for template messages');
        }
        if (!this.config.template?.language) {
          errors.push('Template language is required for template messages');
        }
        break;
      case 'interactive':
        if (!this.config.interactive?.body?.text) {
          errors.push('Body text is required for interactive messages');
        }
        if (this.config.interactive?.type === 'button' && !this.config.interactive?.action?.buttons?.length) {
          errors.push('Buttons are required for button interactive messages');
        }
        if (this.config.interactive?.type === 'list' && !this.config.interactive?.action?.sections?.length) {
          errors.push('Sections are required for list interactive messages');
        }
        break;
      case 'media':
        if (!this.config.media?.mediaId) {
          errors.push('Media ID is required for media messages');
        }
        if (!this.config.media?.type) {
          errors.push('Media type is required for media messages');
        }
        break;
      case 'location':
        if (this.config.location?.latitude === undefined || this.config.location?.longitude === undefined) {
          errors.push('Latitude and longitude are required for location messages');
        }
        break;
      case 'contact':
        if (!this.config.contact?.contacts?.length) {
          errors.push('At least one contact is required for contact messages');
        }
        break;
    }

    // Validate response settings
    if (this.config.waitForResponse) {
      if (this.config.responseTimeout <= 0) {
        errors.push('Response timeout must be positive');
      }
      if (!this.config.responseVariable) {
        errors.push('Response variable name is required when waiting for response');
      }
    }

    // Validate retry settings
    if (this.config.retryCount < 0) {
      errors.push('Retry count cannot be negative');
    }
    if (this.config.retryDelay < 0) {
      errors.push('Retry delay cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  clone(): WhatsAppNode {
    const cloned = new WhatsAppNode(
      `${this.id}_copy`,
      { x: this.position.x + 50, y: this.position.y + 50 }
    );
    
    cloned.config = JSON.parse(JSON.stringify(this.config));
    
    return cloned;
  }
}

export default WhatsAppNode;
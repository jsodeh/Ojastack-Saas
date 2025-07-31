/**
 * Action Nodes for Workflow System
 * Handle agent responses and actions
 */

import { BaseWorkflowNode, ExecutionContext } from './base-node';
import { NodePort, ValidationResult } from '@/lib/workflow-types';

export class AIResponseNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'AI Response node executing', { input });

    const message = input.message || input.text || '';
    const contextData = input.context || {};
    
    // Get configuration
    const model = this.node.configuration.model || 'gpt-3.5-turbo';
    const temperature = this.node.configuration.temperature || 0.7;
    const maxTokens = this.node.configuration.max_tokens || 1000;
    const systemPrompt = this.node.configuration.system_prompt || '';

    try {
      // Simulate AI response generation
      // In real implementation, this would call the AI service
      const response = await this.generateAIResponse({
        message,
        context: contextData,
        model,
        temperature,
        maxTokens,
        systemPrompt
      });

      context.setVariable('ai_response', response.text);
      context.setVariable('ai_confidence', response.confidence);

      context.emit('ai_response_generated', {
        input: message,
        output: response.text,
        model,
        confidence: response.confidence
      });

      return {
        response: response.text,
        confidence: response.confidence,
        model,
        usage: response.usage
      };
    } catch (error) {
      context.log('error', 'AI response generation failed', { error: error.message });
      throw new Error(`AI response generation failed: ${error.message}`);
    }
  }

  private async generateAIResponse(params: {
    message: string;
    context: any;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  }): Promise<{ text: string; confidence: number; usage: any }> {
    // Simulate AI service call
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Mock response based on input
    const responses = [
      "I understand your question. Let me help you with that.",
      "That's an interesting point. Here's what I think...",
      "Based on the information provided, I would suggest...",
      "I can help you with that. Let me explain..."
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      text: `${response} (Model: ${params.model}, Input: "${params.message.substring(0, 50)}...")`,
      confidence: 0.8 + Math.random() * 0.2,
      usage: {
        prompt_tokens: Math.floor(params.message.length / 4),
        completion_tokens: Math.floor(response.length / 4),
        total_tokens: Math.floor((params.message.length + response.length) / 4)
      }
    };
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const model = this.node.configuration.model;
    if (!model) {
      errors.push({
        nodeId: this.node.id,
        type: 'missing_configuration',
        message: 'AI model is required',
        severity: 'error'
      });
    }

    const temperature = this.node.configuration.temperature;
    if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
      errors.push({
        nodeId: this.node.id,
        type: 'invalid_configuration',
        message: 'Temperature must be between 0 and 2',
        severity: 'error'
      });
    }

    const maxTokens = this.node.configuration.max_tokens;
    if (maxTokens !== undefined && maxTokens < 1) {
      errors.push({
        nodeId: this.node.id,
        type: 'invalid_configuration',
        message: 'Max tokens must be greater than 0',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getConfigurationSchema(): any {
    return {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          title: 'AI Model',
          enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3-sonnet', 'claude-3-opus'],
          default: 'gpt-3.5-turbo'
        },
        temperature: {
          type: 'number',
          title: 'Temperature',
          minimum: 0,
          maximum: 2,
          default: 0.7,
          description: 'Controls randomness in responses (0 = deterministic, 2 = very random)'
        },
        max_tokens: {
          type: 'number',
          title: 'Max Tokens',
          minimum: 1,
          maximum: 4000,
          default: 1000,
          description: 'Maximum number of tokens in the response'
        },
        system_prompt: {
          type: 'string',
          title: 'System Prompt',
          description: 'System prompt to guide AI behavior',
          default: 'You are a helpful AI assistant.'
        },
        use_persona: {
          type: 'boolean',
          title: 'Use Agent Persona',
          default: true,
          description: 'Whether to use the agent persona in the system prompt'
        }
      },
      required: ['model']
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 1000,
      system_prompt: 'You are a helpful AI assistant.',
      use_persona: true
    };
  }

  getInputPorts(): NodePort[] {
    return [
      this.createPort('message', 'data', 'string', true, 'The message to respond to'),
      this.createPort('context', 'data', 'object', false, 'Additional context for the response'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow input')
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('response', 'data', 'string', true, 'The AI-generated response'),
      this.createPort('confidence', 'data', 'number', false, 'Confidence score of the response'),
      this.createPort('usage', 'data', 'object', false, 'Token usage information'),
      this.createPort('next', 'control', 'any', true, 'Control flow output')
    ];
  }
}

export class SendMessageNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Send Message node executing', { input });

    const message = input.message || input.text || '';
    const recipient = input.recipient || context.getVariable('trigger_sender') || '';
    const channel = this.node.configuration.channel || context.getVariable('trigger_channel') || 'default';
    const format = this.node.configuration.format || 'text';

    if (!message) {
      throw new Error('Message content is required');
    }

    if (!recipient) {
      throw new Error('Recipient is required');
    }

    try {
      // Simulate message sending
      const result = await this.sendMessage({
        message,
        recipient,
        channel,
        format
      });

      context.setVariable('last_sent_message', message);
      context.setVariable('last_recipient', recipient);

      context.emit('message_sent', {
        message,
        recipient,
        channel,
        messageId: result.messageId
      });

      return {
        sent: true,
        messageId: result.messageId,
        recipient,
        channel,
        timestamp: result.timestamp
      };
    } catch (error) {
      context.log('error', 'Message sending failed', { error: error.message });
      throw new Error(`Message sending failed: ${error.message}`);
    }
  }

  private async sendMessage(params: {
    message: string;
    recipient: string;
    channel: string;
    format: string;
  }): Promise<{ messageId: string; timestamp: string }> {
    // Simulate message sending delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));

    // Mock successful send
    return {
      messageId: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const channel = this.node.configuration.channel;
    if (!channel) {
      warnings.push({
        nodeId: this.node.id,
        type: 'best_practice',
        message: 'No channel specified. Will use the trigger channel.'
      });
    }

    const format = this.node.configuration.format;
    if (format && !['text', 'markdown', 'html'].includes(format)) {
      errors.push({
        nodeId: this.node.id,
        type: 'invalid_configuration',
        message: 'Invalid message format specified',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  getConfigurationSchema(): any {
    return {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          title: 'Channel',
          enum: ['whatsapp', 'slack', 'webchat', 'email', 'sms'],
          description: 'Channel to send the message through'
        },
        format: {
          type: 'string',
          title: 'Message Format',
          enum: ['text', 'markdown', 'html'],
          default: 'text',
          description: 'Format of the message content'
        },
        priority: {
          type: 'string',
          title: 'Priority',
          enum: ['low', 'normal', 'high', 'urgent'],
          default: 'normal',
          description: 'Message priority level'
        },
        delay: {
          type: 'number',
          title: 'Delay (seconds)',
          minimum: 0,
          default: 0,
          description: 'Delay before sending the message'
        },
        retry: {
          type: 'object',
          title: 'Retry Settings',
          properties: {
            enabled: {
              type: 'boolean',
              default: true
            },
            maxAttempts: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              default: 3
            },
            backoffMs: {
              type: 'number',
              minimum: 100,
              default: 1000
            }
          }
        }
      }
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      format: 'text',
      priority: 'normal',
      delay: 0,
      retry: {
        enabled: true,
        maxAttempts: 3,
        backoffMs: 1000
      }
    };
  }

  getInputPorts(): NodePort[] {
    return [
      this.createPort('message', 'data', 'string', true, 'The message to send'),
      this.createPort('recipient', 'data', 'string', false, 'The message recipient (defaults to trigger sender)'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow input')
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('sent', 'data', 'boolean', true, 'Whether the message was sent successfully'),
      this.createPort('messageId', 'data', 'string', false, 'The ID of the sent message'),
      this.createPort('timestamp', 'data', 'string', false, 'When the message was sent'),
      this.createPort('next', 'control', 'any', true, 'Control flow output')
    ];
  }
}
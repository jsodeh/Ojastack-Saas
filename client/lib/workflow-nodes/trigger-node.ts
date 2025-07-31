/**
 * Trigger Nodes for Workflow System
 * Handle workflow initiation events
 */

import { BaseWorkflowNode, ExecutionContext } from './base-node';
import { NodePort, ValidationResult } from '@/lib/workflow-types';

export class MessageTriggerNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Message trigger activated', { input });
    
    // Extract message data from input
    const messageData = {
      message: input.message || input.text || '',
      sender: input.sender || input.from || 'unknown',
      channel: input.channel || 'default',
      timestamp: input.timestamp || new Date().toISOString(),
      metadata: input.metadata || {}
    };

    // Set workflow variables
    context.setVariable('trigger_message', messageData.message);
    context.setVariable('trigger_sender', messageData.sender);
    context.setVariable('trigger_channel', messageData.channel);

    context.emit('message_received', messageData);

    return messageData;
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check channel configuration
    const channels = this.node.configuration.channels;
    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      warnings.push({
        nodeId: this.node.id,
        type: 'best_practice',
        message: 'No specific channels configured. Will accept messages from all channels.'
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
        channels: {
          type: 'array',
          title: 'Channels',
          description: 'Channels to listen for messages on',
          items: {
            type: 'string',
            enum: ['whatsapp', 'slack', 'webchat', 'api']
          },
          default: []
        },
        messageTypes: {
          type: 'array',
          title: 'Message Types',
          description: 'Types of messages to trigger on',
          items: {
            type: 'string',
            enum: ['text', 'image', 'audio', 'video', 'document']
          },
          default: ['text']
        },
        filters: {
          type: 'object',
          title: 'Message Filters',
          properties: {
            keywords: {
              type: 'array',
              title: 'Keywords',
              description: 'Keywords that must be present in message',
              items: { type: 'string' }
            },
            senderPattern: {
              type: 'string',
              title: 'Sender Pattern',
              description: 'Regex pattern for sender filtering'
            },
            minLength: {
              type: 'number',
              title: 'Minimum Length',
              description: 'Minimum message length'
            }
          }
        }
      }
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      channels: [],
      messageTypes: ['text'],
      filters: {}
    };
  }

  getInputPorts(): NodePort[] {
    return []; // Trigger nodes don't have input ports
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('message', 'data', 'string', true, 'The received message text'),
      this.createPort('sender', 'data', 'string', true, 'The message sender identifier'),
      this.createPort('channel', 'data', 'string', true, 'The channel the message came from'),
      this.createPort('metadata', 'data', 'object', false, 'Additional message metadata'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow trigger')
    ];
  }
}

export class WebhookTriggerNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Webhook trigger activated', { input });

    const webhookData = {
      payload: input.body || input.payload || {},
      headers: input.headers || {},
      method: input.method || 'POST',
      url: input.url || '',
      timestamp: new Date().toISOString()
    };

    // Set workflow variables
    context.setVariable('webhook_payload', webhookData.payload);
    context.setVariable('webhook_headers', webhookData.headers);
    context.setVariable('webhook_method', webhookData.method);

    context.emit('webhook_received', webhookData);

    return webhookData;
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const webhookUrl = this.node.configuration.webhook_url;
    if (!webhookUrl) {
      errors.push({
        nodeId: this.node.id,
        type: 'missing_configuration',
        message: 'Webhook URL is required',
        severity: 'error'
      });
    }

    const method = this.node.configuration.method;
    if (method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      errors.push({
        nodeId: this.node.id,
        type: 'invalid_configuration',
        message: 'Invalid HTTP method specified',
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
        webhook_url: {
          type: 'string',
          title: 'Webhook URL',
          description: 'The URL endpoint for this webhook',
          format: 'uri'
        },
        method: {
          type: 'string',
          title: 'HTTP Method',
          description: 'HTTP method to accept',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          default: 'POST'
        },
        authentication: {
          type: 'object',
          title: 'Authentication',
          properties: {
            type: {
              type: 'string',
              enum: ['none', 'bearer', 'basic', 'api_key'],
              default: 'none'
            },
            token: {
              type: 'string',
              title: 'Token/Key',
              description: 'Authentication token or API key'
            },
            header: {
              type: 'string',
              title: 'Header Name',
              description: 'Header name for API key authentication',
              default: 'X-API-Key'
            }
          }
        },
        responseFormat: {
          type: 'string',
          title: 'Response Format',
          enum: ['json', 'text', 'xml'],
          default: 'json'
        }
      },
      required: ['webhook_url']
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      method: 'POST',
      authentication: {
        type: 'none'
      },
      responseFormat: 'json'
    };
  }

  getInputPorts(): NodePort[] {
    return []; // Trigger nodes don't have input ports
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('payload', 'data', 'object', true, 'The webhook payload data'),
      this.createPort('headers', 'data', 'object', false, 'HTTP headers from the request'),
      this.createPort('method', 'data', 'string', false, 'HTTP method used'),
      this.createPort('url', 'data', 'string', false, 'The webhook URL that was called'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow trigger')
    ];
  }
}

export class ScheduleTriggerNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Schedule trigger activated', { input });

    const scheduleData = {
      scheduledTime: input.scheduledTime || new Date().toISOString(),
      actualTime: new Date().toISOString(),
      scheduleType: this.node.configuration.scheduleType || 'once',
      timezone: this.node.configuration.timezone || 'UTC'
    };

    context.setVariable('scheduled_time', scheduleData.scheduledTime);
    context.setVariable('actual_time', scheduleData.actualTime);

    context.emit('schedule_triggered', scheduleData);

    return scheduleData;
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const scheduleType = this.node.configuration.scheduleType;
    if (!scheduleType) {
      errors.push({
        nodeId: this.node.id,
        type: 'missing_configuration',
        message: 'Schedule type is required',
        severity: 'error'
      });
    }

    if (scheduleType === 'cron') {
      const cronExpression = this.node.configuration.cronExpression;
      if (!cronExpression) {
        errors.push({
          nodeId: this.node.id,
          type: 'missing_configuration',
          message: 'Cron expression is required for cron schedule type',
          severity: 'error'
        });
      }
    }

    if (scheduleType === 'once') {
      const scheduledTime = this.node.configuration.scheduledTime;
      if (!scheduledTime) {
        errors.push({
          nodeId: this.node.id,
          type: 'missing_configuration',
          message: 'Scheduled time is required for one-time schedule',
          severity: 'error'
        });
      }
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
        scheduleType: {
          type: 'string',
          title: 'Schedule Type',
          enum: ['once', 'recurring', 'cron'],
          default: 'once'
        },
        scheduledTime: {
          type: 'string',
          title: 'Scheduled Time',
          format: 'date-time',
          description: 'When to trigger (for one-time schedules)'
        },
        cronExpression: {
          type: 'string',
          title: 'Cron Expression',
          description: 'Cron expression for recurring schedules',
          pattern: '^[0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+ [0-9*,/-]+$'
        },
        timezone: {
          type: 'string',
          title: 'Timezone',
          default: 'UTC',
          description: 'Timezone for schedule execution'
        },
        enabled: {
          type: 'boolean',
          title: 'Enabled',
          default: true,
          description: 'Whether this schedule is active'
        }
      },
      required: ['scheduleType']
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      scheduleType: 'once',
      timezone: 'UTC',
      enabled: true
    };
  }

  getInputPorts(): NodePort[] {
    return []; // Trigger nodes don't have input ports
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('scheduledTime', 'data', 'string', true, 'The originally scheduled time'),
      this.createPort('actualTime', 'data', 'string', true, 'The actual execution time'),
      this.createPort('scheduleType', 'data', 'string', false, 'The type of schedule'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow trigger')
    ];
  }
}
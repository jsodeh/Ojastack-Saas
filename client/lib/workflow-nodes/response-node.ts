/**
 * Response Nodes for Workflow System
 * Handle final agent responses and workflow completion
 */

import { BaseWorkflowNode, ExecutionContext } from './base-node';
import { NodePort, ValidationResult } from '@/lib/workflow-types';

export class ResponseNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Response node executing', { input });

    const message = input.message || input.response || '';
    const responseType = this.node.configuration.response_type || 'text';
    const channel = this.node.configuration.channel || context.getVariable('trigger_channel');
    const recipient = input.recipient || context.getVariable('trigger_sender');

    if (!message) {
      throw new Error('Response message is required');
    }

    try {
      const response = await this.sendResponse({
        message,
        responseType,
        channel,
        recipient,
        context
      });

      context.setVariable('final_response', message);
      context.setVariable('response_sent', true);
      context.setVariable('response_id', response.responseId);

      context.emit('workflow_completed', {
        message,
        responseType,
        channel,
        recipient,
        responseId: response.responseId
      });

      return {
        sent: true,
        responseId: response.responseId,
        message,
        responseType,
        channel,
        recipient,
        timestamp: response.timestamp
      };
    } catch (error) {
      context.log('error', 'Response sending failed', { error: error.message });
      throw new Error(`Response sending failed: ${error.message}`);
    }
  }

  private async sendResponse(params: {
    message: string;
    responseType: string;
    channel: string;
    recipient: string;
    context: ExecutionContext;
  }): Promise<{ responseId: string; timestamp: string }> {
    // Simulate response sending
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    // Log the final response
    params.context.log('info', 'Final response sent', {
      message: params.message,
      channel: params.channel,
      recipient: params.recipient
    });

    return {
      responseId: `resp_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString()
    };
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const responseType = this.node.configuration.response_type;
    if (responseType && !['text', 'markdown', 'html', 'json'].includes(responseType)) {
      errors.push({
        nodeId: this.node.id,
        type: 'invalid_configuration',
        message: 'Invalid response type specified',
        severity: 'error'
      });
    }

    // Check if this is truly a terminal node
    const hasOutgoingConnections = this.node.outputs.some(port => port.connected);
    if (hasOutgoingConnections) {
      warnings.push({
        nodeId: this.node.id,
        type: 'best_practice',
        message: 'Response nodes typically should not have outgoing connections'
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
        response_type: {
          type: 'string',
          title: 'Response Type',
          enum: ['text', 'markdown', 'html', 'json'],
          default: 'text',
          description: 'Format of the response message'
        },
        channel: {
          type: 'string',
          title: 'Response Channel',
          enum: ['auto', 'whatsapp', 'slack', 'webchat', 'email'],
          default: 'auto',
          description: 'Channel to send the response through (auto uses trigger channel)'
        },
        priority: {
          type: 'string',
          title: 'Priority',
          enum: ['low', 'normal', 'high', 'urgent'],
          default: 'normal',
          description: 'Response priority level'
        },
        save_to_history: {
          type: 'boolean',
          title: 'Save to History',
          default: true,
          description: 'Whether to save this response to conversation history'
        },
        end_conversation: {
          type: 'boolean',
          title: 'End Conversation',
          default: false,
          description: 'Mark the conversation as completed after this response'
        }
      }
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      response_type: 'text',
      channel: 'auto',
      priority: 'normal',
      save_to_history: true,
      end_conversation: false
    };
  }

  getInputPorts(): NodePort[] {
    return [
      this.createPort('message', 'data', 'string', true, 'The response message to send'),
      this.createPort('recipient', 'data', 'string', false, 'The response recipient (defaults to trigger sender)'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow input')
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('sent', 'data', 'boolean', true, 'Whether the response was sent successfully'),
      this.createPort('responseId', 'data', 'string', false, 'The ID of the sent response'),
      this.createPort('timestamp', 'data', 'string', false, 'When the response was sent'),
      this.createPort('completed', 'event', 'any', true, 'Workflow completion event')
    ];
  }
}

export class ErrorResponseNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Error Response node executing', { input });

    const errorMessage = input.error || input.message || 'An error occurred';
    const errorCode = input.errorCode || this.node.configuration.error_code || 'WORKFLOW_ERROR';
    const userMessage = this.node.configuration.user_message || 'I apologize, but I encountered an error while processing your request.';
    const includeDetails = this.node.configuration.include_details || false;

    const finalMessage = includeDetails 
      ? `${userMessage}\n\nError details: ${errorMessage}`
      : userMessage;

    try {
      const response = await this.sendErrorResponse({
        userMessage: finalMessage,
        errorCode,
        originalError: errorMessage,
        context
      });

      context.setVariable('error_handled', true);
      context.setVariable('error_response_sent', true);
      context.setVariable('error_code', errorCode);

      context.emit('error_response_sent', {
        errorCode,
        userMessage: finalMessage,
        originalError: errorMessage,
        responseId: response.responseId
      });

      return {
        sent: true,
        responseId: response.responseId,
        errorCode,
        userMessage: finalMessage,
        originalError: errorMessage,
        timestamp: response.timestamp
      };
    } catch (error) {
      context.log('error', 'Error response sending failed', { error: error.message });
      throw new Error(`Error response sending failed: ${error.message}`);
    }
  }

  private async sendErrorResponse(params: {
    userMessage: string;
    errorCode: string;
    originalError: string;
    context: ExecutionContext;
  }): Promise<{ responseId: string; timestamp: string }> {
    // Simulate error response sending
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Log the error response
    params.context.log('warn', 'Error response sent to user', {
      errorCode: params.errorCode,
      userMessage: params.userMessage,
      originalError: params.originalError
    });

    return {
      responseId: `err_resp_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString()
    };
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const userMessage = this.node.configuration.user_message;
    if (!userMessage || userMessage.trim() === '') {
      warnings.push({
        nodeId: this.node.id,
        type: 'best_practice',
        message: 'Consider providing a user-friendly error message'
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
        user_message: {
          type: 'string',
          title: 'User Message',
          default: 'I apologize, but I encountered an error while processing your request.',
          description: 'User-friendly error message to display'
        },
        error_code: {
          type: 'string',
          title: 'Error Code',
          default: 'WORKFLOW_ERROR',
          description: 'Internal error code for tracking'
        },
        include_details: {
          type: 'boolean',
          title: 'Include Error Details',
          default: false,
          description: 'Whether to include technical error details in user message'
        },
        log_level: {
          type: 'string',
          title: 'Log Level',
          enum: ['info', 'warn', 'error'],
          default: 'error',
          description: 'Log level for this error'
        },
        notify_admin: {
          type: 'boolean',
          title: 'Notify Admin',
          default: false,
          description: 'Send notification to system administrators'
        }
      }
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      user_message: 'I apologize, but I encountered an error while processing your request.',
      error_code: 'WORKFLOW_ERROR',
      include_details: false,
      log_level: 'error',
      notify_admin: false
    };
  }

  getInputPorts(): NodePort[] {
    return [
      this.createPort('error', 'data', 'string', true, 'The error message or details'),
      this.createPort('errorCode', 'data', 'string', false, 'Optional error code'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow input')
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('sent', 'data', 'boolean', true, 'Whether the error response was sent'),
      this.createPort('responseId', 'data', 'string', false, 'The ID of the error response'),
      this.createPort('errorCode', 'data', 'string', false, 'The error code used'),
      this.createPort('handled', 'event', 'any', true, 'Error handled event')
    ];
  }
}

export class RedirectResponseNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Redirect Response node executing', { input });

    const targetWorkflowId = this.node.configuration.target_workflow_id;
    const redirectMessage = this.node.configuration.redirect_message || 'Redirecting you to a specialist...';
    const preserveContext = this.node.configuration.preserve_context !== false;
    const transferData = input.transferData || {};

    if (!targetWorkflowId) {
      throw new Error('Target workflow ID is required for redirect');
    }

    try {
      const redirect = await this.initiateRedirect({
        targetWorkflowId,
        redirectMessage,
        preserveContext,
        transferData,
        context
      });

      context.setVariable('redirected_to', targetWorkflowId);
      context.setVariable('redirect_id', redirect.redirectId);

      context.emit('workflow_redirected', {
        targetWorkflowId,
        redirectId: redirect.redirectId,
        preserveContext,
        transferData
      });

      return {
        redirected: true,
        redirectId: redirect.redirectId,
        targetWorkflowId,
        redirectMessage,
        preserveContext,
        timestamp: redirect.timestamp
      };
    } catch (error) {
      context.log('error', 'Workflow redirect failed', { error: error.message });
      throw new Error(`Workflow redirect failed: ${error.message}`);
    }
  }

  private async initiateRedirect(params: {
    targetWorkflowId: string;
    redirectMessage: string;
    preserveContext: boolean;
    transferData: any;
    context: ExecutionContext;
  }): Promise<{ redirectId: string; timestamp: string }> {
    // Simulate redirect initiation
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));

    // Log the redirect
    params.context.log('info', 'Workflow redirect initiated', {
      targetWorkflowId: params.targetWorkflowId,
      preserveContext: params.preserveContext,
      transferDataKeys: Object.keys(params.transferData)
    });

    return {
      redirectId: `redirect_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString()
    };
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const targetWorkflowId = this.node.configuration.target_workflow_id;
    if (!targetWorkflowId) {
      errors.push({
        nodeId: this.node.id,
        type: 'missing_configuration',
        message: 'Target workflow ID is required',
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
        target_workflow_id: {
          type: 'string',
          title: 'Target Workflow',
          description: 'The workflow to redirect to'
        },
        redirect_message: {
          type: 'string',
          title: 'Redirect Message',
          default: 'Redirecting you to a specialist...',
          description: 'Message to show user during redirect'
        },
        preserve_context: {
          type: 'boolean',
          title: 'Preserve Context',
          default: true,
          description: 'Whether to preserve conversation context in target workflow'
        },
        transfer_variables: {
          type: 'array',
          title: 'Variables to Transfer',
          items: { type: 'string' },
          description: 'Specific variables to transfer to target workflow'
        },
        redirect_reason: {
          type: 'string',
          title: 'Redirect Reason',
          enum: ['escalation', 'specialization', 'handoff', 'error_recovery'],
          default: 'specialization',
          description: 'Reason for the redirect'
        }
      },
      required: ['target_workflow_id']
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      redirect_message: 'Redirecting you to a specialist...',
      preserve_context: true,
      transfer_variables: [],
      redirect_reason: 'specialization'
    };
  }

  getInputPorts(): NodePort[] {
    return [
      this.createPort('transferData', 'data', 'object', false, 'Data to transfer to target workflow'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow input')
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('redirected', 'data', 'boolean', true, 'Whether redirect was successful'),
      this.createPort('redirectId', 'data', 'string', false, 'The redirect transaction ID'),
      this.createPort('targetWorkflowId', 'data', 'string', false, 'The target workflow ID'),
      this.createPort('completed', 'event', 'any', true, 'Redirect completion event')
    ];
  }
}
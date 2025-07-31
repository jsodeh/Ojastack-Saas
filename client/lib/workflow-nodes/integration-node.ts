/**
 * Integration Nodes for Workflow System
 * Handle external service connections
 */

import { BaseWorkflowNode, ExecutionContext } from './base-node';
import { NodePort, ValidationResult } from '@/lib/workflow-types';

export class WhatsAppIntegrationNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'WhatsApp Integration node executing', { input });

    const message = input.message || '';
    const phoneNumber = input.phone_number || input.recipient || '';
    const messageType = this.node.configuration.message_type || 'text';
    const credentialId = this.node.configuration.credential_id;

    if (!message && messageType === 'text') {
      throw new Error('Message content is required for text messages');
    }

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    if (!credentialId) {
      throw new Error('WhatsApp credential ID is required');
    }

    try {
      const result = await this.sendWhatsAppMessage({
        message,
        phoneNumber,
        messageType,
        credentialId
      });

      context.setVariable('whatsapp_message_id', result.messageId);
      context.setVariable('whatsapp_status', result.status);

      context.emit('whatsapp_message_sent', {
        messageId: result.messageId,
        phoneNumber,
        messageType,
        status: result.status
      });

      return {
        sent: true,
        messageId: result.messageId,
        status: result.status,
        phoneNumber,
        timestamp: result.timestamp
      };
    } catch (error) {
      context.log('error', 'WhatsApp message sending failed', { error: error.message });
      throw new Error(`WhatsApp message sending failed: ${error.message}`);
    }
  }

  private async sendWhatsAppMessage(params: {
    message: string;
    phoneNumber: string;
    messageType: string;
    credentialId: string;
  }): Promise<{ messageId: string; status: string; timestamp: string }> {
    // Simulate WhatsApp API call
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Mock successful send
    return {
      messageId: `wa_${crypto.randomUUID()}`,
      status: 'sent',
      timestamp: new Date().toISOString()
    };
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const credentialId = this.node.configuration.credential_id;
    if (!credentialId) {
      errors.push({
        nodeId: this.node.id,
        type: 'missing_configuration',
        message: 'WhatsApp credential ID is required',
        severity: 'error'
      });
    }

    const messageType = this.node.configuration.message_type;
    if (messageType && !['text', 'image', 'audio', 'video', 'document'].includes(messageType)) {
      errors.push({
        nodeId: this.node.id,
        type: 'invalid_configuration',
        message: 'Invalid message type specified',
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
        credential_id: {
          type: 'string',
          title: 'WhatsApp Credential',
          description: 'Select your WhatsApp Business API credentials'
        },
        message_type: {
          type: 'string',
          title: 'Message Type',
          enum: ['text', 'image', 'audio', 'video', 'document'],
          default: 'text'
        },
        template_name: {
          type: 'string',
          title: 'Template Name',
          description: 'WhatsApp message template name (for template messages)'
        },
        template_language: {
          type: 'string',
          title: 'Template Language',
          default: 'en',
          description: 'Language code for the template'
        }
      },
      required: ['credential_id']
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      message_type: 'text',
      template_language: 'en'
    };
  }

  getInputPorts(): NodePort[] {
    return [
      this.createPort('message', 'data', 'string', true, 'The message to send'),
      this.createPort('phone_number', 'data', 'string', true, 'The recipient phone number'),
      this.createPort('media_url', 'data', 'string', false, 'URL for media messages'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow input')
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('sent', 'data', 'boolean', true, 'Whether the message was sent'),
      this.createPort('messageId', 'data', 'string', false, 'WhatsApp message ID'),
      this.createPort('status', 'data', 'string', false, 'Message status'),
      this.createPort('next', 'control', 'any', true, 'Control flow output')
    ];
  }
}

export class KnowledgeBaseNode extends BaseWorkflowNode {
  async execute(input: any, context: ExecutionContext): Promise<any> {
    context.log('info', 'Knowledge Base node executing', { input });

    const query = input.query || input.message || '';
    const knowledgeBaseId = this.node.configuration.knowledge_base_id;
    const maxResults = this.node.configuration.max_results || 5;
    const minConfidence = this.node.configuration.min_confidence || 0.7;

    if (!query) {
      throw new Error('Query is required for knowledge base search');
    }

    if (!knowledgeBaseId) {
      throw new Error('Knowledge base ID is required');
    }

    try {
      const results = await this.searchKnowledgeBase({
        query,
        knowledgeBaseId,
        maxResults,
        minConfidence
      });

      context.setVariable('kb_results', results.results);
      context.setVariable('kb_confidence', results.confidence);
      context.setVariable('kb_query', query);

      context.emit('knowledge_base_searched', {
        query,
        resultsCount: results.results.length,
        confidence: results.confidence
      });

      return {
        results: results.results,
        confidence: results.confidence,
        query,
        hasResults: results.results.length > 0
      };
    } catch (error) {
      context.log('error', 'Knowledge base search failed', { error: error.message });
      throw new Error(`Knowledge base search failed: ${error.message}`);
    }
  }

  private async searchKnowledgeBase(params: {
    query: string;
    knowledgeBaseId: string;
    maxResults: number;
    minConfidence: number;
  }): Promise<{ results: any[]; confidence: number }> {
    // Simulate knowledge base search
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));

    // Mock search results
    const mockResults = [
      {
        id: '1',
        title: 'Getting Started Guide',
        content: 'This is a comprehensive guide to getting started with our platform...',
        confidence: 0.95,
        source: 'documentation'
      },
      {
        id: '2',
        title: 'FAQ - Common Issues',
        content: 'Here are answers to frequently asked questions...',
        confidence: 0.87,
        source: 'faq'
      },
      {
        id: '3',
        title: 'API Reference',
        content: 'Complete API documentation and examples...',
        confidence: 0.82,
        source: 'api_docs'
      }
    ];

    // Filter by confidence and limit results
    const filteredResults = mockResults
      .filter(result => result.confidence >= params.minConfidence)
      .slice(0, params.maxResults);

    const avgConfidence = filteredResults.length > 0
      ? filteredResults.reduce((sum, r) => sum + r.confidence, 0) / filteredResults.length
      : 0;

    return {
      results: filteredResults,
      confidence: avgConfidence
    };
  }

  validate(): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    const knowledgeBaseId = this.node.configuration.knowledge_base_id;
    if (!knowledgeBaseId) {
      errors.push({
        nodeId: this.node.id,
        type: 'missing_configuration',
        message: 'Knowledge base ID is required',
        severity: 'error'
      });
    }

    const maxResults = this.node.configuration.max_results;
    if (maxResults !== undefined && (maxResults < 1 || maxResults > 50)) {
      errors.push({
        nodeId: this.node.id,
        type: 'invalid_configuration',
        message: 'Max results must be between 1 and 50',
        severity: 'error'
      });
    }

    const minConfidence = this.node.configuration.min_confidence;
    if (minConfidence !== undefined && (minConfidence < 0 || minConfidence > 1)) {
      errors.push({
        nodeId: this.node.id,
        type: 'invalid_configuration',
        message: 'Min confidence must be between 0 and 1',
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
        knowledge_base_id: {
          type: 'string',
          title: 'Knowledge Base',
          description: 'Select the knowledge base to search'
        },
        max_results: {
          type: 'number',
          title: 'Max Results',
          minimum: 1,
          maximum: 50,
          default: 5,
          description: 'Maximum number of results to return'
        },
        min_confidence: {
          type: 'number',
          title: 'Min Confidence',
          minimum: 0,
          maximum: 1,
          default: 0.7,
          description: 'Minimum confidence score for results'
        },
        search_type: {
          type: 'string',
          title: 'Search Type',
          enum: ['semantic', 'keyword', 'hybrid'],
          default: 'semantic',
          description: 'Type of search to perform'
        },
        include_metadata: {
          type: 'boolean',
          title: 'Include Metadata',
          default: true,
          description: 'Include document metadata in results'
        }
      },
      required: ['knowledge_base_id']
    };
  }

  getDefaultConfiguration(): Record<string, any> {
    return {
      max_results: 5,
      min_confidence: 0.7,
      search_type: 'semantic',
      include_metadata: true
    };
  }

  getInputPorts(): NodePort[] {
    return [
      this.createPort('query', 'data', 'string', true, 'The search query'),
      this.createPort('trigger', 'control', 'any', true, 'Control flow input')
    ];
  }

  getOutputPorts(): NodePort[] {
    return [
      this.createPort('results', 'data', 'array', true, 'Search results from knowledge base'),
      this.createPort('confidence', 'data', 'number', false, 'Average confidence of results'),
      this.createPort('hasResults', 'data', 'boolean', false, 'Whether any results were found'),
      this.createPort('next', 'control', 'any', true, 'Control flow output')
    ];
  }
}
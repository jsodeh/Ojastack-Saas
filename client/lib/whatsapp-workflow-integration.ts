/**
 * WhatsApp Workflow Integration Service
 * Connects WhatsApp messaging with visual workflow execution
 */

import { enhancedWhatsAppService, type WhatsAppMessage } from './whatsapp-enhanced';
import { workflowExecutor, type WorkflowExecution } from './workflow-executor';
import { supabase } from './supabase';
import type { AgentWorkflow } from './workflow-types';

export interface WhatsAppWorkflowConfig {
  workflowId: string;
  userId: string;
  credentialId: string;
  deploymentId?: string;
  triggerConditions?: {
    messageTypes?: string[];
    keywords?: string[];
    phoneNumbers?: string[];
    businessHours?: {
      enabled: boolean;
      timezone: string;
      schedule: Array<{
        day: string;
        start: string;
        end: string;
      }>;
    };
  };
  responseSettings?: {
    autoReply: boolean;
    typingIndicator: boolean;
    readReceipts: boolean;
    maxResponseTime: number; // milliseconds
  };
}

export interface ConversationContext {
  conversationId: string;
  phoneNumber: string;
  userId: string;
  credentialId: string;
  workflowId: string;
  lastMessageTime: string;
  messageCount: number;
  variables: Record<string, any>;
  state: 'active' | 'waiting' | 'completed' | 'error';
  metadata: Record<string, any>;
}

export interface WorkflowTriggerEvent {
  type: 'message_received' | 'message_status' | 'user_action';
  source: 'whatsapp';
  data: {
    message?: WhatsAppMessage;
    phoneNumber: string;
    userId: string;
    credentialId: string;
    context?: ConversationContext;
  };
  timestamp: string;
}

class WhatsAppWorkflowIntegration {
  private static instance: WhatsAppWorkflowIntegration;
  private activeConversations: Map<string, ConversationContext> = new Map();
  private workflowConfigs: Map<string, WhatsAppWorkflowConfig> = new Map();
  private messageQueue: Map<string, WhatsAppMessage[]> = new Map();

  static getInstance(): WhatsAppWorkflowIntegration {
    if (!WhatsAppWorkflowIntegration.instance) {
      WhatsAppWorkflowIntegration.instance = new WhatsAppWorkflowIntegration();
    }
    return WhatsAppWorkflowIntegration.instance;
  }

  /**
   * Configure WhatsApp workflow integration
   */
  async configureWorkflow(config: WhatsAppWorkflowConfig): Promise<void> {
    try {
      // Validate workflow exists
      const { data: workflow, error } = await supabase
        .from('agent_workflows')
        .select('*')
        .eq('id', config.workflowId)
        .single();

      if (error || !workflow) {
        throw new Error(`Workflow ${config.workflowId} not found`);
      }

      // Validate WhatsApp credentials
      const isAvailable = await enhancedWhatsAppService.isAvailable(
        config.userId, 
        config.credentialId
      );

      if (!isAvailable) {
        throw new Error('WhatsApp credentials not available or invalid');
      }

      // Store configuration
      this.workflowConfigs.set(config.workflowId, config);

      // Save to database
      await supabase
        .from('whatsapp_workflow_configs')
        .upsert({
          workflow_id: config.workflowId,
          user_id: config.userId,
          credential_id: config.credentialId,
          deployment_id: config.deploymentId,
          config_data: {
            triggerConditions: config.triggerConditions,
            responseSettings: config.responseSettings
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      console.log(`WhatsApp workflow integration configured for workflow ${config.workflowId}`);

    } catch (error) {
      console.error('Failed to configure WhatsApp workflow:', error);
      throw error;
    }
  }

  /**
   * Process incoming WhatsApp message and trigger workflow
   */
  async processIncomingMessage(
    message: WhatsAppMessage,
    userId: string,
    credentialId: string
  ): Promise<WorkflowExecution | null> {
    try {
      // Find active workflow configuration for this user/credential
      const config = await this.findWorkflowConfig(userId, credentialId);
      if (!config) {
        console.log('No active workflow configuration found');
        return null;
      }

      // Check trigger conditions
      if (!this.shouldTriggerWorkflow(message, config)) {
        console.log('Message does not meet trigger conditions');
        return null;
      }

      // Get or create conversation context
      const conversationKey = `${message.from}_${config.workflowId}`;
      let context = this.activeConversations.get(conversationKey);

      if (!context) {
        context = await this.createConversationContext(
          message.from,
          userId,
          credentialId,
          config.workflowId
        );
        this.activeConversations.set(conversationKey, context);
      }

      // Update conversation context
      context.lastMessageTime = message.timestamp;
      context.messageCount++;
      context.state = 'active';

      // Add message to queue
      this.addMessageToQueue(conversationKey, message);

      // Load workflow
      const workflow = await this.loadWorkflow(config.workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${config.workflowId} not found`);
      }

      // Prepare workflow input data
      const inputData = {
        message: message,
        conversation: context,
        whatsapp: {
          phoneNumber: message.from,
          userId: userId,
          credentialId: credentialId
        },
        trigger: {
          type: 'whatsapp_message',
          source: 'whatsapp',
          timestamp: message.timestamp
        }
      };

      // Execute workflow
      const execution = await workflowExecutor.executeWorkflow(
        workflow,
        inputData,
        {
          variables: context.variables,
          context: {
            conversationId: context.conversationId,
            deploymentId: config.deploymentId,
            channel: 'whatsapp',
            phoneNumber: message.from,
            userId: userId,
            credentialId: credentialId
          },
          timeout: config.responseSettings?.maxResponseTime || 30000
        }
      );

      // Update conversation state based on execution result
      if (execution.status === 'completed') {
        context.state = 'completed';
        
        // Process workflow response
        await this.processWorkflowResponse(execution, context, config);
      } else if (execution.status === 'failed') {
        context.state = 'error';
        console.error(`Workflow execution failed: ${execution.error}`);
      }

      // Save conversation context
      await this.saveConversationContext(context);

      return execution;

    } catch (error) {
      console.error('Failed to process WhatsApp message:', error);
      return null;
    }
  }

  /**
   * Process workflow response and send WhatsApp messages
   */
  private async processWorkflowResponse(
    execution: WorkflowExecution,
    context: ConversationContext,
    config: WhatsAppWorkflowConfig
  ): Promise<void> {
    try {
      const result = execution.result;
      
      if (!result) {
        console.log('No response from workflow execution');
        return;
      }

      // Handle different response types
      if (result.type === 'text' && result.content) {
        await enhancedWhatsAppService.sendTextMessage(
          context.userId,
          context.credentialId,
          context.phoneNumber,
          result.content
        );
      } else if (result.type === 'interactive' && result.interactive) {
        // Handle interactive messages (buttons, lists)
        if (result.interactive.type === 'button') {
          await enhancedWhatsAppService.sendButtonMessage(
            context.phoneNumber,
            result.interactive.body.text,
            result.interactive.action.buttons.map((btn: any) => ({
              id: btn.reply.id,
              title: btn.reply.title
            })),
            result.interactive.header?.text,
            result.interactive.footer?.text
          );
        } else if (result.interactive.type === 'list') {
          await enhancedWhatsAppService.sendListMessage(
            context.phoneNumber,
            result.interactive.body.text,
            result.interactive.action.button,
            result.interactive.action.sections,
            result.interactive.header?.text,
            result.interactive.footer?.text
          );
        }
      } else if (result.type === 'template' && result.template) {
        await enhancedWhatsAppService.sendTemplateMessage(
          context.phoneNumber,
          result.template.name,
          result.template.language.code,
          result.template.parameters
        );
      } else if (result.type === 'media' && result.media) {
        await enhancedWhatsAppService.sendMediaMessage(
          context.userId,
          context.credentialId,
          context.phoneNumber,
          result.media.type,
          result.media.id,
          result.media.caption,
          result.media.filename
        );
      }

      // Handle multiple responses
      if (result.responses && Array.isArray(result.responses)) {
        for (const response of result.responses) {
          await this.processWorkflowResponse(
            { ...execution, result: response },
            context,
            config
          );
          
          // Add delay between multiple messages
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update conversation variables if provided
      if (result.variables) {
        Object.assign(context.variables, result.variables);
      }

    } catch (error) {
      console.error('Failed to process workflow response:', error);
    }
  }

  /**
   * Check if message should trigger workflow
   */
  private shouldTriggerWorkflow(
    message: WhatsAppMessage,
    config: WhatsAppWorkflowConfig
  ): boolean {
    const conditions = config.triggerConditions;
    if (!conditions) return true;

    // Check message types
    if (conditions.messageTypes && conditions.messageTypes.length > 0) {
      if (!conditions.messageTypes.includes(message.type)) {
        return false;
      }
    }

    // Check keywords
    if (conditions.keywords && conditions.keywords.length > 0) {
      const messageText = message.content.text?.toLowerCase() || '';
      const hasKeyword = conditions.keywords.some(keyword => 
        messageText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        return false;
      }
    }

    // Check phone numbers
    if (conditions.phoneNumbers && conditions.phoneNumbers.length > 0) {
      if (!conditions.phoneNumbers.includes(message.from)) {
        return false;
      }
    }

    // Check business hours
    if (conditions.businessHours?.enabled) {
      if (!this.isWithinBusinessHours(conditions.businessHours)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if current time is within business hours
   */
  private isWithinBusinessHours(businessHours: NonNullable<WhatsAppWorkflowConfig['triggerConditions']>['businessHours']): boolean {
    if (!businessHours?.enabled) return true;

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const todaySchedule = businessHours.schedule.find(s => s.day.toLowerCase() === currentDay);
    if (!todaySchedule) return false;

    return currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;
  }

  /**
   * Find workflow configuration for user/credential
   */
  private async findWorkflowConfig(
    userId: string,
    credentialId: string
  ): Promise<WhatsAppWorkflowConfig | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_workflow_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('credential_id', credentialId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        workflowId: data.workflow_id,
        userId: data.user_id,
        credentialId: data.credential_id,
        deploymentId: data.deployment_id,
        triggerConditions: data.config_data?.triggerConditions,
        responseSettings: data.config_data?.responseSettings
      };

    } catch (error) {
      console.error('Failed to find workflow config:', error);
      return null;
    }
  }

  /**
   * Load workflow from database
   */
  private async loadWorkflow(workflowId: string): Promise<AgentWorkflow | null> {
    try {
      const { data, error } = await supabase
        .from('agent_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        nodes: data.workflow_data?.nodes || [],
        connections: data.workflow_data?.connections || [],
        variables: data.workflow_data?.variables || {},
        settings: data.workflow_data?.settings || {},
        userId: data.user_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        metadata: data.metadata || {}
      };

    } catch (error) {
      console.error('Failed to load workflow:', error);
      return null;
    }
  }

  /**
   * Create conversation context
   */
  private async createConversationContext(
    phoneNumber: string,
    userId: string,
    credentialId: string,
    workflowId: string
  ): Promise<ConversationContext> {
    const conversationId = crypto.randomUUID();
    
    const context: ConversationContext = {
      conversationId,
      phoneNumber,
      userId,
      credentialId,
      workflowId,
      lastMessageTime: new Date().toISOString(),
      messageCount: 0,
      variables: {},
      state: 'active',
      metadata: {}
    };

    // Save to database
    await supabase
      .from('whatsapp_conversations')
      .insert({
        id: conversationId,
        phone_number: phoneNumber,
        user_id: userId,
        credential_id: credentialId,
        workflow_id: workflowId,
        context_data: {
          variables: context.variables,
          metadata: context.metadata
        },
        state: context.state,
        message_count: context.messageCount,
        last_message_at: context.lastMessageTime,
        created_at: new Date().toISOString()
      });

    return context;
  }

  /**
   * Save conversation context
   */
  private async saveConversationContext(context: ConversationContext): Promise<void> {
    try {
      await supabase
        .from('whatsapp_conversations')
        .update({
          context_data: {
            variables: context.variables,
            metadata: context.metadata
          },
          state: context.state,
          message_count: context.messageCount,
          last_message_at: context.lastMessageTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', context.conversationId);

    } catch (error) {
      console.error('Failed to save conversation context:', error);
    }
  }

  /**
   * Add message to conversation queue
   */
  private addMessageToQueue(conversationKey: string, message: WhatsAppMessage): void {
    if (!this.messageQueue.has(conversationKey)) {
      this.messageQueue.set(conversationKey, []);
    }
    
    const messages = this.messageQueue.get(conversationKey)!;
    messages.push(message);
    
    // Keep only last 50 messages per conversation
    if (messages.length > 50) {
      messages.splice(0, messages.length - 50);
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationKey: string): WhatsAppMessage[] {
    return this.messageQueue.get(conversationKey) || [];
  }

  /**
   * Get active conversations
   */
  getActiveConversations(): ConversationContext[] {
    return Array.from(this.activeConversations.values());
  }

  /**
   * End conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    const conversationKey = Array.from(this.activeConversations.keys())
      .find(key => this.activeConversations.get(key)?.conversationId === conversationId);

    if (conversationKey) {
      const context = this.activeConversations.get(conversationKey);
      if (context) {
        context.state = 'completed';
        await this.saveConversationContext(context);
      }
      
      this.activeConversations.delete(conversationKey);
      this.messageQueue.delete(conversationKey);
    }
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(
    userId: string,
    timeRange: { start: string; end: string }
  ): Promise<{
    totalConversations: number;
    activeConversations: number;
    completedConversations: number;
    averageMessageCount: number;
    topWorkflows: Array<{ workflowId: string; count: number }>;
  }> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end);

      if (error) throw error;

      const conversations = data || [];
      const totalConversations = conversations.length;
      const activeConversations = conversations.filter(c => c.state === 'active').length;
      const completedConversations = conversations.filter(c => c.state === 'completed').length;
      const averageMessageCount = conversations.reduce((sum, c) => sum + c.message_count, 0) / totalConversations || 0;

      // Count workflows
      const workflowCounts = conversations.reduce((acc, c) => {
        acc[c.workflow_id] = (acc[c.workflow_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topWorkflows = Object.entries(workflowCounts)
        .map(([workflowId, count]) => ({ workflowId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalConversations,
        activeConversations,
        completedConversations,
        averageMessageCount,
        topWorkflows
      };

    } catch (error) {
      console.error('Failed to get conversation analytics:', error);
      return {
        totalConversations: 0,
        activeConversations: 0,
        completedConversations: 0,
        averageMessageCount: 0,
        topWorkflows: []
      };
    }
  }
}

// Export singleton instance
export const whatsappWorkflowIntegration = WhatsAppWorkflowIntegration.getInstance();
export default whatsappWorkflowIntegration;

// Export types
export type {
  WhatsAppWorkflowConfig,
  ConversationContext,
  WorkflowTriggerEvent
};
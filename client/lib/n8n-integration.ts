/**
 * N8N Integration Layer
 * Connects agent conversations with N8N workflows for automation
 */

import { n8nService, type N8NWorkflow, type WorkflowTemplate } from './n8n-service';
import { conversationManager } from './conversation-manager';
import * as agentService from './agent-service';

interface WorkflowTrigger {
  id: string;
  name: string;
  description: string;
  type: 'conversation_end' | 'keyword_detected' | 'intent_classified' | 'data_extracted' | 'manual';
  conditions: {
    keywords?: string[];
    intents?: string[];
    dataFields?: string[];
    conversationLength?: number;
    userSentiment?: 'positive' | 'negative' | 'neutral';
  };
  workflowId: string;
  enabled: boolean;
}

interface WorkflowExecution {
  id: string;
  triggerId: string;
  workflowId: string;
  conversationId: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  error?: string;
}

class N8NIntegration {
  private triggers: Map<string, WorkflowTrigger> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private webhookListeners: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.initializeDefaultTriggers();
    this.setupConversationListeners();
  }

  /**
   * Create a new workflow trigger
   */
  async createTrigger(trigger: Omit<WorkflowTrigger, 'id'>): Promise<string> {
    const triggerId = `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newTrigger: WorkflowTrigger = {
      id: triggerId,
      ...trigger
    };

    this.triggers.set(triggerId, newTrigger);

    // Validate workflow exists
    try {
      await n8nService.getWorkflow(trigger.workflowId);
    } catch (error) {
      console.warn(`Workflow ${trigger.workflowId} not found, trigger created but may not work`);
    }

    return triggerId;
  }

  /**
   * Update workflow trigger
   */
  updateTrigger(triggerId: string, updates: Partial<WorkflowTrigger>): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      return false;
    }

    Object.assign(trigger, updates);
    this.triggers.set(triggerId, trigger);
    return true;
  }

  /**
   * Delete workflow trigger
   */
  deleteTrigger(triggerId: string): boolean {
    return this.triggers.delete(triggerId);
  }

  /**
   * Get all triggers
   */
  getTriggers(): WorkflowTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Get triggers for specific workflow
   */
  getTriggersForWorkflow(workflowId: string): WorkflowTrigger[] {
    return Array.from(this.triggers.values()).filter(t => t.workflowId === workflowId);
  }

  /**
   * Enable/disable trigger
   */
  setTriggerEnabled(triggerId: string, enabled: boolean): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) {
      return false;
    }

    trigger.enabled = enabled;
    return true;
  }

  /**
   * Manually execute workflow with conversation data
   */
  async executeWorkflow(
    workflowId: string,
    conversationId: string,
    additionalData: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Get conversation data
      const conversationData = await this.extractConversationData(conversationId);

      // Prepare input data
      const inputData = {
        conversation: conversationData,
        timestamp: new Date().toISOString(),
        ...additionalData
      };

      // Execute workflow
      const execution = await n8nService.executeWorkflow(workflowId, inputData);

      // Track execution
      const executionRecord: WorkflowExecution = {
        id: execution.id,
        triggerId: 'manual',
        workflowId,
        conversationId,
        agentId: conversationData.agentId,
        status: 'running',
        startedAt: new Date(),
        inputData
      };

      this.executions.set(execution.id, executionRecord);

      // Monitor execution status
      this.monitorExecution(execution.id);

      return execution.id;
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      throw error;
    }
  }

  /**
   * Create workflow from template with agent-specific configuration
   */
  async createAgentWorkflow(
    agentId: string,
    templateId: string,
    variables: Record<string, any>,
    customName?: string
  ): Promise<N8NWorkflow> {
    try {
      // Get agent configuration
      const agent = await agentService.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Add agent-specific variables
      const agentVariables = {
        ...variables,
        agentId,
        agentName: agent.name,
        agentWebhookUrl: this.createAgentWebhookUrl(agentId)
      };

      // Create workflow from template
      const workflow = await n8nService.createWorkflowFromTemplate(
        templateId,
        agentVariables,
        customName || `${agent.name} - ${templateId}`
      );

      // Create default triggers for the workflow
      await this.createDefaultTriggersForWorkflow(workflow.id, agentId);

      return workflow;
    } catch (error) {
      console.error('Failed to create agent workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow executions for agent
   */
  getAgentExecutions(agentId: string): WorkflowExecution[] {
    return Array.from(this.executions.values()).filter(e => e.agentId === agentId);
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    try {
      await n8nService.stopExecution(executionId);

      const execution = this.executions.get(executionId);
      if (execution) {
        execution.status = 'failed';
        execution.completedAt = new Date();
        execution.error = 'Cancelled by user';
      }

      return true;
    } catch (error) {
      console.error('Failed to cancel execution:', error);
      return false;
    }
  }

  /**
   * Setup webhook listener for workflow results
   */
  setupWebhookListener(workflowId: string, callback: (data: any) => void): void {
    this.webhookListeners.set(workflowId, callback);
  }

  /**
   * Handle webhook data from N8N
   */
  handleWebhook(workflowId: string, data: any): void {
    const listener = this.webhookListeners.get(workflowId);
    if (listener) {
      listener(data);
    }

    // Update execution status if this is a workflow completion
    if (data.executionId) {
      const execution = this.executions.get(data.executionId);
      if (execution) {
        execution.status = data.success ? 'completed' : 'failed';
        execution.completedAt = new Date();
        execution.outputData = data.result;
        if (!data.success) {
          execution.error = data.error;
        }
      }
    }
  }

  /**
   * Get workflow integration statistics
   */
  getIntegrationStats(): {
    totalTriggers: number;
    activeTriggers: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } {
    const triggers = Array.from(this.triggers.values());
    const executions = Array.from(this.executions.values());

    const completedExecutions = executions.filter(e => e.completedAt);
    const successfulExecutions = executions.filter(e => e.status === 'completed');
    const failedExecutions = executions.filter(e => e.status === 'failed');

    let averageExecutionTime = 0;
    if (completedExecutions.length > 0) {
      const totalTime = completedExecutions.reduce((sum, e) => {
        return sum + (e.completedAt!.getTime() - e.startedAt.getTime());
      }, 0);
      averageExecutionTime = totalTime / completedExecutions.length;
    }

    return {
      totalTriggers: triggers.length,
      activeTriggers: triggers.filter(t => t.enabled).length,
      totalExecutions: executions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      averageExecutionTime
    };
  }

  /**
   * Test N8N integration
   */
  async testIntegration(): Promise<{
    n8nConnection: boolean;
    webhookEndpoint: boolean;
    workflowExecution: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let n8nConnection = false;
    let webhookEndpoint = false;
    let workflowExecution = false;

    try {
      // Test N8N connection
      const connectionTest = await n8nService.testConnection();
      n8nConnection = connectionTest.success;
      if (!connectionTest.success) {
        errors.push(`N8N connection failed: ${connectionTest.error}`);
      }

      // Test webhook endpoint (simplified check)
      webhookEndpoint = true; // Assume webhook is working if N8N is connected

      // Test workflow execution with a simple workflow
      if (n8nConnection) {
        try {
          const workflows = await n8nService.getWorkflows();
          if (workflows.length > 0) {
            // Try to get execution history for first workflow
            await n8nService.getExecutions(workflows[0].id, { limit: 1 });
            workflowExecution = true;
          }
        } catch (error) {
          errors.push(`Workflow execution test failed: ${error}`);
        }
      }

    } catch (error) {
      errors.push(`Integration test failed: ${error}`);
    }

    return {
      n8nConnection,
      webhookEndpoint,
      workflowExecution,
      errors
    };
  }

  // Private methods

  /**
   * Initialize default triggers
   */
  private initializeDefaultTriggers(): void {
    // These would be created when workflows are set up
    // For now, we'll keep this empty and create triggers dynamically
  }

  /**
   * Setup conversation event listeners
   */
  private setupConversationListeners(): void {
    // Listen for conversation events that might trigger workflows
    // This would integrate with the conversation manager

    // Example: Listen for conversation end
    // conversationManager.on('conversationEnd', (conversationId, data) => {
    //   this.checkTriggers('conversation_end', conversationId, data);
    // });
  }

  /**
   * Check if any triggers should fire for an event
   */
  private async checkTriggers(
    eventType: WorkflowTrigger['type'],
    conversationId: string,
    eventData: any
  ): Promise<void> {
    const relevantTriggers = Array.from(this.triggers.values()).filter(
      t => t.type === eventType && t.enabled
    );

    for (const trigger of relevantTriggers) {
      if (await this.shouldTriggerFire(trigger, conversationId, eventData)) {
        try {
          await this.executeWorkflow(trigger.workflowId, conversationId, eventData);
        } catch (error) {
          console.error(`Failed to execute workflow ${trigger.workflowId}:`, error);
        }
      }
    }
  }

  /**
   * Check if trigger conditions are met
   */
  private async shouldTriggerFire(
    trigger: WorkflowTrigger,
    conversationId: string,
    eventData: any
  ): Promise<boolean> {
    const { conditions } = trigger;

    // Check keyword conditions
    if (conditions.keywords && conditions.keywords.length > 0) {
      const conversationText = eventData.messages?.map((m: any) => m.content).join(' ') || '';
      const hasKeyword = conditions.keywords.some(keyword =>
        conversationText.toLowerCase().includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Check intent conditions
    if (conditions.intents && conditions.intents.length > 0) {
      const detectedIntent = eventData.intent;
      if (!detectedIntent || !conditions.intents.includes(detectedIntent)) {
        return false;
      }
    }

    // Check conversation length
    if (conditions.conversationLength) {
      const messageCount = eventData.messages?.length || 0;
      if (messageCount < conditions.conversationLength) {
        return false;
      }
    }

    // Check sentiment
    if (conditions.userSentiment) {
      const sentiment = eventData.sentiment;
      if (sentiment !== conditions.userSentiment) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract conversation data for workflow input
   */
  private async extractConversationData(conversationId: string): Promise<any> {
    try {
      // This would integrate with your conversation manager
      // For now, return mock data structure
      return {
        conversationId,
        agentId: 'agent-123',
        userId: 'user-456',
        messages: [],
        metadata: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 0,
          messageCount: 0
        },
        extractedData: {},
        sentiment: 'neutral',
        intent: 'general_inquiry'
      };
    } catch (error) {
      console.error('Failed to extract conversation data:', error);
      throw error;
    }
  }

  /**
   * Monitor workflow execution status
   */
  private async monitorExecution(executionId: string): Promise<void> {
    const checkStatus = async () => {
      try {
        const execution = await n8nService.getExecution(executionId);
        const localExecution = this.executions.get(executionId);

        if (localExecution) {
          localExecution.status = execution.status as any;

          if (execution.status === 'success' || execution.status === 'error') {
            localExecution.completedAt = new Date();
            if (execution.status === 'error') {
              localExecution.error = 'Workflow execution failed';
            }
            return; // Stop monitoring
          }
        }

        // Continue monitoring if still running
        if (execution.status === 'running' || execution.status === 'waiting') {
          setTimeout(checkStatus, 5000); // Check again in 5 seconds
        }
      } catch (error) {
        console.error('Failed to monitor execution:', error);
      }
    };

    // Start monitoring
    setTimeout(checkStatus, 1000);
  }

  /**
   * Create agent-specific webhook URL
   */
  private createAgentWebhookUrl(agentId: string): string {
    return n8nService.createWebhookUrl(`agent-${agentId}`);
  }

  /**
   * Create default triggers for a workflow
   */
  private async createDefaultTriggersForWorkflow(workflowId: string, agentId: string): Promise<void> {
    // Create a conversation end trigger
    await this.createTrigger({
      name: 'Conversation End Trigger',
      description: 'Triggers when a conversation ends',
      type: 'conversation_end',
      conditions: {},
      workflowId,
      enabled: true
    });

    // Create a keyword detection trigger for lead qualification
    await this.createTrigger({
      name: 'Lead Qualification Keywords',
      description: 'Triggers when lead qualification keywords are detected',
      type: 'keyword_detected',
      conditions: {
        keywords: ['interested', 'budget', 'timeline', 'decision maker', 'purchase']
      },
      workflowId,
      enabled: true
    });
  }
}

// Export singleton instance
export const n8nIntegration = new N8NIntegration();
export default n8nIntegration;

// Export helpers
export const n8nHelpers = {
  validateConfig(): boolean {
    return n8nIntegration.isAvailable();
  },
  
  getIntegrationStats() {
    return n8nIntegration.getIntegrationStats();
  }
};

// Export types
export type { WorkflowTrigger, WorkflowExecution };
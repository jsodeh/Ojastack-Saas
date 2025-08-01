/**
 * N8N Workflow Integration Service
 * Bridges visual agent workflows with N8N automation workflows
 */

import { n8nService, type N8NWorkflow, type N8NExecution, type WorkflowTemplate } from './n8n-service';
import { workflowExecutor, type WorkflowExecution } from './workflow-executor';
import { supabase } from './supabase';
import type { AgentWorkflow } from './workflow-types';

export interface N8NWorkflowMapping {
  id: string;
  visualWorkflowId: string;
  n8nWorkflowId: string;
  userId: string;
  
  // Mapping configuration
  triggerConditions: {
    nodeTypes?: string[];
    nodeIds?: string[];
    dataConditions?: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    }>;
    executionStatus?: ('completed' | 'failed' | 'timeout')[];
  };
  
  // Data transformation
  dataMapping: {
    input: Record<string, string>; // visual workflow data -> N8N input
    output: Record<string, string>; // N8N output -> visual workflow variables
  };
  
  // Execution settings
  executionMode: 'sync' | 'async' | 'webhook';
  timeout: number;
  retryCount: number;
  
  // Status and metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface N8NExecutionRecord {
  id: string;
  mappingId: string;
  visualExecutionId: string;
  n8nExecutionId: string;
  
  // Execution details
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  
  // Data
  inputData: any;
  outputData?: any;
  error?: string;
  
  // Metadata
  metadata: Record<string, any>;
}

export interface N8NIntegrationStats {
  totalMappings: number;
  activeMappings: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  topN8NWorkflows: Array<{
    workflowId: string;
    workflowName: string;
    executionCount: number;
  }>;
}

class N8NWorkflowIntegration {
  private static instance: N8NWorkflowIntegration;
  private mappings: Map<string, N8NWorkflowMapping> = new Map();
  private executionRecords: Map<string, N8NExecutionRecord> = new Map();
  private webhookListeners: Map<string, (data: any) => void> = new Map();

  static getInstance(): N8NWorkflowIntegration {
    if (!N8NWorkflowIntegration.instance) {
      N8NWorkflowIntegration.instance = new N8NWorkflowIntegration();
    }
    return N8NWorkflowIntegration.instance;
  }

  constructor() {
    this.initializeIntegration();
  }

  /**
   * Create N8N workflow mapping
   */
  async createMapping(mapping: Omit<N8NWorkflowMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Validate N8N workflow exists
      if (n8nService.isAvailable()) {
        await n8nService.getWorkflow(mapping.n8nWorkflowId);
      }

      // Validate visual workflow exists
      const { data: visualWorkflow, error } = await supabase
        .from('agent_workflows')
        .select('id')
        .eq('id', mapping.visualWorkflowId)
        .single();

      if (error || !visualWorkflow) {
        throw new Error(`Visual workflow ${mapping.visualWorkflowId} not found`);
      }

      const mappingId = crypto.randomUUID();
      const now = new Date().toISOString();

      const newMapping: N8NWorkflowMapping = {
        id: mappingId,
        createdAt: now,
        updatedAt: now,
        ...mapping
      };

      // Store in memory
      this.mappings.set(mappingId, newMapping);

      // Save to database
      await supabase
        .from('n8n_workflow_mappings')
        .insert({
          id: mappingId,
          visual_workflow_id: mapping.visualWorkflowId,
          n8n_workflow_id: mapping.n8nWorkflowId,
          user_id: mapping.userId,
          mapping_config: {
            triggerConditions: mapping.triggerConditions,
            dataMapping: mapping.dataMapping,
            executionMode: mapping.executionMode,
            timeout: mapping.timeout,
            retryCount: mapping.retryCount
          },
          is_active: mapping.isActive,
          created_at: now,
          updated_at: now
        });

      console.log(`N8N workflow mapping created: ${mappingId}`);
      return mappingId;

    } catch (error) {
      console.error('Failed to create N8N workflow mapping:', error);
      throw error;
    }
  }

  /**
   * Update N8N workflow mapping
   */
  async updateMapping(mappingId: string, updates: Partial<N8NWorkflowMapping>): Promise<void> {
    try {
      const mapping = this.mappings.get(mappingId);
      if (!mapping) {
        throw new Error(`Mapping ${mappingId} not found`);
      }

      const updatedMapping = {
        ...mapping,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      this.mappings.set(mappingId, updatedMapping);

      // Update in database
      await supabase
        .from('n8n_workflow_mappings')
        .update({
          mapping_config: {
            triggerConditions: updatedMapping.triggerConditions,
            dataMapping: updatedMapping.dataMapping,
            executionMode: updatedMapping.executionMode,
            timeout: updatedMapping.timeout,
            retryCount: updatedMapping.retryCount
          },
          is_active: updatedMapping.isActive,
          updated_at: updatedMapping.updatedAt
        })
        .eq('id', mappingId);

    } catch (error) {
      console.error('Failed to update N8N workflow mapping:', error);
      throw error;
    }
  }

  /**
   * Delete N8N workflow mapping
   */
  async deleteMapping(mappingId: string): Promise<void> {
    try {
      this.mappings.delete(mappingId);

      await supabase
        .from('n8n_workflow_mappings')
        .delete()
        .eq('id', mappingId);

    } catch (error) {
      console.error('Failed to delete N8N workflow mapping:', error);
      throw error;
    }
  }

  /**
   * Get mappings for visual workflow
   */
  getMappingsForWorkflow(visualWorkflowId: string): N8NWorkflowMapping[] {
    return Array.from(this.mappings.values())
      .filter(mapping => mapping.visualWorkflowId === visualWorkflowId && mapping.isActive);
  }

  /**
   * Process visual workflow execution and trigger N8N workflows
   */
  async processWorkflowExecution(execution: WorkflowExecution): Promise<void> {
    try {
      const mappings = this.getMappingsForWorkflow(execution.workflowId);
      
      for (const mapping of mappings) {
        if (this.shouldTriggerN8NWorkflow(mapping, execution)) {
          await this.executeN8NWorkflow(mapping, execution);
        }
      }

    } catch (error) {
      console.error('Failed to process workflow execution for N8N integration:', error);
    }
  }

  /**
   * Execute N8N workflow based on mapping
   */
  private async executeN8NWorkflow(
    mapping: N8NWorkflowMapping,
    visualExecution: WorkflowExecution
  ): Promise<void> {
    try {
      if (!n8nService.isAvailable()) {
        console.warn('N8N service not available, skipping execution');
        return;
      }

      // Prepare input data
      const inputData = this.prepareN8NInputData(mapping, visualExecution);

      // Create execution record
      const executionRecord: N8NExecutionRecord = {
        id: crypto.randomUUID(),
        mappingId: mapping.id,
        visualExecutionId: visualExecution.id,
        n8nExecutionId: '',
        status: 'pending',
        startedAt: new Date().toISOString(),
        inputData,
        metadata: {
          visualWorkflowId: visualExecution.workflowId,
          n8nWorkflowId: mapping.n8nWorkflowId,
          executionMode: mapping.executionMode
        }
      };

      this.executionRecords.set(executionRecord.id, executionRecord);

      // Execute N8N workflow
      let n8nExecution: N8NExecution;
      
      switch (mapping.executionMode) {
        case 'sync':
          n8nExecution = await n8nService.executeWorkflow(mapping.n8nWorkflowId, inputData);
          executionRecord.n8nExecutionId = n8nExecution.id;
          executionRecord.status = 'running';
          
          // Wait for completion
          await this.waitForN8NCompletion(executionRecord, mapping.timeout);
          break;

        case 'async':
          n8nExecution = await n8nService.executeWorkflow(mapping.n8nWorkflowId, inputData);
          executionRecord.n8nExecutionId = n8nExecution.id;
          executionRecord.status = 'running';
          
          // Monitor asynchronously
          this.monitorN8NExecution(executionRecord);
          break;

        case 'webhook':
          // Execute via webhook
          const webhookUrl = n8nService.createWebhookUrl(mapping.n8nWorkflowId);
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inputData)
          });

          if (response.ok) {
            const responseData = await response.json();
            executionRecord.n8nExecutionId = responseData.executionId || 'webhook-' + Date.now();
            executionRecord.status = 'completed';
            executionRecord.outputData = responseData;
            executionRecord.completedAt = new Date().toISOString();
            executionRecord.duration = Date.now() - new Date(executionRecord.startedAt).getTime();
          } else {
            throw new Error(`Webhook execution failed: ${response.statusText}`);
          }
          break;
      }

      // Save execution record
      await this.saveExecutionRecord(executionRecord);

    } catch (error) {
      console.error('Failed to execute N8N workflow:', error);
      
      // Update execution record with error
      const executionRecord = Array.from(this.executionRecords.values())
        .find(record => record.visualExecutionId === visualExecution.id);
      
      if (executionRecord) {
        executionRecord.status = 'failed';
        executionRecord.error = error.message;
        executionRecord.completedAt = new Date().toISOString();
        await this.saveExecutionRecord(executionRecord);
      }
    }
  }

  /**
   * Check if N8N workflow should be triggered
   */
  private shouldTriggerN8NWorkflow(
    mapping: N8NWorkflowMapping,
    execution: WorkflowExecution
  ): boolean {
    const conditions = mapping.triggerConditions;

    // Check execution status
    if (conditions.executionStatus && conditions.executionStatus.length > 0) {
      if (!conditions.executionStatus.includes(execution.status as any)) {
        return false;
      }
    }

    // Check node types
    if (conditions.nodeTypes && conditions.nodeTypes.length > 0) {
      const executedNodeTypes = execution.steps.map(step => step.nodeType);
      const hasMatchingNodeType = conditions.nodeTypes.some(type => 
        executedNodeTypes.includes(type)
      );
      if (!hasMatchingNodeType) {
        return false;
      }
    }

    // Check specific node IDs
    if (conditions.nodeIds && conditions.nodeIds.length > 0) {
      const executedNodeIds = execution.steps.map(step => step.nodeId);
      const hasMatchingNodeId = conditions.nodeIds.some(id => 
        executedNodeIds.includes(id)
      );
      if (!hasMatchingNodeId) {
        return false;
      }
    }

    // Check data conditions
    if (conditions.dataConditions && conditions.dataConditions.length > 0) {
      for (const condition of conditions.dataConditions) {
        const value = this.getNestedValue(execution.result, condition.field);
        if (!this.evaluateCondition(value, condition.operator, condition.value)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Prepare input data for N8N workflow
   */
  private prepareN8NInputData(
    mapping: N8NWorkflowMapping,
    execution: WorkflowExecution
  ): any {
    const sourceData = {
      execution: execution,
      result: execution.result,
      variables: execution.variables,
      steps: execution.steps,
      metadata: execution.metadata
    };

    // Apply input mapping
    const mappedData: any = {};
    
    for (const [n8nField, sourceField] of Object.entries(mapping.dataMapping.input)) {
      const value = this.getNestedValue(sourceData, sourceField);
      this.setNestedValue(mappedData, n8nField, value);
    }

    // Add default fields if no mapping specified
    if (Object.keys(mapping.dataMapping.input).length === 0) {
      mappedData.visualWorkflowExecution = sourceData;
    }

    // Add metadata
    mappedData.integrationMetadata = {
      mappingId: mapping.id,
      visualWorkflowId: mapping.visualWorkflowId,
      executionId: execution.id,
      timestamp: new Date().toISOString()
    };

    return mappedData;
  }

  /**
   * Wait for N8N workflow completion
   */
  private async waitForN8NCompletion(
    executionRecord: N8NExecutionRecord,
    timeout: number
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const n8nExecution = await n8nService.getExecution(executionRecord.n8nExecutionId);
        
        if (n8nExecution.status === 'success') {
          executionRecord.status = 'completed';
          executionRecord.outputData = n8nExecution.data?.resultData?.runData;
          executionRecord.completedAt = new Date().toISOString();
          executionRecord.duration = Date.now() - new Date(executionRecord.startedAt).getTime();
          return;
        } else if (n8nExecution.status === 'error') {
          executionRecord.status = 'failed';
          executionRecord.error = 'N8N workflow execution failed';
          executionRecord.completedAt = new Date().toISOString();
          return;
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error('Error checking N8N execution status:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Timeout
    executionRecord.status = 'timeout';
    executionRecord.error = `N8N workflow execution timed out after ${timeout}ms`;
    executionRecord.completedAt = new Date().toISOString();
  }

  /**
   * Monitor N8N execution asynchronously
   */
  private async monitorN8NExecution(executionRecord: N8NExecutionRecord): Promise<void> {
    const checkStatus = async () => {
      try {
        const n8nExecution = await n8nService.getExecution(executionRecord.n8nExecutionId);
        
        if (n8nExecution.status === 'success' || n8nExecution.status === 'error') {
          executionRecord.status = n8nExecution.status === 'success' ? 'completed' : 'failed';
          executionRecord.outputData = n8nExecution.data?.resultData?.runData;
          executionRecord.completedAt = new Date().toISOString();
          executionRecord.duration = Date.now() - new Date(executionRecord.startedAt).getTime();
          
          if (n8nExecution.status === 'error') {
            executionRecord.error = 'N8N workflow execution failed';
          }

          await this.saveExecutionRecord(executionRecord);
          return; // Stop monitoring
        }

        // Continue monitoring if still running
        if (n8nExecution.status === 'running' || n8nExecution.status === 'waiting') {
          setTimeout(checkStatus, 10000); // Check again in 10 seconds
        }

      } catch (error) {
        console.error('Error monitoring N8N execution:', error);
        setTimeout(checkStatus, 15000); // Retry in 15 seconds
      }
    };

    // Start monitoring after a short delay
    setTimeout(checkStatus, 5000);
  }

  /**
   * Save execution record to database
   */
  private async saveExecutionRecord(record: N8NExecutionRecord): Promise<void> {
    try {
      await supabase
        .from('n8n_execution_records')
        .upsert({
          id: record.id,
          mapping_id: record.mappingId,
          visual_execution_id: record.visualExecutionId,
          n8n_execution_id: record.n8nExecutionId,
          status: record.status,
          started_at: record.startedAt,
          completed_at: record.completedAt,
          duration_ms: record.duration,
          input_data: record.inputData,
          output_data: record.outputData,
          error_message: record.error,
          metadata: record.metadata
        });

    } catch (error) {
      console.error('Failed to save N8N execution record:', error);
    }
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStats(userId: string): Promise<N8NIntegrationStats> {
    try {
      const { data: mappings } = await supabase
        .from('n8n_workflow_mappings')
        .select('*')
        .eq('user_id', userId);

      const { data: executions } = await supabase
        .from('n8n_execution_records')
        .select('*')
        .in('mapping_id', (mappings || []).map(m => m.id));

      const executionRecords = executions || [];
      const totalExecutions = executionRecords.length;
      const successfulExecutions = executionRecords.filter(e => e.status === 'completed').length;
      const failedExecutions = executionRecords.filter(e => e.status === 'failed').length;

      // Calculate average execution time
      const completedExecutions = executionRecords.filter(e => e.duration_ms);
      const averageExecutionTime = completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + e.duration_ms, 0) / completedExecutions.length
        : 0;

      // Get top N8N workflows
      const workflowCounts = executionRecords.reduce((acc, e) => {
        const workflowId = e.metadata?.n8nWorkflowId;
        if (workflowId) {
          acc[workflowId] = (acc[workflowId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const topN8NWorkflows = Object.entries(workflowCounts)
        .map(([workflowId, count]) => ({
          workflowId,
          workflowName: `Workflow ${workflowId}`, // Would fetch actual name in real implementation
          executionCount: count
        }))
        .sort((a, b) => b.executionCount - a.executionCount)
        .slice(0, 10);

      return {
        totalMappings: (mappings || []).length,
        activeMappings: (mappings || []).filter(m => m.is_active).length,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime,
        topN8NWorkflows
      };

    } catch (error) {
      console.error('Failed to get integration stats:', error);
      return {
        totalMappings: 0,
        activeMappings: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        topN8NWorkflows: []
      };
    }
  }

  /**
   * Create workflow from N8N template
   */
  async createWorkflowFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    userId: string,
    customName?: string
  ): Promise<{ n8nWorkflow: N8NWorkflow; mappingId: string }> {
    try {
      // Create N8N workflow from template
      const n8nWorkflow = await n8nService.createWorkflowFromTemplate(
        templateId,
        variables,
        customName
      );

      // Create a basic visual workflow that can trigger this N8N workflow
      const visualWorkflow = await this.createVisualWorkflowForN8N(
        n8nWorkflow,
        userId,
        templateId
      );

      // Create mapping between visual and N8N workflows
      const mappingId = await this.createMapping({
        visualWorkflowId: visualWorkflow.id,
        n8nWorkflowId: n8nWorkflow.id,
        userId,
        triggerConditions: {
          executionStatus: ['completed']
        },
        dataMapping: {
          input: {},
          output: {}
        },
        executionMode: 'async',
        timeout: 300000, // 5 minutes
        retryCount: 1,
        isActive: true
      });

      return { n8nWorkflow, mappingId };

    } catch (error) {
      console.error('Failed to create workflow from template:', error);
      throw error;
    }
  }

  // Utility methods

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expectedValue;
      case 'contains':
        return String(value).includes(String(expectedValue));
      case 'greater_than':
        return Number(value) > Number(expectedValue);
      case 'less_than':
        return Number(value) < Number(expectedValue);
      default:
        return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  private async createVisualWorkflowForN8N(
    n8nWorkflow: N8NWorkflow,
    userId: string,
    templateId: string
  ): Promise<AgentWorkflow> {
    // Create a simple visual workflow that can be used to trigger the N8N workflow
    const visualWorkflowData = {
      name: `Visual Trigger for ${n8nWorkflow.name}`,
      description: `Visual workflow to trigger N8N workflow: ${n8nWorkflow.name}`,
      workflow_data: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'message_trigger',
            name: 'Message Trigger',
            position: { x: 100, y: 100 },
            configuration: {
              messageTypes: ['text'],
              keywords: []
            }
          },
          {
            id: 'n8n-1',
            type: 'n8n_workflow',
            name: 'N8N Workflow',
            position: { x: 300, y: 100 },
            configuration: {
              workflowId: n8nWorkflow.id,
              executionMode: 'async',
              timeout: 300000
            }
          }
        ],
        connections: [
          {
            id: 'conn-1',
            sourceNodeId: 'trigger-1',
            sourcePortId: 'output',
            targetNodeId: 'n8n-1',
            targetPortId: 'trigger'
          }
        ],
        variables: {},
        settings: {
          timeout: 300000,
          retryCount: 1,
          errorHandling: 'stop'
        }
      },
      user_id: userId,
      metadata: {
        created_by: userId,
        template_id: templateId,
        n8n_workflow_id: n8nWorkflow.id
      }
    };

    const { data, error } = await supabase
      .from('agent_workflows')
      .insert(visualWorkflowData)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      nodes: data.workflow_data.nodes,
      connections: data.workflow_data.connections,
      variables: data.workflow_data.variables,
      settings: data.workflow_data.settings,
      userId: data.user_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      metadata: data.metadata
    };
  }

  private async initializeIntegration(): Promise<void> {
    try {
      // Load existing mappings from database
      const { data: mappings } = await supabase
        .from('n8n_workflow_mappings')
        .select('*')
        .eq('is_active', true);

      if (mappings) {
        for (const mapping of mappings) {
          this.mappings.set(mapping.id, {
            id: mapping.id,
            visualWorkflowId: mapping.visual_workflow_id,
            n8nWorkflowId: mapping.n8n_workflow_id,
            userId: mapping.user_id,
            triggerConditions: mapping.mapping_config.triggerConditions,
            dataMapping: mapping.mapping_config.dataMapping,
            executionMode: mapping.mapping_config.executionMode,
            timeout: mapping.mapping_config.timeout,
            retryCount: mapping.mapping_config.retryCount,
            isActive: mapping.is_active,
            createdAt: mapping.created_at,
            updatedAt: mapping.updated_at
          });
        }
      }

      console.log(`Loaded ${this.mappings.size} N8N workflow mappings`);

    } catch (error) {
      console.error('Failed to initialize N8N workflow integration:', error);
    }
  }
}

// Export singleton instance
export const n8nWorkflowIntegration = N8NWorkflowIntegration.getInstance();
export default n8nWorkflowIntegration;

// Export types
export type {
  N8NWorkflowMapping,
  N8NExecutionRecord,
  N8NIntegrationStats
};
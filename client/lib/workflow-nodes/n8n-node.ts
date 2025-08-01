/**
 * N8N Workflow Node
 * Execute N8N workflows from within visual agent workflows
 */

import { BaseNode, NodeExecutionContext, NodeExecutionResult } from './base-node';
import { n8nService, type N8NWorkflow, type N8NExecution } from '../n8n-service';

export interface N8NNodeConfig {
  // N8N workflow selection
  workflowId: string;
  workflowName?: string;
  
  // Execution settings
  executionMode: 'sync' | 'async' | 'webhook';
  timeout: number; // milliseconds
  
  // Data mapping
  inputMapping: Record<string, string>; // Map workflow variables to N8N input
  outputMapping: Record<string, string>; // Map N8N output to workflow variables
  
  // Webhook settings (for webhook mode)
  webhookPath?: string;
  webhookMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  
  // Error handling
  continueOnError: boolean;
  retryCount: number;
  retryDelay: number;
  
  // Advanced settings
  passthrough: boolean; // Pass original data through
  mergeOutput: boolean; // Merge N8N output with input data
  
  // Template variables (for template-based workflows)
  templateVariables: Record<string, any>;
}

export interface N8NExecutionResult {
  executionId: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  data?: any;
  error?: string;
  duration?: number;
  n8nWorkflowId: string;
}

export class N8NNode extends BaseNode {
  type = 'n8n_workflow';
  name = 'N8N Workflow';
  description = 'Execute N8N workflows with data mapping';
  category = 'automation';
  
  config: N8NNodeConfig = {
    workflowId: '',
    executionMode: 'sync',
    timeout: 30000,
    inputMapping: {},
    outputMapping: {},
    webhookMethod: 'POST',
    continueOnError: false,
    retryCount: 0,
    retryDelay: 1000,
    passthrough: true,
    mergeOutput: true,
    templateVariables: {}
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
        id: 'error',
        name: 'Error',
        type: 'flow'
      },
      {
        id: 'timeout',
        name: 'Timeout',
        type: 'flow'
      },
      {
        id: 'async',
        name: 'Async Started',
        type: 'flow'
      }
    ];
  }

  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    try {
      const { data, variables } = context;

      // Check if N8N service is available
      if (!n8nService.isAvailable()) {
        throw new Error('N8N service is not available. Please check configuration.');
      }

      // Validate workflow ID
      if (!this.config.workflowId) {
        throw new Error('N8N workflow ID is required');
      }

      // Prepare input data for N8N workflow
      const n8nInputData = this.prepareN8NInput(data, variables);

      let result: N8NExecutionResult;
      let attempts = 0;
      const maxAttempts = this.config.retryCount + 1;

      while (attempts < maxAttempts) {
        try {
          switch (this.config.executionMode) {
            case 'sync':
              result = await this.executeSynchronous(n8nInputData);
              break;
            case 'async':
              result = await this.executeAsynchronous(n8nInputData);
              break;
            case 'webhook':
              result = await this.executeViaWebhook(n8nInputData);
              break;
            default:
              throw new Error(`Unsupported execution mode: ${this.config.executionMode}`);
          }

          break; // Success, exit retry loop

        } catch (error) {
          attempts++;
          
          if (attempts >= maxAttempts) {
            if (this.config.continueOnError) {
              return {
                success: true,
                data: this.config.passthrough ? data : {},
                nextNodes: ['error'],
                logs: [{
                  level: 'warn',
                  message: `N8N workflow failed but continuing: ${error.message}`,
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

      // Process the result
      return this.processExecutionResult(result!, data, variables);

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: context.data,
        nextNodes: ['error'],
        logs: [{
          level: 'error',
          message: `N8N node execution failed: ${error.message}`,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  private async executeSynchronous(inputData: any): Promise<N8NExecutionResult> {
    const startTime = Date.now();
    
    try {
      const execution = await n8nService.executeWorkflow(this.config.workflowId, inputData);
      
      // Wait for completion with timeout
      const result = await this.waitForCompletion(execution.id, this.config.timeout);
      
      return {
        executionId: execution.id,
        status: result.status as any,
        data: result.data?.resultData?.runData,
        duration: Date.now() - startTime,
        n8nWorkflowId: this.config.workflowId,
        error: result.status === 'error' ? 'N8N workflow execution failed' : undefined
      };

    } catch (error) {
      return {
        executionId: 'failed',
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
        n8nWorkflowId: this.config.workflowId
      };
    }
  }

  private async executeAsynchronous(inputData: any): Promise<N8NExecutionResult> {
    try {
      const execution = await n8nService.executeWorkflow(this.config.workflowId, inputData);
      
      return {
        executionId: execution.id,
        status: 'running',
        n8nWorkflowId: this.config.workflowId
      };

    } catch (error) {
      return {
        executionId: 'failed',
        status: 'error',
        error: error.message,
        n8nWorkflowId: this.config.workflowId
      };
    }
  }

  private async executeViaWebhook(inputData: any): Promise<N8NExecutionResult> {
    try {
      const webhookUrl = n8nService.createWebhookUrl(
        this.config.workflowId, 
        this.config.webhookPath
      );

      const response = await fetch(webhookUrl, {
        method: this.config.webhookMethod,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inputData)
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();

      return {
        executionId: responseData.executionId || 'webhook-' + Date.now(),
        status: 'success',
        data: responseData,
        n8nWorkflowId: this.config.workflowId
      };

    } catch (error) {
      return {
        executionId: 'failed',
        status: 'error',
        error: error.message,
        n8nWorkflowId: this.config.workflowId
      };
    }
  }

  private async waitForCompletion(executionId: string, timeout: number): Promise<N8NExecution> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const execution = await n8nService.getExecution(executionId);
        
        if (execution.status === 'success' || execution.status === 'error' || execution.status === 'canceled') {
          return execution;
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error('Error checking execution status:', error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error(`N8N workflow execution timed out after ${timeout}ms`);
  }

  private prepareN8NInput(data: any, variables: Record<string, any>): any {
    const combinedData = { ...data, ...variables };
    
    // If no input mapping is configured, pass all data
    if (Object.keys(this.config.inputMapping).length === 0) {
      return {
        workflowData: combinedData,
        templateVariables: this.config.templateVariables,
        timestamp: new Date().toISOString()
      };
    }

    // Apply input mapping
    const mappedData: any = {};
    
    for (const [n8nField, sourceField] of Object.entries(this.config.inputMapping)) {
      const value = this.getNestedValue(combinedData, sourceField);
      this.setNestedValue(mappedData, n8nField, value);
    }

    // Add template variables
    if (Object.keys(this.config.templateVariables).length > 0) {
      mappedData.templateVariables = this.config.templateVariables;
    }

    return mappedData;
  }

  private processExecutionResult(
    result: N8NExecutionResult,
    originalData: any,
    variables: Record<string, any>
  ): NodeExecutionResult {
    let outputData = this.config.passthrough ? { ...originalData } : {};
    let outputVariables = { ...variables };

    // Handle successful execution
    if (result.status === 'success' && result.data) {
      // Apply output mapping if configured
      if (Object.keys(this.config.outputMapping).length > 0) {
        for (const [targetField, sourceField] of Object.entries(this.config.outputMapping)) {
          const value = this.getNestedValue(result.data, sourceField);
          if (value !== undefined) {
            this.setNestedValue(outputData, targetField, value);
            outputVariables[targetField] = value;
          }
        }
      } else if (this.config.mergeOutput) {
        // Merge all N8N output if no specific mapping
        Object.assign(outputData, result.data);
      }

      // Add execution metadata
      outputData.n8n_execution = {
        executionId: result.executionId,
        workflowId: result.n8nWorkflowId,
        duration: result.duration,
        status: result.status
      };

      return {
        success: true,
        data: outputData,
        variables: outputVariables,
        nextNodes: ['success'],
        logs: [{
          level: 'info',
          message: `N8N workflow executed successfully (${result.duration}ms)`,
          timestamp: new Date().toISOString()
        }]
      };
    }

    // Handle async execution
    if (result.status === 'running' && this.config.executionMode === 'async') {
      outputData.n8n_execution = {
        executionId: result.executionId,
        workflowId: result.n8nWorkflowId,
        status: result.status
      };

      return {
        success: true,
        data: outputData,
        variables: outputVariables,
        nextNodes: ['async'],
        logs: [{
          level: 'info',
          message: `N8N workflow started asynchronously (${result.executionId})`,
          timestamp: new Date().toISOString()
        }]
      };
    }

    // Handle timeout
    if (result.error && result.error.includes('timed out')) {
      return {
        success: true,
        data: outputData,
        nextNodes: ['timeout'],
        logs: [{
          level: 'warn',
          message: `N8N workflow execution timed out`,
          timestamp: new Date().toISOString()
        }]
      };
    }

    // Handle error
    return {
      success: false,
      error: result.error || 'N8N workflow execution failed',
      data: outputData,
      nextNodes: ['error'],
      logs: [{
        level: 'error',
        message: `N8N workflow execution failed: ${result.error}`,
        timestamp: new Date().toISOString()
      }]
    };
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

  // Utility methods for configuration

  async getAvailableWorkflows(): Promise<Array<{ id: string; name: string; active: boolean }>> {
    try {
      if (!n8nService.isAvailable()) {
        return [];
      }

      const workflows = await n8nService.getWorkflows();
      return workflows.map(w => ({
        id: w.id,
        name: w.name,
        active: w.active
      }));
    } catch (error) {
      console.error('Failed to get available workflows:', error);
      return [];
    }
  }

  async getWorkflowDetails(workflowId: string): Promise<N8NWorkflow | null> {
    try {
      if (!n8nService.isAvailable() || !workflowId) {
        return null;
      }

      return await n8nService.getWorkflow(workflowId);
    } catch (error) {
      console.error('Failed to get workflow details:', error);
      return null;
    }
  }

  async testWorkflowExecution(testData: any = {}): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      if (!this.config.workflowId) {
        return { success: false, error: 'No workflow selected' };
      }

      const result = await this.executeSynchronous(testData);
      
      return {
        success: result.status === 'success',
        result: result.data,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if N8N service is available
    if (!n8nService.isAvailable()) {
      errors.push('N8N service is not configured or available');
    }

    // Validate workflow ID
    if (!this.config.workflowId) {
      errors.push('N8N workflow ID is required');
    }

    // Validate timeout
    if (this.config.timeout <= 0) {
      errors.push('Timeout must be positive');
    }

    // Validate retry settings
    if (this.config.retryCount < 0) {
      errors.push('Retry count cannot be negative');
    }

    if (this.config.retryDelay < 0) {
      errors.push('Retry delay cannot be negative');
    }

    // Validate webhook settings for webhook mode
    if (this.config.executionMode === 'webhook') {
      if (!this.config.webhookMethod) {
        errors.push('Webhook method is required for webhook execution mode');
      }
    }

    // Validate mapping configurations
    for (const [target, source] of Object.entries(this.config.inputMapping)) {
      if (!target.trim()) {
        errors.push('Input mapping target field cannot be empty');
      }
      if (!source.trim()) {
        errors.push('Input mapping source field cannot be empty');
      }
    }

    for (const [target, source] of Object.entries(this.config.outputMapping)) {
      if (!target.trim()) {
        errors.push('Output mapping target field cannot be empty');
      }
      if (!source.trim()) {
        errors.push('Output mapping source field cannot be empty');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  clone(): N8NNode {
    const cloned = new N8NNode(
      `${this.id}_copy`,
      { x: this.position.x + 50, y: this.position.y + 50 }
    );
    
    cloned.config = JSON.parse(JSON.stringify(this.config));
    
    return cloned;
  }
}

export default N8NNode;
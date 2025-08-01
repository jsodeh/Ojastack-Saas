/**
 * Workflow Execution Engine
 * Handles runtime execution of visual workflows with state management
 */

import { 
  AgentWorkflow, 
  WorkflowNode, 
  WorkflowConnection, 
  ExecutionResult,
  ValidationResult 
} from './workflow-types';
import { 
  BaseWorkflowNode, 
  ExecutionContext, 
  WorkflowExecutionContext 
} from './workflow-nodes/base-node';
import { nodeRegistry } from './workflow-nodes/node-registry';
import { supabase } from './supabase';

export interface WorkflowExecutionOptions {
  timeout?: number; // milliseconds
  maxIterations?: number;
  debugMode?: boolean;
  breakpoints?: string[];
  variables?: Record<string, any>;
  context?: Record<string, any>;
}

export interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: any;
  output?: any;
  error?: string;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  nodeId?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  deploymentId?: string;
  conversationId?: string;
  status: 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  steps: ExecutionStep[];
  variables: Record<string, any>;
  result?: any;
  error?: string;
  logs: ExecutionLog[];
  metadata: Record<string, any>;
}

export interface ExecutionQueue {
  nodeId: string;
  priority: number;
  dependencies: string[];
  satisfied: boolean;
}

export class WorkflowExecutor {
  private static instance: WorkflowExecutor;
  private activeExecutions: Map<string, WorkflowExecution> = new Map();
  private executionQueue: Map<string, ExecutionQueue[]> = new Map();

  static getInstance(): WorkflowExecutor {
    if (!WorkflowExecutor.instance) {
      WorkflowExecutor.instance = new WorkflowExecutor();
    }
    return WorkflowExecutor.instance;
  }

  /**
   * Execute a workflow with given input data
   */
  async executeWorkflow(
    workflow: AgentWorkflow,
    inputData: any = {},
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    const executionId = crypto.randomUUID();
    const startTime = new Date().toISOString();

    // Create execution context
    const context = new WorkflowExecutionContext({
      workflowId: workflow.id,
      executionId,
      userId: workflow.metadata.created_by,
      variables: { ...options.variables, ...inputData },
      metadata: options.context || {}
    });

    // Initialize execution record
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      deploymentId: options.context?.deploymentId,
      conversationId: options.context?.conversationId,
      status: 'running',
      startTime,
      steps: [],
      variables: context.variables,
      logs: [],
      metadata: options.context || {}
    };

    this.activeExecutions.set(executionId, execution);

    try {
      // Validate workflow before execution
      const validation = this.validateWorkflow(workflow);
      if (!validation.isValid) {
        throw new Error(`Workflow validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Find trigger nodes
      const triggerNodes = workflow.nodes.filter(node => node.category === 'triggers');
      if (triggerNodes.length === 0) {
        throw new Error('No trigger nodes found in workflow');
      }

      // Build execution plan
      const executionPlan = this.buildExecutionPlan(workflow, triggerNodes[0].id);
      
      // Execute workflow
      const result = await this.executeNodes(
        workflow, 
        executionPlan, 
        context, 
        execution, 
        options
      );

      // Complete execution
      execution.status = 'completed';
      execution.endTime = new Date().toISOString();
      execution.duration = Date.now() - new Date(startTime).getTime();
      execution.result = result;

      // Save execution to database
      await this.saveExecution(execution);

      return execution;

    } catch (error) {
      // Handle execution error
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      execution.duration = Date.now() - new Date(startTime).getTime();
      execution.error = error.message;

      this.log(execution, 'error', `Workflow execution failed: ${error.message}`, { error });

      // Save failed execution
      await this.saveExecution(execution);

      return execution;

    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Cancel running workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date().toISOString();
    execution.duration = Date.now() - new Date(execution.startTime).getTime();

    this.log(execution, 'info', 'Workflow execution cancelled by user');

    await this.saveExecution(execution);
    this.activeExecutions.delete(executionId);

    return true;
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): WorkflowExecution | null {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(
    workflowId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WorkflowExecution[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return (data || []).map(this.transformExecutionData);
    } catch (error) {
      console.error('Failed to get execution history:', error);
      return [];
    }
  }

  private validateWorkflow(workflow: AgentWorkflow): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check for trigger nodes
    const triggerNodes = workflow.nodes.filter(node => node.category === 'triggers');
    if (triggerNodes.length === 0) {
      errors.push({
        type: 'missing_trigger',
        message: 'Workflow must have at least one trigger node',
        severity: 'error'
      });
    }

    // Check for orphaned nodes
    const connectedNodeIds = new Set<string>();
    workflow.connections.forEach(conn => {
      connectedNodeIds.add(conn.sourceNodeId);
      connectedNodeIds.add(conn.targetNodeId);
    });

    workflow.nodes.forEach(node => {
      if (node.category !== 'triggers' && !connectedNodeIds.has(node.id)) {
        warnings.push({
          nodeId: node.id,
          type: 'orphaned_node',
          message: `Node '${node.name}' is not connected to the workflow`
        });
      }
    });

    // Check for circular dependencies
    const hasCycle = this.detectCycles(workflow);
    if (hasCycle) {
      errors.push({
        type: 'circular_dependency',
        message: 'Workflow contains circular dependencies',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private detectCycles(workflow: AgentWorkflow): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingConnections = workflow.connections.filter(conn => conn.sourceNodeId === nodeId);
      for (const conn of outgoingConnections) {
        if (hasCycle(conn.targetNodeId)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  private buildExecutionPlan(workflow: AgentWorkflow, startNodeId: string): string[] {
    const visited = new Set<string>();
    const plan: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Add current node to plan
      plan.push(nodeId);

      // Visit connected nodes
      const outgoingConnections = workflow.connections
        .filter(conn => conn.sourceNodeId === nodeId)
        .sort((a, b) => {
          // Sort by target node priority if available
          const nodeA = workflow.nodes.find(n => n.id === a.targetNodeId);
          const nodeB = workflow.nodes.find(n => n.id === b.targetNodeId);
          return (nodeA?.metadata?.priority || 0) - (nodeB?.metadata?.priority || 0);
        });

      outgoingConnections.forEach(conn => visit(conn.targetNodeId));
    };

    visit(startNodeId);
    return plan;
  }

  private async executeNodes(
    workflow: AgentWorkflow,
    executionPlan: string[],
    context: WorkflowExecutionContext,
    execution: WorkflowExecution,
    options: WorkflowExecutionOptions
  ): Promise<any> {
    let lastResult: any = null;
    const nodeResults: Map<string, any> = new Map();

    for (const nodeId of executionPlan) {
      // Check for cancellation
      if (execution.status === 'cancelled') {
        break;
      }

      // Check for timeout
      if (options.timeout && Date.now() - new Date(execution.startTime).getTime() > options.timeout) {
        execution.status = 'timeout';
        throw new Error('Workflow execution timeout');
      }

      // Check for breakpoints in debug mode
      if (options.debugMode && options.breakpoints?.includes(nodeId)) {
        this.log(execution, 'debug', `Breakpoint hit at node ${nodeId}`);
        // In a real implementation, this would pause execution
      }

      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) {
        this.log(execution, 'warn', `Node ${nodeId} not found in workflow`);
        continue;
      }

      // Create execution step
      const step: ExecutionStep = {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        startTime: new Date().toISOString(),
        status: 'running',
        logs: []
      };

      execution.steps.push(step);

      try {
        // Get node instance
        const nodeInstance = nodeRegistry.createNodeInstance(node);
        if (!nodeInstance) {
          throw new Error(`Unknown node type: ${node.type}`);
        }

        // Prepare input data
        const inputData = this.prepareNodeInput(node, workflow, nodeResults, context);
        step.input = inputData;

        this.log(execution, 'info', `Executing node: ${node.name} (${node.type})`);

        // Execute node
        const result = await nodeInstance.execute(inputData, context);
        
        // Store result
        nodeResults.set(nodeId, result);
        lastResult = result;
        step.output = result;
        step.status = 'completed';

        this.log(execution, 'info', `Node ${node.name} completed successfully`);

      } catch (error) {
        step.status = 'failed';
        step.error = error.message;
        
        this.log(execution, 'error', `Node ${node.name} failed: ${error.message}`, { error });

        // Handle error based on node configuration
        if (node.metadata?.continueOnError) {
          this.log(execution, 'info', `Continuing execution despite error in ${node.name}`);
          continue;
        } else {
          throw error;
        }

      } finally {
        step.endTime = new Date().toISOString();
        step.duration = Date.now() - new Date(step.startTime).getTime();
      }
    }

    return lastResult;
  }

  private prepareNodeInput(
    node: WorkflowNode,
    workflow: AgentWorkflow,
    nodeResults: Map<string, any>,
    context: WorkflowExecutionContext
  ): any {
    const input: any = {};

    // Get incoming connections
    const incomingConnections = workflow.connections.filter(conn => conn.targetNodeId === node.id);

    // Collect data from connected nodes
    incomingConnections.forEach(conn => {
      const sourceResult = nodeResults.get(conn.sourceNodeId);
      if (sourceResult) {
        // Map source output to target input based on port connections
        Object.assign(input, sourceResult);
      }
    });

    // Add workflow variables
    Object.assign(input, context.variables);

    // Add node configuration
    if (node.configuration) {
      input.configuration = node.configuration;
    }

    return input;
  }

  private log(
    execution: WorkflowExecution,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    data?: any
  ): void {
    const logEntry: ExecutionLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    execution.logs.push(logEntry);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, data);
    }
  }

  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    try {
      const { error } = await supabase
        .from('workflow_executions')
        .upsert({
          id: execution.id,
          workflow_id: execution.workflowId,
          deployment_id: execution.deploymentId,
          conversation_id: execution.conversationId,
          execution_data: {
            steps: execution.steps,
            variables: execution.variables,
            logs: execution.logs,
            metadata: execution.metadata
          },
          input_data: execution.metadata.inputData,
          output_data: execution.result,
          status: execution.status,
          error_message: execution.error,
          started_at: execution.startTime,
          completed_at: execution.endTime,
          execution_time_ms: execution.duration
        });

      if (error) {
        console.error('Failed to save execution:', error);
      }
    } catch (error) {
      console.error('Failed to save execution:', error);
    }
  }

  private transformExecutionData(data: any): WorkflowExecution {
    return {
      id: data.id,
      workflowId: data.workflow_id,
      deploymentId: data.deployment_id,
      conversationId: data.conversation_id,
      status: data.status,
      startTime: data.started_at,
      endTime: data.completed_at,
      duration: data.execution_time_ms,
      steps: data.execution_data?.steps || [],
      variables: data.execution_data?.variables || {},
      result: data.output_data,
      error: data.error_message,
      logs: data.execution_data?.logs || [],
      metadata: data.execution_data?.metadata || {}
    };
  }
}

// Export singleton instance
export const workflowExecutor = WorkflowExecutor.getInstance();
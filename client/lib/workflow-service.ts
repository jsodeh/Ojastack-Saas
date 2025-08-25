/**
 * Workflow Service
 * Manages workflow creation, editing, storage, and execution
 */

import { supabase } from './supabase';
import { 
  Workflow, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowExecution,
  WorkflowExecutionLog,
  NODE_TEMPLATES,
  NodeTemplate
} from './workflow-types';

export class WorkflowService {
  private static instance: WorkflowService;

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  /**
   * Get all workflows for a user
   */
  async getWorkflows(userId: string): Promise<Workflow[]> {
    // Use mock data for demo - replace with actual Supabase queries when tables exist
    return this.getMockWorkflows(userId);
  }

  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const mockWorkflows = this.getMockWorkflows('user_123');
    return mockWorkflows.find(w => w.id === workflowId) || null;
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    userId: string,
    workflow: Omit<Workflow, 'id' | 'metadata'> & { metadata?: Partial<Workflow['metadata']> }
  ): Promise<Workflow> {
    const now = new Date().toISOString();
    const newWorkflow: Workflow = {
      ...workflow,
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        tags: workflow.metadata?.tags || [],
        category: workflow.metadata?.category || 'general'
      }
    };

    // In a real implementation, save to Supabase
    console.log('Created workflow:', newWorkflow);
    return newWorkflow;
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(
    workflowId: string,
    updates: Partial<Workflow>
  ): Promise<Workflow> {
    // In a real implementation, update in Supabase
    const existing = await this.getWorkflow(workflowId);
    if (!existing) {
      throw new Error('Workflow not found');
    }

    const updated: Workflow = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    console.log('Updated workflow:', updated);
    return updated;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    // In a real implementation, delete from Supabase
    console.log('Deleted workflow:', workflowId);
  }

  /**
   * Validate workflow structure
   */
  validateWorkflow(workflow: Workflow): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for trigger nodes
    const triggerNodes = workflow.nodes.filter(node => node.type === 'trigger');
    if (triggerNodes.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    workflow.edges.forEach(edge => {
      connectedNodeIds.add(edge.sourceNodeId);
      connectedNodeIds.add(edge.targetNodeId);
    });

    const disconnectedNodes = workflow.nodes.filter(
      node => node.type !== 'trigger' && !connectedNodeIds.has(node.id)
    );

    if (disconnectedNodes.length > 0) {
      warnings.push(`${disconnectedNodes.length} disconnected nodes found`);
    }

    // Validate node configurations
    workflow.nodes.forEach(node => {
      const template = NODE_TEMPLATES.find(t => t.id === `${node.type}_${node.data.config.templateId || node.type}`);
      if (template) {
        template.configSchema.forEach(field => {
          if (field.required && !node.data.config[field.name]) {
            errors.push(`Missing required field '${field.label}' in ${node.data.label}`);
          }
        });
      }
    });

    // Check for circular dependencies
    if (this.hasCircularDependency(workflow.nodes, workflow.edges)) {
      errors.push('Workflow contains circular dependencies');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    input: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: 'pending',
      startTime: new Date().toISOString(),
      logs: [],
      variables: { ...input }
    };

    try {
      execution.status = 'running';
      
      // Simulate workflow execution
      const triggerNodes = workflow.nodes.filter(node => node.type === 'trigger');
      for (const triggerNode of triggerNodes) {
        await this.executeNode(workflow, triggerNode, execution);
      }

      execution.status = 'completed';
      execution.endTime = new Date().toISOString();
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.addExecutionLog(execution, 'error', 'root', 'Workflow execution failed', { error });
    }

    return execution;
  }

  /**
   * Get workflow execution history
   */
  async getExecutionHistory(workflowId: string): Promise<WorkflowExecution[]> {
    // Mock data for demo
    return this.getMockExecutions(workflowId);
  }

  /**
   * Get available node templates
   */
  getNodeTemplates(): NodeTemplate[] {
    return NODE_TEMPLATES;
  }

  /**
   * Get node templates by category
   */
  getNodeTemplatesByCategory(category: string): NodeTemplate[] {
    return NODE_TEMPLATES.filter(template => template.category === category);
  }

  // Private helper methods

  private async executeNode(
    workflow: Workflow,
    node: WorkflowNode,
    execution: WorkflowExecution
  ): Promise<any> {
    this.addExecutionLog(execution, 'info', node.id, `Executing node: ${node.data.label}`);

    try {
      let result: any;

      switch (node.type) {
        case 'trigger':
          result = this.executeTriggerNode(node, execution);
          break;
        case 'condition':
          result = this.executeConditionNode(node, execution);
          break;
        case 'ai_response':
          result = await this.executeAIResponseNode(node, execution);
          break;
        case 'action':
          result = await this.executeActionNode(node, execution);
          break;
        case 'integration':
          result = await this.executeIntegrationNode(node, execution);
          break;
        case 'wait':
          result = await this.executeWaitNode(node, execution);
          break;
        case 'human_handoff':
          result = await this.executeHumanHandoffNode(node, execution);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      this.addExecutionLog(execution, 'info', node.id, 'Node executed successfully', { result });

      // Execute connected nodes
      const outgoingEdges = workflow.edges.filter(edge => edge.sourceNodeId === node.id);
      for (const edge of outgoingEdges) {
        const targetNode = workflow.nodes.find(n => n.id === edge.targetNodeId);
        if (targetNode) {
          await this.executeNode(workflow, targetNode, execution);
        }
      }

      return result;
    } catch (error) {
      this.addExecutionLog(execution, 'error', node.id, 'Node execution failed', { error });
      throw error;
    }
  }

  private executeTriggerNode(node: WorkflowNode, execution: WorkflowExecution): any {
    return execution.variables;
  }

  private executeConditionNode(node: WorkflowNode, execution: WorkflowExecution): boolean {
    const { operator, value, caseSensitive } = node.data.config;
    const inputText = execution.variables.input || '';
    
    let comparison = caseSensitive ? inputText : inputText.toLowerCase();
    let compareValue = caseSensitive ? value : value.toLowerCase();

    switch (operator) {
      case 'contains':
        return comparison.includes(compareValue);
      case 'equals':
        return comparison === compareValue;
      case 'starts_with':
        return comparison.startsWith(compareValue);
      case 'ends_with':
        return comparison.endsWith(compareValue);
      default:
        return false;
    }
  }

  private async executeAIResponseNode(node: WorkflowNode, execution: WorkflowExecution): Promise<string> {
    const { model, systemPrompt, temperature } = node.data.config;
    
    // Mock AI response - replace with actual AI service call
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const responses = [
      "I understand your question. Let me help you with that.",
      "Thank you for reaching out. I'm here to assist you.",
      "I can help you with this request. Here's what I suggest...",
      "Based on the information provided, here's my response..."
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private async executeActionNode(node: WorkflowNode, execution: WorkflowExecution): Promise<boolean> {
    const { delay, typing } = node.data.config;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }
    
    // Mock action execution
    return true;
  }

  private async executeIntegrationNode(node: WorkflowNode, execution: WorkflowExecution): Promise<any> {
    const { method, url, headers, timeout } = node.data.config;
    
    // Mock HTTP request
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
    
    return {
      status: 200,
      data: { message: 'Integration call successful', timestamp: new Date().toISOString() }
    };
  }

  private async executeWaitNode(node: WorkflowNode, execution: WorkflowExecution): Promise<any> {
    const { duration, unit } = node.data.config;
    
    let milliseconds = duration * 1000; // default seconds
    if (unit === 'minutes') milliseconds = duration * 60 * 1000;
    if (unit === 'hours') milliseconds = duration * 60 * 60 * 1000;
    
    await new Promise(resolve => setTimeout(resolve, Math.min(milliseconds, 5000))); // Cap at 5s for demo
    
    return execution.variables;
  }

  private async executeHumanHandoffNode(node: WorkflowNode, execution: WorkflowExecution): Promise<boolean> {
    const { department, priority, message } = node.data.config;
    
    // Mock handoff
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.addExecutionLog(execution, 'info', node.id, `Handed off to ${department} (${priority} priority)`);
    
    return true;
  }

  private hasCircularDependency(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const adjacencyList = new Map<string, string[]>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Build adjacency list
    edges.forEach(edge => {
      if (!adjacencyList.has(edge.sourceNodeId)) {
        adjacencyList.set(edge.sourceNodeId, []);
      }
      adjacencyList.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    });

    // DFS to detect cycle
    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check each unvisited node
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) return true;
      }
    }

    return false;
  }

  private addExecutionLog(
    execution: WorkflowExecution,
    level: 'info' | 'warn' | 'error' | 'debug',
    nodeId: string,
    message: string,
    data?: any
  ): void {
    execution.logs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      nodeId,
      level,
      message,
      data
    });
  }

  private getMockWorkflows(userId: string): Workflow[] {
    return [
      {
        id: 'workflow_1',
        name: 'Customer Support Flow',
        description: 'Handle customer inquiries and route to appropriate responses',
        version: '1.0.0',
        status: 'active',
        nodes: [
          {
            id: 'node_1',
            type: 'trigger',
            position: { x: 100, y: 100 },
            data: {
              label: 'User Message',
              config: { messageFilters: ['contains_question'] }
            },
            inputs: [],
            outputs: [
              { id: 'out_1', type: 'output', dataType: 'text', label: 'Message', required: false }
            ]
          },
          {
            id: 'node_2',
            type: 'condition',
            position: { x: 300, y: 100 },
            data: {
              label: 'Is Question?',
              config: { operator: 'contains', value: '?', caseSensitive: false }
            },
            inputs: [
              { id: 'in_1', type: 'input', dataType: 'text', label: 'Text', required: true }
            ],
            outputs: [
              { id: 'out_1', type: 'output', dataType: 'boolean', label: 'True', required: false },
              { id: 'out_2', type: 'output', dataType: 'boolean', label: 'False', required: false }
            ]
          }
        ],
        edges: [
          {
            id: 'edge_1',
            sourceNodeId: 'node_1',
            sourcePortId: 'out_1',
            targetNodeId: 'node_2',
            targetPortId: 'in_1'
          }
        ],
        variables: [],
        triggers: [
          {
            id: 'trigger_1',
            type: 'user_message',
            config: {}
          }
        ],
        metadata: {
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          createdBy: userId,
          tags: ['customer-support', 'automated'],
          category: 'support'
        }
      }
    ];
  }

  private getMockExecutions(workflowId: string): WorkflowExecution[] {
    return [
      {
        id: 'exec_1',
        workflowId,
        status: 'completed',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5000).toISOString(),
        logs: [
          {
            id: 'log_1',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            nodeId: 'node_1',
            level: 'info',
            message: 'Workflow started'
          }
        ],
        variables: {
          userMessage: 'Can you help me with my account?',
          userId: 'user_123'
        }
      }
    ];
  }
}

export const workflowService = WorkflowService.getInstance();
/**
 * Workflow Builder Service
 * Core service for managing visual workflows, nodes, and connections
 */

import { supabase } from './supabase';
import {
  AgentWorkflow,
  WorkflowNode,
  WorkflowConnection,
  NodeDefinition,
  ValidationResult,
  ExecutionResult,
  ExecutionContext,
  DebugSession,
  ValidationError,
  ValidationWarning
} from './workflow-types';

export class WorkflowBuilderService {
  private static instance: WorkflowBuilderService;
  private nodeDefinitions: Map<string, NodeDefinition> = new Map();

  static getInstance(): WorkflowBuilderService {
    if (!WorkflowBuilderService.instance) {
      WorkflowBuilderService.instance = new WorkflowBuilderService();
    }
    return WorkflowBuilderService.instance;
  }

  constructor() {
    this.loadNodeDefinitions();
  }

  /**
   * Load available node definitions from database
   */
  private async loadNodeDefinitions(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('workflow_node_definitions')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;

      data?.forEach(def => {
        this.nodeDefinitions.set(def.type, {
          id: def.id,
          type: def.type,
          name: def.name,
          description: def.description,
          category: def.category,
          icon: def.icon || 'Circle',
          inputSchema: def.input_schema || {},
          outputSchema: def.output_schema || {},
          configurationSchema: def.configuration_schema || {},
          isSystem: def.is_system
        });
      });

      console.log(`Loaded ${this.nodeDefinitions.size} node definitions`);
    } catch (error) {
      console.error('Failed to load node definitions:', error);
    }
  }

  /**
   * Get all available node definitions
   */
  getNodeDefinitions(): NodeDefinition[] {
    return Array.from(this.nodeDefinitions.values());
  }

  /**
   * Get node definitions by category
   */
  getNodeDefinitionsByCategory(category: string): NodeDefinition[] {
    return Array.from(this.nodeDefinitions.values())
      .filter(def => def.category === category);
  }

  /**
   * Get node definition by type
   */
  getNodeDefinition(type: string): NodeDefinition | undefined {
    return this.nodeDefinitions.get(type);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    name: string,
    description: string,
    userId: string,
    templateId?: string
  ): Promise<AgentWorkflow> {
    try {
      const workflowData = {
        nodes: [],
        connections: [],
        variables: [],
        triggers: []
      };

      const { data, error } = await supabase
        .from('agent_workflows')
        .insert({
          user_id: userId,
          name,
          description,
          workflow_data: workflowData,
          template_id: templateId,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapDatabaseToWorkflow(data);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }

  /**
   * Load workflow by ID
   */
  async loadWorkflow(workflowId: string): Promise<AgentWorkflow | null> {
    try {
      const { data, error } = await supabase
        .from('agent_workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (error || !data) return null;

      return this.mapDatabaseToWorkflow(data);
    } catch (error) {
      console.error('Failed to load workflow:', error);
      return null;
    }
  }

  /**
   * Save workflow
   */
  async saveWorkflow(workflow: AgentWorkflow): Promise<void> {
    try {
      const { error } = await supabase
        .from('agent_workflows')
        .update({
          name: workflow.name,
          description: workflow.description,
          version: workflow.version,
          workflow_data: {
            nodes: workflow.nodes,
            connections: workflow.connections,
            variables: workflow.variables,
            triggers: workflow.triggers
          },
          tags: workflow.metadata.tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflow.id);

      if (error) throw error;

      console.log(`Workflow saved: ${workflow.id}`);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw new Error(`Failed to save workflow: ${error.message}`);
    }
  }

  /**
   * Add node to workflow
   */
  addNode(
    workflow: AgentWorkflow,
    nodeType: string,
    position: { x: number; y: number },
    configuration: Record<string, any> = {}
  ): WorkflowNode {
    const nodeDefinition = this.nodeDefinitions.get(nodeType);
    if (!nodeDefinition) {
      throw new Error(`Unknown node type: ${nodeType}`);
    }

    const node: WorkflowNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: nodeType,
      name: nodeDefinition.name,
      description: nodeDefinition.description,
      icon: nodeDefinition.icon,
      category: nodeDefinition.category as any,
      inputs: this.generatePortsFromSchema(nodeDefinition.inputSchema, 'input'),
      outputs: this.generatePortsFromSchema(nodeDefinition.outputSchema, 'output'),
      configuration,
      position,
      metadata: {
        created_at: new Date().toISOString()
      }
    };

    workflow.nodes.push(node);
    return node;
  }

  /**
   * Remove node from workflow
   */
  removeNode(workflow: AgentWorkflow, nodeId: string): void {
    // Remove the node
    workflow.nodes = workflow.nodes.filter(node => node.id !== nodeId);

    // Remove all connections involving this node
    workflow.connections = workflow.connections.filter(
      conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
    );
  }

  /**
   * Update node in workflow
   */
  updateNode(
    workflow: AgentWorkflow,
    nodeId: string,
    updates: Partial<WorkflowNode>
  ): void {
    const nodeIndex = workflow.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    workflow.nodes[nodeIndex] = {
      ...workflow.nodes[nodeIndex],
      ...updates
    };
  }

  /**
   * Create connection between nodes
   */
  createConnection(
    workflow: AgentWorkflow,
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string
  ): WorkflowConnection {
    // Validate connection
    const validation = this.validateConnection(
      workflow,
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId
    );

    if (!validation.valid) {
      throw new Error(`Invalid connection: ${validation.errors[0]?.message}`);
    }

    const connection: WorkflowConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      sourceNodeId,
      sourcePortId,
      targetNodeId,
      targetPortId,
      metadata: {
        created_at: new Date().toISOString()
      }
    };

    workflow.connections.push(connection);
    return connection;
  }

  /**
   * Remove connection from workflow
   */
  removeConnection(workflow: AgentWorkflow, connectionId: string): void {
    workflow.connections = workflow.connections.filter(
      conn => conn.id !== connectionId
    );
  }

  /**
   * Validate workflow
   */
  validateWorkflow(workflow: AgentWorkflow): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    workflow.connections.forEach(conn => {
      connectedNodes.add(conn.sourceNodeId);
      connectedNodes.add(conn.targetNodeId);
    });

    workflow.nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && node.category !== 'triggers') {
        warnings.push({
          nodeId: node.id,
          type: 'best_practice',
          message: `Node "${node.name}" is not connected to any other nodes`
        });
      }
    });

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingConnections = workflow.connections.filter(
        conn => conn.sourceNodeId === nodeId
      );

      for (const conn of outgoingConnections) {
        if (hasCycle(conn.targetNodeId)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    workflow.nodes.forEach(node => {
      if (!visited.has(node.id) && hasCycle(node.id)) {
        errors.push({
          nodeId: node.id,
          type: 'circular_dependency',
          message: 'Circular dependency detected in workflow',
          severity: 'error'
        });
      }
    });

    // Check for required node configurations
    workflow.nodes.forEach(node => {
      const nodeDefinition = this.nodeDefinitions.get(node.type);
      if (nodeDefinition) {
        const configSchema = nodeDefinition.configurationSchema;
        // Basic validation - in production, use a proper JSON schema validator
        Object.keys(configSchema).forEach(key => {
          if (configSchema[key].required && !node.configuration[key]) {
            errors.push({
              nodeId: node.id,
              type: 'invalid_configuration',
              message: `Required configuration "${key}" is missing for node "${node.name}"`,
              severity: 'error'
            });
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Execute workflow (simplified version for testing)
   */
  async executeWorkflow(
    workflow: AgentWorkflow,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const nodeResults: Record<string, any> = {};

    try {
      // Find trigger nodes
      const triggerNodes = workflow.nodes.filter(node => node.category === 'triggers');
      
      if (triggerNodes.length === 0) {
        throw new Error('No trigger nodes found in workflow');
      }

      // For now, execute the first trigger node
      const triggerNode = triggerNodes[0];
      const result = await this.executeNode(triggerNode, context.inputData, context);
      nodeResults[triggerNode.id] = result;

      return {
        success: true,
        result: result.output,
        executionTime: Date.now() - startTime,
        nodeResults,
        metadata: {
          workflowId: workflow.id,
          nodesExecuted: [triggerNode.id]
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime,
        nodeResults,
        metadata: {
          workflowId: workflow.id
        }
      };
    }
  }

  /**
   * Execute a single node (simplified implementation)
   */
  private async executeNode(
    node: WorkflowNode,
    input: any,
    context: ExecutionContext
  ): Promise<{ output: any; metadata: Record<string, any> }> {
    // This is a simplified implementation
    // In production, this would route to specific node executors
    
    switch (node.type) {
      case 'message_trigger':
        return {
          output: {
            message: input.message || 'Hello',
            sender: input.sender || 'user',
            channel: input.channel || 'web_chat'
          },
          metadata: { nodeType: node.type }
        };

      case 'ai_response':
        return {
          output: {
            response: `AI response to: ${input.message || 'Hello'}`,
            confidence: 0.95
          },
          metadata: { nodeType: node.type }
        };

      case 'send_message':
        return {
          output: {
            sent: true,
            message_id: `msg_${Date.now()}`
          },
          metadata: { nodeType: node.type }
        };

      default:
        return {
          output: { processed: true },
          metadata: { nodeType: node.type }
        };
    }
  }

  /**
   * Validate connection between two nodes
   */
  private validateConnection(
    workflow: AgentWorkflow,
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check if nodes exist
    const sourceNode = workflow.nodes.find(n => n.id === sourceNodeId);
    const targetNode = workflow.nodes.find(n => n.id === targetNodeId);

    if (!sourceNode) {
      errors.push({
        type: 'missing_connection',
        message: 'Source node not found',
        severity: 'error'
      });
    }

    if (!targetNode) {
      errors.push({
        type: 'missing_connection',
        message: 'Target node not found',
        severity: 'error'
      });
    }

    // Check for self-connection
    if (sourceNodeId === targetNodeId) {
      errors.push({
        type: 'invalid_configuration',
        message: 'Cannot connect node to itself',
        severity: 'error'
      });
    }

    // Check if connection already exists
    const existingConnection = workflow.connections.find(
      conn => 
        conn.sourceNodeId === sourceNodeId &&
        conn.sourcePortId === sourcePortId &&
        conn.targetNodeId === targetNodeId &&
        conn.targetPortId === targetPortId
    );

    if (existingConnection) {
      errors.push({
        connectionId: existingConnection.id,
        type: 'invalid_configuration',
        message: 'Connection already exists',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Generate ports from schema
   */
  private generatePortsFromSchema(schema: Record<string, any>, portType: 'input' | 'output') {
    return Object.entries(schema).map(([key, config]: [string, any]) => ({
      id: `${portType}_${key}`,
      name: key,
      type: 'data' as const,
      dataType: config.type || 'any',
      required: config.required || false,
      description: config.description || `${key} ${portType}`
    }));
  }

  /**
   * Map database record to workflow object
   */
  private mapDatabaseToWorkflow(data: any): AgentWorkflow {
    const workflowData = data.workflow_data || { nodes: [], connections: [], variables: [], triggers: [] };
    
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      version: data.version,
      nodes: workflowData.nodes || [],
      connections: workflowData.connections || [],
      variables: workflowData.variables || [],
      triggers: workflowData.triggers || [],
      metadata: {
        created_at: data.created_at,
        updated_at: data.updated_at,
        created_by: data.user_id,
        template_id: data.template_id,
        is_template: data.is_template,
        tags: data.tags || []
      }
    };
  }

  /**
   * Export workflow to JSON
   */
  async exportWorkflow(workflowId: string): Promise<string> {
    const workflow = await this.loadWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    return JSON.stringify(workflow, null, 2);
  }

  /**
   * Import workflow from JSON
   */
  async importWorkflow(workflowData: string, userId: string): Promise<AgentWorkflow> {
    try {
      const workflow = JSON.parse(workflowData) as AgentWorkflow;
      
      // Create new workflow with imported data
      return await this.createWorkflow(
        `${workflow.name} (Imported)`,
        workflow.description,
        userId
      );
    } catch (error) {
      throw new Error(`Failed to import workflow: ${error.message}`);
    }
  }
}

// Export singleton instance
export const workflowBuilderService = WorkflowBuilderService.getInstance();
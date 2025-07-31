/**
 * Base Node Classes for Workflow System
 * Provides foundation for all workflow node types
 */

import { WorkflowNode, NodePort, ValidationResult } from '@/lib/workflow-types';

export abstract class BaseWorkflowNode {
  protected node: WorkflowNode;

  constructor(node: WorkflowNode) {
    this.node = node;
  }

  /**
   * Execute the node with given input data
   */
  abstract execute(input: any, context: ExecutionContext): Promise<any>;

  /**
   * Validate node configuration
   */
  abstract validate(): ValidationResult;

  /**
   * Get node configuration schema
   */
  abstract getConfigurationSchema(): any;

  /**
   * Get default configuration
   */
  abstract getDefaultConfiguration(): Record<string, any>;

  /**
   * Get input ports definition
   */
  abstract getInputPorts(): NodePort[];

  /**
   * Get output ports definition
   */
  abstract getOutputPorts(): NodePort[];

  /**
   * Get node metadata
   */
  getMetadata() {
    return {
      id: this.node.id,
      type: this.node.type,
      name: this.node.name,
      category: this.node.category,
      version: this.node.metadata?.version || '1.0.0'
    };
  }

  /**
   * Update node configuration
   */
  updateConfiguration(config: Record<string, any>) {
    this.node.configuration = { ...this.node.configuration, ...config };
    this.validateConfiguration();
  }

  /**
   * Validate current configuration
   */
  protected validateConfiguration(): ValidationResult {
    const result = this.validate();
    this.node.isValid = result.isValid;
    this.node.errors = result.errors.map(e => e.message);
    return result;
  }

  /**
   * Create a port definition
   */
  protected createPort(
    name: string,
    type: 'data' | 'control' | 'event',
    dataType: string,
    required: boolean = false,
    description: string = ''
  ): NodePort {
    return {
      id: crypto.randomUUID(),
      name,
      type,
      dataType,
      required,
      description,
      connected: false
    };
  }
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, any>;
  userId: string;
  agentId?: string;
  conversationId?: string;
  metadata: Record<string, any>;
  
  // Context methods
  setVariable(name: string, value: any): void;
  getVariable(name: string): any;
  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void;
  emit(event: string, data: any): void;
}

export class WorkflowExecutionContext implements ExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, any>;
  userId: string;
  agentId?: string;
  conversationId?: string;
  metadata: Record<string, any>;
  
  private logs: Array<{ level: string; message: string; data?: any; timestamp: string }> = [];
  private events: Array<{ event: string; data: any; timestamp: string }> = [];

  constructor(params: {
    workflowId: string;
    executionId: string;
    userId: string;
    variables?: Record<string, any>;
    agentId?: string;
    conversationId?: string;
    metadata?: Record<string, any>;
  }) {
    this.workflowId = params.workflowId;
    this.executionId = params.executionId;
    this.userId = params.userId;
    this.variables = params.variables || {};
    this.agentId = params.agentId;
    this.conversationId = params.conversationId;
    this.metadata = params.metadata || {};
  }

  setVariable(name: string, value: any): void {
    this.variables[name] = value;
  }

  getVariable(name: string): any {
    return this.variables[name];
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    this.logs.push({
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    });
    console.log(`[${level.toUpperCase()}] ${message}`, data);
  }

  emit(event: string, data: any): void {
    this.events.push({
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }

  getLogs() {
    return this.logs;
  }

  getEvents() {
    return this.events;
  }
}
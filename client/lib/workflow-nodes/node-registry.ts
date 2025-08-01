/**
 * Node Registry for Workflow System
 * Central registry for all workflow node types
 */

import { BaseWorkflowNode } from './base-node';
import { MessageTriggerNode, WebhookTriggerNode, ScheduleTriggerNode } from './trigger-node';
import { AIResponseNode, SendMessageNode } from './action-node';
import { ConditionNode, SentimentAnalysisNode } from './condition-node';
import { WhatsAppIntegrationNode, KnowledgeBaseNode } from './integration-node';
import { ResponseNode, ErrorResponseNode, RedirectResponseNode } from './response-node';
import { ConditionalLogicNode } from './conditional-logic-node';
import { LoopNode } from './loop-node';
import { DataTransformNode } from './data-transform-node';
import { JSNode } from './js-node';
import { SubworkflowNode } from './subworkflow-node';
import { WhatsAppNode } from './whatsapp-node';
import { N8NNode } from './n8n-node';
import { WorkflowNode } from '@/lib/workflow-types';

export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodeClasses: Map<string, typeof BaseWorkflowNode> = new Map();

  static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  constructor() {
    this.registerDefaultNodes();
  }

  /**
   * Register default node types
   */
  private registerDefaultNodes(): void {
    // Trigger nodes
    this.register('message_trigger', MessageTriggerNode);
    this.register('webhook_trigger', WebhookTriggerNode);
    this.register('schedule_trigger', ScheduleTriggerNode);

    // Action nodes
    this.register('ai_response', AIResponseNode);
    this.register('send_message', SendMessageNode);

    // Condition nodes
    this.register('condition', ConditionNode);
    this.register('sentiment_analysis', SentimentAnalysisNode);
    this.register('conditional_logic', ConditionalLogicNode);

    // Integration nodes
    this.register('whatsapp_integration', WhatsAppIntegrationNode);
    this.register('knowledge_base', KnowledgeBaseNode);

    // Response nodes
    this.register('response', ResponseNode);
    this.register('error_response', ErrorResponseNode);
    this.register('redirect_response', RedirectResponseNode);

    // Advanced workflow nodes
    this.register('loop', LoopNode);
    this.register('data_transform', DataTransformNode);
    this.register('javascript', JSNode);
    this.register('subworkflow', SubworkflowNode);
    
    // Communication nodes
    this.register('whatsapp', WhatsAppNode);
    
    // Automation nodes
    this.register('n8n_workflow', N8NNode);
  }

  /**
   * Register a new node type
   */
  register(nodeType: string, nodeClass: typeof BaseWorkflowNode): void {
    this.nodeClasses.set(nodeType, nodeClass);
  }

  /**
   * Create a node instance from workflow node data
   */
  createNodeInstance(workflowNode: WorkflowNode): BaseWorkflowNode | null {
    const NodeClass = this.nodeClasses.get(workflowNode.type);
    if (!NodeClass) {
      console.error(`Unknown node type: ${workflowNode.type}`);
      return null;
    }

    return new NodeClass(workflowNode);
  }

  /**
   * Get all registered node types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.nodeClasses.keys());
  }

  /**
   * Check if a node type is registered
   */
  isRegistered(nodeType: string): boolean {
    return this.nodeClasses.has(nodeType);
  }

  /**
   * Get node class for a type
   */
  getNodeClass(nodeType: string): typeof BaseWorkflowNode | null {
    return this.nodeClasses.get(nodeType) || null;
  }

  /**
   * Unregister a node type
   */
  unregister(nodeType: string): boolean {
    return this.nodeClasses.delete(nodeType);
  }

  /**
   * Get node types by category
   */
  getNodeTypesByCategory(): Record<string, string[]> {
    const categories: Record<string, string[]> = {
      triggers: [],
      actions: [],
      conditions: [],
      integrations: [],
      utilities: []
    };

    // This would ideally come from node definitions, but for now we'll categorize manually
    const categoryMap: Record<string, string> = {
      message_trigger: 'triggers',
      webhook_trigger: 'triggers',
      schedule_trigger: 'triggers',
      ai_response: 'actions',
      send_message: 'actions',
      condition: 'conditions',
      sentiment_analysis: 'conditions',
      conditional_logic: 'conditions',
      whatsapp_integration: 'integrations',
      knowledge_base: 'integrations',
      response: 'utilities',
      error_response: 'utilities',
      redirect_response: 'utilities',
      loop: 'utilities',
      data_transform: 'utilities',
      javascript: 'utilities',
      subworkflow: 'utilities',
      whatsapp: 'integrations',
      n8n_workflow: 'integrations'
    };

    this.nodeClasses.forEach((nodeClass, nodeType) => {
      const category = categoryMap[nodeType] || 'utilities';
      categories[category].push(nodeType);
    });

    return categories;
  }
}

// Export singleton instance
export const nodeRegistry = NodeRegistry.getInstance();
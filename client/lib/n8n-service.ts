/**
 * N8N Workflow Service
 * Integrates with N8N for workflow automation and orchestration
 */

interface N8NConfig {
  apiUrl: string;
  apiKey: string;
  webhookUrl: string;
}

interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  nodes: N8NNode[];
  connections: Record<string, any>;
  settings: Record<string, any>;
  staticData: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface N8NNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
}

interface N8NExecution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry';
  status: 'new' | 'running' | 'success' | 'error' | 'canceled' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  data: {
    resultData: {
      runData: Record<string, any>;
    };
    executionData?: {
      contextData: Record<string, any>;
      nodeExecutionStack: any[];
      metadata: Record<string, any>;
    };
  };
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'lead-qualification' | 'customer-support' | 'e-commerce' | 'appointment' | 'internal-support';
  tags: string[];
  workflow: Partial<N8NWorkflow>;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    description: string;
    required: boolean;
    defaultValue?: any;
  }>;
  integrations: string[];
}

class N8NService {
  private config: N8NConfig;
  private workflowTemplates: Map<string, WorkflowTemplate> = new Map();

  constructor() {
    this.config = {
      apiUrl: import.meta.env.VITE_N8N_API_URL || 'http://localhost:5678/api/v1',
      apiKey: import.meta.env.VITE_N8N_API_KEY || '',
      webhookUrl: import.meta.env.VITE_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook'
    };

    if (!this.config.apiKey) {
      console.warn('N8N API key not found. Workflow features will not work.');
    }

    this.initializeTemplates();
  }

  /**
   * Check if N8N service is available
   */
  isAvailable(): boolean {
    return !!(this.config.apiKey && this.config.apiUrl);
  }

  /**
   * Test N8N connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; version?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'N8N API key not configured' };
    }

    try {
      const response = await this.makeRequest('GET', '/workflows');
      return {
        success: true,
        version: response.headers?.get('x-n8n-version') || 'unknown'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all workflows
   */
  async getWorkflows(): Promise<N8NWorkflow[]> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      const response = await this.makeRequest('GET', '/workflows');
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<N8NWorkflow> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      const response = await this.makeRequest('GET', `/workflows/${workflowId}`);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
      throw error;
    }
  }

  /**
   * Create new workflow
   */
  async createWorkflow(workflow: Partial<N8NWorkflow>): Promise<N8NWorkflow> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      const response = await this.makeRequest('POST', '/workflows', workflow);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(workflowId: string, updates: Partial<N8NWorkflow>): Promise<N8NWorkflow> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      const response = await this.makeRequest('PATCH', `/workflows/${workflowId}`, updates);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to update workflow:', error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      await this.makeRequest('DELETE', `/workflows/${workflowId}`);
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      throw error;
    }
  }

  /**
   * Activate/deactivate workflow
   */
  async setWorkflowActive(workflowId: string, active: boolean): Promise<N8NWorkflow> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      const endpoint = active ? `/workflows/${workflowId}/activate` : `/workflows/${workflowId}/deactivate`;
      const response = await this.makeRequest('POST', endpoint);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to set workflow active state:', error);
      throw error;
    }
  }

  /**
   * Execute workflow manually
   */
  async executeWorkflow(
    workflowId: string,
    inputData?: Record<string, any>
  ): Promise<N8NExecution> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      const response = await this.makeRequest('POST', `/workflows/${workflowId}/execute`, {
        data: inputData || {}
      });
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow executions
   */
  async getExecutions(
    workflowId?: string,
    options: {
      limit?: number;
      offset?: number;
      status?: N8NExecution['status'];
    } = {}
  ): Promise<N8NExecution[]> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      const params = new URLSearchParams();
      if (workflowId) params.append('workflowId', workflowId);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.status) params.append('status', options.status);

      const response = await this.makeRequest('GET', `/executions?${params.toString()}`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch executions:', error);
      throw error;
    }
  }

  /**
   * Get execution by ID
   */
  async getExecution(executionId: string): Promise<N8NExecution> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      const response = await this.makeRequest('GET', `/executions/${executionId}`);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to fetch execution:', error);
      throw error;
    }
  }

  /**
   * Stop execution
   */
  async stopExecution(executionId: string): Promise<N8NExecution> {
    if (!this.isAvailable()) {
      throw new Error('N8N service not available');
    }

    try {
      const response = await this.makeRequest('POST', `/executions/${executionId}/stop`);
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Failed to stop execution:', error);
      throw error;
    }
  }

  /**
   * Create workflow from template
   */
  async createWorkflowFromTemplate(
    templateId: string,
    variables: Record<string, any> = {},
    customName?: string
  ): Promise<N8NWorkflow> {
    const template = this.workflowTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Clone template workflow
    const workflowData = JSON.parse(JSON.stringify(template.workflow));
    
    // Apply variables
    this.applyVariablesToWorkflow(workflowData, variables, template.variables);
    
    // Set custom name
    if (customName) {
      workflowData.name = customName;
    } else {
      workflowData.name = `${template.name} - ${new Date().toISOString()}`;
    }

    return this.createWorkflow(workflowData);
  }

  /**
   * Get workflow templates
   */
  getWorkflowTemplates(category?: WorkflowTemplate['category']): WorkflowTemplate[] {
    const templates = Array.from(this.workflowTemplates.values());
    
    if (category) {
      return templates.filter(template => template.category === category);
    }
    
    return templates;
  }

  /**
   * Get workflow template by ID
   */
  getWorkflowTemplate(templateId: string): WorkflowTemplate | null {
    return this.workflowTemplates.get(templateId) || null;
  }

  /**
   * Create webhook URL for workflow
   */
  createWebhookUrl(workflowId: string, path?: string): string {
    const webhookPath = path || workflowId;
    return `${this.config.webhookUrl}/${webhookPath}`;
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecution?: Date;
  }> {
    try {
      const executions = await this.getExecutions(workflowId, { limit: 100 });
      
      const stats = {
        totalExecutions: executions.length,
        successfulExecutions: executions.filter(e => e.status === 'success').length,
        failedExecutions: executions.filter(e => e.status === 'error').length,
        averageExecutionTime: 0,
        lastExecution: undefined as Date | undefined
      };

      if (executions.length > 0) {
        // Calculate average execution time
        const executionTimes = executions
          .filter(e => e.stoppedAt)
          .map(e => new Date(e.stoppedAt!).getTime() - new Date(e.startedAt).getTime());
        
        if (executionTimes.length > 0) {
          stats.averageExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
        }

        // Get last execution
        stats.lastExecution = new Date(executions[0].startedAt);
      }

      return stats;
    } catch (error) {
      console.error('Failed to get workflow stats:', error);
      throw error;
    }
  }

  /**
   * Make HTTP request to N8N API
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<Response> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': this.config.apiKey
      }
    };

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`N8N API error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  /**
   * Apply variables to workflow template
   */
  private applyVariablesToWorkflow(
    workflow: any,
    variables: Record<string, any>,
    templateVariables: WorkflowTemplate['variables']
  ): void {
    // Validate required variables
    const requiredVars = templateVariables.filter(v => v.required);
    for (const reqVar of requiredVars) {
      if (!(reqVar.name in variables)) {
        throw new Error(`Required variable '${reqVar.name}' not provided`);
      }
    }

    // Apply default values for missing optional variables
    for (const templateVar of templateVariables) {
      if (!(templateVar.name in variables) && templateVar.defaultValue !== undefined) {
        variables[templateVar.name] = templateVar.defaultValue;
      }
    }

    // Replace variables in workflow JSON
    const workflowStr = JSON.stringify(workflow);
    const replacedStr = workflowStr.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (varName in variables) {
        return JSON.stringify(variables[varName]).slice(1, -1); // Remove quotes for string values
      }
      return match;
    });

    Object.assign(workflow, JSON.parse(replacedStr));
  }

  /**
   * Initialize workflow templates
   */
  private initializeTemplates(): void {
    // Lead Qualification Template
    this.workflowTemplates.set('lead-qualification', {
      id: 'lead-qualification',
      name: 'Lead Qualification Workflow',
      description: 'Automatically qualify leads based on conversation data and route to appropriate sales team',
      category: 'lead-qualification',
      tags: ['sales', 'crm', 'automation'],
      variables: [
        { name: 'crmUrl', type: 'string', description: 'CRM API URL', required: true },
        { name: 'crmApiKey', type: 'string', description: 'CRM API Key', required: true },
        { name: 'qualificationScore', type: 'number', description: 'Minimum qualification score', required: false, defaultValue: 70 },
        { name: 'salesTeamEmail', type: 'string', description: 'Sales team notification email', required: true }
      ],
      integrations: ['CRM', 'Email', 'Slack'],
      workflow: {
        name: 'Lead Qualification Workflow',
        nodes: [
          {
            id: 'webhook',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              httpMethod: 'POST',
              path: 'lead-qualification'
            }
          },
          {
            id: 'qualify-lead',
            name: 'Qualify Lead',
            type: 'n8n-nodes-base.function',
            typeVersion: 1,
            position: [450, 300],
            parameters: {
              functionCode: `
                const leadData = items[0].json;
                const score = calculateLeadScore(leadData);
                
                return [{
                  json: {
                    ...leadData,
                    qualificationScore: score,
                    qualified: score >= {{qualificationScore}}
                  }
                }];
                
                function calculateLeadScore(data) {
                  let score = 0;
                  if (data.company) score += 20;
                  if (data.budget && data.budget > 10000) score += 30;
                  if (data.timeline && data.timeline === 'immediate') score += 25;
                  if (data.authority === 'decision-maker') score += 25;
                  return score;
                }
              `
            }
          }
        ],
        connections: {
          'webhook': {
            'main': [
              [{ 'node': 'qualify-lead', 'type': 'main', 'index': 0 }]
            ]
          }
        }
      }
    });

    // Customer Support Template
    this.workflowTemplates.set('customer-support', {
      id: 'customer-support',
      name: 'Customer Support Workflow',
      description: 'Route support tickets based on priority and category, create tickets in support system',
      category: 'customer-support',
      tags: ['support', 'tickets', 'automation'],
      variables: [
        { name: 'supportSystemUrl', type: 'string', description: 'Support system API URL', required: true },
        { name: 'supportApiKey', type: 'string', description: 'Support system API key', required: true },
        { name: 'escalationEmail', type: 'string', description: 'Escalation team email', required: true }
      ],
      integrations: ['Support System', 'Email', 'Slack'],
      workflow: {
        name: 'Customer Support Workflow',
        nodes: [
          {
            id: 'webhook',
            name: 'Support Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              httpMethod: 'POST',
              path: 'customer-support'
            }
          }
        ],
        connections: {}
      }
    });

    // E-commerce Order Template
    this.workflowTemplates.set('ecommerce-order', {
      id: 'ecommerce-order',
      name: 'E-commerce Order Processing',
      description: 'Process orders, update inventory, send confirmations, and handle fulfillment',
      category: 'e-commerce',
      tags: ['ecommerce', 'orders', 'inventory'],
      variables: [
        { name: 'shopifyUrl', type: 'string', description: 'Shopify store URL', required: true },
        { name: 'shopifyApiKey', type: 'string', description: 'Shopify API key', required: true },
        { name: 'fulfillmentEmail', type: 'string', description: 'Fulfillment team email', required: true }
      ],
      integrations: ['Shopify', 'Email', 'Inventory System'],
      workflow: {
        name: 'E-commerce Order Processing',
        nodes: [
          {
            id: 'webhook',
            name: 'Order Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              httpMethod: 'POST',
              path: 'ecommerce-order'
            }
          }
        ],
        connections: {}
      }
    });

    // Appointment Booking Template
    this.workflowTemplates.set('appointment-booking', {
      id: 'appointment-booking',
      name: 'Appointment Booking Workflow',
      description: 'Handle appointment requests, check availability, send confirmations and reminders',
      category: 'appointment',
      tags: ['calendar', 'booking', 'scheduling'],
      variables: [
        { name: 'calendarId', type: 'string', description: 'Google Calendar ID', required: true },
        { name: 'timeZone', type: 'string', description: 'Default timezone', required: false, defaultValue: 'UTC' },
        { name: 'reminderHours', type: 'number', description: 'Hours before appointment to send reminder', required: false, defaultValue: 24 }
      ],
      integrations: ['Google Calendar', 'Email', 'SMS'],
      workflow: {
        name: 'Appointment Booking Workflow',
        nodes: [
          {
            id: 'webhook',
            name: 'Booking Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              httpMethod: 'POST',
              path: 'appointment-booking'
            }
          }
        ],
        connections: {}
      }
    });

    // Internal Support Template
    this.workflowTemplates.set('internal-support', {
      id: 'internal-support',
      name: 'Internal Support Workflow',
      description: 'Handle internal employee requests, IT support, HR queries, and facility management',
      category: 'internal-support',
      tags: ['hr', 'it', 'internal', 'employee'],
      variables: [
        { name: 'hrEmail', type: 'string', description: 'HR team email', required: true },
        { name: 'itEmail', type: 'string', description: 'IT support email', required: true },
        { name: 'facilityEmail', type: 'string', description: 'Facility management email', required: true }
      ],
      integrations: ['HRIS', 'IT Service Desk', 'Email'],
      workflow: {
        name: 'Internal Support Workflow',
        nodes: [
          {
            id: 'webhook',
            name: 'Internal Support Webhook',
            type: 'n8n-nodes-base.webhook',
            typeVersion: 1,
            position: [250, 300],
            parameters: {
              httpMethod: 'POST',
              path: 'internal-support'
            }
          }
        ],
        connections: {}
      }
    });
  }
}

// Export singleton instance
export const n8nService = new N8NService();
export default n8nService;

// Export types
export type {
  N8NWorkflow,
  N8NNode,
  N8NExecution,
  WorkflowTemplate
};
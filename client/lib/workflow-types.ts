/**
 * Workflow Builder Types and Interfaces
 * Defines the data structures for visual workflow construction
 */

// Core workflow node types
export type WorkflowNodeType = 
  | 'trigger'
  | 'condition'
  | 'action'
  | 'ai_response'
  | 'human_handoff'
  | 'integration'
  | 'wait'
  | 'webhook'
  | 'variable'
  | 'loop';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
}

export interface WorkflowNodeData {
  label: string;
  description?: string;
  config: Record<string, any>;
  validation?: {
    isValid: boolean;
    errors: string[];
  };
}

export interface WorkflowPort {
  id: string;
  type: 'input' | 'output';
  dataType: 'any' | 'text' | 'number' | 'boolean' | 'object' | 'array';
  label: string;
  required: boolean;
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'active' | 'inactive' | 'error';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  triggers: WorkflowTrigger[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    tags: string[];
    category: string;
  };
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  value?: any;
  description?: string;
  scope: 'global' | 'local';
}

export interface WorkflowTrigger {
  id: string;
  type: 'user_message' | 'webhook' | 'schedule' | 'manual' | 'event';
  config: Record<string, any>;
  conditions?: WorkflowCondition[];
}

// Node templates for the workflow builder
export interface NodeTemplate {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  inputs: Omit<WorkflowPort, 'id'>[];
  outputs: Omit<WorkflowPort, 'id'>[];
  defaultConfig: Record<string, any>;
  configSchema: ConfigField[];
  // Additional properties for enhanced functionality
  tags?: string[];
  setupComplexity?: 'easy' | 'medium' | 'advanced';
  provider?: string;
  requirements?: string[];
  features?: string[];
  webhookSupport?: boolean;
  oauthSupport?: boolean;
}

export interface ConfigField {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json' | 'password';
  label: string;
  description?: string;
  required: boolean;
  default?: any;
  options?: Array<{ value: any; label: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

// Workflow execution types
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  logs: WorkflowExecutionLog[];
  variables: Record<string, any>;
  error?: string;
}

export interface WorkflowExecutionLog {
  id: string;
  timestamp: string;
  nodeId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

// Predefined node templates
export const NODE_TEMPLATES: NodeTemplate[] = [
  // Trigger nodes
  {
    id: 'user_message_trigger',
    type: 'trigger',
    name: 'User Message',
    description: 'Triggers when a user sends a message',
    category: 'Triggers',
    icon: '💬',
    color: '#10b981',
    inputs: [],
    outputs: [
      { type: 'output', dataType: 'text', label: 'Message', required: false },
      { type: 'output', dataType: 'object', label: 'User Data', required: false }
    ],
    defaultConfig: {
      messageFilters: [],
      userFilters: []
    },
    configSchema: [
      {
        name: 'messageFilters',
        type: 'multiselect',
        label: 'Message Filters',
        description: 'Filter messages based on content',
        required: false,
        options: [
          { value: 'contains_question', label: 'Contains Question' },
          { value: 'contains_greeting', label: 'Contains Greeting' },
          { value: 'contains_complaint', label: 'Contains Complaint' }
        ]
      }
    ],
    tags: ['messaging', 'trigger', 'user'],
    setupComplexity: 'easy',
    provider: 'Built-in',
    requirements: [],
    features: ['Real-time', 'Filtering'],
    webhookSupport: false,
    oauthSupport: false
  },

  // Condition nodes
  {
    id: 'text_condition',
    type: 'condition',
    name: 'Text Condition',
    description: 'Evaluates text-based conditions',
    category: 'Logic',
    icon: '🔀',
    color: '#f59e0b',
    inputs: [
      { type: 'input', dataType: 'text', label: 'Input Text', required: true }
    ],
    outputs: [
      { type: 'output', dataType: 'boolean', label: 'True', required: false },
      { type: 'output', dataType: 'boolean', label: 'False', required: false }
    ],
    defaultConfig: {
      operator: 'contains',
      value: '',
      caseSensitive: false
    },
    configSchema: [
      {
        name: 'operator',
        type: 'select',
        label: 'Operator',
        required: true,
        options: [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'starts_with', label: 'Starts With' },
          { value: 'ends_with', label: 'Ends With' }
        ]
      },
      {
        name: 'value',
        type: 'text',
        label: 'Value to Compare',
        required: true
      },
      {
        name: 'caseSensitive',
        type: 'boolean',
        label: 'Case Sensitive',
        required: false,
        default: false
      }
    ],
    tags: ['logic', 'condition', 'text'],
    setupComplexity: 'easy',
    provider: 'Built-in',
    requirements: [],
    features: ['Text Processing', 'Case Sensitivity'],
    webhookSupport: false,
    oauthSupport: false
  },

  // Action nodes
  {
    id: 'ai_response',
    type: 'ai_response',
    name: 'AI Response',
    description: 'Generate AI-powered response',
    category: 'Actions',
    icon: '🤖',
    color: '#3b82f6',
    inputs: [
      { type: 'input', dataType: 'text', label: 'User Message', required: true },
      { type: 'input', dataType: 'text', label: 'Context', required: false }
    ],
    outputs: [
      { type: 'output', dataType: 'text', label: 'Response', required: true }
    ],
    defaultConfig: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: 'You are a helpful assistant.'
    },
    configSchema: [
      {
        name: 'model',
        type: 'select',
        label: 'AI Model',
        required: true,
        options: [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ]
      },
      {
        name: 'systemPrompt',
        type: 'textarea',
        label: 'System Prompt',
        description: 'Instructions for the AI',
        required: false
      },
      {
        name: 'temperature',
        type: 'number',
        label: 'Temperature',
        description: 'Creativity level (0-1)',
        required: false,
        validation: { min: 0, max: 1 }
      }
    ],
    tags: ['ai', 'response', 'gpt'],
    setupComplexity: 'medium',
    provider: 'OpenAI',
    requirements: ['OpenAI API Key'],
    features: ['Multiple Models', 'Customizable Temperature', 'System Prompts'],
    webhookSupport: false,
    oauthSupport: true
  },

  {
    id: 'send_message',
    type: 'action',
    name: 'Send Message',
    description: 'Send a message to the user',
    category: 'Actions',
    icon: '📤',
    color: '#8b5cf6',
    inputs: [
      { type: 'input', dataType: 'text', label: 'Message', required: true }
    ],
    outputs: [
      { type: 'output', dataType: 'boolean', label: 'Success', required: false }
    ],
    defaultConfig: {
      delay: 0,
      typing: true
    },
    configSchema: [
      {
        name: 'delay',
        type: 'number',
        label: 'Delay (seconds)',
        description: 'Delay before sending',
        required: false,
        default: 0
      },
      {
        name: 'typing',
        type: 'boolean',
        label: 'Show Typing Indicator',
        required: false,
        default: true
      }
    ],
    tags: ['message', 'send', 'communication'],
    setupComplexity: 'easy',
    provider: 'Built-in',
    requirements: [],
    features: ['Typing Indicator', 'Delay Support'],
    webhookSupport: false,
    oauthSupport: false
  },

  // Integration nodes
  {
    id: 'webhook_call',
    type: 'integration',
    name: 'Webhook Call',
    description: 'Make HTTP request to external service',
    category: 'Integrations',
    icon: '🔗',
    color: '#ec4899',
    inputs: [
      { type: 'input', dataType: 'object', label: 'Data', required: false }
    ],
    outputs: [
      { type: 'output', dataType: 'object', label: 'Response', required: false },
      { type: 'output', dataType: 'boolean', label: 'Success', required: false }
    ],
    defaultConfig: {
      method: 'POST',
      url: '',
      headers: {},
      timeout: 30000
    },
    configSchema: [
      {
        name: 'method',
        type: 'select',
        label: 'HTTP Method',
        required: true,
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' }
        ]
      },
      {
        name: 'url',
        type: 'text',
        label: 'URL',
        required: true,
        validation: { pattern: '^https?://', message: 'Must be a valid URL' }
      },
      {
        name: 'headers',
        type: 'json',
        label: 'Headers',
        description: 'JSON object with headers',
        required: false
      }
    ],
    tags: ['webhook', 'http', 'integration'],
    setupComplexity: 'medium',
    provider: 'HTTP',
    requirements: ['Valid URL', 'Network Access'],
    features: ['Multiple HTTP Methods', 'Custom Headers', 'Timeout Control'],
    webhookSupport: true,
    oauthSupport: false
  },

  // Utility nodes
  {
    id: 'wait_delay',
    type: 'wait',
    name: 'Wait',
    description: 'Add a delay in the workflow',
    category: 'Utilities',
    icon: '⏱️',
    color: '#6b7280',
    inputs: [
      { type: 'input', dataType: 'any', label: 'Input', required: false }
    ],
    outputs: [
      { type: 'output', dataType: 'any', label: 'Output', required: false }
    ],
    defaultConfig: {
      duration: 5,
      unit: 'seconds'
    },
    configSchema: [
      {
        name: 'duration',
        type: 'number',
        label: 'Duration',
        required: true,
        validation: { min: 1 }
      },
      {
        name: 'unit',
        type: 'select',
        label: 'Unit',
        required: true,
        options: [
          { value: 'seconds', label: 'Seconds' },
          { value: 'minutes', label: 'Minutes' },
          { value: 'hours', label: 'Hours' }
        ]
      }
    ],
    tags: ['wait', 'delay', 'timing'],
    setupComplexity: 'easy',
    provider: 'Built-in',
    requirements: [],
    features: ['Flexible Duration', 'Multiple Time Units'],
    webhookSupport: false,
    oauthSupport: false
  },

  {
    id: 'human_handoff',
    type: 'human_handoff',
    name: 'Human Handoff',
    description: 'Transfer conversation to human agent',
    category: 'Actions',
    icon: '👥',
    color: '#f97316',
    inputs: [
      { type: 'input', dataType: 'text', label: 'Handoff Message', required: false }
    ],
    outputs: [
      { type: 'output', dataType: 'boolean', label: 'Success', required: false }
    ],
    defaultConfig: {
      department: 'general',
      priority: 'normal',
      message: 'Customer needs human assistance'
    },
    configSchema: [
      {
        name: 'department',
        type: 'select',
        label: 'Department',
        required: true,
        options: [
          { value: 'general', label: 'General Support' },
          { value: 'technical', label: 'Technical Support' },
          { value: 'sales', label: 'Sales' },
          { value: 'billing', label: 'Billing' }
        ]
      },
      {
        name: 'priority',
        type: 'select',
        label: 'Priority',
        required: true,
        options: [
          { value: 'low', label: 'Low' },
          { value: 'normal', label: 'Normal' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' }
        ]
      }
    ],
    tags: ['handoff', 'human', 'escalation'],
    setupComplexity: 'medium',
    provider: 'Built-in',
    requirements: ['Human Agent Availability'],
    features: ['Department Routing', 'Priority Levels', 'Custom Messages'],
    webhookSupport: false,
    oauthSupport: false
  }
];

// Workflow categories for organization
export const WORKFLOW_CATEGORIES = [
  { id: 'triggers', name: 'Triggers', icon: '🎯', color: '#10b981' },
  { id: 'logic', name: 'Logic', icon: '🧠', color: '#f59e0b' },
  { id: 'actions', name: 'Actions', icon: '⚡', color: '#3b82f6' },
  { id: 'integrations', name: 'Integrations', icon: '🔗', color: '#ec4899' },
  { id: 'utilities', name: 'Utilities', icon: '🛠️', color: '#6b7280' }
];
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
  properties?: Record<string, ToolParameter>;
  // Enhanced validation properties
  min_length?: number;
  max_length?: number;
  minimum?: number;
  maximum?: number;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'search' | 'data' | 'communication' | 'automation' | 'utility';
  provider: 'built-in' | 'n8n' | 'custom' | 'api';
  version: string;
  parameters: ToolParameter[];
  configuration: {
    endpoint?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    authentication?: {
      type: 'none' | 'api_key' | 'bearer' | 'basic';
      key?: string;
      value?: string;
    };
    timeout?: number;
    retries?: number;
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToolCall {
  id: string;
  tool_id: string;
  conversation_id: string;
  message_id?: string;
  parameters: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  error_message?: string;
  execution_time?: number;
  created_at: string;
  completed_at?: string;
}

export interface ToolExecutionContext {
  conversation_id: string;
  agent_id: string;
  user_id: string;
  customer_id: string;
  message_context: string;
  variables: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  data?: any;
  error?: string;
  execution_time?: number;
  metadata?: Record<string, any>;
}
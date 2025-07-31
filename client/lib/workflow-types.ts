/**
 * Visual Workflow Builder Types
 * Core types and interfaces for the visual agent workflow system
 */

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  category: 'triggers' | 'actions' | 'conditions' | 'integrations' | 'responses';
  inputs: NodePort[];
  outputs: NodePort[];
  configuration: Record<string, any>;
  position: { x: number; y: number };
  metadata?: Record<string, any>;
}

export interface NodePort {
  id: string;
  name: string;
  type: 'data' | 'control' | 'event';
  dataType: 'string' | 'number' | 'object' | 'boolean' | 'any';
  required: boolean;
  description: string;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  metadata?: Record<string, any>;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  description: string;
  scope: 'global' | 'local';
}

export interface WorkflowTrigger {
  id: string;
  type: 'message' | 'webhook' | 'schedule' | 'event';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  variables: WorkflowVariable[];
  triggers: WorkflowTrigger[];
  metadata: {
    created_at: string;
    updated_at: string;
    created_by: string;
    template_id?: string;
    is_template: boolean;
    tags: string[];
  };
}

export interface NodeDefinition {
  id: string;
  type: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  configurationSchema: Record<string, any>;
  isSystem: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  nodeId?: string;
  connectionId?: string;
  type: 'missing_connection' | 'invalid_configuration' | 'circular_dependency' | 'type_mismatch';
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  nodeId?: string;
  type: 'performance' | 'best_practice' | 'deprecated';
  message: string;
}

export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  nodeResults: Record<string, any>;
  metadata: Record<string, any>;
}

export interface ExecutionContext {
  workflowId: string;
  deploymentId?: string;
  variables: Record<string, any>;
  inputData: any;
  userId: string;
  conversationId?: string;
  messageId?: string;
}

export interface DebugSession {
  id: string;
  workflowId: string;
  breakpoints: string[];
  currentNode?: string;
  variables: Record<string, any>;
  executionStack: ExecutionStep[];
  status: 'running' | 'paused' | 'completed' | 'error';
}

export interface ExecutionStep {
  nodeId: string;
  timestamp: string;
  input: any;
  output: any;
  duration: number;
  status: 'success' | 'error' | 'skipped';
  error?: string;
}

// Persona Types
export interface PersonaDefinition {
  id: string;
  name: string;
  role: string;
  personality: {
    tone: 'professional' | 'friendly' | 'casual' | 'formal' | 'enthusiastic';
    style: 'concise' | 'detailed' | 'conversational' | 'technical';
    empathy_level: number; // 1-10
    creativity_level: number; // 1-10
    formality_level: number; // 1-10
  };
  expertise: {
    domains: string[];
    knowledge_depth: 'basic' | 'intermediate' | 'expert';
    specializations: string[];
  };
  behavior: {
    greeting_style: string;
    escalation_triggers: string[];
    response_patterns: ResponsePattern[];
    constraints: string[];
    fallback_responses: string[];
  };
  context_awareness: {
    remember_conversation: boolean;
    use_customer_history: boolean;
    adapt_to_sentiment: boolean;
    personalization_level: number; // 1-10
  };
  generated_prompt: string;
  created_at: string;
  updated_at: string;
}

export interface ResponsePattern {
  scenario: string;
  trigger_keywords: string[];
  response_template: string;
  follow_up_actions: string[];
  escalation_conditions: string[];
}

export interface PersonaCreationSession {
  id: string;
  userId: string;
  sessionData: Record<string, any>;
  currentStep: string;
  completedSteps: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  type: 'single_choice' | 'multiple_choice' | 'text_input' | 'slider' | 'scenario_builder';
  options?: WizardOption[];
  validation?: ValidationRule[];
  dependencies?: StepDependency[];
}

export interface WizardOption {
  id: string;
  label: string;
  description?: string;
  value: any;
  icon?: string;
}

export interface ValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface StepDependency {
  stepId: string;
  condition: string;
  value: any;
}

export interface PersonaFeedback {
  scenario: string;
  expected_response: string;
  actual_response: string;
  rating: number;
  feedback: string;
}

// Template Types
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  workflow_id?: string;
  persona_id?: string;
  configuration: Record<string, any>;
  customization_options: CustomizationOption[];
  setup_instructions: SetupInstruction[];
  metadata: {
    author: string;
    version: string;
    created_at: string;
    updated_at: string;
    usage_count: number;
    rating: number;
    is_official: boolean;
    is_public: boolean;
  };
}

export interface CustomizationOption {
  type: 'channel_selection' | 'integration_selection' | 'persona_customization' | 'workflow_modification';
  title: string;
  description?: string;
  options: string[] | CustomizationChoice[];
  required: boolean;
  multiple: boolean;
}

export interface CustomizationChoice {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  configuration?: Record<string, any>;
}

export interface SetupInstruction {
  step: number;
  title: string;
  description: string;
  type?: 'configuration' | 'integration' | 'testing' | 'deployment';
  required: boolean;
  estimated_time?: string;
}

export interface TemplateCustomization {
  optionId: string;
  selectedValues: any[];
  configuration?: Record<string, any>;
}

export interface TemplateFilter {
  category?: string;
  tags?: string[];
  rating_min?: number;
  is_official?: boolean;
  search_query?: string;
}

// Deployment Types
export interface AgentDeployment {
  id: string;
  agent_id: string;
  workflow_id: string;
  persona_id: string;
  channels: DeployedChannel[];
  integrations: DeployedIntegration[];
  status: 'deploying' | 'active' | 'paused' | 'error';
  endpoints: {
    webhook_url: string;
    api_endpoint: string;
    chat_widget_url: string;
  };
  metrics: {
    conversations_count: number;
    messages_count: number;
    average_response_time: number;
    satisfaction_score: number;
  };
  created_at: string;
  deployed_at?: string;
  last_active?: string;
}

export interface DeployedChannel {
  type: 'whatsapp' | 'slack' | 'web_chat' | 'email';
  configuration: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
  webhook_url?: string;
  last_message?: string;
}

export interface DeployedIntegration {
  type: 'knowledge_base' | 'crm' | 'helpdesk' | 'analytics';
  configuration: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
  last_sync?: string;
}

export interface AgentConfiguration {
  name: string;
  description: string;
  workflow: AgentWorkflow;
  persona: PersonaDefinition;
  channels: ChannelConfiguration[];
  integrations: IntegrationConfiguration[];
  knowledge_bases: string[];
}

export interface ChannelConfiguration {
  type: string;
  enabled: boolean;
  configuration: Record<string, any>;
}

export interface IntegrationConfiguration {
  type: string;
  enabled: boolean;
  configuration: Record<string, any>;
  credentials?: Record<string, any>;
}

// Execution and Runtime Types
export interface IncomingMessage {
  id: string;
  content: string;
  sender: string;
  channel: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface AgentResponse {
  content: string;
  type: 'text' | 'image' | 'audio' | 'interactive';
  metadata: Record<string, any>;
  actions?: ResponseAction[];
}

export interface ResponseAction {
  type: 'escalate' | 'transfer' | 'schedule' | 'create_ticket';
  configuration: Record<string, any>;
}

export interface WorkflowResult {
  success: boolean;
  response?: AgentResponse;
  error?: string;
  executionTime: number;
  nodesExecuted: string[];
  finalState: Record<string, any>;
}

export interface DeploymentMetrics {
  conversations: {
    total: number;
    active: number;
    completed: number;
    escalated: number;
  };
  performance: {
    average_response_time: number;
    success_rate: number;
    error_rate: number;
  };
  satisfaction: {
    average_rating: number;
    total_ratings: number;
    distribution: Record<string, number>;
  };
  usage: {
    messages_per_day: number[];
    peak_hours: number[];
    channel_distribution: Record<string, number>;
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context: Record<string, any>;
  nodeId?: string;
  executionId?: string;
}

export interface LogFilter {
  level?: string;
  start_date?: string;
  end_date?: string;
  nodeId?: string;
  search_query?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  last_updated: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration?: number;
}
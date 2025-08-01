-- Visual Agent Builder Database Schema
-- This migration creates tables for dynamic workflows, personas, templates, and deployments

-- Agent workflows with visual node-based structure
CREATE TABLE IF NOT EXISTS agent_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  workflow_data JSONB NOT NULL DEFAULT '{"nodes": [], "connections": [], "variables": []}',
  is_template BOOLEAN DEFAULT false,
  template_id UUID REFERENCES agent_workflows(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent personas with personality and behavior configuration
CREATE TABLE IF NOT EXISTS agent_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  personality_config JSONB NOT NULL DEFAULT '{}',
  expertise_config JSONB NOT NULL DEFAULT '{}',
  behavior_config JSONB NOT NULL DEFAULT '{}',
  context_config JSONB NOT NULL DEFAULT '{}',
  generated_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to existing agent_templates table
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES agent_workflows(id);
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS persona_id UUID REFERENCES agent_personas(id);
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}';
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS customization_options JSONB DEFAULT '[]';
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS setup_instructions JSONB DEFAULT '[]';
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE agent_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Agent deployments with runtime management
CREATE TABLE IF NOT EXISTS agent_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES agent_workflows(id),
  persona_id UUID REFERENCES agent_personas(id),
  deployment_config JSONB NOT NULL DEFAULT '{}',
  endpoints JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'deploying' CHECK (status IN ('deploying', 'active', 'paused', 'error')),
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  last_active TIMESTAMPTZ
);

-- Workflow execution logs for debugging and monitoring
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID REFERENCES agent_deployments(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES agent_workflows(id),
  execution_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'timeout')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  execution_time_ms INTEGER,
  error_message TEXT,
  debug_info JSONB DEFAULT '{}'
);

-- Template ratings and reviews for marketplace
CREATE TABLE IF NOT EXISTS template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, user_id)
);

-- Workflow node definitions for the visual builder
CREATE TABLE IF NOT EXISTS workflow_node_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  input_schema JSONB NOT NULL DEFAULT '{}',
  output_schema JSONB NOT NULL DEFAULT '{}',
  configuration_schema JSONB NOT NULL DEFAULT '{}',
  is_system BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persona creation sessions for wizard state management
CREATE TABLE IF NOT EXISTS persona_creation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data JSONB NOT NULL DEFAULT '{}',
  current_step TEXT DEFAULT 'role_definition',
  completed_steps TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_workflows_user_id ON agent_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_template_id ON agent_workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_status ON agent_workflows(status);
CREATE INDEX IF NOT EXISTS idx_agent_personas_user_id ON agent_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_agent_templates_is_public ON agent_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_agent_templates_rating ON agent_templates(rating DESC);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_user_id ON agent_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_status ON agent_deployments(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_deployment_id ON workflow_executions(deployment_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_node_definitions_type ON workflow_node_definitions(type);
CREATE INDEX IF NOT EXISTS idx_workflow_node_definitions_category ON workflow_node_definitions(category);

-- Row Level Security (RLS) policies
ALTER TABLE agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_creation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_workflows
CREATE POLICY "Users can view their own workflows" ON agent_workflows
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workflows" ON agent_workflows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows" ON agent_workflows
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows" ON agent_workflows
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for agent_personas
CREATE POLICY "Users can view their own personas" ON agent_personas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own personas" ON agent_personas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own personas" ON agent_personas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own personas" ON agent_personas
  FOR DELETE USING (auth.uid() = user_id);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agent templates are publicly readable" ON agent_templates;
DROP POLICY IF EXISTS "Users can view public templates and their own" ON agent_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON agent_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON agent_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON agent_templates;

-- RLS Policies for agent_templates
CREATE POLICY "Users can view public templates and their own" ON agent_templates
  FOR SELECT USING (is_public = true OR auth.uid() = created_by OR is_active = true);

CREATE POLICY "Users can insert their own templates" ON agent_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates" ON agent_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates" ON agent_templates
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for agent_deployments
CREATE POLICY "Users can view their own deployments" ON agent_deployments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deployments" ON agent_deployments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deployments" ON agent_deployments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deployments" ON agent_deployments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for workflow_executions
CREATE POLICY "Users can view executions for their deployments" ON workflow_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agent_deployments 
      WHERE agent_deployments.id = workflow_executions.deployment_id 
      AND agent_deployments.user_id = auth.uid()
    )
  );

-- RLS Policies for template_reviews
CREATE POLICY "Users can view all template reviews" ON template_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON template_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON template_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON template_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for persona_creation_sessions
CREATE POLICY "Users can view their own persona sessions" ON persona_creation_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own persona sessions" ON persona_creation_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own persona sessions" ON persona_creation_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own persona sessions" ON persona_creation_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (drop existing first to avoid conflicts)
DROP TRIGGER IF EXISTS update_agent_workflows_updated_at ON agent_workflows;
CREATE TRIGGER update_agent_workflows_updated_at BEFORE UPDATE ON agent_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_personas_updated_at ON agent_personas;
CREATE TRIGGER update_agent_personas_updated_at BEFORE UPDATE ON agent_personas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_templates_updated_at ON agent_templates;
CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON agent_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_node_definitions_updated_at ON workflow_node_definitions;
CREATE TRIGGER update_workflow_node_definitions_updated_at BEFORE UPDATE ON workflow_node_definitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_persona_creation_sessions_updated_at ON persona_creation_sessions;
CREATE TRIGGER update_persona_creation_sessions_updated_at BEFORE UPDATE ON persona_creation_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default workflow node definitions
INSERT INTO workflow_node_definitions (type, name, description, category, icon, input_schema, output_schema, configuration_schema) VALUES
-- Trigger Nodes
('message_trigger', 'Message Trigger', 'Triggers when a message is received', 'triggers', 'MessageSquare', 
 '{}', 
 '{"message": {"type": "object"}, "sender": {"type": "string"}, "channel": {"type": "string"}}',
 '{"channels": {"type": "array", "items": {"type": "string"}}, "filters": {"type": "object"}}'
),

('webhook_trigger', 'Webhook Trigger', 'Triggers when a webhook is called', 'triggers', 'Webhook',
 '{}',
 '{"payload": {"type": "object"}, "headers": {"type": "object"}}',
 '{"webhook_url": {"type": "string"}, "method": {"type": "string"}}'
),

-- Action Nodes
('send_message', 'Send Message', 'Sends a message to the user', 'actions', 'Send',
 '{"message": {"type": "string"}, "recipient": {"type": "string"}}',
 '{"sent": {"type": "boolean"}, "message_id": {"type": "string"}}',
 '{"template": {"type": "string"}, "variables": {"type": "object"}}'
),

('ai_response', 'AI Response', 'Generates an AI response based on context', 'actions', 'Bot',
 '{"message": {"type": "string"}, "context": {"type": "object"}}',
 '{"response": {"type": "string"}, "confidence": {"type": "number"}}',
 '{"model": {"type": "string"}, "temperature": {"type": "number"}, "max_tokens": {"type": "number"}}'
),

-- Condition Nodes
('text_condition', 'Text Condition', 'Checks text content against conditions', 'conditions', 'GitBranch',
 '{"text": {"type": "string"}}',
 '{"result": {"type": "boolean"}, "matched_condition": {"type": "string"}}',
 '{"conditions": {"type": "array"}, "match_type": {"type": "string"}}'
),

('sentiment_condition', 'Sentiment Condition', 'Analyzes message sentiment', 'conditions', 'Heart',
 '{"text": {"type": "string"}}',
 '{"sentiment": {"type": "string"}, "confidence": {"type": "number"}}',
 '{"threshold": {"type": "number"}, "sentiments": {"type": "array"}}'
),

-- Integration Nodes
('whatsapp_integration', 'WhatsApp', 'Send messages via WhatsApp', 'integrations', 'MessageCircle',
 '{"message": {"type": "string"}, "phone": {"type": "string"}}',
 '{"sent": {"type": "boolean"}, "message_id": {"type": "string"}}',
 '{"credential_id": {"type": "string"}, "message_type": {"type": "string"}}'
),

('knowledge_base', 'Knowledge Base', 'Query knowledge base for information', 'integrations', 'Database',
 '{"query": {"type": "string"}, "context": {"type": "object"}}',
 '{"results": {"type": "array"}, "confidence": {"type": "number"}}',
 '{"knowledge_base_id": {"type": "string"}, "max_results": {"type": "number"}}'
),

-- Response Nodes
('final_response', 'Final Response', 'Final response to end the workflow', 'responses', 'CheckCircle',
 '{"message": {"type": "string"}}',
 '{"completed": {"type": "boolean"}}',
 '{"response_type": {"type": "string"}, "metadata": {"type": "object"}}'
);

-- Update existing templates with new fields
UPDATE agent_templates SET 
  tags = ARRAY['support', 'tickets', 'knowledge_base', 'escalation'],
  configuration = '{"channels": ["whatsapp", "web_chat"], "integrations": ["knowledge_base"], "features": ["sentiment_analysis", "escalation"]}',
  customization_options = '[{"type": "channel_selection", "title": "Communication Channels", "options": ["whatsapp", "slack", "web_chat", "email"]}, {"type": "integration_selection", "title": "Integrations", "options": ["hubspot", "zendesk", "knowledge_base", "slack"]}]',
  setup_instructions = '[{"step": 1, "title": "Configure Channels", "description": "Select and configure your communication channels"}, {"step": 2, "title": "Connect Knowledge Base", "description": "Link your knowledge base for accurate responses"}, {"step": 3, "title": "Set Escalation Rules", "description": "Define when to escalate to human agents"}]',
  metadata = '{"difficulty": "beginner", "setup_time": "10 minutes", "features": ["24/7 availability", "Multi-language support", "Sentiment analysis"]}',
  is_official = true,
  is_public = true
WHERE name = 'Customer Support Agent';

UPDATE agent_templates SET 
  tags = ARRAY['sales', 'crm', 'leads', 'follow_up'],
  configuration = '{"channels": ["web_chat", "email"], "integrations": ["crm"], "features": ["lead_qualification", "follow_up"]}',
  customization_options = '[{"type": "crm_selection", "title": "CRM Integration", "options": ["hubspot", "salesforce", "pipedrive", "custom"]}, {"type": "qualification_criteria", "title": "Lead Qualification", "options": ["budget", "authority", "need", "timeline"]}]',
  setup_instructions = '[{"step": 1, "title": "Connect CRM", "description": "Integrate with your CRM system"}, {"step": 2, "title": "Define Lead Criteria", "description": "Set qualification parameters"}, {"step": 3, "title": "Configure Follow-ups", "description": "Set automated follow-up sequences"}]',
  metadata = '{"difficulty": "intermediate", "setup_time": "15 minutes", "features": ["Lead scoring", "CRM integration", "Automated follow-ups"]}',
  is_official = true,
  is_public = true
WHERE name = 'Sales Agent';

UPDATE agent_templates SET 
  tags = ARRAY['ecommerce', 'shopping', 'orders', 'returns'],
  configuration = '{"channels": ["web_chat", "whatsapp"], "integrations": ["ecommerce_platform"], "features": ["product_search", "order_tracking"]}',
  customization_options = '[{"type": "platform_selection", "title": "E-commerce Platform", "options": ["shopify", "woocommerce", "magento", "custom"]}, {"type": "payment_integration", "title": "Payment Processing", "options": ["stripe", "paypal", "square"]}]',
  setup_instructions = '[{"step": 1, "title": "Connect Store", "description": "Link your e-commerce platform"}, {"step": 2, "title": "Configure Products", "description": "Set up product catalog access"}, {"step": 3, "title": "Enable Payments", "description": "Configure payment processing"}]',
  metadata = '{"difficulty": "intermediate", "setup_time": "20 minutes", "features": ["Product recommendations", "Order tracking", "Return processing"]}',
  is_official = true,
  is_public = true
WHERE name = 'E-commerce Assistant';
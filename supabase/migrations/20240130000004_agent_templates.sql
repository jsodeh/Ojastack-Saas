-- Agent Templates System Migration
-- Creates tables for template management and agent creation

-- Agent Templates table
CREATE TABLE agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('sales', 'support', 'internal', 'ecommerce', 'booking', 'custom')) NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  preview_image TEXT,
  
  -- Template configuration
  personality JSONB NOT NULL DEFAULT '{
    "tone": "professional",
    "style": "balanced",
    "language": "en",
    "creativity_level": 50
  }',
  
  -- Features and capabilities
  features JSONB NOT NULL DEFAULT '{
    "voice_enabled": true,
    "video_enabled": false,
    "multimodal": true,
    "tools": [],
    "integrations": []
  }',
  
  -- Default configuration
  default_config JSONB NOT NULL DEFAULT '{
    "knowledge_bases": [],
    "channels": ["web_chat"],
    "workflows": [],
    "ai_provider": "openai"
  }',
  
  -- Customization options
  customizable_fields JSONB NOT NULL DEFAULT '[]',
  
  -- N8N workflows
  workflows JSONB NOT NULL DEFAULT '[]',
  
  -- Template metadata
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Bases table
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('document', 'website', 'faq', 'api', 'database')) DEFAULT 'document',
  status TEXT CHECK (status IN ('processing', 'ready', 'error', 'updating')) DEFAULT 'processing',
  
  -- Content statistics
  file_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  
  -- Configuration
  settings JSONB DEFAULT '{
    "chunk_size": 1000,
    "overlap": 200,
    "language": "en",
    "auto_update": false
  }',
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Base Files table
CREATE TABLE knowledge_base_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_path TEXT,
  
  -- Processing status
  content_hash TEXT,
  processed_content TEXT,
  embedding_status TEXT CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Base Chunks table (for vector search)
CREATE TABLE knowledge_base_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES knowledge_base_files(id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI embeddings dimension
  
  -- Chunk metadata
  chunk_index INTEGER NOT NULL,
  start_position INTEGER,
  end_position INTEGER,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced Agents table (update existing)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES agent_templates(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS knowledge_base_ids UUID[] DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_config JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS video_config JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS workflow_ids TEXT[] DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS integration_configs JSONB DEFAULT '{}';

-- Agent Template Usage tracking
CREATE TABLE agent_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Usage metrics
  customizations_made JSONB DEFAULT '{}',
  deployment_channels TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agent_templates_category ON agent_templates(category);
CREATE INDEX idx_agent_templates_active ON agent_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_agent_templates_featured ON agent_templates(is_featured) WHERE is_featured = true;

CREATE INDEX idx_knowledge_bases_user_id ON knowledge_bases(user_id);
CREATE INDEX idx_knowledge_bases_status ON knowledge_bases(status);
CREATE INDEX idx_knowledge_bases_type ON knowledge_bases(type);

CREATE INDEX idx_knowledge_base_files_kb_id ON knowledge_base_files(knowledge_base_id);
CREATE INDEX idx_knowledge_base_files_status ON knowledge_base_files(embedding_status);

CREATE INDEX idx_knowledge_base_chunks_kb_id ON knowledge_base_chunks(knowledge_base_id);
CREATE INDEX idx_knowledge_base_chunks_file_id ON knowledge_base_chunks(file_id);

-- Vector similarity search index (requires pgvector extension)
CREATE INDEX idx_knowledge_base_chunks_embedding ON knowledge_base_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Row Level Security (RLS) policies
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_template_usage ENABLE ROW LEVEL SECURITY;

-- Agent templates are publicly readable
CREATE POLICY "Agent templates are publicly readable" ON agent_templates
  FOR SELECT USING (is_active = true);

-- Knowledge bases are owned by users
CREATE POLICY "Users can manage their own knowledge bases" ON knowledge_bases
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public knowledge bases" ON knowledge_bases
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- Knowledge base files follow knowledge base permissions
CREATE POLICY "Knowledge base files follow parent permissions" ON knowledge_base_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases kb 
      WHERE kb.id = knowledge_base_files.knowledge_base_id 
      AND (kb.user_id = auth.uid() OR kb.is_public = true)
    )
  );

-- Knowledge base chunks follow knowledge base permissions
CREATE POLICY "Knowledge base chunks follow parent permissions" ON knowledge_base_chunks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases kb 
      WHERE kb.id = knowledge_base_chunks.knowledge_base_id 
      AND (kb.user_id = auth.uid() OR kb.is_public = true)
    )
  );

-- Template usage tracking
CREATE POLICY "Users can manage their own template usage" ON agent_template_usage
  FOR ALL USING (auth.uid() = user_id);

-- Insert default agent templates
INSERT INTO agent_templates (name, category, description, icon, personality, features, default_config, customizable_fields, workflows) VALUES
(
  'Sales Agent',
  'sales',
  'Intelligent sales assistant that qualifies leads, manages CRM data, and automates follow-ups to boost your conversion rates.',
  '💼',
  '{
    "tone": "professional",
    "style": "persuasive",
    "language": "en",
    "creativity_level": 60
  }',
  '{
    "voice_enabled": true,
    "video_enabled": true,
    "multimodal": true,
    "tools": ["web_search", "calculator", "calendar"],
    "integrations": ["hubspot", "salesforce", "email", "calendar"]
  }',
  '{
    "knowledge_bases": ["sales_materials", "product_catalog"],
    "channels": ["web_chat", "whatsapp", "email"],
    "workflows": ["lead_qualification", "follow_up_automation"],
    "ai_provider": "openai"
  }',
  '[
    {"field": "qualification_questions", "type": "text", "required": false},
    {"field": "crm_integration", "type": "select", "options": ["hubspot", "salesforce", "pipedrive"], "required": true},
    {"field": "follow_up_delay", "type": "number", "required": false}
  ]',
  '[
    {
      "id": "lead_qualification",
      "name": "Lead Qualification Workflow",
      "trigger": "new_conversation",
      "description": "Automatically qualifies leads and updates CRM"
    },
    {
      "id": "follow_up_automation",
      "name": "Follow-up Automation",
      "trigger": "conversation_end",
      "description": "Schedules and sends follow-up messages"
    }
  ]'
),
(
  'Customer Support Agent',
  'support',
  'Comprehensive support assistant that handles tickets, searches knowledge bases, and escalates complex issues seamlessly.',
  '🎧',
  '{
    "tone": "helpful",
    "style": "detailed",
    "language": "en",
    "creativity_level": 40
  }',
  '{
    "voice_enabled": true,
    "video_enabled": true,
    "multimodal": true,
    "tools": ["web_search", "file_system", "datetime"],
    "integrations": ["zendesk", "intercom", "slack", "email"]
  }',
  '{
    "knowledge_bases": ["support_docs", "faq", "troubleshooting"],
    "channels": ["web_chat", "whatsapp", "slack", "email"],
    "workflows": ["ticket_creation", "escalation_rules"],
    "ai_provider": "openai"
  }',
  '[
    {"field": "escalation_threshold", "type": "number", "required": false},
    {"field": "support_hours", "type": "text", "required": false},
    {"field": "ticket_system", "type": "select", "options": ["zendesk", "intercom", "freshdesk"], "required": true}
  ]',
  '[
    {
      "id": "ticket_creation",
      "name": "Support Ticket Creation",
      "trigger": "support_request",
      "description": "Creates and routes support tickets automatically"
    },
    {
      "id": "escalation_rules",
      "name": "Issue Escalation",
      "trigger": "complex_issue",
      "description": "Escalates complex issues to human agents"
    }
  ]'
),
(
  'Internal Support Agent',
  'internal',
  'Employee assistance agent for HR policies, IT support, and internal processes to streamline workplace operations.',
  '👥',
  '{
    "tone": "friendly",
    "style": "concise",
    "language": "en",
    "creativity_level": 30
  }',
  '{
    "voice_enabled": true,
    "video_enabled": false,
    "multimodal": true,
    "tools": ["file_system", "datetime", "web_search"],
    "integrations": ["slack", "teams", "google_workspace", "active_directory"]
  }',
  '{
    "knowledge_bases": ["hr_policies", "it_procedures", "employee_handbook"],
    "channels": ["slack", "teams", "email"],
    "workflows": ["leave_request", "it_support"],
    "ai_provider": "openai"
  }',
  '[
    {"field": "department_access", "type": "select", "options": ["hr", "it", "finance", "all"], "required": true},
    {"field": "approval_workflow", "type": "boolean", "required": false}
  ]',
  '[
    {
      "id": "leave_request",
      "name": "Leave Request Processing",
      "trigger": "leave_request",
      "description": "Processes employee leave requests"
    },
    {
      "id": "it_support",
      "name": "IT Support Workflow",
      "trigger": "it_issue",
      "description": "Routes IT support requests to appropriate teams"
    }
  ]'
),
(
  'E-commerce Assistant',
  'ecommerce',
  'Shopping assistant that helps customers find products, track orders, and process returns with integrated payment support.',
  '🛒',
  '{
    "tone": "enthusiastic",
    "style": "conversational",
    "language": "en",
    "creativity_level": 70
  }',
  '{
    "voice_enabled": true,
    "video_enabled": false,
    "multimodal": true,
    "tools": ["web_search", "calculator"],
    "integrations": ["shopify", "stripe", "email", "sms"]
  }',
  '{
    "knowledge_bases": ["product_catalog", "shipping_info", "return_policy"],
    "channels": ["web_chat", "whatsapp", "email"],
    "workflows": ["order_tracking", "return_processing"],
    "ai_provider": "openai"
  }',
  '[
    {"field": "store_integration", "type": "select", "options": ["shopify", "woocommerce", "magento"], "required": true},
    {"field": "payment_processor", "type": "select", "options": ["stripe", "paypal", "square"], "required": true}
  ]',
  '[
    {
      "id": "order_tracking",
      "name": "Order Tracking Workflow",
      "trigger": "order_inquiry",
      "description": "Provides real-time order status updates"
    },
    {
      "id": "return_processing",
      "name": "Return Processing",
      "trigger": "return_request",
      "description": "Handles product returns and refunds"
    }
  ]'
),
(
  'Appointment Booking Agent',
  'booking',
  'Intelligent scheduling assistant that manages calendars, books appointments, and sends automated reminders.',
  '📅',
  '{
    "tone": "professional",
    "style": "efficient",
    "language": "en",
    "creativity_level": 20
  }',
  '{
    "voice_enabled": true,
    "video_enabled": true,
    "multimodal": true,
    "tools": ["datetime", "calendar"],
    "integrations": ["google_calendar", "outlook", "calendly", "zoom"]
  }',
  '{
    "knowledge_bases": ["service_descriptions", "availability_rules"],
    "channels": ["web_chat", "whatsapp", "email", "phone"],
    "workflows": ["booking_confirmation", "reminder_automation"],
    "ai_provider": "openai"
  }',
  '[
    {"field": "calendar_integration", "type": "select", "options": ["google", "outlook", "calendly"], "required": true},
    {"field": "booking_buffer", "type": "number", "required": false},
    {"field": "reminder_schedule", "type": "text", "required": false}
  ]',
  '[
    {
      "id": "booking_confirmation",
      "name": "Booking Confirmation",
      "trigger": "appointment_booked",
      "description": "Sends booking confirmations and calendar invites"
    },
    {
      "id": "reminder_automation",
      "name": "Appointment Reminders",
      "trigger": "scheduled_reminder",
      "description": "Sends automated appointment reminders"
    }
  ]'
);

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON agent_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_bases_updated_at BEFORE UPDATE ON knowledge_bases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_base_files_updated_at BEFORE UPDATE ON knowledge_base_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
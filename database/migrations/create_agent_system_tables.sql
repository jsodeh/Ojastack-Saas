-- Agent System Database Schema
-- This migration creates all tables needed for the comprehensive agent management system

-- Agent Templates Table
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '{}',
  default_personality JSONB NOT NULL DEFAULT '{}',
  sample_conversations JSONB DEFAULT '[]',
  rating DECIMAL(2,1) DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  preview_image TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Agents Table
CREATE TABLE IF NOT EXISTS user_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES agent_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  personality_config JSONB NOT NULL DEFAULT '{}',
  capabilities_config JSONB NOT NULL DEFAULT '{}',
  knowledge_bases TEXT[] DEFAULT '{}',
  deployment_channels JSONB DEFAULT '[]',
  n8n_workflow_id TEXT,
  status TEXT CHECK (status IN ('draft', 'testing', 'active', 'paused', 'error')) DEFAULT 'draft',
  is_draft BOOLEAN DEFAULT true,
  draft_step INTEGER DEFAULT 0,
  draft_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Conversations Table
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  channel_id TEXT,
  external_conversation_id TEXT,
  messages JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('active', 'completed', 'error')) DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Analytics Table
CREATE TABLE IF NOT EXISTS agent_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  conversations_count INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,
  response_time_avg DECIMAL(10,2),
  satisfaction_score DECIMAL(2,1),
  channel_breakdown JSONB DEFAULT '{}',
  error_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, date)
);

-- Agent Deployments Table
CREATE TABLE IF NOT EXISTS agent_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES user_agents(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  channel_config JSONB NOT NULL DEFAULT '{}',
  deployment_url TEXT,
  webhook_url TEXT,
  status TEXT CHECK (status IN ('pending', 'active', 'error', 'paused')) DEFAULT 'pending',
  last_health_check TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  deployed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_agent_templates_featured ON agent_templates(featured);
CREATE INDEX IF NOT EXISTS idx_agent_templates_rating ON agent_templates(rating DESC);
CREATE INDEX IF NOT EXISTS idx_agent_templates_usage ON agent_templates(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_agents_user_id ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_status ON user_agents(status);
CREATE INDEX IF NOT EXISTS idx_user_agents_template_id ON user_agents(template_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_is_draft ON user_agents(is_draft);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_id ON agent_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_channel_type ON agent_conversations(channel_type);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_status ON agent_conversations(status);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_last_message ON agent_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent_id ON agent_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_date ON agent_analytics(date DESC);

CREATE INDEX IF NOT EXISTS idx_agent_deployments_agent_id ON agent_deployments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_channel_type ON agent_deployments(channel_type);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_status ON agent_deployments(status);

-- Row Level Security (RLS) Policies

-- Agent Templates are public (read-only for all authenticated users)
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agent templates are viewable by authenticated users" ON agent_templates
  FOR SELECT USING (auth.role() = 'authenticated');

-- User Agents are private to the user
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own agents" ON user_agents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own agents" ON user_agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agents" ON user_agents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agents" ON user_agents
  FOR DELETE USING (auth.uid() = user_id);

-- Agent Conversations are private to the agent owner
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view conversations for their agents" ON agent_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_agents 
      WHERE user_agents.id = agent_conversations.agent_id 
      AND user_agents.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert conversations for their agents" ON agent_conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_agents 
      WHERE user_agents.id = agent_conversations.agent_id 
      AND user_agents.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update conversations for their agents" ON agent_conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_agents 
      WHERE user_agents.id = agent_conversations.agent_id 
      AND user_agents.user_id = auth.uid()
    )
  );

-- Agent Analytics are private to the agent owner
ALTER TABLE agent_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view analytics for their agents" ON agent_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_agents 
      WHERE user_agents.id = agent_analytics.agent_id 
      AND user_agents.user_id = auth.uid()
    )
  );
CREATE POLICY "System can insert analytics" ON agent_analytics
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update analytics" ON agent_analytics
  FOR UPDATE USING (true);

-- Agent Deployments are private to the agent owner
ALTER TABLE agent_deployments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view deployments for their agents" ON agent_deployments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_agents 
      WHERE user_agents.id = agent_deployments.agent_id 
      AND user_agents.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage deployments for their agents" ON agent_deployments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_agents 
      WHERE user_agents.id = agent_deployments.agent_id 
      AND user_agents.user_id = auth.uid()
    )
  );

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_agent_templates_updated_at BEFORE UPDATE ON agent_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_agents_updated_at BEFORE UPDATE ON user_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_conversations_updated_at BEFORE UPDATE ON agent_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_analytics_updated_at BEFORE UPDATE ON agent_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_deployments_updated_at BEFORE UPDATE ON agent_deployments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE agent_templates 
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = template_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update agent analytics
CREATE OR REPLACE FUNCTION update_agent_analytics(
  p_agent_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_conversations_increment INTEGER DEFAULT 0,
  p_messages_increment INTEGER DEFAULT 0,
  p_response_time DECIMAL DEFAULT NULL,
  p_satisfaction_score DECIMAL DEFAULT NULL,
  p_channel_type TEXT DEFAULT NULL,
  p_error_increment INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO agent_analytics (
    agent_id, 
    date, 
    conversations_count, 
    messages_count,
    response_time_avg,
    satisfaction_score,
    channel_breakdown,
    error_count
  ) VALUES (
    p_agent_id,
    p_date,
    p_conversations_increment,
    p_messages_increment,
    p_response_time,
    p_satisfaction_score,
    CASE WHEN p_channel_type IS NOT NULL 
         THEN jsonb_build_object(p_channel_type, 1)
         ELSE '{}'::jsonb END,
    p_error_increment
  )
  ON CONFLICT (agent_id, date) DO UPDATE SET
    conversations_count = agent_analytics.conversations_count + p_conversations_increment,
    messages_count = agent_analytics.messages_count + p_messages_increment,
    response_time_avg = CASE 
      WHEN p_response_time IS NOT NULL THEN 
        COALESCE((agent_analytics.response_time_avg + p_response_time) / 2, p_response_time)
      ELSE agent_analytics.response_time_avg
    END,
    satisfaction_score = COALESCE(p_satisfaction_score, agent_analytics.satisfaction_score),
    channel_breakdown = CASE 
      WHEN p_channel_type IS NOT NULL THEN
        jsonb_set(
          agent_analytics.channel_breakdown,
          ARRAY[p_channel_type],
          to_jsonb(COALESCE((agent_analytics.channel_breakdown->>p_channel_type)::integer, 0) + 1)
        )
      ELSE agent_analytics.channel_breakdown
    END,
    error_count = agent_analytics.error_count + p_error_increment,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
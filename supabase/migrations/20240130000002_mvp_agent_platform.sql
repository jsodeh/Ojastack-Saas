-- MVP Agent Platform Database Schema

-- Extend agents table for full functionality
ALTER TABLE agents ADD COLUMN IF NOT EXISTS personality TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.7;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 500;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tools TEXT[] DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_settings JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS deployment_urls JSONB DEFAULT '{}';

-- WhatsApp deployments table
CREATE TABLE IF NOT EXISTS whatsapp_deployments (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  business_phone_number TEXT NOT NULL,
  display_name TEXT,
  access_token TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  webhook_url TEXT,
  status TEXT CHECK (status IN ('pending', 'active', 'error', 'suspended')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  
  UNIQUE(business_phone_number, user_id)
);

-- Enhanced conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS intent TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS escalation_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS human_agent_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resolution_time INTEGER; -- in seconds
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5);

-- Messages table for detailed message tracking
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'agent', 'system', 'human')) NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'audio', 'image', 'file')) DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tool calls tracking
CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  execution_time INTEGER, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Knowledge bases table
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  documents_count INTEGER DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'processing', 'error')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table for knowledge base
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  size_bytes BIGINT DEFAULT 0,
  status TEXT CHECK (status IN ('processed', 'processing', 'error')) DEFAULT 'processing',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Document chunks for vector search (will add vector support later)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding_json TEXT, -- Store embedding as JSON for now
  chunk_index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent analytics table
CREATE TABLE IF NOT EXISTS agent_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  conversations_count INTEGER DEFAULT 0,
  messages_count INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0, -- in milliseconds
  escalations_count INTEGER DEFAULT 0,
  satisfaction_avg DECIMAL(3,2) DEFAULT 0,
  tool_calls_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(agent_id, date)
);

-- Human agents table for escalation
CREATE TABLE IF NOT EXISTS human_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'agent',
  status TEXT CHECK (status IN ('available', 'busy', 'offline')) DEFAULT 'offline',
  max_concurrent_conversations INTEGER DEFAULT 5,
  current_conversations INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Escalations tracking
CREATE TABLE IF NOT EXISTS escalations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  human_agent_id UUID REFERENCES human_agents(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'assigned', 'resolved', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Enable Row Level Security on new tables
ALTER TABLE whatsapp_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE human_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for WhatsApp deployments
CREATE POLICY "Users can manage own WhatsApp deployments" ON whatsapp_deployments
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages from own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = messages.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = messages.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for tool calls
CREATE POLICY "Users can view own tool calls" ON tool_calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = tool_calls.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for knowledge bases
CREATE POLICY "Users can manage own knowledge bases" ON knowledge_bases
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for documents
CREATE POLICY "Users can manage documents in own knowledge bases" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases kb 
      WHERE kb.id = documents.knowledge_base_id 
      AND kb.user_id = auth.uid()
    )
  );

-- RLS Policies for document chunks
CREATE POLICY "Users can access chunks from own documents" ON document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN knowledge_bases kb ON kb.id = d.knowledge_base_id
      WHERE d.id = document_chunks.document_id 
      AND kb.user_id = auth.uid()
    )
  );

-- RLS Policies for agent analytics
CREATE POLICY "Users can view analytics for own agents" ON agent_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents a 
      WHERE a.id = agent_analytics.agent_id 
      AND a.user_id = auth.uid()
    )
  );

-- RLS Policies for human agents
CREATE POLICY "Users can manage own human agents" ON human_agents
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for escalations
CREATE POLICY "Users can view escalations for own conversations" ON escalations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = escalations.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- Functions for analytics
CREATE OR REPLACE FUNCTION update_agent_analytics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agent_analytics (agent_id, date, conversations_count, messages_count)
  VALUES (NEW.agent_id, CURRENT_DATE, 1, 1)
  ON CONFLICT (agent_id, date)
  DO UPDATE SET
    conversations_count = agent_analytics.conversations_count + 1,
    messages_count = agent_analytics.messages_count + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update analytics on new conversations
CREATE TRIGGER update_agent_analytics_trigger
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_analytics();

-- Function to update conversation status
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Additional indexes for new tables
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_calls_conversation_id ON tool_calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_status ON tool_calls(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_user_id ON knowledge_bases(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_knowledge_base_id ON documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent_id ON agent_analytics(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_date ON agent_analytics(date);
CREATE INDEX IF NOT EXISTS idx_human_agents_user_id ON human_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_human_agents_status ON human_agents(status);
CREATE INDEX IF NOT EXISTS idx_escalations_conversation_id ON escalations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
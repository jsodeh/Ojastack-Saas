-- User WhatsApp Credentials Migration
-- This migration creates tables for user-provided WhatsApp Business API credentials

-- User encryption keys for credential security
CREATE TABLE user_encryption_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User WhatsApp credentials (encrypted)
CREATE TABLE whatsapp_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_account_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  display_name TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invalid', 'expired', 'suspended')),
  last_validated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, phone_number_id)
);

-- Webhook configurations for dynamic routing
CREATE TABLE whatsapp_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES whatsapp_credentials(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL UNIQUE,
  webhook_token TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent WhatsApp configurations
CREATE TABLE agent_whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES whatsapp_credentials(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  auto_reply BOOLEAN DEFAULT true,
  business_hours JSONB,
  welcome_message TEXT,
  fallback_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id)
);

-- WhatsApp message history with user credential association
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  credential_id UUID REFERENCES whatsapp_credentials(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT NOT NULL,
  conversation_id UUID REFERENCES conversations(id),
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL,
  content JSONB NOT NULL,
  status TEXT DEFAULT 'sent',
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(whatsapp_message_id)
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_credentials_user_id ON whatsapp_credentials(user_id);
CREATE INDEX idx_whatsapp_credentials_phone_number_id ON whatsapp_credentials(phone_number_id);
CREATE INDEX idx_whatsapp_webhooks_webhook_url ON whatsapp_webhooks(webhook_url);
CREATE INDEX idx_whatsapp_webhooks_phone_number_id ON whatsapp_webhooks(phone_number_id);
CREATE INDEX idx_agent_whatsapp_configs_agent_id ON agent_whatsapp_configs(agent_id);
CREATE INDEX idx_agent_whatsapp_configs_credential_id ON agent_whatsapp_configs(credential_id);
CREATE INDEX idx_whatsapp_messages_agent_id ON whatsapp_messages(agent_id);
CREATE INDEX idx_whatsapp_messages_conversation_id ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);

-- Row Level Security (RLS) policies
ALTER TABLE whatsapp_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_credentials
CREATE POLICY "Users can view their own WhatsApp credentials" ON whatsapp_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp credentials" ON whatsapp_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp credentials" ON whatsapp_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp credentials" ON whatsapp_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for whatsapp_webhooks
CREATE POLICY "Users can view their own webhooks" ON whatsapp_webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhooks" ON whatsapp_webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks" ON whatsapp_webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks" ON whatsapp_webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for agent_whatsapp_configs
CREATE POLICY "Users can view WhatsApp configs for their agents" ON agent_whatsapp_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_whatsapp_configs.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert WhatsApp configs for their agents" ON agent_whatsapp_configs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_whatsapp_configs.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update WhatsApp configs for their agents" ON agent_whatsapp_configs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_whatsapp_configs.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete WhatsApp configs for their agents" ON agent_whatsapp_configs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = agent_whatsapp_configs.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

-- RLS Policies for whatsapp_messages
CREATE POLICY "Users can view messages for their agents" ON whatsapp_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = whatsapp_messages.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for their agents" ON whatsapp_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = whatsapp_messages.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

-- RLS Policies for user_encryption_keys
CREATE POLICY "Users can view their own encryption keys" ON user_encryption_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own encryption keys" ON user_encryption_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption keys" ON user_encryption_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own encryption keys" ON user_encryption_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_credentials_updated_at BEFORE UPDATE ON whatsapp_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_webhooks_updated_at BEFORE UPDATE ON whatsapp_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_whatsapp_configs_updated_at BEFORE UPDATE ON agent_whatsapp_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_encryption_keys_updated_at BEFORE UPDATE ON user_encryption_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- WhatsApp Workflow Integration Tables
-- Enables WhatsApp messaging to trigger and interact with visual workflows

-- WhatsApp workflow configurations
CREATE TABLE IF NOT EXISTS whatsapp_workflow_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id UUID NOT NULL REFERENCES user_whatsapp_credentials(id) ON DELETE CASCADE,
    deployment_id UUID REFERENCES agent_deployments(id) ON DELETE SET NULL,
    
    -- Configuration data
    config_data JSONB NOT NULL DEFAULT '{}',
    
    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    UNIQUE(workflow_id, user_id, credential_id)
);

-- WhatsApp conversations with workflow context
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id UUID NOT NULL REFERENCES user_whatsapp_credentials(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
    
    -- Conversation context and state
    context_data JSONB NOT NULL DEFAULT '{}',
    state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'waiting', 'completed', 'error')),
    message_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_whatsapp_conversations_phone_user (phone_number, user_id),
    INDEX idx_whatsapp_conversations_workflow (workflow_id),
    INDEX idx_whatsapp_conversations_state (state),
    INDEX idx_whatsapp_conversations_last_message (last_message_at)
);

-- WhatsApp message history (for analytics and debugging)
CREATE TABLE IF NOT EXISTS whatsapp_message_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL, -- WhatsApp message ID
    
    -- Message details
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT NOT NULL,
    message_data JSONB NOT NULL DEFAULT '{}',
    
    -- Workflow execution reference
    execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    
    -- Status and timing
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_whatsapp_messages_conversation (conversation_id),
    INDEX idx_whatsapp_messages_execution (execution_id),
    INDEX idx_whatsapp_messages_sent_at (sent_at),
    UNIQUE(message_id, conversation_id)
);

-- WhatsApp workflow triggers (for advanced trigger conditions)
CREATE TABLE IF NOT EXISTS whatsapp_workflow_triggers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_id UUID NOT NULL REFERENCES whatsapp_workflow_configs(id) ON DELETE CASCADE,
    
    -- Trigger conditions
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('message', 'keyword', 'schedule', 'event')),
    trigger_data JSONB NOT NULL DEFAULT '{}',
    
    -- Execution settings
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_whatsapp_triggers_config (config_id),
    INDEX idx_whatsapp_triggers_type (trigger_type),
    INDEX idx_whatsapp_triggers_active (is_active)
);

-- WhatsApp workflow analytics
CREATE TABLE IF NOT EXISTS whatsapp_workflow_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
    credential_id UUID NOT NULL REFERENCES user_whatsapp_credentials(id) ON DELETE CASCADE,
    
    -- Analytics data
    date DATE NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_whatsapp_analytics_user_date (user_id, date),
    INDEX idx_whatsapp_analytics_workflow_date (workflow_id, date),
    UNIQUE(user_id, workflow_id, credential_id, date)
);

-- Row Level Security (RLS) Policies

-- WhatsApp workflow configs
ALTER TABLE whatsapp_workflow_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own WhatsApp workflow configs"
    ON whatsapp_workflow_configs
    FOR ALL
    USING (auth.uid() = user_id);

-- WhatsApp conversations
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own WhatsApp conversations"
    ON whatsapp_conversations
    FOR ALL
    USING (auth.uid() = user_id);

-- WhatsApp message history
ALTER TABLE whatsapp_message_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own WhatsApp message history"
    ON whatsapp_message_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM whatsapp_conversations 
            WHERE whatsapp_conversations.id = whatsapp_message_history.conversation_id 
            AND whatsapp_conversations.user_id = auth.uid()
        )
    );

-- WhatsApp workflow triggers
ALTER TABLE whatsapp_workflow_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own WhatsApp workflow triggers"
    ON whatsapp_workflow_triggers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM whatsapp_workflow_configs 
            WHERE whatsapp_workflow_configs.id = whatsapp_workflow_triggers.config_id 
            AND whatsapp_workflow_configs.user_id = auth.uid()
        )
    );

-- WhatsApp workflow analytics
ALTER TABLE whatsapp_workflow_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own WhatsApp workflow analytics"
    ON whatsapp_workflow_analytics
    FOR ALL
    USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_whatsapp_workflow_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_workflow_configs_updated_at
    BEFORE UPDATE ON whatsapp_workflow_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_workflow_configs_updated_at();

CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_conversations_updated_at
    BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_conversations_updated_at();

CREATE OR REPLACE FUNCTION update_whatsapp_workflow_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_workflow_triggers_updated_at
    BEFORE UPDATE ON whatsapp_workflow_triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_workflow_triggers_updated_at();

CREATE OR REPLACE FUNCTION update_whatsapp_workflow_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_workflow_analytics_updated_at
    BEFORE UPDATE ON whatsapp_workflow_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_workflow_analytics_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_workflow_configs_user_active ON whatsapp_workflow_configs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_workflow_configs_workflow ON whatsapp_workflow_configs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_workflow_configs_credential ON whatsapp_workflow_configs(credential_id);

-- Comments for documentation
COMMENT ON TABLE whatsapp_workflow_configs IS 'Configuration for WhatsApp workflow integrations';
COMMENT ON TABLE whatsapp_conversations IS 'Active WhatsApp conversations with workflow context';
COMMENT ON TABLE whatsapp_message_history IS 'Historical record of WhatsApp messages for analytics';
COMMENT ON TABLE whatsapp_workflow_triggers IS 'Advanced trigger conditions for WhatsApp workflows';
COMMENT ON TABLE whatsapp_workflow_analytics IS 'Analytics data for WhatsApp workflow performance';
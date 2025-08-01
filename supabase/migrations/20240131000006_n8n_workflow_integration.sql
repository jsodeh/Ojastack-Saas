-- N8N Workflow Integration Tables
-- Enables visual agent workflows to trigger and interact with N8N automation workflows

-- N8N workflow mappings (connects visual workflows to N8N workflows)
CREATE TABLE IF NOT EXISTS n8n_workflow_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    visual_workflow_id UUID NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
    n8n_workflow_id TEXT NOT NULL, -- N8N workflow ID (external)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Mapping configuration
    mapping_config JSONB NOT NULL DEFAULT '{}',
    
    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_n8n_mappings_visual_workflow (visual_workflow_id),
    INDEX idx_n8n_mappings_n8n_workflow (n8n_workflow_id),
    INDEX idx_n8n_mappings_user (user_id),
    INDEX idx_n8n_mappings_active (is_active),
    UNIQUE(visual_workflow_id, n8n_workflow_id, user_id)
);

-- N8N execution records (tracks N8N workflow executions triggered by visual workflows)
CREATE TABLE IF NOT EXISTS n8n_execution_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mapping_id UUID NOT NULL REFERENCES n8n_workflow_mappings(id) ON DELETE CASCADE,
    visual_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    n8n_execution_id TEXT NOT NULL, -- N8N execution ID (external)
    
    -- Execution details
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Data
    input_data JSONB NOT NULL DEFAULT '{}',
    output_data JSONB,
    error_message TEXT,
    
    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Indexes
    INDEX idx_n8n_executions_mapping (mapping_id),
    INDEX idx_n8n_executions_visual (visual_execution_id),
    INDEX idx_n8n_executions_n8n (n8n_execution_id),
    INDEX idx_n8n_executions_status (status),
    INDEX idx_n8n_executions_started (started_at)
);

-- N8N workflow templates (cached N8N template information)
CREATE TABLE IF NOT EXISTS n8n_workflow_templates (
    id TEXT PRIMARY KEY, -- Template ID from N8N service
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    
    -- Template configuration
    template_data JSONB NOT NULL DEFAULT '{}',
    variables JSONB NOT NULL DEFAULT '[]',
    integrations TEXT[] DEFAULT '{}',
    
    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_n8n_templates_category (category),
    INDEX idx_n8n_templates_active (is_active),
    INDEX idx_n8n_templates_tags USING GIN (tags)
);

-- N8N integration settings (per-user N8N configuration)
CREATE TABLE IF NOT EXISTS n8n_integration_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- N8N connection settings
    n8n_api_url TEXT,
    n8n_api_key_encrypted TEXT, -- Encrypted API key
    n8n_webhook_url TEXT,
    
    -- Integration preferences
    default_execution_mode TEXT NOT NULL DEFAULT 'async' CHECK (default_execution_mode IN ('sync', 'async', 'webhook')),
    default_timeout INTEGER NOT NULL DEFAULT 300000, -- 5 minutes
    auto_retry_count INTEGER NOT NULL DEFAULT 1,
    
    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- N8N webhook endpoints (tracks webhook URLs for N8N workflows)
CREATE TABLE IF NOT EXISTS n8n_webhook_endpoints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mapping_id UUID NOT NULL REFERENCES n8n_workflow_mappings(id) ON DELETE CASCADE,
    webhook_path TEXT NOT NULL,
    webhook_method TEXT NOT NULL DEFAULT 'POST' CHECK (webhook_method IN ('GET', 'POST', 'PUT', 'DELETE')),
    
    -- Webhook configuration
    webhook_config JSONB NOT NULL DEFAULT '{}',
    
    -- Status and metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_n8n_webhooks_mapping (mapping_id),
    INDEX idx_n8n_webhooks_path (webhook_path),
    INDEX idx_n8n_webhooks_active (is_active),
    UNIQUE(webhook_path, webhook_method)
);

-- N8N integration analytics (aggregated statistics)
CREATE TABLE IF NOT EXISTS n8n_integration_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Execution metrics
    total_executions INTEGER NOT NULL DEFAULT 0,
    successful_executions INTEGER NOT NULL DEFAULT 0,
    failed_executions INTEGER NOT NULL DEFAULT 0,
    average_execution_time_ms INTEGER NOT NULL DEFAULT 0,
    
    -- Workflow metrics
    active_mappings INTEGER NOT NULL DEFAULT 0,
    unique_n8n_workflows INTEGER NOT NULL DEFAULT 0,
    
    -- Additional metrics
    metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_n8n_analytics_user_date (user_id, date),
    UNIQUE(user_id, date)
);

-- Row Level Security (RLS) Policies

-- N8N workflow mappings
ALTER TABLE n8n_workflow_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own N8N workflow mappings"
    ON n8n_workflow_mappings
    FOR ALL
    USING (auth.uid() = user_id);

-- N8N execution records
ALTER TABLE n8n_execution_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own N8N execution records"
    ON n8n_execution_records
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM n8n_workflow_mappings 
            WHERE n8n_workflow_mappings.id = n8n_execution_records.mapping_id 
            AND n8n_workflow_mappings.user_id = auth.uid()
        )
    );

-- N8N workflow templates (public read, admin write)
ALTER TABLE n8n_workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read N8N workflow templates"
    ON n8n_workflow_templates
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Only admins can manage N8N workflow templates"
    ON n8n_workflow_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

-- N8N integration settings
ALTER TABLE n8n_integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own N8N integration settings"
    ON n8n_integration_settings
    FOR ALL
    USING (auth.uid() = user_id);

-- N8N webhook endpoints
ALTER TABLE n8n_webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own N8N webhook endpoints"
    ON n8n_webhook_endpoints
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM n8n_workflow_mappings 
            WHERE n8n_workflow_mappings.id = n8n_webhook_endpoints.mapping_id 
            AND n8n_workflow_mappings.user_id = auth.uid()
        )
    );

-- N8N integration analytics
ALTER TABLE n8n_integration_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own N8N integration analytics"
    ON n8n_integration_analytics
    FOR ALL
    USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_n8n_workflow_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_n8n_workflow_mappings_updated_at
    BEFORE UPDATE ON n8n_workflow_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_n8n_workflow_mappings_updated_at();

CREATE OR REPLACE FUNCTION update_n8n_workflow_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_n8n_workflow_templates_updated_at
    BEFORE UPDATE ON n8n_workflow_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_n8n_workflow_templates_updated_at();

CREATE OR REPLACE FUNCTION update_n8n_integration_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_n8n_integration_settings_updated_at
    BEFORE UPDATE ON n8n_integration_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_n8n_integration_settings_updated_at();

CREATE OR REPLACE FUNCTION update_n8n_webhook_endpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_n8n_webhook_endpoints_updated_at
    BEFORE UPDATE ON n8n_webhook_endpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_n8n_webhook_endpoints_updated_at();

CREATE OR REPLACE FUNCTION update_n8n_integration_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_n8n_integration_analytics_updated_at
    BEFORE UPDATE ON n8n_integration_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_n8n_integration_analytics_updated_at();

-- Function to increment webhook trigger count
CREATE OR REPLACE FUNCTION increment_webhook_trigger_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.trigger_count = OLD.trigger_count + 1;
    NEW.last_triggered_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_n8n_mappings_user_active ON n8n_workflow_mappings(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_mapping_status ON n8n_execution_records(mapping_id, status);
CREATE INDEX IF NOT EXISTS idx_n8n_executions_completed_at ON n8n_execution_records(completed_at) WHERE completed_at IS NOT NULL;

-- Comments for documentation
COMMENT ON TABLE n8n_workflow_mappings IS 'Maps visual agent workflows to N8N automation workflows';
COMMENT ON TABLE n8n_execution_records IS 'Records of N8N workflow executions triggered by visual workflows';
COMMENT ON TABLE n8n_workflow_templates IS 'Cached N8N workflow templates for easy access';
COMMENT ON TABLE n8n_integration_settings IS 'Per-user N8N integration configuration and credentials';
COMMENT ON TABLE n8n_webhook_endpoints IS 'Webhook endpoints for N8N workflow triggers';
COMMENT ON TABLE n8n_integration_analytics IS 'Aggregated analytics for N8N integration performance';
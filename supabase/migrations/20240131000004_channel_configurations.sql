-- Migration: Add channel configuration tables
-- Created: 2024-01-31

-- Channel Configurations table
CREATE TABLE IF NOT EXISTS channel_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('whatsapp', 'slack', 'webchat', 'api', 'webhook')),
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    configuration JSONB NOT NULL DEFAULT '{}',
    authentication JSONB DEFAULT '{}',
    test_results JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channel Messages table
CREATE TABLE IF NOT EXISTS channel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channel_configs(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content JSONB NOT NULL,
    sender JSONB NOT NULL,
    recipient JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook Events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channel_configs(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channel Analytics table
CREATE TABLE IF NOT EXISTS channel_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channel_configs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    messages_sent INTEGER NOT NULL DEFAULT 0,
    messages_received INTEGER NOT NULL DEFAULT 0,
    messages_failed INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    avg_response_time INTEGER, -- milliseconds
    uptime_percentage DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, date)
);

-- Channel Sessions table (for webchat and other session-based channels)
CREATE TABLE IF NOT EXISTS channel_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channel_configs(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    user_id TEXT,
    user_info JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(channel_id, session_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_channel_configs_user_id ON channel_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_configs_type ON channel_configs(type);
CREATE INDEX IF NOT EXISTS idx_channel_configs_enabled ON channel_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_channel_configs_created_at ON channel_configs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_timestamp ON channel_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_channel_messages_direction ON channel_messages(direction);
CREATE INDEX IF NOT EXISTS idx_channel_messages_status ON channel_messages(status);

CREATE INDEX IF NOT EXISTS idx_webhook_events_channel_id ON webhook_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_timestamp ON webhook_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_channel_analytics_channel_id ON channel_analytics(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_analytics_date ON channel_analytics(date DESC);

CREATE INDEX IF NOT EXISTS idx_channel_sessions_channel_id ON channel_sessions(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_sessions_session_id ON channel_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_channel_sessions_last_activity ON channel_sessions(last_activity DESC);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_channel_configs_updated_at 
    BEFORE UPDATE ON channel_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for channel_configs
CREATE POLICY "Users can view their own channel configs" ON channel_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own channel configs" ON channel_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channel configs" ON channel_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channel configs" ON channel_configs
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for channel_messages
CREATE POLICY "Users can view messages for their channels" ON channel_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = channel_messages.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages for their channels" ON channel_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = channel_messages.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

-- Policies for webhook_events
CREATE POLICY "Users can view webhook events for their channels" ON webhook_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = webhook_events.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create webhook events for their channels" ON webhook_events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = webhook_events.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update webhook events for their channels" ON webhook_events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = webhook_events.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

-- Policies for channel_analytics
CREATE POLICY "Users can view analytics for their channels" ON channel_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = channel_analytics.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create analytics for their channels" ON channel_analytics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = channel_analytics.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

-- Policies for channel_sessions
CREATE POLICY "Users can view sessions for their channels" ON channel_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = channel_sessions.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create sessions for their channels" ON channel_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = channel_sessions.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update sessions for their channels" ON channel_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM channel_configs 
            WHERE channel_configs.id = channel_sessions.channel_id 
            AND channel_configs.user_id = auth.uid()
        )
    );

-- Views for easier querying
CREATE OR REPLACE VIEW channel_summary AS
SELECT 
    cc.id,
    cc.user_id,
    cc.type,
    cc.name,
    cc.enabled,
    cc.created_at,
    cc.updated_at,
    COALESCE(msg_stats.total_messages, 0) as total_messages,
    COALESCE(msg_stats.messages_today, 0) as messages_today,
    COALESCE(msg_stats.failed_messages, 0) as failed_messages,
    CASE 
        WHEN cc.test_results IS NOT NULL THEN (cc.test_results->>'status')
        ELSE 'untested' 
    END as test_status,
    CASE 
        WHEN cc.test_results IS NOT NULL THEN (cc.test_results->>'timestamp')::timestamptz
        ELSE NULL 
    END as last_tested
FROM channel_configs cc
LEFT JOIN (
    SELECT 
        channel_id,
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE DATE(timestamp) = CURRENT_DATE) as messages_today,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_messages
    FROM channel_messages
    GROUP BY channel_id
) msg_stats ON cc.id = msg_stats.channel_id;

CREATE OR REPLACE VIEW channel_activity AS
SELECT 
    cc.id as channel_id,
    cc.name as channel_name,
    cc.type as channel_type,
    DATE(cm.timestamp) as activity_date,
    COUNT(*) as message_count,
    COUNT(*) FILTER (WHERE cm.direction = 'inbound') as inbound_messages,
    COUNT(*) FILTER (WHERE cm.direction = 'outbound') as outbound_messages,
    COUNT(*) FILTER (WHERE cm.status = 'failed') as failed_messages,
    COUNT(DISTINCT (cm.sender->>'id')) as unique_senders
FROM channel_configs cc
LEFT JOIN channel_messages cm ON cc.id = cm.channel_id
WHERE cm.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY cc.id, cc.name, cc.type, DATE(cm.timestamp)
ORDER BY activity_date DESC;

-- Functions for analytics
CREATE OR REPLACE FUNCTION update_channel_analytics()
RETURNS void AS $$
BEGIN
    INSERT INTO channel_analytics (channel_id, date, messages_sent, messages_received, messages_failed, unique_users)
    SELECT 
        cm.channel_id,
        CURRENT_DATE - INTERVAL '1 day',
        COUNT(*) FILTER (WHERE cm.direction = 'outbound' AND cm.status != 'failed'),
        COUNT(*) FILTER (WHERE cm.direction = 'inbound'),
        COUNT(*) FILTER (WHERE cm.status = 'failed'),
        COUNT(DISTINCT (cm.sender->>'id'))
    FROM channel_messages cm
    WHERE DATE(cm.timestamp) = CURRENT_DATE - INTERVAL '1 day'
    GROUP BY cm.channel_id
    ON CONFLICT (channel_id, date) DO UPDATE SET
        messages_sent = EXCLUDED.messages_sent,
        messages_received = EXCLUDED.messages_received,
        messages_failed = EXCLUDED.messages_failed,
        unique_users = EXCLUDED.unique_users;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON channel_sessions TO authenticated;

GRANT SELECT ON channel_summary TO authenticated;
GRANT SELECT ON channel_activity TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
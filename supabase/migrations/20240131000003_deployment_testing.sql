-- Migration: Add deployment and testing system tables
-- Created: 2024-01-31

-- Agent Deployments table
CREATE TABLE IF NOT EXISTS agent_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL,
    workflow_id UUID,
    persona_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    deployment_config JSONB NOT NULL DEFAULT '{}',
    channel_configs JSONB NOT NULL DEFAULT '[]',
    integration_configs JSONB NOT NULL DEFAULT '[]',
    endpoints JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deploying', 'active', 'updating', 'paused', 'error', 'terminated')),
    health_status TEXT NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'warning', 'error', 'unknown')),
    metrics JSONB NOT NULL DEFAULT '{}',
    error_details JSONB,
    deployed_at TIMESTAMPTZ,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Test Suites table
CREATE TABLE IF NOT EXISTS test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_type TEXT NOT NULL CHECK (target_type IN ('agent', 'workflow', 'deployment', 'persona')),
    target_id UUID NOT NULL,
    test_cases JSONB NOT NULL DEFAULT '[]',
    configuration JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'running', 'completed', 'failed', 'cancelled')),
    results JSONB,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Test Results table
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'error', 'skipped')),
    summary JSONB NOT NULL DEFAULT '{}',
    case_results JSONB NOT NULL DEFAULT '[]',
    metrics JSONB NOT NULL DEFAULT '{}',
    artifacts JSONB NOT NULL DEFAULT '[]',
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployment Metrics table (for historical data)
CREATE TABLE IF NOT EXISTS deployment_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uptime DECIMAL(5,2) NOT NULL DEFAULT 0,
    response_time INTEGER NOT NULL DEFAULT 0,
    request_count INTEGER NOT NULL DEFAULT 0,
    error_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
    cpu_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
    memory_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
    active_connections INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployment Logs table
CREATE TABLE IF NOT EXISTS deployment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id UUID NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Test Execution Logs table
CREATE TABLE IF NOT EXISTS test_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    result_id UUID REFERENCES test_results(id) ON DELETE CASCADE,
    test_case_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_deployments_user_id ON agent_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_status ON agent_deployments(status);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_agent_id ON agent_deployments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_created_at ON agent_deployments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_suites_user_id ON test_suites(user_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_target ON test_suites(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_status ON test_suites(status);
CREATE INDEX IF NOT EXISTS idx_test_suites_created_at ON test_suites(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_results_suite_id ON test_results(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_test_results_started_at ON test_results(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_deployment_metrics_deployment_id ON deployment_metrics(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_metrics_timestamp ON deployment_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_timestamp ON deployment_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_logs_level ON deployment_logs(level);

CREATE INDEX IF NOT EXISTS idx_test_execution_logs_suite_id ON test_execution_logs(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_execution_logs_result_id ON test_execution_logs(result_id);
CREATE INDEX IF NOT EXISTS idx_test_execution_logs_timestamp ON test_execution_logs(timestamp DESC);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_agent_deployments_updated_at 
    BEFORE UPDATE ON agent_deployments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_suites_updated_at 
    BEFORE UPDATE ON test_suites 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE agent_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_logs ENABLE ROW LEVEL SECURITY;

-- Policies for agent_deployments (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own deployments" ON agent_deployments;
CREATE POLICY "Users can view their own deployments" ON agent_deployments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own deployments" ON agent_deployments;
CREATE POLICY "Users can create their own deployments" ON agent_deployments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own deployments" ON agent_deployments;
CREATE POLICY "Users can update their own deployments" ON agent_deployments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own deployments" ON agent_deployments;
CREATE POLICY "Users can delete their own deployments" ON agent_deployments
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for test_suites
CREATE POLICY "Users can view their own test suites" ON test_suites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test suites" ON test_suites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test suites" ON test_suites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test suites" ON test_suites
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for test_results
CREATE POLICY "Users can view test results for their test suites" ON test_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM test_suites 
            WHERE test_suites.id = test_results.suite_id 
            AND test_suites.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create test results for their test suites" ON test_results
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM test_suites 
            WHERE test_suites.id = test_results.suite_id 
            AND test_suites.user_id = auth.uid()
        )
    );

-- Policies for deployment_metrics
CREATE POLICY "Users can view metrics for their deployments" ON deployment_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agent_deployments 
            WHERE agent_deployments.id = deployment_metrics.deployment_id 
            AND agent_deployments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create metrics for their deployments" ON deployment_metrics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agent_deployments 
            WHERE agent_deployments.id = deployment_metrics.deployment_id 
            AND agent_deployments.user_id = auth.uid()
        )
    );

-- Policies for deployment_logs
CREATE POLICY "Users can view logs for their deployments" ON deployment_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agent_deployments 
            WHERE agent_deployments.id = deployment_logs.deployment_id 
            AND agent_deployments.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create logs for their deployments" ON deployment_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agent_deployments 
            WHERE agent_deployments.id = deployment_logs.deployment_id 
            AND agent_deployments.user_id = auth.uid()
        )
    );

-- Policies for test_execution_logs
CREATE POLICY "Users can view test execution logs for their test suites" ON test_execution_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM test_suites 
            WHERE test_suites.id = test_execution_logs.suite_id 
            AND test_suites.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create test execution logs for their test suites" ON test_execution_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM test_suites 
            WHERE test_suites.id = test_execution_logs.suite_id 
            AND test_suites.user_id = auth.uid()
        )
    );

-- Views for easier querying
CREATE OR REPLACE VIEW deployment_summary AS
SELECT 
    d.id,
    d.user_id,
    d.agent_id,
    d.workflow_id,
    d.persona_id,
    d.status,
    d.created_at,
    d.deployed_at,
    d.last_active,
    (d.metrics->>'uptime')::decimal as uptime,
    (d.metrics->>'responseTime')::integer as response_time,
    (d.metrics->>'requestCount')::integer as request_count,
    (d.metrics->>'errorRate')::decimal as error_rate
FROM agent_deployments d;

CREATE OR REPLACE VIEW test_suite_summary AS
SELECT 
    ts.id,
    ts.user_id,
    ts.name,
    ts.target_type,
    ts.target_id,
    ts.status,
    ts.created_at,
    ts.updated_at,
    ts.last_run_at,
    COALESCE(jsonb_array_length(ts.test_cases), 0) as test_case_count,
    CASE 
        WHEN ts.results IS NOT NULL THEN (ts.results->'summary'->>'passRate')::decimal
        ELSE NULL 
    END as pass_rate,
    CASE 
        WHEN ts.results IS NOT NULL THEN (ts.results->'summary'->>'total')::integer
        ELSE 0 
    END as total_tests,
    CASE 
        WHEN ts.results IS NOT NULL THEN (ts.results->'summary'->>'passed')::integer
        ELSE 0 
    END as passed_tests,
    CASE 
        WHEN ts.results IS NOT NULL THEN (ts.results->'summary'->>'failed')::integer
        ELSE 0 
    END as failed_tests
FROM test_suites ts;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_deployments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON test_suites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON test_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON deployment_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON deployment_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON test_execution_logs TO authenticated;

GRANT SELECT ON deployment_summary TO authenticated;
GRANT SELECT ON test_suite_summary TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
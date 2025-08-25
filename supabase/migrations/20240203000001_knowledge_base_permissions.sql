-- Create knowledge_base_permissions table for sharing and access control
CREATE TABLE IF NOT EXISTS knowledge_base_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT CHECK (permission IN ('read', 'write', 'admin')) NOT NULL DEFAULT 'read',
  granted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  UNIQUE(knowledge_base_id, user_id)
);

-- Create agent_knowledge_base_sessions table for tracking agent creation sessions
CREATE TABLE IF NOT EXISTS agent_knowledge_base_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  selected_knowledge_bases TEXT[] DEFAULT '{}',
  uploaded_documents JSONB DEFAULT '[]',
  validation_result JSONB DEFAULT '{}',
  requirements JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_knowledge_base_permissions_kb_id ON knowledge_base_permissions(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_permissions_user_id ON knowledge_base_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_permissions_granted_by ON knowledge_base_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_permissions_permission ON knowledge_base_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_permissions_expires_at ON knowledge_base_permissions(expires_at);

CREATE INDEX IF NOT EXISTS idx_agent_kb_sessions_user_id ON agent_knowledge_base_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_kb_sessions_status ON agent_knowledge_base_sessions(status);
CREATE INDEX IF NOT EXISTS idx_agent_kb_sessions_expires_at ON agent_knowledge_base_sessions(expires_at);

-- Enable RLS
ALTER TABLE knowledge_base_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_base_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_base_permissions
CREATE POLICY "Users can view permissions for their knowledge bases" ON knowledge_base_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases 
      WHERE knowledge_bases.id = knowledge_base_permissions.knowledge_base_id 
      AND knowledge_bases.user_id = auth.uid()
    )
    OR knowledge_base_permissions.user_id = auth.uid()
  );

CREATE POLICY "Knowledge base owners can grant permissions" ON knowledge_base_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM knowledge_bases 
      WHERE knowledge_bases.id = knowledge_base_permissions.knowledge_base_id 
      AND knowledge_bases.user_id = auth.uid()
    )
    AND knowledge_base_permissions.granted_by = auth.uid()
  );

CREATE POLICY "Knowledge base owners can update permissions" ON knowledge_base_permissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases 
      WHERE knowledge_bases.id = knowledge_base_permissions.knowledge_base_id 
      AND knowledge_bases.user_id = auth.uid()
    )
  );

CREATE POLICY "Knowledge base owners and grantees can delete permissions" ON knowledge_base_permissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases 
      WHERE knowledge_bases.id = knowledge_base_permissions.knowledge_base_id 
      AND knowledge_bases.user_id = auth.uid()
    )
    OR knowledge_base_permissions.user_id = auth.uid()
  );

-- RLS policies for agent_knowledge_base_sessions
CREATE POLICY "Users can manage their own agent KB sessions" ON agent_knowledge_base_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_knowledge_base_permissions_updated_at 
  BEFORE UPDATE ON knowledge_base_permissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_kb_sessions_updated_at 
  BEFORE UPDATE ON agent_knowledge_base_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions and permissions
CREATE OR REPLACE FUNCTION cleanup_expired_kb_data()
RETURNS void AS $
BEGIN
  -- Clean up expired agent KB sessions
  DELETE FROM agent_knowledge_base_sessions 
  WHERE expires_at < NOW();
  
  -- Clean up expired permissions
  DELETE FROM knowledge_base_permissions 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$ language 'plpgsql';

-- Function to check if user has permission to access knowledge base
CREATE OR REPLACE FUNCTION user_has_kb_permission(
  kb_id TEXT,
  user_id_param UUID,
  required_permission TEXT DEFAULT 'read'
)
RETURNS BOOLEAN AS $
BEGIN
  -- Check if user owns the knowledge base
  IF EXISTS (
    SELECT 1 FROM knowledge_bases 
    WHERE id = kb_id AND user_id = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has explicit permission
  IF EXISTS (
    SELECT 1 FROM knowledge_base_permissions 
    WHERE knowledge_base_id = kb_id 
    AND user_id = user_id_param
    AND (
      permission = 'admin' OR
      (required_permission = 'read' AND permission IN ('read', 'write', 'admin')) OR
      (required_permission = 'write' AND permission IN ('write', 'admin'))
    )
    AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$ language 'plpgsql';

-- Function to get user's accessible knowledge bases
CREATE OR REPLACE FUNCTION get_accessible_knowledge_bases(user_id_param UUID)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  status TEXT,
  documents_count INTEGER,
  total_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  permission TEXT,
  is_owner BOOLEAN
) AS $
BEGIN
  RETURN QUERY
  -- Owned knowledge bases
  SELECT 
    kb.id,
    kb.name,
    kb.description,
    kb.status,
    kb.documents_count,
    kb.total_size_bytes,
    kb.created_at,
    kb.updated_at,
    kb.user_id,
    'admin'::TEXT as permission,
    TRUE as is_owner
  FROM knowledge_bases kb
  WHERE kb.user_id = user_id_param
  
  UNION ALL
  
  -- Shared knowledge bases
  SELECT 
    kb.id,
    kb.name,
    kb.description,
    kb.status,
    kb.documents_count,
    kb.total_size_bytes,
    kb.created_at,
    kb.updated_at,
    kb.user_id,
    kbp.permission,
    FALSE as is_owner
  FROM knowledge_bases kb
  JOIN knowledge_base_permissions kbp ON kb.id = kbp.knowledge_base_id
  WHERE kbp.user_id = user_id_param
  AND (kbp.expires_at IS NULL OR kbp.expires_at > NOW())
  
  ORDER BY updated_at DESC;
END;
$ language 'plpgsql';

-- Function to validate agent knowledge base configuration
CREATE OR REPLACE FUNCTION validate_agent_kb_config(
  user_id_param UUID,
  selected_kbs TEXT[],
  min_docs INTEGER DEFAULT 1,
  max_docs INTEGER DEFAULT NULL,
  max_size_bytes BIGINT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  total_documents INTEGER,
  total_size_bytes BIGINT,
  accessible_kbs INTEGER,
  error_message TEXT
) AS $
DECLARE
  total_docs INTEGER := 0;
  total_size BIGINT := 0;
  accessible_count INTEGER := 0;
  kb_id TEXT;
BEGIN
  -- Check each knowledge base
  FOREACH kb_id IN ARRAY selected_kbs
  LOOP
    -- Check if user has access
    IF user_has_kb_permission(kb_id, user_id_param, 'read') THEN
      accessible_count := accessible_count + 1;
      
      -- Add to totals
      SELECT 
        COALESCE(documents_count, 0),
        COALESCE(total_size_bytes, 0)
      INTO total_docs, total_size
      FROM knowledge_bases 
      WHERE id = kb_id;
      
    END IF;
  END LOOP;
  
  -- Validate requirements
  IF accessible_count < array_length(selected_kbs, 1) THEN
    RETURN QUERY SELECT 
      FALSE,
      total_docs,
      total_size,
      accessible_count,
      'Access denied to one or more knowledge bases'::TEXT;
    RETURN;
  END IF;
  
  IF total_docs < min_docs THEN
    RETURN QUERY SELECT 
      FALSE,
      total_docs,
      total_size,
      accessible_count,
      format('Minimum %s documents required, found %s', min_docs, total_docs)::TEXT;
    RETURN;
  END IF;
  
  IF max_docs IS NOT NULL AND total_docs > max_docs THEN
    RETURN QUERY SELECT 
      FALSE,
      total_docs,
      total_size,
      accessible_count,
      format('Maximum %s documents allowed, found %s', max_docs, total_docs)::TEXT;
    RETURN;
  END IF;
  
  IF max_size_bytes IS NOT NULL AND total_size > max_size_bytes THEN
    RETURN QUERY SELECT 
      FALSE,
      total_docs,
      total_size,
      accessible_count,
      format('Maximum size exceeded: %s bytes', max_size_bytes)::TEXT;
    RETURN;
  END IF;
  
  -- All validations passed
  RETURN QUERY SELECT 
    TRUE,
    total_docs,
    total_size,
    accessible_count,
    'Configuration is valid'::TEXT;
END;
$ language 'plpgsql';

-- Function to get knowledge base processing status
CREATE OR REPLACE FUNCTION get_kb_processing_status(kb_ids TEXT[])
RETURNS TABLE (
  knowledge_base_id TEXT,
  total_documents INTEGER,
  processing_documents INTEGER,
  completed_documents INTEGER,
  failed_documents INTEGER,
  processing_percentage INTEGER
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    d.knowledge_base_id,
    COUNT(*)::INTEGER as total_documents,
    COUNT(CASE WHEN ps.status IN ('pending', 'extracting', 'chunking', 'embedding', 'indexing') THEN 1 END)::INTEGER as processing_documents,
    COUNT(CASE WHEN ps.status = 'completed' THEN 1 END)::INTEGER as completed_documents,
    COUNT(CASE WHEN ps.status = 'error' THEN 1 END)::INTEGER as failed_documents,
    CASE 
      WHEN COUNT(*) = 0 THEN 100
      ELSE ROUND((COUNT(CASE WHEN ps.status IN ('completed', 'error') THEN 1 END)::FLOAT / COUNT(*)::FLOAT) * 100)::INTEGER
    END as processing_percentage
  FROM documents d
  LEFT JOIN processing_status ps ON d.id = ps.document_id
  WHERE d.knowledge_base_id = ANY(kb_ids)
  GROUP BY d.knowledge_base_id;
END;
$ language 'plpgsql';

-- Create a view for agent-accessible knowledge bases
CREATE OR REPLACE VIEW agent_accessible_knowledge_bases AS
SELECT 
  kb.id,
  kb.name,
  kb.description,
  kb.status,
  kb.documents_count,
  kb.total_size_bytes,
  kb.created_at,
  kb.updated_at,
  kb.user_id as owner_id,
  CASE 
    WHEN kb.user_id = auth.uid() THEN 'admin'
    ELSE COALESCE(kbp.permission, 'none')
  END as user_permission,
  CASE 
    WHEN kb.user_id = auth.uid() THEN TRUE
    ELSE FALSE
  END as is_owner,
  CASE 
    WHEN kbp.granted_by IS NOT NULL THEN kbp.granted_by
    ELSE NULL
  END as shared_by,
  CASE 
    WHEN kbp.granted_at IS NOT NULL THEN kbp.granted_at
    ELSE NULL
  END as shared_at
FROM knowledge_bases kb
LEFT JOIN knowledge_base_permissions kbp ON (
  kb.id = kbp.knowledge_base_id 
  AND kbp.user_id = auth.uid()
  AND (kbp.expires_at IS NULL OR kbp.expires_at > NOW())
)
WHERE kb.user_id = auth.uid() 
   OR kbp.user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON agent_accessible_knowledge_bases TO authenticated;
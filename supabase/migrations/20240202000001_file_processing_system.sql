-- Create document_chunks table for storing processed content chunks
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL,
  tokens INTEGER NOT NULL,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Create document_metadata table for storing file metadata
CREATE TABLE IF NOT EXISTS document_metadata (
  document_id TEXT PRIMARY KEY,
  metadata JSONB DEFAULT '{}',
  images JSONB DEFAULT '[]',
  tables JSONB DEFAULT '[]',
  processing_stats JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Create processing_status table for tracking real-time processing status
CREATE TABLE IF NOT EXISTS processing_status (
  document_id TEXT PRIMARY KEY,
  status TEXT CHECK (status IN ('pending', 'extracting', 'chunking', 'embedding', 'indexing', 'completed', 'error')) DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  total_steps INTEGER DEFAULT 5,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  processed_chunks INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Create file_processors table for tracking supported file types
CREATE TABLE IF NOT EXISTS file_processors (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  extensions TEXT[] NOT NULL,
  mime_types TEXT[] NOT NULL,
  icon TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tokens ON document_chunks(tokens);
CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at ON document_chunks(created_at);

-- Vector similarity search index (requires pgvector extension)
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_document_metadata_document_id ON document_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_document_metadata_updated_at ON document_metadata(updated_at);

CREATE INDEX IF NOT EXISTS idx_processing_status_document_id ON processing_status(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_status_status ON processing_status(status);
CREATE INDEX IF NOT EXISTS idx_processing_status_started_at ON processing_status(started_at);

CREATE INDEX IF NOT EXISTS idx_file_processors_type ON file_processors(type);
CREATE INDEX IF NOT EXISTS idx_file_processors_enabled ON file_processors(enabled);

-- Enable RLS
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_processors ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_chunks
CREATE POLICY "Users can view chunks for their documents" ON document_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for their documents" ON document_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks for their documents" ON document_chunks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks for their documents" ON document_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_chunks.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- RLS policies for document_metadata
CREATE POLICY "Users can view metadata for their documents" ON document_metadata
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_metadata.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metadata for their documents" ON document_metadata
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_metadata.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update metadata for their documents" ON document_metadata
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_metadata.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete metadata for their documents" ON document_metadata
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = document_metadata.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- RLS policies for processing_status
CREATE POLICY "Users can view processing status for their documents" ON processing_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = processing_status.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert processing status for their documents" ON processing_status
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = processing_status.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update processing status for their documents" ON processing_status
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = processing_status.document_id 
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete processing status for their documents" ON processing_status
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = processing_status.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- RLS policies for file_processors (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view file processors" ON file_processors
  FOR SELECT USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_document_chunks_updated_at 
  BEFORE UPDATE ON document_chunks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_metadata_updated_at 
  BEFORE UPDATE ON document_metadata 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_processors_updated_at 
  BEFORE UPDATE ON file_processors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old processing status records
CREATE OR REPLACE FUNCTION cleanup_old_processing_status()
RETURNS void AS $$
BEGIN
  DELETE FROM processing_status 
  WHERE started_at < NOW() - INTERVAL '30 days'
  AND status IN ('completed', 'error');
END;
$$ language 'plpgsql';

-- Function to get processing statistics
CREATE OR REPLACE FUNCTION get_processing_stats(user_id_param UUID)
RETURNS TABLE (
  total_documents INTEGER,
  processing_documents INTEGER,
  completed_documents INTEGER,
  failed_documents INTEGER,
  total_chunks INTEGER,
  avg_processing_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_documents,
    COUNT(CASE WHEN ps.status IN ('pending', 'extracting', 'chunking', 'embedding', 'indexing') THEN 1 END)::INTEGER as processing_documents,
    COUNT(CASE WHEN ps.status = 'completed' THEN 1 END)::INTEGER as completed_documents,
    COUNT(CASE WHEN ps.status = 'error' THEN 1 END)::INTEGER as failed_documents,
    COALESCE(SUM(ps.total_chunks), 0)::INTEGER as total_chunks,
    AVG(ps.completed_at - ps.started_at) as avg_processing_time
  FROM documents d
  LEFT JOIN processing_status ps ON d.id = ps.document_id
  WHERE d.user_id = user_id_param;
END;
$$ language 'plpgsql';

-- Insert default file processors
INSERT INTO file_processors (id, type, extensions, mime_types, icon, enabled) VALUES
  ('pdf', 'pdf', ARRAY['.pdf'], ARRAY['application/pdf'], '📄', true),
  ('docx', 'docx', ARRAY['.docx'], ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], '📝', true),
  ('xlsx', 'xlsx', ARRAY['.xlsx', '.xls'], ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'], '📊', true),
  ('image', 'image', ARRAY['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'], ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'], '🖼️', true),
  ('text', 'text', ARRAY['.txt', '.md', '.csv'], ARRAY['text/plain', 'text/markdown', 'text/csv'], '📄', true)
ON CONFLICT (id) DO UPDATE SET
  extensions = EXCLUDED.extensions,
  mime_types = EXCLUDED.mime_types,
  icon = EXCLUDED.icon,
  enabled = EXCLUDED.enabled,
  updated_at = NOW();

-- Function to update document processing status
CREATE OR REPLACE FUNCTION update_document_processing_status(
  doc_id TEXT,
  new_status TEXT,
  new_progress INTEGER DEFAULT NULL,
  new_step TEXT DEFAULT NULL,
  error_info JSONB DEFAULT NULL,
  chunks_processed INTEGER DEFAULT NULL,
  chunks_total INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO processing_status (
    document_id, 
    status, 
    progress, 
    current_step, 
    error_details,
    processed_chunks,
    total_chunks,
    completed_at
  ) VALUES (
    doc_id, 
    new_status, 
    COALESCE(new_progress, 0), 
    new_step, 
    error_info,
    chunks_processed,
    chunks_total,
    CASE WHEN new_status IN ('completed', 'error') THEN NOW() ELSE NULL END
  )
  ON CONFLICT (document_id) DO UPDATE SET
    status = EXCLUDED.status,
    progress = COALESCE(EXCLUDED.progress, processing_status.progress),
    current_step = COALESCE(EXCLUDED.current_step, processing_status.current_step),
    error_details = COALESCE(EXCLUDED.error_details, processing_status.error_details),
    processed_chunks = COALESCE(EXCLUDED.processed_chunks, processing_status.processed_chunks),
    total_chunks = COALESCE(EXCLUDED.total_chunks, processing_status.total_chunks),
    completed_at = EXCLUDED.completed_at;
END;
$$ language 'plpgsql';

-- Function to get document processing progress
CREATE OR REPLACE FUNCTION get_document_processing_progress(doc_id TEXT)
RETURNS TABLE (
  document_id TEXT,
  status TEXT,
  progress INTEGER,
  current_step TEXT,
  total_steps INTEGER,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  processed_chunks INTEGER,
  total_chunks INTEGER,
  estimated_completion TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.document_id,
    ps.status,
    ps.progress,
    ps.current_step,
    ps.total_steps,
    ps.error_details,
    ps.started_at,
    ps.completed_at,
    ps.processed_chunks,
    ps.total_chunks,
    ps.estimated_completion
  FROM processing_status ps
  WHERE ps.document_id = doc_id;
END;
$$ language 'plpgsql';
-- Create upload_sessions table for chunked file uploads
CREATE TABLE IF NOT EXISTS upload_sessions (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  chunk_size INTEGER NOT NULL DEFAULT 1048576, -- 1MB default
  total_chunks INTEGER NOT NULL,
  uploaded_chunks TEXT[] DEFAULT '{}',
  knowledge_base_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'error', 'cancelled')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_knowledge_base_id ON upload_sessions(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_created_at ON upload_sessions(created_at);

-- Create upload_chunks table for tracking individual chunks
CREATE TABLE IF NOT EXISTS upload_chunks (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES upload_sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL,
  checksum TEXT,
  storage_path TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, chunk_index)
);

-- Create index for efficient chunk queries
CREATE INDEX IF NOT EXISTS idx_upload_chunks_session_id ON upload_chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_upload_chunks_session_chunk ON upload_chunks(session_id, chunk_index);

-- Enable RLS
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for upload_sessions
CREATE POLICY "Users can view their own upload sessions" ON upload_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upload sessions" ON upload_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload sessions" ON upload_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upload sessions" ON upload_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for upload_chunks
CREATE POLICY "Users can view chunks for their upload sessions" ON upload_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM upload_sessions 
      WHERE upload_sessions.id = upload_chunks.session_id 
      AND upload_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert chunks for their upload sessions" ON upload_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM upload_sessions 
      WHERE upload_sessions.id = upload_chunks.session_id 
      AND upload_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks for their upload sessions" ON upload_chunks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM upload_sessions 
      WHERE upload_sessions.id = upload_chunks.session_id 
      AND upload_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks for their upload sessions" ON upload_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM upload_sessions 
      WHERE upload_sessions.id = upload_chunks.session_id 
      AND upload_sessions.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_upload_sessions_updated_at 
  BEFORE UPDATE ON upload_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old upload sessions (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_upload_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM upload_sessions 
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND status IN ('completed', 'error', 'cancelled');
END;
$$ language 'plpgsql';

-- Create a scheduled job to clean up old sessions (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-upload-sessions', '0 2 * * *', 'SELECT cleanup_old_upload_sessions();');
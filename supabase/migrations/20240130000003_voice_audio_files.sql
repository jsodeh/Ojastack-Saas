-- Voice Audio Files table for storing voice conversation audio
CREATE TABLE IF NOT EXISTS voice_audio_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  duration DECIMAL(10,2) NOT NULL DEFAULT 0,
  format TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'agent')) NOT NULL,
  quality_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_voice_audio_files_conversation_id (conversation_id),
  INDEX idx_voice_audio_files_message_id (message_id),
  INDEX idx_voice_audio_files_created_at (created_at)
);

-- Enable Row Level Security
ALTER TABLE voice_audio_files ENABLE ROW LEVEL SECURITY;

-- RLS Policy for voice audio files
CREATE POLICY "Users can access audio files from own conversations" ON voice_audio_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = voice_audio_files.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- Create storage bucket for voice audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-conversations', 'voice-conversations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for voice audio files
CREATE POLICY "Users can upload voice audio files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'voice-conversations' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view own voice audio files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'voice-conversations' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete own voice audio files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'voice-conversations' AND
    auth.uid() IS NOT NULL
  );

-- Function to calculate voice conversation statistics
CREATE OR REPLACE FUNCTION update_voice_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation metadata with voice statistics
  UPDATE conversations 
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
    'voice_interactions_count', (
      SELECT COUNT(*) 
      FROM voice_audio_files 
      WHERE conversation_id = NEW.conversation_id
    ),
    'total_audio_duration', (
      SELECT COALESCE(SUM(duration), 0) 
      FROM voice_audio_files 
      WHERE conversation_id = NEW.conversation_id
    ),
    'last_voice_interaction', NOW()
  )
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update voice conversation stats
CREATE TRIGGER update_voice_conversation_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON voice_audio_files
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_conversation_stats();

-- Add voice-specific columns to agent_analytics table
ALTER TABLE agent_analytics ADD COLUMN IF NOT EXISTS voice_conversations_count INTEGER DEFAULT 0;
ALTER TABLE agent_analytics ADD COLUMN IF NOT EXISTS total_voice_duration DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agent_analytics ADD COLUMN IF NOT EXISTS avg_voice_quality DECIMAL(3,2) DEFAULT 0;

-- Function to update agent voice analytics
CREATE OR REPLACE FUNCTION update_agent_voice_analytics()
RETURNS TRIGGER AS $$
DECLARE
  agent_record RECORD;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Get agent info from conversation
  SELECT agent_id INTO agent_record
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  IF agent_record.agent_id IS NOT NULL THEN
    -- Update or insert analytics record
    INSERT INTO agent_analytics (
      agent_id, 
      date, 
      voice_conversations_count, 
      total_voice_duration,
      avg_voice_quality
    )
    VALUES (
      agent_record.agent_id,
      today_date,
      1,
      NEW.duration,
      COALESCE(NEW.quality_score, 0.8)
    )
    ON CONFLICT (agent_id, date)
    DO UPDATE SET
      voice_conversations_count = agent_analytics.voice_conversations_count + 1,
      total_voice_duration = agent_analytics.total_voice_duration + NEW.duration,
      avg_voice_quality = (
        (agent_analytics.avg_voice_quality * agent_analytics.voice_conversations_count + COALESCE(NEW.quality_score, 0.8)) /
        (agent_analytics.voice_conversations_count + 1)
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update agent voice analytics
CREATE TRIGGER update_agent_voice_analytics_trigger
  AFTER INSERT ON voice_audio_files
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_voice_analytics();

-- Add voice settings to agents table if not exists
ALTER TABLE agents ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS default_voice_settings JSONB DEFAULT '{
  "voice_id": "rachel",
  "stability": 0.5,
  "similarity_boost": 0.5,
  "style": 0.5,
  "use_speaker_boost": false
}'::jsonb;

-- Update existing agents to enable voice for multimodal and voice types
UPDATE agents 
SET voice_enabled = TRUE 
WHERE type IN ('voice', 'multimodal') AND voice_enabled = FALSE;
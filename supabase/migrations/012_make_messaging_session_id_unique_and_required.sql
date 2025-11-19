-- Migration: Make messaging_session_id unique and required
-- This ensures messaging_session_id is always available and unique for all transcripts

-- First, update existing NULL values to a placeholder (if any exist)
-- We'll use a generated UUID-based identifier for any existing NULLs
UPDATE transcripts
SET messaging_session_id = 'LEGACY-' || id::text
WHERE messaging_session_id IS NULL;

-- Make messaging_session_id NOT NULL
ALTER TABLE transcripts
  ALTER COLUMN messaging_session_id SET NOT NULL;

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_transcripts_messaging_session_id;

-- Create unique index on messaging_session_id
CREATE UNIQUE INDEX idx_transcripts_messaging_session_id_unique 
  ON transcripts(messaging_session_id);

-- Add unique constraint
ALTER TABLE transcripts
  ADD CONSTRAINT transcripts_messaging_session_id_unique 
  UNIQUE (messaging_session_id);

-- Update comments
COMMENT ON COLUMN transcripts.messaging_session_id IS 'Salesforce MessagingSessionId - unique identifier for the messaging session, always required';
COMMENT ON CONSTRAINT transcripts_messaging_session_id_unique ON transcripts IS 'Ensures each MessagingSessionId is unique across all transcripts';


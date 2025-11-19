-- Migration: Add messaging_session_name support
-- This allows tracking MessagingSession Name from Salesforce in chat_sessions, evaluations, and transcripts

-- Add messaging_session_name to chat_sessions table
ALTER TABLE chat_sessions
  ADD COLUMN messaging_session_name VARCHAR(255);

-- Add messaging_session_name to evaluations table (for tracking)
ALTER TABLE evaluations
  ADD COLUMN messaging_session_name VARCHAR(255);

-- Add messaging_session_name to transcripts table (for tracking)
ALTER TABLE transcripts
  ADD COLUMN messaging_session_name VARCHAR(255);

-- Create indexes for performance
CREATE INDEX idx_chat_sessions_messaging_session_name ON chat_sessions(messaging_session_name);
CREATE INDEX idx_evaluations_messaging_session_name ON evaluations(messaging_session_name);
CREATE INDEX idx_transcripts_messaging_session_name ON transcripts(messaging_session_name);

-- Add comment for documentation
COMMENT ON COLUMN chat_sessions.messaging_session_name IS 'Salesforce MessagingSession Name associated with this chat session';
COMMENT ON COLUMN evaluations.messaging_session_name IS 'Salesforce MessagingSession Name associated with this evaluation (for tracking purposes)';
COMMENT ON COLUMN transcripts.messaging_session_name IS 'Salesforce MessagingSession Name associated with this transcript (for tracking purposes)';


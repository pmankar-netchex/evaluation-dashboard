-- Migration: Add messaging_session_id support
-- This allows tracking MessagingSessionId from Salesforce in chat_sessions, evaluations, and transcripts

-- Add messaging_session_id to chat_sessions table
ALTER TABLE chat_sessions
  ADD COLUMN messaging_session_id VARCHAR(255);

-- Add messaging_session_id to evaluations table (for tracking)
ALTER TABLE evaluations
  ADD COLUMN messaging_session_id VARCHAR(255);

-- Add messaging_session_id to transcripts table (for tracking)
ALTER TABLE transcripts
  ADD COLUMN messaging_session_id VARCHAR(255);

-- Create indexes for performance
CREATE INDEX idx_chat_sessions_messaging_session_id ON chat_sessions(messaging_session_id);
CREATE INDEX idx_evaluations_messaging_session_id ON evaluations(messaging_session_id);
CREATE INDEX idx_transcripts_messaging_session_id ON transcripts(messaging_session_id);

-- Add comment for documentation
COMMENT ON COLUMN chat_sessions.messaging_session_id IS 'Salesforce MessagingSessionId associated with this chat session';
COMMENT ON COLUMN evaluations.messaging_session_id IS 'Salesforce MessagingSessionId associated with this evaluation (for tracking purposes)';
COMMENT ON COLUMN transcripts.messaging_session_id IS 'Salesforce MessagingSessionId associated with this transcript (for tracking purposes)';


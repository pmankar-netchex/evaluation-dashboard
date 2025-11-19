-- Add sierra_conversation_state column to chat_sessions table
-- This stores Sierra's conversation state to maintain context across messages

ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS sierra_conversation_state TEXT;

COMMENT ON COLUMN chat_sessions.sierra_conversation_state IS 'Sierra API conversation state for maintaining context';


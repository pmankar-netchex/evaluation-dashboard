-- Chat sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP,
  session_status VARCHAR(20) CHECK (session_status IN ('active', 'ended')) DEFAULT 'active' NOT NULL,
  sierra_conversation_state TEXT, -- Store Sierra's conversation state
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Modify evaluations table to support both case comparisons and custom chats
ALTER TABLE evaluations 
  ALTER COLUMN transcript_id DROP NOT NULL,
  ADD COLUMN chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  ADD COLUMN evaluation_type VARCHAR(20) CHECK (evaluation_type IN ('case_comparison', 'custom_chat')) NOT NULL DEFAULT 'case_comparison',
  ADD CONSTRAINT evaluation_source_check CHECK (
    (transcript_id IS NOT NULL AND chat_session_id IS NULL) OR
    (transcript_id IS NULL AND chat_session_id IS NOT NULL)
  );

-- Indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(session_status);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_evaluations_chat_session_id ON evaluations(chat_session_id);
CREATE INDEX idx_evaluations_type ON evaluations(evaluation_type);

-- Enable Row Level Security
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions (users can only see their own sessions)
CREATE POLICY "Users can view their own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for chat_messages (users can only see messages from their sessions)
CREATE POLICY "Users can view messages from their sessions"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their sessions"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Create unified evaluations view
CREATE OR REPLACE VIEW unified_evaluations AS
SELECT 
  e.id,
  e.evaluator_id,
  e.evaluator_email,
  e.winner,
  e.scores,
  e.notes,
  e.evaluation_timestamp,
  e.evaluation_type,
  e.created_at,
  -- Case comparison fields
  e.transcript_id,
  t.case_number,
  t.test_batch_id,
  -- Custom chat fields
  e.chat_session_id,
  cs.started_at as chat_started_at,
  cs.ended_at as chat_ended_at,
  -- Unified fields
  CASE 
    WHEN e.evaluation_type = 'case_comparison' THEN t.case_number
    WHEN e.evaluation_type = 'custom_chat' THEN 'chat-' || cs.id::text
    ELSE NULL
  END as reference_id,
  CASE 
    WHEN e.evaluation_type = 'case_comparison' THEN t.created_at
    WHEN e.evaluation_type = 'custom_chat' THEN cs.started_at
    ELSE NULL
  END as source_created_at
FROM evaluations e
LEFT JOIN transcripts t ON e.transcript_id = t.id
LEFT JOIN chat_sessions cs ON e.chat_session_id = cs.id;

-- Grant access to the view
GRANT SELECT ON unified_evaluations TO authenticated;

-- Comments for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat sessions between users and Sierra bot';
COMMENT ON TABLE chat_messages IS 'Stores individual messages within chat sessions';
COMMENT ON COLUMN evaluations.evaluation_type IS 'Type of evaluation: case_comparison for side-by-side comparison, custom_chat for single Sierra chat';
COMMENT ON VIEW unified_evaluations IS 'Unified view of all evaluations from both case comparisons and custom chats';


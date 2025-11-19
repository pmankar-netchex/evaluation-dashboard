-- Migration: Enable cross-user analytics, logs, and history
-- This allows all authenticated users to view all evaluations and chat sessions
-- for analytics, logs, and history purposes

-- Drop existing restrictive SELECT policies for evaluations
DROP POLICY IF EXISTS "Users can view their own evaluations" ON evaluations;

-- Create new policy: All authenticated users can view all evaluations
CREATE POLICY "All authenticated users can view evaluations"
  ON evaluations FOR SELECT
  TO authenticated
  USING (true);

-- Drop existing restrictive SELECT policies for chat_sessions
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;

-- Create new policy: All authenticated users can view all chat sessions
CREATE POLICY "All authenticated users can view chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (true);

-- Drop existing restrictive SELECT policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON chat_messages;

-- Create new policy: All authenticated users can view all chat messages
-- (since they can view all sessions, they should be able to view all messages)
CREATE POLICY "All authenticated users can view chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

-- Note: INSERT and UPDATE policies remain restrictive
-- Users can still only create/update their own evaluations and chat sessions


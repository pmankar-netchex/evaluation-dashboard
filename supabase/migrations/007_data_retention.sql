-- Data retention policies and cleanup functions

-- Function to cleanup old chat sessions (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_chat_sessions()
RETURNS TABLE(deleted_sessions INTEGER, deleted_messages INTEGER) AS $$
DECLARE
  session_count INTEGER;
  message_count INTEGER;
BEGIN
  -- Count messages before deletion (cascade will delete them)
  SELECT COUNT(*) INTO message_count
  FROM chat_messages cm
  WHERE cm.session_id IN (
    SELECT id FROM chat_sessions 
    WHERE ended_at < NOW() - INTERVAL '90 days'
  );
  
  -- Delete old sessions (messages will be deleted by cascade)
  WITH deleted AS (
    DELETE FROM chat_sessions 
    WHERE ended_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO session_count FROM deleted;
  
  RETURN QUERY SELECT session_count, message_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old transcripts (older than 180 days)
-- Note: Only delete transcripts with no evaluations
CREATE OR REPLACE FUNCTION cleanup_old_transcripts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM transcripts 
    WHERE created_at < NOW() - INTERVAL '180 days'
    AND id NOT IN (
      SELECT DISTINCT transcript_id 
      FROM evaluations 
      WHERE transcript_id IS NOT NULL
    )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup orphaned evaluations (where associated data is deleted)
CREATE OR REPLACE FUNCTION cleanup_orphaned_evaluations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM evaluations 
    WHERE (
      evaluation_type = 'case_comparison' 
      AND transcript_id IS NOT NULL 
      AND transcript_id NOT IN (SELECT id FROM transcripts)
    ) OR (
      evaluation_type = 'custom_chat' 
      AND chat_session_id IS NOT NULL 
      AND chat_session_id NOT IN (SELECT id FROM chat_sessions)
    )
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Master cleanup function
CREATE OR REPLACE FUNCTION run_all_cleanup_tasks()
RETURNS TABLE(
  task_name TEXT,
  records_deleted INTEGER,
  completed_at TIMESTAMP
) AS $$
DECLARE
  rate_limit_count INTEGER;
  audit_count INTEGER;
  transcript_count INTEGER;
  orphan_count INTEGER;
  session_result RECORD;
BEGIN
  -- Cleanup rate limit entries
  DELETE FROM rate_limit_entries 
  WHERE timestamp < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS rate_limit_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    'rate_limit_cleanup'::TEXT, 
    rate_limit_count, 
    NOW();
  
  -- Cleanup old audit logs
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS audit_count = ROW_COUNT;
  
  RETURN QUERY SELECT 
    'audit_log_cleanup'::TEXT, 
    audit_count, 
    NOW();
  
  -- Cleanup old chat sessions
  SELECT * INTO session_result FROM cleanup_old_chat_sessions();
  
  RETURN QUERY SELECT 
    'chat_session_cleanup'::TEXT, 
    session_result.deleted_sessions, 
    NOW();
  
  RETURN QUERY SELECT 
    'chat_message_cleanup'::TEXT, 
    session_result.deleted_messages, 
    NOW();
  
  -- Cleanup old transcripts
  SELECT cleanup_old_transcripts() INTO transcript_count;
  
  RETURN QUERY SELECT 
    'transcript_cleanup'::TEXT, 
    transcript_count, 
    NOW();
  
  -- Cleanup orphaned evaluations
  SELECT cleanup_orphaned_evaluations() INTO orphan_count;
  
  RETURN QUERY SELECT 
    'orphaned_evaluation_cleanup'::TEXT, 
    orphan_count, 
    NOW();
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION cleanup_old_chat_sessions IS 'Deletes chat sessions older than 90 days and their associated messages';
COMMENT ON FUNCTION cleanup_old_transcripts IS 'Deletes transcripts older than 180 days that have no evaluations';
COMMENT ON FUNCTION cleanup_orphaned_evaluations IS 'Deletes evaluations where the associated transcript or chat session no longer exists';
COMMENT ON FUNCTION run_all_cleanup_tasks IS 'Runs all cleanup tasks and returns a summary';

-- To run cleanup manually:
-- SELECT * FROM run_all_cleanup_tasks();

-- To schedule with pg_cron (if available):
-- SELECT cron.schedule('daily-cleanup', '0 2 * * *', 'SELECT run_all_cleanup_tasks()');


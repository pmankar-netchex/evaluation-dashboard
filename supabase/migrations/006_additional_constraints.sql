-- Prevent duplicate evaluations for case comparisons
-- Note: We don't add this constraint globally because chat evaluations work differently
-- Instead, we'll add a partial unique index
CREATE UNIQUE INDEX unique_user_transcript_eval 
ON evaluations (transcript_id, evaluator_id)
WHERE transcript_id IS NOT NULL;

-- Ensure evaluation type matches foreign key
ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS check_evaluation_source;

ALTER TABLE evaluations
ADD CONSTRAINT check_evaluation_source 
CHECK (
  (evaluation_type = 'case_comparison' AND transcript_id IS NOT NULL AND chat_session_id IS NULL) OR
  (evaluation_type = 'custom_chat' AND chat_session_id IS NOT NULL AND transcript_id IS NULL)
);

-- Ensure scores are valid JSON objects
ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS check_scores_valid;

ALTER TABLE evaluations
ADD CONSTRAINT check_scores_valid
CHECK (
  jsonb_typeof(scores) = 'object'
);

-- Ensure chat sessions have valid status
ALTER TABLE chat_sessions
DROP CONSTRAINT IF EXISTS chat_sessions_session_status_check;

ALTER TABLE chat_sessions
ADD CONSTRAINT chat_sessions_session_status_check
CHECK (session_status IN ('active', 'ended'));

-- Ensure ended sessions have ended_at timestamp
ALTER TABLE chat_sessions
DROP CONSTRAINT IF EXISTS check_ended_session_timestamp;

ALTER TABLE chat_sessions
ADD CONSTRAINT check_ended_session_timestamp
CHECK (
  (session_status = 'active' AND ended_at IS NULL) OR
  (session_status = 'ended' AND ended_at IS NOT NULL)
);

-- Add check constraint for time_spent_seconds (max 24 hours)
ALTER TABLE evaluations
DROP CONSTRAINT IF EXISTS check_time_spent;

ALTER TABLE evaluations
ADD CONSTRAINT check_time_spent
CHECK (time_spent_seconds IS NULL OR (time_spent_seconds >= 0 AND time_spent_seconds <= 86400));

-- Comments
COMMENT ON CONSTRAINT check_evaluation_source ON evaluations IS 'Ensures evaluation has either transcript_id or chat_session_id based on type';
COMMENT ON CONSTRAINT check_scores_valid ON evaluations IS 'Ensures scores field is a valid JSON object';
COMMENT ON CONSTRAINT check_time_spent ON evaluations IS 'Ensures time_spent_seconds is between 0 and 24 hours';


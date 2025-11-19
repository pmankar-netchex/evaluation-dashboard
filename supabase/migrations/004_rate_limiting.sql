-- Rate limiting table
CREATE TABLE rate_limit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_rate_limit_key_timestamp ON rate_limit_entries(key, timestamp);

-- Auto-cleanup function (run daily)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_entries 
  WHERE timestamp < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (no policies needed - service role only)
ALTER TABLE rate_limit_entries ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE rate_limit_entries IS 'Rate limiting entries for API request throttling';
COMMENT ON COLUMN rate_limit_entries.key IS 'Rate limit key (e.g., ratelimit:api:192.168.1.1)';
COMMENT ON COLUMN rate_limit_entries.timestamp IS 'Timestamp of the request';


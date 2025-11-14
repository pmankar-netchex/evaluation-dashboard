-- Transcripts table
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(255) UNIQUE NOT NULL,
  agentforce_transcript JSONB NOT NULL,
  sierra_transcript JSONB NOT NULL,
  sierra_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  test_batch_id VARCHAR(100),
  metadata JSONB
);

-- Evaluations table
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  evaluator_email VARCHAR(255),
  winner VARCHAR(20) CHECK (winner IN ('sierra', 'agentforce', 'tie', 'both_poor')),
  scores JSONB NOT NULL, -- {resolution: {af: 4, sierra: 5}, empathy: {...}, efficiency: {...}, accuracy: {...}}
  notes TEXT,
  evaluation_timestamp TIMESTAMP DEFAULT NOW(),
  time_spent_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transcripts_case_number ON transcripts(case_number);
CREATE INDEX idx_evaluations_transcript_id ON evaluations(transcript_id);
CREATE INDEX idx_evaluations_evaluator_id ON evaluations(evaluator_id);
CREATE INDEX idx_evaluations_evaluator_transcript ON evaluations(evaluator_id, transcript_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON transcripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transcripts (all authenticated users can read, only service role can write)
CREATE POLICY "Authenticated users can read transcripts"
  ON transcripts FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for evaluations (users can only see their own evaluations)
CREATE POLICY "Users can view their own evaluations"
  ON evaluations FOR SELECT
  TO authenticated
  USING (auth.uid() = evaluator_id);

CREATE POLICY "Users can insert their own evaluations"
  ON evaluations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = evaluator_id);

CREATE POLICY "Users can update their own evaluations"
  ON evaluations FOR UPDATE
  TO authenticated
  USING (auth.uid() = evaluator_id);

-- View for unevaluated transcripts (for analytics)
CREATE OR REPLACE VIEW unevaluated_transcripts AS
SELECT t.*
FROM transcripts t
WHERE t.id NOT IN (
  SELECT DISTINCT transcript_id 
  FROM evaluations 
  WHERE transcript_id IS NOT NULL
);


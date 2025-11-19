-- Migration: Make case_number nullable
-- This allows transcripts to be created without a case number when fetched by MessagingSessionId or MessagingSessionName

-- Drop the NOT NULL constraint and UNIQUE constraint
ALTER TABLE transcripts
  ALTER COLUMN case_number DROP NOT NULL;

-- Drop the unique constraint (we'll recreate it as a partial unique index)
ALTER TABLE transcripts
  DROP CONSTRAINT IF EXISTS transcripts_case_number_key;

-- Create a partial unique index that only enforces uniqueness for non-null case numbers
CREATE UNIQUE INDEX idx_transcripts_case_number_unique 
  ON transcripts(case_number) 
  WHERE case_number IS NOT NULL;

-- Update the comment
COMMENT ON COLUMN transcripts.case_number IS 'Case number from Salesforce. Can be null if transcript was fetched by MessagingSessionId or MessagingSessionName without a case association.';


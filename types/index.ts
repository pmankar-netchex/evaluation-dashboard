// Transcript types
export interface Message {
  role: 'user' | 'agent' | 'bot' | 'system';
  content: string;
  timestamp?: number;
}

export interface TranscriptEntry {
  identifier: string;
  messageText: string;
  clientTimestamp: number;
  serverReceivedTimestamp: number;
  sender: {
    role: string;
    appType?: string;
    subject?: string;
  };
  type?: string;
  clientDuration?: number;
  relatedRecords?: string[];
}

export interface Transcript {
  id?: string;
  case_number: string;
  agentforce_transcript: TranscriptEntry[];
  sierra_transcript: TranscriptEntry[];
  sierra_version?: string;
  test_batch_id?: string;
  metadata?: Record<string, any>;
  messaging_session_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Evaluation types
export type Winner = 'sierra' | 'agentforce' | 'tie' | 'both_poor';

export interface EvaluationScores {
  resolution: {
    af: number;
    sierra: number;
  };
  empathy: {
    af: number;
    sierra: number;
  };
  efficiency: {
    af: number;
    sierra: number;
  };
  accuracy: {
    af: number;
    sierra: number;
  };
}

export interface Evaluation {
  id?: string;
  transcript_id: string;
  evaluator_id: string;
  evaluator_email?: string;
  winner: Winner;
  scores: EvaluationScores;
  notes?: string;
  evaluation_timestamp?: string;
  time_spent_seconds?: number;
  created_at?: string;
}

// User type from Supabase auth
export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

// Chat Session types
export interface ChatSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  session_status: 'active' | 'ended';
  messaging_session_id?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  created_at: string;
}

// Simplified evaluation scores for single bot (Sierra only)
export interface SimplifiedEvaluationScores {
  resolution: number;
  empathy: number;
  efficiency: number;
  accuracy: number;
}

// Chat evaluation type
export interface ChatEvaluation {
  id?: string;
  chat_session_id: string;
  evaluator_id: string;
  evaluator_email?: string;
  scores: SimplifiedEvaluationScores;
  notes?: string;
  evaluation_type: 'custom_chat';
  evaluation_timestamp?: string;
  created_at?: string;
}


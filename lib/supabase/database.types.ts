// This file is auto-generated. Update it when the database schema changes.
// For now, we'll use a basic structure that matches our schema.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      transcripts: {
        Row: {
          id: string
          case_number: string
          agentforce_transcript: Json
          sierra_transcript: Json
          sierra_version: string | null
          created_at: string
          updated_at: string
          test_batch_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          case_number: string
          agentforce_transcript: Json
          sierra_transcript: Json
          sierra_version?: string | null
          created_at?: string
          updated_at?: string
          test_batch_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          case_number?: string
          agentforce_transcript?: Json
          sierra_transcript?: Json
          sierra_version?: string | null
          created_at?: string
          updated_at?: string
          test_batch_id?: string | null
          metadata?: Json | null
        }
      }
      evaluations: {
        Row: {
          id: string
          transcript_id: string
          evaluator_id: string
          evaluator_email: string | null
          winner: 'sierra' | 'agentforce' | 'tie' | 'both_poor'
          scores: Json
          notes: string | null
          evaluation_timestamp: string
          time_spent_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          transcript_id: string
          evaluator_id: string
          evaluator_email?: string | null
          winner: 'sierra' | 'agentforce' | 'tie' | 'both_poor'
          scores: Json
          notes?: string | null
          evaluation_timestamp?: string
          time_spent_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          transcript_id?: string
          evaluator_id?: string
          evaluator_email?: string | null
          winner?: 'sierra' | 'agentforce' | 'tie' | 'both_poor'
          scores?: Json
          notes?: string | null
          evaluation_timestamp?: string
          time_spent_seconds?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      unevaluated_transcripts: {
        Row: {
          id: string
          case_number: string
          agentforce_transcript: Json
          sierra_transcript: Json
          sierra_version: string | null
          created_at: string
          updated_at: string
          test_batch_id: string | null
          metadata: Json | null
        }
      }
    }
  }
}


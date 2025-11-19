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
          messaging_session_id: string | null
          messaging_session_name: string | null
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
          messaging_session_id?: string | null
          messaging_session_name?: string | null
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
          messaging_session_id?: string | null
          messaging_session_name?: string | null
        }
      }
      evaluations: {
        Row: {
          id: string
          transcript_id: string | null
          chat_session_id: string | null
          evaluator_id: string
          evaluator_email: string | null
          evaluation_type: 'case_comparison' | 'custom_chat'
          winner: 'sierra' | 'agentforce' | 'tie' | 'both_poor'
          scores: Json
          notes: string | null
          evaluation_timestamp: string
          time_spent_seconds: number | null
          created_at: string
          messaging_session_id: string | null
          messaging_session_name: string | null
        }
        Insert: {
          id?: string
          transcript_id?: string | null
          chat_session_id?: string | null
          evaluator_id: string
          evaluator_email?: string | null
          evaluation_type?: 'case_comparison' | 'custom_chat'
          winner: 'sierra' | 'agentforce' | 'tie' | 'both_poor'
          scores: Json
          notes?: string | null
          evaluation_timestamp?: string
          time_spent_seconds?: number | null
          created_at?: string
          messaging_session_id?: string | null
          messaging_session_name?: string | null
        }
        Update: {
          id?: string
          transcript_id?: string | null
          chat_session_id?: string | null
          evaluator_id?: string
          evaluator_email?: string | null
          evaluation_type?: 'case_comparison' | 'custom_chat'
          winner?: 'sierra' | 'agentforce' | 'tie' | 'both_poor'
          scores?: Json
          notes?: string | null
          evaluation_timestamp?: string
          time_spent_seconds?: number | null
          created_at?: string
          messaging_session_id?: string | null
          messaging_session_name?: string | null
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          ended_at: string | null
          session_status: 'active' | 'ended'
          sierra_conversation_state: string | null
          created_at: string
          messaging_session_id: string | null
          messaging_session_name: string | null
        }
        Insert: {
          id?: string
          user_id: string
          started_at?: string
          ended_at?: string | null
          session_status?: 'active' | 'ended'
          sierra_conversation_state?: string | null
          created_at?: string
          messaging_session_id?: string | null
          messaging_session_name?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          session_status?: 'active' | 'ended'
          sierra_conversation_state?: string | null
          created_at?: string
          messaging_session_id?: string | null
          messaging_session_name?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          timestamp?: string
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
      unified_evaluations: {
        Row: {
          id: string
          evaluator_id: string
          evaluator_email: string | null
          winner: 'sierra' | 'agentforce' | 'tie' | 'both_poor'
          scores: Json
          notes: string | null
          evaluation_timestamp: string
          evaluation_type: 'case_comparison' | 'custom_chat'
          created_at: string
          // Case comparison fields
          transcript_id: string | null
          case_number: string | null
          test_batch_id: string | null
          // Custom chat fields
          chat_session_id: string | null
          chat_started_at: string | null
          chat_ended_at: string | null
          // Unified fields
          reference_id: string | null
          source_created_at: string | null
        }
      }
    }
  }
}


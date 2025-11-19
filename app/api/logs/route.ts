import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServiceClient();

    // Fetch all evaluations with transcript and chat session info
    const { data: evaluations, error } = await supabase
      .from('evaluations')
      .select('*, transcripts(*), chat_sessions(*)')
      .order('evaluation_timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch logs', details: error.message },
        { status: 500 }
      );
    }

    // Filter out active chat sessions - only show ended sessions with feedback
    // Case comparison evaluations are always included (they don't have chat sessions)
    const filteredEvaluations = evaluations?.filter((evaluation: any) => {
      // Include all case_comparison evaluations
      if (evaluation.evaluation_type === 'case_comparison') {
        return true;
      }
      
      // For custom_chat evaluations, only include if session is ended
      if (evaluation.evaluation_type === 'custom_chat') {
        const chatSession = Array.isArray(evaluation.chat_sessions) && evaluation.chat_sessions.length > 0 
          ? evaluation.chat_sessions[0] 
          : evaluation.chat_sessions;
        
        // Only include if session exists and is ended
        return chatSession && chatSession.session_status === 'ended';
      }
      
      return true;
    }) || [];

    // Transform the data to flatten the structure
    const logs = filteredEvaluations.map((evaluation: any) => {
      const evaluationType = evaluation.evaluation_type || 'case_comparison';
      
      // Handle comparison evaluations
      if (evaluationType === 'case_comparison') {
        const transcript = Array.isArray(evaluation.transcripts) && evaluation.transcripts.length > 0 
          ? evaluation.transcripts[0] 
          : evaluation.transcripts;
        
        return {
          id: evaluation.id,
          evaluationType: 'case_comparison',
          caseNumber: transcript?.case_number || 'Unknown',
          transcriptId: evaluation.transcript_id,
          winner: evaluation.winner,
          scores: evaluation.scores,
          notes: evaluation.notes,
          evaluatorEmail: evaluation.evaluator_email || 'Unknown',
          evaluationDate: evaluation.evaluation_timestamp,
        };
      } 
      // Handle chat evaluations
      else {
        const chatSession = Array.isArray(evaluation.chat_sessions) && evaluation.chat_sessions.length > 0 
          ? evaluation.chat_sessions[0] 
          : evaluation.chat_sessions;
        
        return {
          id: evaluation.id,
          evaluationType: 'custom_chat',
          caseNumber: `Chat Session ${evaluation.chat_session_id?.substring(0, 8)}`,
          chatSessionId: evaluation.chat_session_id,
          winner: null, // Chat evaluations don't have winners
          scores: evaluation.scores,
          notes: evaluation.notes,
          evaluatorEmail: evaluation.evaluator_email || 'Unknown',
          evaluationDate: evaluation.evaluation_timestamp,
          chatStarted: chatSession?.started_at,
          chatEnded: chatSession?.ended_at,
        };
      }
    }) || [];

    return NextResponse.json(logs);
  } catch (error: unknown) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServiceClient();

    // Fetch all evaluations with transcript and evaluator info
    const { data: evaluations, error } = await supabase
      .from('evaluations')
      .select('*, transcripts(*)')
      .order('evaluation_timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch logs', details: error.message },
        { status: 500 }
      );
    }

    // Transform the data to flatten the structure
    const logs = evaluations?.map((evaluation: any) => {
      // Handle transcripts as array (Supabase returns related data as array)
      const transcript = Array.isArray(evaluation.transcripts) && evaluation.transcripts.length > 0 
        ? evaluation.transcripts[0] 
        : evaluation.transcripts;
      
      return {
        id: evaluation.id,
        caseNumber: transcript?.case_number || 'N/A',
        winner: evaluation.winner,
        scores: evaluation.scores,
        notes: evaluation.notes,
        evaluatorEmail: evaluation.evaluator_email || 'Unknown',
        evaluationDate: evaluation.evaluation_timestamp,
      };
    }) || [];

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs', details: error.message },
      { status: 500 }
    );
  }
}


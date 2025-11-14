import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all evaluated transcript IDs for this user
    const { data: evaluatedTranscripts, error: evalError } = await supabase
      .from('evaluations')
      .select('transcript_id')
      .eq('evaluator_id', user.id);

    if (evalError) {
      console.error('Error fetching evaluated transcripts:', evalError);
    }

    const evaluatedIds =
      evaluatedTranscripts?.map((e) => e.transcript_id).filter(Boolean) || [];

    console.log(`Found ${evaluatedIds.length} evaluated transcripts for user ${user.id}`);

    // Get next unevaluated transcript
    // Use a simpler approach: get all transcripts and filter in memory if needed
    // Or use a subquery approach
    let transcript = null;
    
    if (evaluatedIds.length === 0) {
      // No evaluations yet, get any transcript
      const { data: transcripts, error } = await supabase
        .from('transcripts')
        .select('*')
        .limit(1);
      
      if (error) {
        throw error;
      }
      transcript = transcripts && transcripts.length > 0 ? transcripts[0] : null;
    } else {
      // Get transcripts that are not in the evaluated list
      // Use a workaround: get all and filter, or use a better query
      const { data: allTranscripts, error } = await supabase
        .from('transcripts')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      if (allTranscripts) {
        // Filter out evaluated transcripts
        const unevaluated = allTranscripts.filter(
          (t) => !evaluatedIds.includes(t.id)
        );
        transcript = unevaluated.length > 0 ? unevaluated[0] : null;
      }
    }

    if (!transcript) {
      console.log('No unevaluated transcripts found');
      return NextResponse.json(
        { message: 'No unevaluated transcripts found' },
        { status: 404 }
      );
    }

    console.log(`Found next unevaluated transcript: ${transcript.case_number}`);
    return NextResponse.json(transcript);
  } catch (error: any) {
    console.error('Error fetching next transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch next transcript', details: error.message },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/database.types';

type Evaluation = Database['public']['Tables']['evaluations']['Row'];
type Transcript = Database['public']['Tables']['transcripts']['Row'];

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
    // Type assertion needed due to Supabase type inference limitations
    const { data: evaluatedTranscripts, error: evalError } = await (supabase
      .from('evaluations') as any)
      .select('transcript_id')
      .eq('evaluator_id', user.id) as { data: Pick<Evaluation, 'transcript_id'>[] | null; error: any };

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
      // Type assertion needed due to Supabase type inference limitations
      const { data: transcripts, error } = await (supabase
        .from('transcripts') as any)
        .select('*')
        .limit(1) as { data: Transcript[] | null; error: any };
      
      if (error) {
        throw error;
      }
      transcript = transcripts && transcripts.length > 0 ? transcripts[0] : null;
    } else {
      // Get transcripts that are not in the evaluated list
      // Use a workaround: get all and filter, or use a better query
      // Type assertion needed due to Supabase type inference limitations
      const { data: allTranscripts, error } = await (supabase
        .from('transcripts') as any)
        .select('*') as { data: Transcript[] | null; error: any };
      
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


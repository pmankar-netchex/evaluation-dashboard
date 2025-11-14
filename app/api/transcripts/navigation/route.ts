import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/database.types';

type Evaluation = Database['public']['Tables']['evaluations']['Row'];
type Transcript = Database['public']['Tables']['transcripts']['Row'];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const currentTranscriptId = searchParams.get('current');
    const direction = searchParams.get('direction'); // 'next' or 'previous'

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all transcripts ordered by case number
    // Type assertion needed due to Supabase type inference limitations
    const { data: allTranscripts, error: transcriptsError } = await (supabase
      .from('transcripts') as any)
      .select('id, case_number, created_at')
      .order('case_number', { ascending: true }) as { data: Pick<Transcript, 'id' | 'case_number' | 'created_at'>[] | null; error: any };

    if (transcriptsError) {
      throw transcriptsError;
    }

    if (!allTranscripts || allTranscripts.length === 0) {
      return NextResponse.json(
        { message: 'No transcripts found' },
        { status: 404 }
      );
    }

    // Get evaluated transcript IDs for this user
    // Type assertion needed due to Supabase type inference limitations
    const { data: evaluatedTranscripts, error: evalError } = await (supabase
      .from('evaluations') as any)
      .select('transcript_id')
      .eq('evaluator_id', user.id) as { data: Pick<Evaluation, 'transcript_id'>[] | null; error: any };

    if (evalError) {
      console.error('Error fetching evaluated transcripts:', evalError);
    }

    const evaluatedIds = new Set(
      evaluatedTranscripts?.map((e) => e.transcript_id).filter(Boolean) || []
    );

    // Find current transcript index
    let currentIndex = -1;
    if (currentTranscriptId) {
      currentIndex = allTranscripts.findIndex((t) => t.id === currentTranscriptId);
    }

    // Determine which transcripts to show based on direction
    let targetTranscript = null;
    let position = { current: 0, total: allTranscripts.length };

    if (direction === 'next') {
      // Find next unevaluated transcript
      const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
      for (let i = startIndex; i < allTranscripts.length; i++) {
        if (!evaluatedIds.has(allTranscripts[i].id)) {
          targetTranscript = allTranscripts[i];
          position.current = i + 1;
          break;
        }
      }
    } else if (direction === 'previous') {
      // Find previous transcript (can be evaluated or unevaluated)
      if (currentIndex > 0) {
        targetTranscript = allTranscripts[currentIndex - 1];
        position.current = currentIndex;
      }
    } else {
      // No direction specified, get next unevaluated
      const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
      for (let i = startIndex; i < allTranscripts.length; i++) {
        if (!evaluatedIds.has(allTranscripts[i].id)) {
          targetTranscript = allTranscripts[i];
          position.current = i + 1;
          break;
        }
      }
    }

    if (!targetTranscript) {
      return NextResponse.json(
        { message: direction === 'previous' ? 'No previous transcript' : 'No unevaluated transcripts found' },
        { status: 404 }
      );
    }

    // Get full transcript data
    // Type assertion needed due to Supabase type inference limitations
    const { data: fullTranscript, error: fetchError } = await (supabase
      .from('transcripts') as any)
      .select('*')
      .eq('id', targetTranscript.id)
      .single() as { data: Transcript | null; error: any };

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({
      transcript: fullTranscript,
      position,
      hasNext: currentIndex < allTranscripts.length - 1,
      hasPrevious: currentIndex > 0,
    });
  } catch (error: any) {
    console.error('Error fetching navigation transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript', details: error.message },
      { status: 500 }
    );
  }
}


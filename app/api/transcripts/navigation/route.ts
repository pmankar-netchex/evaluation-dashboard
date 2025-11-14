import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { data: allTranscripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('id, case_number, created_at')
      .order('case_number', { ascending: true });

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
    const { data: evaluatedTranscripts, error: evalError } = await supabase
      .from('evaluations')
      .select('transcript_id')
      .eq('evaluator_id', user.id);

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
    const { data: fullTranscript, error: fetchError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('id', targetTranscript.id)
      .single();

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


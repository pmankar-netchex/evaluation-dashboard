import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Submit feedback for chat session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { scores, notes } = body;
    
    // Validate scores
    if (!scores || typeof scores !== 'object') {
      return NextResponse.json(
        { error: 'Scores are required' },
        { status: 400 }
      );
    }

    const requiredMetrics = ['resolution', 'empathy', 'efficiency', 'accuracy'];
    for (const metric of requiredMetrics) {
      if (typeof scores[metric] !== 'number' || scores[metric] < 1 || scores[metric] > 5) {
        return NextResponse.json(
          { error: `Invalid score for ${metric}. Must be between 1 and 5.` },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify session exists and belongs to user
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if evaluation already exists for this session
    const { data: existingEvaluation } = await supabase
      .from('evaluations')
      .select('id')
      .eq('chat_session_id', sessionId)
      .single();

    if (existingEvaluation) {
      return NextResponse.json(
        { error: 'Feedback already submitted for this session' },
        { status: 400 }
      );
    }

    // Create evaluation record
    // For custom chat, we only have Sierra scores, so we store them in a simplified format
    const evaluationScores = {
      resolution: { sierra: scores.resolution },
      empathy: { sierra: scores.empathy },
      efficiency: { sierra: scores.efficiency },
      accuracy: { sierra: scores.accuracy },
    };

    // Type assertion needed due to Supabase type inference limitations
    const { data: evaluation, error: evaluationError } = await (supabase
      .from('evaluations') as any)
      .insert({
        chat_session_id: sessionId,
        evaluator_id: user.id,
        evaluator_email: user.email,
        evaluation_type: 'custom_chat',
        winner: 'sierra', // Default for custom chat since only Sierra is involved
        scores: evaluationScores,
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (evaluationError) {
      console.error('Error creating evaluation:', evaluationError);
      return NextResponse.json(
        { error: 'Failed to submit feedback', details: evaluationError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error: unknown) {
    console.error('Error in POST /api/chat/[sessionId]/feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


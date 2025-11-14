import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const evaluationSchema = z.object({
  transcript_id: z.string().uuid(),
  winner: z.enum(['sierra', 'agentforce', 'tie', 'both_poor']),
  scores: z.object({
    resolution: z.object({
      af: z.number().min(1).max(5),
      sierra: z.number().min(1).max(5),
    }),
    empathy: z.object({
      af: z.number().min(1).max(5),
      sierra: z.number().min(1).max(5),
    }),
    efficiency: z.object({
      af: z.number().min(1).max(5),
      sierra: z.number().min(1).max(5),
    }),
    accuracy: z.object({
      af: z.number().min(1).max(5),
      sierra: z.number().min(1).max(5),
    }),
  }),
  notes: z.string().optional(),
  time_spent_seconds: z.number().optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = evaluationSchema.parse(body);

    // Insert evaluation
    const { data: evaluation, error } = await supabase
      .from('evaluations')
      .insert({
        transcript_id: validatedData.transcript_id,
        evaluator_id: user.id,
        evaluator_email: user.email,
        winner: validatedData.winner,
        scores: validatedData.scores,
        notes: validatedData.notes || null,
        time_spent_seconds: validatedData.time_spent_seconds || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving evaluation:', error);
      return NextResponse.json(
        { error: 'Failed to save evaluation', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error submitting evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to submit evaluation', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const evaluatorId = searchParams.get('evaluator_id');
    const transcriptId = searchParams.get('transcript_id');

    let query = supabase
      .from('evaluations')
      .select('*, transcripts(*)')
      .eq('evaluator_id', evaluatorId || user.id);

    if (transcriptId) {
      query = query.eq('transcript_id', transcriptId);
    }

    const { data: evaluations, error } = await query.order(
      'evaluation_timestamp',
      { ascending: false }
    );

    if (error) {
      console.error('Error fetching evaluations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch evaluations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(evaluations);
  } catch (error: any) {
    console.error('Error fetching evaluations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch evaluations', details: error.message },
      { status: 500 }
    );
  }
}


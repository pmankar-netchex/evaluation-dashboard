import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { Database } from '@/lib/supabase/database.types';
import { handleApiError, SafeApiError, SafeErrors } from '@/lib/error-handler';
import { logAudit, AuditActions, extractRequestInfo } from '@/lib/audit-logger';
import { evaluationSchema } from '@/lib/schemas/validation';

export async function POST(request: NextRequest) {
  const requestInfo = extractRequestInfo(request);
  let user: any = null;
  
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      throw SafeErrors.Unauthorized;
    }
    
    user = authUser;

    const body = await request.json();
    const validatedData = evaluationSchema.parse(body);

    // Get messaging_session_id from request, or fetch from related chat_session/transcript
    let messagingSessionId: string | null = validatedData.messaging_session_id || null;
    
    if (!messagingSessionId) {
      // Try to get messaging_session_id from related chat_session or transcript
      if (validatedData.chat_session_id) {
        const { data: chatSession } = await (supabase
          .from('chat_sessions') as any)
          .select('messaging_session_id')
          .eq('id', validatedData.chat_session_id)
          .single();
        messagingSessionId = chatSession?.messaging_session_id || null;
      } else if (validatedData.transcript_id) {
        const { data: transcript } = await (supabase
          .from('transcripts') as any)
          .select('messaging_session_id')
          .eq('id', validatedData.transcript_id)
          .single();
        messagingSessionId = transcript?.messaging_session_id || null;
      }
    }

    // Insert evaluation
    const insertData: Database['public']['Tables']['evaluations']['Insert'] = {
      transcript_id: validatedData.transcript_id || null,
      chat_session_id: validatedData.chat_session_id || null,
      evaluation_type: validatedData.evaluation_type,
      evaluator_id: user.id,
      evaluator_email: user.email,
      winner: validatedData.winner as any || null, // Cast needed for nullable winner in chat evaluations
      scores: validatedData.scores as Database['public']['Tables']['evaluations']['Insert']['scores'],
      notes: validatedData.notes || null,
      time_spent_seconds: validatedData.time_spent_seconds || null,
      messaging_session_id: messagingSessionId,
    };

    // Type assertion needed due to Supabase type inference limitations
    const { data: evaluation, error } = await (supabase
      .from('evaluations') as any)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new SafeApiError(
        'Failed to save evaluation',
        500,
        'DATABASE_ERROR',
        error
      );
    }

    // Log successful creation
    await logAudit({
      userId: user.id,
      action: AuditActions.CREATE_EVALUATION,
      resourceType: 'evaluation',
      resourceId: evaluation.id,
      ...requestInfo,
      statusCode: 201,
      metadata: {
        evaluationType: validatedData.evaluation_type,
        transcriptId: validatedData.transcript_id,
        chatSessionId: validatedData.chat_session_id,
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    // Log failed attempt
    const statusCode = error instanceof SafeApiError ? error.statusCode : 500;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await logAudit({
      userId: user?.id,
      action: AuditActions.CREATE_EVALUATION,
      resourceType: 'evaluation',
      ...requestInfo,
      statusCode,
      metadata: {
        error: errorMessage,
      },
    });

    return handleApiError(error, 'POST /api/evaluations');
  }
}

export async function GET(request: NextRequest) {
  const requestInfo = extractRequestInfo(request);
  let user: any = null;
  
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      throw SafeErrors.Unauthorized;
    }
    
    user = authUser;

    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcript_id');
    // Analytics are available to all authenticated users - showing all evaluations

    let query = supabase
      .from('evaluations')
      .select('*, transcripts(*), chat_sessions(*)');

    if (transcriptId) {
      query = query.eq('transcript_id', transcriptId);
    }

    const { data: evaluations, error } = await query.order(
      'evaluation_timestamp',
      { ascending: false }
    );

    if (error) {
      throw new SafeApiError(
        'Failed to fetch evaluations',
        500,
        'DATABASE_ERROR',
        error
      );
    }

    // Log access
    await logAudit({
      userId: user.id,
      action: AuditActions.LIST_EVALUATIONS,
      resourceType: 'evaluation',
      ...requestInfo,
      statusCode: 200,
      metadata: {
        count: evaluations?.length || 0,
        transcriptId,
      },
    });

    return NextResponse.json(evaluations);
  } catch (error: unknown) {
    return handleApiError(error, 'GET /api/evaluations');
  }
}


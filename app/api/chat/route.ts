import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Create a new chat session
export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create new chat session
    // Type assertion needed due to Supabase type inference limitations
    const { data: session, error: sessionError } = await (supabase
      .from('chat_sessions') as any)
      .insert({
        user_id: user.id,
        session_status: 'active',
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating chat session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create chat session', details: sessionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error: unknown) {
    console.error('Error in POST /api/chat:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: List user's chat sessions with pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // 'active' or 'ended'
    
    const offset = (page - 1) * limit;

    // Build query
    // Type assertion needed due to Supabase type inference limitations
    let query = (supabase
      .from('chat_sessions') as any)
      .select('*, chat_messages(count)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status === 'active' || status === 'ended') {
      query = query.eq('session_status', status);
    }

    const { data: sessions, error: sessionsError, count } = await query;

    if (sessionsError) {
      console.error('Error fetching chat sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch chat sessions', details: sessionsError.message },
        { status: 500 }
      );
    }

    // Get evaluations for these sessions
    const sessionIds = sessions?.map((s: any) => s.id) || [];
    // Type assertion needed due to Supabase type inference limitations
    const { data: evaluations } = await (supabase
      .from('evaluations') as any)
      .select('chat_session_id, scores')
      .in('chat_session_id', sessionIds);

    // Map evaluations to sessions
    const evaluationsMap = new Map(
      evaluations?.map((e: any) => [e.chat_session_id, e]) || []
    );

    const sessionsWithEvaluations = sessions?.map((session: any) => ({
      ...session,
      has_evaluation: evaluationsMap.has(session.id),
    }));

    return NextResponse.json({
      sessions: sessionsWithEvaluations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/chat:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


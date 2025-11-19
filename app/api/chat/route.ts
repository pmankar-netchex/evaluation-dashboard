import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: Create a new chat session
export async function POST(request: NextRequest) {
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

    // Parse request body for optional messaging_session_id and messaging_session_name
    let messagingSessionId: string | undefined;
    let messagingSessionName: string | undefined;
    try {
      const body = await request.json();
      messagingSessionId = body.messaging_session_id;
      messagingSessionName = body.messaging_session_name;
    } catch {
      // Body is optional, continue without it
    }

    // Create new chat session
    // Type assertion needed due to Supabase type inference limitations
    const { data: session, error: sessionError } = await (supabase
      .from('chat_sessions') as any)
      .insert({
        user_id: user.id,
        session_status: 'active',
        messaging_session_id: messagingSessionId || null,
        messaging_session_name: messagingSessionName || null,
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
    const allUsers = searchParams.get('all_users') === 'true'; // For logs page - all ended sessions with feedback
    
    const offset = (page - 1) * limit;

    // Build query based on access rules:
    // 1. For active chat (status=active): only active sessions for current user
    // 2. For history (no status filter): all sessions for current user (active + ended)
    // 3. For logs (all_users=true): all ended sessions with feedback (irrespective of user)
    // Type assertion needed due to Supabase type inference limitations
    
    let sessions: any[] = [];
    let totalCount = 0;

    if (allUsers) {
      // Logs page mode: show all ended sessions with feedback (irrespective of user)
      // First, get all chat session IDs that have evaluations (feedback submitted)
      const { data: evaluations } = await (supabase
        .from('evaluations') as any)
        .select('chat_session_id')
        .not('chat_session_id', 'is', null);

      const sessionIdsWithFeedback = evaluations
        ?.map((e: any) => e.chat_session_id)
        .filter((id: string) => id !== null) || [];
      
      if (sessionIdsWithFeedback.length > 0) {
        // Get all ended sessions that have feedback
        const { data, error: sessionsError, count } = await (supabase
          .from('chat_sessions') as any)
          .select('*, chat_messages(count)', { count: 'exact' })
          .eq('session_status', 'ended')
          .in('id', sessionIdsWithFeedback)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (sessionsError) {
          console.error('Error fetching chat sessions:', sessionsError);
          return NextResponse.json(
            { error: 'Failed to fetch chat sessions', details: sessionsError.message },
            { status: 500 }
          );
        }
        
        sessions = data || [];
        totalCount = count || 0;
      } else {
        // No sessions with feedback
        sessions = [];
        totalCount = 0;
      }
    } else if (status === 'active') {
      // Active chat mode: only active sessions for current user
      const { data, error: sessionsError, count } = await (supabase
        .from('chat_sessions') as any)
        .select('*, chat_messages(count)', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('session_status', 'active')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (sessionsError) {
        console.error('Error fetching chat sessions:', sessionsError);
        return NextResponse.json(
          { error: 'Failed to fetch chat sessions', details: sessionsError.message },
          { status: 500 }
        );
      }
      
      sessions = data || [];
      totalCount = count || 0;
    } else {
      // History mode: all sessions for current user (active + ended, no status filter)
      // If status=ended is specified, only show ended sessions for current user
      let query = (supabase
        .from('chat_sessions') as any)
        .select('*, chat_messages(count)', { count: 'exact' })
        .eq('user_id', user.id);
      
      if (status === 'ended') {
        query = query.eq('session_status', 'ended');
      }
      // If no status filter, show both active and ended (all sessions for user)
      
      query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      
      const { data, error: sessionsError, count } = await query;
      
      if (sessionsError) {
        console.error('Error fetching chat sessions:', sessionsError);
        return NextResponse.json(
          { error: 'Failed to fetch chat sessions', details: sessionsError.message },
          { status: 500 }
        );
      }
      
      sessions = data || [];
      totalCount = count || 0;
    }

    // Get evaluations for these sessions
    const sessionIds = sessions?.map((s: any) => s.id) || [];
    // Type assertion needed due to Supabase type inference limitations
    const { data: sessionEvaluations } = await (supabase
      .from('evaluations') as any)
      .select('chat_session_id, scores')
      .in('chat_session_id', sessionIds);

    // Map evaluations to sessions
    const evaluationsMap = new Map(
      sessionEvaluations?.map((e: any) => [e.chat_session_id, e]) || []
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
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
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


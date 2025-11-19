import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/database.types';

type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];

// GET: Retrieve session details and messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate sessionId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      console.error('Invalid sessionId format:', sessionId);
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // Get session - allow cross-user access for ended sessions with feedback
    // RLS policy allows all authenticated users to view all sessions
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    // Type assertion to fix TypeScript inference issue with .single()
    const typedSession = session as ChatSession | null;

    if (sessionError) {
      // Check if it's a "not found" error (PGRST116) or other error
      if (sessionError.code === 'PGRST116' || sessionError.message?.includes('No rows')) {
        console.log(`Session not found: ${sessionId} for user: ${user.id}`);
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      // Other database errors
      console.error('Error fetching session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to fetch session', details: sessionError.message },
        { status: 500 }
      );
    }

    if (!typedSession) {
      console.log(`Session not found: ${sessionId} for user: ${user.id}`);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check access permissions:
    // - Users can always view their own sessions
    // - Users can view ended sessions with feedback (from any user)
    // - Users cannot view active sessions from other users
    if (typedSession.user_id !== user.id) {
      // Check if session is ended and has feedback
      if (typedSession.session_status !== 'ended') {
        return NextResponse.json(
          { error: 'Forbidden: You can only view your own active sessions' },
          { status: 403 }
        );
      }

      // Check if session has evaluation (feedback) - we'll reuse this below
      const { data: evaluationCheck } = await supabase
        .from('evaluations')
        .select('id')
        .eq('chat_session_id', sessionId)
        .single();

      if (!evaluationCheck) {
        return NextResponse.json(
          { error: 'Forbidden: You can only view ended sessions that have feedback' },
          { status: 403 }
        );
      }
    }

    // Get messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesError.message },
        { status: 500 }
      );
    }

    // Get evaluation details (reuse if we already checked above, or fetch full details)
    const { data: evaluation } = await supabase
      .from('evaluations')
      .select('*')
      .eq('chat_session_id', sessionId)
      .single();

    return NextResponse.json({
      session: typedSession,
      messages: messages || [],
      evaluation: evaluation || null,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/chat/[sessionId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT: Update session status (end session)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { session_status } = body;
    
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate status
    if (session_status !== 'active' && session_status !== 'ended') {
      return NextResponse.json(
        { error: 'Invalid session status' },
        { status: 400 }
      );
    }

    // Validate sessionId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      console.error('Invalid sessionId format:', sessionId);
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // First, check if session exists and belongs to the user
    const { data: existingSession, error: checkError } = await supabase
      .from('chat_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();
    
    // Type assertion to fix TypeScript inference issue with .single()
    const typedExistingSession = existingSession as { id: string; user_id: string } | null;

    if (checkError) {
      if (checkError.code === 'PGRST116' || checkError.message?.includes('No rows')) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }
      console.error('Error checking session:', checkError);
      return NextResponse.json(
        { error: 'Failed to check session', details: checkError.message },
        { status: 500 }
      );
    }

    if (!typedExistingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session belongs to the user
    if (typedExistingSession.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own sessions' },
        { status: 403 }
      );
    }

    // Update session
    const updateData: any = { session_status };
    if (session_status === 'ended') {
      updateData.ended_at = new Date().toISOString();
    }

    // Type assertion needed due to Supabase type inference limitations
    // Note: We don't use .single() here to avoid PGRST116 error when 0 rows are updated
    // Instead, we check if the result array has any items
    const { data: sessions, error: updateError } = await (supabase
      .from('chat_sessions') as any)
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session', details: updateError.message },
        { status: 500 }
      );
    }

    // Check if any rows were updated
    if (!sessions || sessions.length === 0) {
      // This shouldn't happen after our pre-check, but handle it gracefully
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Return the first (and should be only) updated session
    return NextResponse.json(sessions[0]);
  } catch (error: unknown) {
    console.error('Error in PUT /api/chat/[sessionId]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


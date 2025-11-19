import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SierraClient } from '@/lib/sierra/client';

// POST: Send message and get Sierra response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { content } = body;
    
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
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
    // Type assertion needed due to Supabase type inference limitations
    const { data: session, error: sessionError } = await (supabase
      .from('chat_sessions') as any)
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

    // Check if session is active
    if (session.session_status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      );
    }

    // Save user message to database
    // Type assertion needed due to Supabase type inference limitations
    const { data: userMessage, error: userMessageError } = await (supabase
      .from('chat_messages') as any)
      .insert({
        session_id: sessionId,
        role: 'user',
        content: content.trim(),
      })
      .select()
      .single();

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
      return NextResponse.json(
        { error: 'Failed to save message', details: userMessageError.message },
        { status: 500 }
      );
    }

    // Get Sierra API credentials from environment
    const sierraApiUrl = process.env.SIERRA_API_URL;
    const sierraApiKey = process.env.SIERRA_API_KEY;
    const sierraApiToken = process.env.SIERRA_API_TOKEN;

    if (!sierraApiUrl || !sierraApiKey || !sierraApiToken) {
      console.error('Missing Sierra API configuration');
      return NextResponse.json(
        { error: 'Sierra API not configured' },
        { status: 500 }
      );
    }

    // Initialize Sierra client with stored conversation state (not sessionId!)
    const sierraClient = new SierraClient(
      sierraApiUrl,
      sierraApiKey,
      sierraApiToken,
      '2025-02-01',
      session.sierra_conversation_state || undefined // Use stored Sierra state or undefined for new conversations
    );

    // Get Sierra response
    let sierraResponse;
    try {
      sierraResponse = await sierraClient.sendMessage(content.trim());
      
      // Store/update Sierra's conversation state for subsequent messages
      const updatedState = sierraClient.getState();
      if (updatedState && updatedState !== session.sierra_conversation_state) {
        // Type assertion needed due to Supabase type inference limitations
        await (supabase
          .from('chat_sessions') as any)
          .update({ sierra_conversation_state: updatedState })
          .eq('id', sessionId);
      }
    } catch (sierraError: unknown) {
      console.error('Error getting Sierra response:', sierraError);
      return NextResponse.json(
        { 
          error: 'Failed to get Sierra response', 
          details: sierraError instanceof Error ? sierraError.message : 'Unknown error',
          userMessage 
        },
        { status: 500 }
      );
    }

    // Save Sierra response to database
    // Type assertion needed due to Supabase type inference limitations
    const { data: assistantMessage, error: assistantMessageError } = await (supabase
      .from('chat_messages') as any)
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: sierraResponse.message,
      })
      .select()
      .single();

    if (assistantMessageError) {
      console.error('Error saving assistant message:', assistantMessageError);
      return NextResponse.json(
        { 
          error: 'Failed to save Sierra response', 
          details: assistantMessageError.message,
          userMessage,
          sierraResponse: sierraResponse.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userMessage,
      assistantMessage,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/chat/[sessionId]/messages:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


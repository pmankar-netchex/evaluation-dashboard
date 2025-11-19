import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/database.types';

type Transcript = Database['public']['Tables']['transcripts']['Row'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messagingSessionId: string }> }
) {
  try {
    const { messagingSessionId } = await params;
    const supabase = await createServiceClient();

    // Check if transcript exists in database by messaging_session_id
    // Type assertion needed due to Supabase type inference limitations
    const { data: existingTranscript, error: fetchError } = await (supabase
      .from('transcripts') as any)
      .select('*')
      .eq('messaging_session_id', messagingSessionId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single() as { data: Transcript | null; error: any };

    if (existingTranscript && !fetchError) {
      return NextResponse.json(existingTranscript);
    }

    // If not found in database, return error
    // Note: We don't fetch from Salesforce here as MessagingSessionId lookup
    // would require different Salesforce API endpoints
    return NextResponse.json(
      { error: 'Transcript not found for this MessagingSessionId' },
      { status: 404 }
    );
  } catch (error: unknown) {
    console.error('Error fetching transcript by MessagingSessionId:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


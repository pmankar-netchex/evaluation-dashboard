import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/database.types';
import { SalesforceSession } from '@/lib/salesforce/client';
import {
  getConversationIdentifierByMessagingSessionName,
  getConversationEntries,
} from '@/lib/salesforce/conversation';

type Transcript = Database['public']['Tables']['transcripts']['Row'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    const supabase = await createServiceClient();

    console.log(`Searching for transcript with messaging_session_name: "${decodedName}"`);

    // Check if transcript exists in database by messaging_session_name
    // Type assertion needed due to Supabase type inference limitations
    const { data: existingTranscript, error: fetchError } = await (supabase
      .from('transcripts') as any)
      .select('*')
      .eq('messaging_session_name', decodedName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .maybeSingle() as { data: Transcript | null; error: any };

    if (fetchError) {
      console.error('Error fetching transcript by MessagingSessionName:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch transcript', details: fetchError.message },
        { status: 500 }
      );
    }

    if (existingTranscript) {
      console.log(`Found transcript with id: ${existingTranscript.id}`);
      return NextResponse.json(existingTranscript);
    }

    // If not found, try case-insensitive search as fallback
    console.log(`No exact match found, trying case-insensitive search...`);
    const { data: caseInsensitiveTranscript, error: caseInsensitiveError } = await (supabase
      .from('transcripts') as any)
      .select('*')
      .ilike('messaging_session_name', decodedName)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .maybeSingle() as { data: Transcript | null; error: any };

    if (!caseInsensitiveError && caseInsensitiveTranscript) {
      console.log(`Found transcript with case-insensitive match, id: ${caseInsensitiveTranscript.id}`);
      return NextResponse.json(caseInsensitiveTranscript);
    }

    // If not found in database, fetch from Salesforce
    console.log(`Transcript not found in database for MessagingSessionName: "${decodedName}", fetching from Salesforce...`);

    // Validate environment variables
    const salesforceClientId = process.env.SALESFORCE_CLIENT_ID;
    const salesforceClientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const salesforceOauthUrl = process.env.SALESFORCE_OAUTH_URL;

    if (!salesforceClientId || !salesforceClientSecret || !salesforceOauthUrl) {
      const missing = [];
      if (!salesforceClientId) missing.push('SALESFORCE_CLIENT_ID');
      if (!salesforceClientSecret) missing.push('SALESFORCE_CLIENT_SECRET');
      if (!salesforceOauthUrl) missing.push('SALESFORCE_OAUTH_URL');
      
      return NextResponse.json(
        { 
          error: 'Missing required environment variables', 
          details: `Please configure: ${missing.join(', ')}` 
        },
        { status: 500 }
      );
    }

    // Fetch from Salesforce
    const salesforceSession = new SalesforceSession(
      salesforceClientId,
      salesforceClientSecret,
      salesforceOauthUrl
    );

    await salesforceSession.authenticate();

    const conversationResult = await getConversationIdentifierByMessagingSessionName(
      salesforceSession,
      decodedName,
      process.env.SALESFORCE_API_VERSION || 'v65.0'
    );

    if (!conversationResult) {
      return NextResponse.json(
        { error: 'Conversation not found for this MessagingSessionName', searchedName: decodedName },
        { status: 404 }
      );
    }

    const { conversationIdentifier, messagingSessionId, messagingSessionName, caseNumber } = conversationResult;

    const agentforceEntries = await getConversationEntries(
      salesforceSession,
      conversationIdentifier,
      process.env.SALESFORCE_API_VERSION || 'v65.0'
    );

    // Save to database with empty Sierra transcript (will be generated later)
    // Use case number if available, otherwise keep it null
    // Check if transcript with this messaging_session_name already exists (in case of retry)
    const { data: existingByName } = await (supabase
      .from('transcripts') as any)
      .select('*')
      .eq('messaging_session_name', messagingSessionName || decodedName)
      .maybeSingle();

    if (existingByName) {
      // Update existing transcript
      const { data: updatedTranscript, error: updateError } = await (supabase
        .from('transcripts') as any)
        .update({
          agentforce_transcript: agentforceEntries,
          case_number: caseNumber || null,
          messaging_session_id: messagingSessionId || existingByName.messaging_session_id,
          messaging_session_name: messagingSessionName || decodedName,
          updated_at: new Date().toISOString(),
        })
        .eq('messaging_session_name', messagingSessionName || decodedName)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating transcript:', updateError);
        return NextResponse.json(
          { error: 'Failed to update transcript', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json(updatedTranscript);
    }

    // Ensure messagingSessionId is available (should always be from the function)
    if (!messagingSessionId) {
      return NextResponse.json(
        { error: 'MessagingSessionId is required but was not found in Salesforce' },
        { status: 500 }
      );
    }

    // Type assertion needed due to Supabase type inference limitations
    const { data: savedTranscript, error: saveError } = await (supabase
      .from('transcripts') as any)
      .insert({
        case_number: caseNumber || null,
        agentforce_transcript: agentforceEntries,
        sierra_transcript: [], // Empty array - will be populated when Sierra replay is triggered
        sierra_version: process.env.SIERRA_VERSION || 'v2.1.0',
        messaging_session_id: messagingSessionId, // Required, always set
        messaging_session_name: messagingSessionName || decodedName,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving transcript:', saveError);
      return NextResponse.json(
        { error: 'Failed to save transcript', details: saveError.message },
        { status: 500 }
      );
    }

    console.log(`Successfully fetched and saved transcript from Salesforce for MessagingSessionName: "${decodedName}"`);
    return NextResponse.json(savedTranscript);
  } catch (error: unknown) {
    console.error('Error fetching transcript by MessagingSessionName:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


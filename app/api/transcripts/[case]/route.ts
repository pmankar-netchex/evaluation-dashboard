import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { SalesforceSession } from '@/lib/salesforce/client';
import {
  getConversationIdentifier,
  getConversationEntries,
} from '@/lib/salesforce/conversation';
import { SierraClient } from '@/lib/sierra/client';
import { replayToSierra } from '@/lib/sierra/replay';
import { Database } from '@/lib/supabase/database.types';
import { ConversationEntry } from '@/types/salesforce';

type Transcript = Database['public']['Tables']['transcripts']['Row'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ case: string }> }
) {
  try {
    const { case: caseNumber } = await params;
    const supabase = await createServiceClient();

    // Check if transcript exists in database
    // Type assertion needed due to Supabase type inference limitations
    const { data: existingTranscript, error: fetchError } = await (supabase
      .from('transcripts') as any)
      .select('*')
      .eq('case_number', caseNumber)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .single() as { data: Transcript | null; error: any };

    if (existingTranscript && !fetchError) {
      return NextResponse.json(existingTranscript);
    }

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

    // Fetch from Salesforce only
    const salesforceSession = new SalesforceSession(
      salesforceClientId,
      salesforceClientSecret,
      salesforceOauthUrl
    );

    await salesforceSession.authenticate();

    const conversationIdentifier = await getConversationIdentifier(
      salesforceSession,
      caseNumber,
      process.env.SALESFORCE_API_VERSION || 'v65.0'
    );

    if (!conversationIdentifier) {
      return NextResponse.json(
        { error: 'Conversation not found for this case number' },
        { status: 404 }
      );
    }

    const agentforceEntries = await getConversationEntries(
      salesforceSession,
      conversationIdentifier,
      process.env.SALESFORCE_API_VERSION || 'v65.0'
    );

    // Save to database with empty Sierra transcript (will be generated later)
    // Type assertion needed due to Supabase type inference limitations
    const { data: savedTranscript, error: saveError } = await (supabase
      .from('transcripts') as any)
      .insert({
        case_number: caseNumber,
        agentforce_transcript: agentforceEntries,
        sierra_transcript: [], // Empty array - will be populated when Sierra replay is triggered
        sierra_version: process.env.SIERRA_VERSION || 'v2.1.0',
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

    return NextResponse.json(savedTranscript);
  } catch (error: unknown) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcript', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ case: string }> }
) {
  try {
    const { case: caseNumber } = await params;
    console.log(`Generating Sierra transcript for case: ${caseNumber}`);
    const supabase = await createServiceClient();

    // Get existing transcript - try both with and without leading zeros
    // Type assertion needed due to Supabase type inference limitations
    let { data: existingTranscript, error: fetchError } = await (supabase
      .from('transcripts') as any)
      .select('*')
      .eq('case_number', caseNumber)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .maybeSingle() as { data: Transcript | null; error: any };

    // If not found, try without leading zeros (in case of format mismatch)
    if (!existingTranscript && !fetchError && caseNumber) {
      const caseWithoutZeros = caseNumber.replace(/^0+/, '');
      if (caseWithoutZeros !== caseNumber) {
        console.log(`Trying case number without leading zeros: ${caseWithoutZeros}`);
        const result = await (supabase
          .from('transcripts') as any)
          .select('*')
          .eq('case_number', caseWithoutZeros)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .maybeSingle() as { data: Transcript | null; error: any };
        existingTranscript = result.data;
        fetchError = result.error;
      }
    }

    if (fetchError) {
      console.error('Error fetching transcript:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch transcript from database', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!existingTranscript) {
      console.error(`Transcript not found for case number: ${caseNumber}`);
      return NextResponse.json(
        { error: 'Transcript not found. Please load Salesforce transcript first.' },
        { status: 404 }
      );
    }

    // Check if Sierra transcript already exists
    if (existingTranscript.sierra_transcript && 
        Array.isArray(existingTranscript.sierra_transcript) && 
        existingTranscript.sierra_transcript.length > 0) {
      return NextResponse.json(existingTranscript);
    }

    // Validate Sierra environment variables
    const sierraApiKey = process.env.SIERRA_API_KEY;
    const sierraApiToken = process.env.SIERRA_API_TOKEN;
    const sierraApiUrl = process.env.SIERRA_API_URL || 'https://api.sierra.chat';

    if (!sierraApiKey || !sierraApiToken) {
      const missing = [];
      if (!sierraApiKey) missing.push('SIERRA_API_KEY');
      if (!sierraApiToken) missing.push('SIERRA_API_TOKEN');
      
      return NextResponse.json(
        { 
          error: 'Missing required environment variables', 
          details: `Please configure: ${missing.join(', ')}` 
        },
        { status: 500 }
      );
    }

    // Generate Sierra transcript
    // Don't pass state initially - Sierra will return state in first response
    // and we'll use that for subsequent messages to maintain conversation continuity
    const sierraClient = new SierraClient(
      sierraApiUrl,
      sierraApiKey,
      sierraApiToken,
      '2025-02-01'
      // No state parameter - Sierra will return it in the first response
    );

    const agentforceEntries = existingTranscript.agentforce_transcript as any[];
    
    let sierraEntries: ConversationEntry[];
    try {
      sierraEntries = await replayToSierra(
        agentforceEntries, 
        sierraClient,
        undefined, // No progress callback for non-streaming endpoint
        caseNumber // Pass case ID to ensure single conversation per case
      );
    } catch (sierraError: unknown) {
      console.error('Error generating Sierra transcript:', sierraError);
      const errorMessage = sierraError instanceof Error ? sierraError.message : String(sierraError);
      return NextResponse.json(
        { 
          error: 'Failed to generate Sierra transcript', 
          details: errorMessage,
          suggestion: 'Please check your Sierra API credentials and network connection.'
        },
        { status: 500 }
      );
    }

    // Update database with Sierra transcript
    // Type assertion needed due to Supabase type inference limitations
    const { data: updatedTranscript, error: updateError } = await (supabase
      .from('transcripts') as any)
      .update({
        sierra_transcript: sierraEntries,
        sierra_version: process.env.SIERRA_VERSION || 'v2.1.0',
      })
      .eq('case_number', caseNumber)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating transcript:', updateError);
      return NextResponse.json(
        { error: 'Failed to update transcript with Sierra data', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedTranscript);
  } catch (error: unknown) {
    console.error('Error generating Sierra transcript:', error);
    return NextResponse.json(
      { error: 'Failed to generate Sierra transcript', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


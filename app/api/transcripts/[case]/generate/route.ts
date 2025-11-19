import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { SierraClient } from '@/lib/sierra/client';
import { replayToSierra, ProgressCallback } from '@/lib/sierra/replay';
import { Database } from '@/lib/supabase/database.types';

type Transcript = Database['public']['Tables']['transcripts']['Row'];

// Ensure this route uses Node.js runtime (not Edge) for streaming support
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ case: string }> }
) {
  try {
    const { case: identifier } = await params;
    
    if (!identifier) {
      return new Response(
        JSON.stringify({ type: 'error', message: 'Case number or transcript ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  
  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;
      
      const sendEvent = (data: any) => {
        if (isClosed) {
          console.warn('Attempted to send event after stream closed');
          return;
        }
        try {
          // Check if controller is still open before enqueueing
          if (controller.desiredSize === null) {
            // Stream is closed or errored
            isClosed = true;
            console.warn('Attempted to send event after stream closed');
            return;
          }
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (err: unknown) {
          // If error is due to closed controller, mark as closed
          const errorCode = (err as { code?: string })?.code;
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (errorCode === 'ERR_INVALID_STATE' || errorMessage.includes('closed')) {
            isClosed = true;
          }
          console.error('Error sending event:', err);
        }
      };

      const closeStream = () => {
        if (isClosed) {
          return;
        }
        try {
          // Check if controller is still open before closing
          if (controller.desiredSize !== null) {
            isClosed = true;
            controller.close();
          } else {
            // Already closed or errored
            isClosed = true;
          }
        } catch (err: unknown) {
          // If we get an error, the stream is likely already closed
          isClosed = true;
          // Only log if it's not the expected "already closed" error
          const errorCode = (err as { code?: string })?.code;
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (errorCode !== 'ERR_INVALID_STATE' && !errorMessage.includes('closed')) {
            console.error('Error closing stream:', err);
          }
        }
      };

      try {
        // Send initial connection message
        sendEvent({ type: 'connected', message: 'Connected to progress stream' });

        const supabase = await createServiceClient();

        // Get existing transcript - try by ID first (UUID format), then by case number
        let existingTranscript: Transcript | null = null;
        let fetchError: any = null;

        // Check if identifier is a UUID (transcript ID)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
        
        if (isUUID) {
          const result = await supabase
            .from('transcripts')
            .select('*')
            .eq('id', identifier)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .maybeSingle() as { data: Transcript | null; error: any };
          existingTranscript = result.data;
          fetchError = result.error;
        } else {
          // Try by case number
          const result = await supabase
            .from('transcripts')
            .select('*')
            .eq('case_number', identifier)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .maybeSingle() as { data: Transcript | null; error: any };
          existingTranscript = result.data;
          fetchError = result.error;

          // Fallback for case number format (without leading zeros)
          if (!existingTranscript && !fetchError && identifier) {
            const caseWithoutZeros = identifier.replace(/^0+/, '');
            if (caseWithoutZeros !== identifier) {
              const fallbackResult = await supabase
                .from('transcripts')
                .select('*')
                .eq('case_number', caseWithoutZeros)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .maybeSingle() as { data: Transcript | null; error: any };
              existingTranscript = fallbackResult.data;
              fetchError = fallbackResult.error;
            }
          }
        }

        if (fetchError) {
          sendEvent({
            type: 'error',
            message: 'Failed to fetch transcript from database',
            details: fetchError.message,
          });
          closeStream();
          return;
        }

        if (!existingTranscript) {
          sendEvent({
            type: 'error',
            message: 'Transcript not found. Please load Salesforce transcript first.',
          });
          closeStream();
          return;
        }

        // Check if Sierra transcript already exists
        if (
          existingTranscript.sierra_transcript &&
          Array.isArray(existingTranscript.sierra_transcript) &&
          existingTranscript.sierra_transcript.length > 0
        ) {
          sendEvent({
            type: 'complete',
            message: 'Sierra transcript already exists',
            transcript: existingTranscript,
          });
          closeStream();
          return;
        }

        // Validate Sierra environment variables
        const sierraApiKey = process.env.SIERRA_API_KEY;
        const sierraApiToken = process.env.SIERRA_API_TOKEN;
        const sierraApiUrl = process.env.SIERRA_API_URL || 'https://api.sierra.chat';

        if (!sierraApiKey || !sierraApiToken) {
          const missing = [];
          if (!sierraApiKey) missing.push('SIERRA_API_KEY');
          if (!sierraApiToken) missing.push('SIERRA_API_TOKEN');

          sendEvent({
            type: 'error',
            message: 'Missing required environment variables',
            details: `Please configure: ${missing.join(', ')}`,
          });
          closeStream();
          return;
        }

        // Create progress callback
        const progressCallback: ProgressCallback = (progress) => {
          sendEvent({
            type: 'progress',
            ...progress,
          });
        };

        // Generate Sierra transcript with progress updates
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

        // Use case number if available, otherwise use transcript ID for Sierra conversation ID
        const sierraConversationId = existingTranscript.case_number || existingTranscript.id;

        sendEvent({
          type: 'start',
          message: 'Starting Sierra transcript generation...',
        });

        const sierraEntries = await replayToSierra(
          agentforceEntries,
          sierraClient,
          progressCallback,
          sierraConversationId // Pass identifier to ensure single conversation
        );

        // Update database with Sierra transcript
        sendEvent({
          type: 'saving',
          message: 'Saving Sierra transcript to database...',
        });

        const updateData = {
          sierra_transcript: sierraEntries,
          sierra_version: process.env.SIERRA_VERSION || 'v2.1.0',
        };

        // Update by ID if identifier is UUID, otherwise by case_number
        // Type assertion needed due to Supabase type inference limitations
        const updateQuery = isUUID 
          ? (supabase.from('transcripts') as any).update(updateData).eq('id', identifier)
          : (supabase.from('transcripts') as any).update(updateData).eq('case_number', identifier);
        
        const { data: updatedTranscript, error: updateError } = await updateQuery
          .select()
          .single();
        
        const typedUpdatedTranscript = updatedTranscript as Transcript | null;

        if (updateError) {
          sendEvent({
            type: 'error',
            message: 'Failed to update transcript with Sierra data',
            details: updateError.message,
          });
          closeStream();
          return;
        }

        // Send completion event
        sendEvent({
          type: 'complete',
          message: 'Sierra transcript generated successfully',
          transcript: typedUpdatedTranscript,
        });

        closeStream();
      } catch (error: unknown) {
        console.error('Error in Sierra generation stream:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        try {
          sendEvent({
            type: 'error',
            message: 'Failed to generate Sierra transcript',
            details: errorMessage,
          });
        } catch (sendError) {
          console.error('Error sending error event:', sendError);
        }
        closeStream();
      }
    },
  });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for nginx
      },
    });
  } catch (error: unknown) {
    console.error('Error setting up Sierra generation stream:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        type: 'error',
        message: 'Failed to initialize stream',
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}


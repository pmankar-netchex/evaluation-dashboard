import { SierraClient } from './client';
import { ConversationEntry } from '@/types/salesforce';
import { decodeHtmlEntities } from '@/lib/utils/html-entities';

/**
 * Extract end-user messages from Agentforce transcript
 */
function extractEndUserMessages(
  entries: ConversationEntry[]
): Array<{ message: string; timestamp: number }> {
  return entries
    .filter((entry) => {
      // Filter for EndUser messages that have valid message text
      return (
        entry.sender?.role === 'EndUser' &&
        entry.messageText &&
        typeof entry.messageText === 'string' &&
        entry.messageText.trim().length > 0 &&
        entry.clientTimestamp
      );
    })
    .map((entry) => {
      // Decode HTML entities before sending to Sierra API
      const decodedMessage = decodeHtmlEntities(entry.messageText!.trim());
      return {
        message: decodedMessage,
        timestamp: entry.clientTimestamp!,
      };
    });
}

export interface ProgressCallback {
  (progress: {
    current: number;
    total: number;
    message: string;
    status: 'processing' | 'complete' | 'error';
  }): void;
}

/**
 * Replay Agentforce transcript messages to Sierra API and generate Sierra transcript
 * @param agentforceEntries - The Agentforce conversation entries to replay
 * @param sierraClient - The Sierra client instance (will receive state from Sierra on first message)
 * @param onProgress - Optional progress callback
 * @param caseId - The case ID for logging purposes (not sent as state - Sierra returns its own state)
 */
export async function replayToSierra(
  agentforceEntries: ConversationEntry[],
  sierraClient: SierraClient,
  onProgress?: ProgressCallback,
  caseId?: string
): Promise<ConversationEntry[]> {
  // Note: We don't set state initially - Sierra will return state in the first response
  // and we'll use that state for subsequent messages in this conversation
  const userMessages = extractEndUserMessages(agentforceEntries);
  const sierraEntries: ConversationEntry[] = [];

  // Sort user messages by timestamp
  const sortedMessages = userMessages.sort(
    (a, b) => a.timestamp - b.timestamp
  );

  const totalMessages = sortedMessages.length;
  
  // Notify progress: starting
  onProgress?.({
    current: 0,
    total: totalMessages,
    message: `Starting Sierra transcript generation for ${totalMessages} messages...`,
    status: 'processing',
  });

  const conversationStartTime = sortedMessages[0]?.timestamp || Date.now();

  console.log(`Starting replay loop with ${sortedMessages.length} messages`);

  for (let i = 0; i < sortedMessages.length; i++) {
    const userMessage = sortedMessages[i];
    const currentIndex = i + 1;

    console.log(`Processing message ${currentIndex}/${totalMessages} (loop index ${i})`);

    // Validate message before processing
    if (!userMessage.message || !userMessage.message.trim()) {
      console.warn(`Skipping empty message at index ${i}`);
      onProgress?.({
        current: currentIndex,
        total: totalMessages,
        message: `Skipping empty message ${currentIndex}/${totalMessages}`,
        status: 'processing',
      });
      continue;
    }

    // Add user message to Sierra transcript
    sierraEntries.push({
      identifier: `sierra-user-${i}`,
      messageText: userMessage.message,
      clientTimestamp: userMessage.timestamp,
      serverReceivedTimestamp: userMessage.timestamp + 100,
      sender: {
        role: 'EndUser',
      },
      type: 'Message',
    });

    // Notify progress: sending message
    onProgress?.({
      current: currentIndex,
      total: totalMessages,
      message: `Sending message ${currentIndex}/${totalMessages} to Sierra...`,
      status: 'processing',
    });

    // Send to Sierra API and get response
    // Note: We're using the same SierraClient instance, which maintains conversation state
    // via the state parameter (returned by Sierra) and token. First message has no state,
    // Sierra returns state in response, and subsequent messages use that state.
    // This ensures one continuous conversation per case.
    try {
      const hasState = sierraClient.getState();
      const stateInfo = hasState ? `state: ${hasState.substring(0, 20)}..., ` : 'no state (first message), ';
      const caseInfo = caseId ? `case: ${caseId}, ` : '';
      console.log(`Sending message ${currentIndex}/${totalMessages} to Sierra (${caseInfo}${stateInfo}token: ${sierraClient.getToken().substring(0, 20)}...):`, userMessage.message.substring(0, 100));
      const sierraResponse = await sierraClient.sendMessage(
        userMessage.message
      );

      console.log(`Received Sierra response for message ${currentIndex}, message length: ${sierraResponse.message?.length || 0}`);

      // Log if token or state was updated (confirms conversation state is being maintained)
      if (sierraResponse.token && sierraResponse.token !== sierraClient.getToken()) {
        console.log(`Token updated for message ${currentIndex}`);
      }
      if (sierraClient.getState() && !hasState) {
        console.log(`State received from Sierra for message ${currentIndex}, conversation state established`);
      }

      // Add Sierra bot response
      const responseTimestamp = userMessage.timestamp + 2000; // Assume 2s delay
      sierraEntries.push({
        identifier: `sierra-bot-${i}`,
        messageText: sierraResponse.message || '',
        clientTimestamp: responseTimestamp,
        serverReceivedTimestamp: responseTimestamp + 100,
        sender: {
          role: 'Bot',
          appType: 'chatbot',
        },
        type: 'Message',
      });

      console.log(`Added Sierra bot response for message ${currentIndex}, total entries: ${sierraEntries.length}`);

      // Notify progress: message completed
      onProgress?.({
        current: currentIndex,
        total: totalMessages,
        message: `Completed message ${currentIndex}/${totalMessages}`,
        status: 'processing',
      });

      console.log(`Progress notified for message ${currentIndex}/${totalMessages}`);

      // Add a small delay between messages to avoid rate limiting
      if (i < sortedMessages.length - 1) {
        console.log(`Waiting 500ms before next message (${i + 1}/${sortedMessages.length})`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(`Delay complete, continuing to next message`);
      } else {
        console.log(`All messages processed (${currentIndex}/${totalMessages})`);
      }
    } catch (error) {
      console.error(`Error sending message to Sierra: ${error}`);
      // Add error message to transcript
      sierraEntries.push({
        identifier: `sierra-error-${i}`,
        messageText: `[Error: Failed to get Sierra response]`,
        clientTimestamp: userMessage.timestamp + 2000,
        serverReceivedTimestamp: userMessage.timestamp + 2100,
        sender: {
          role: 'System',
        },
        type: 'Message',
      });
      
      // Notify progress: error
      onProgress?.({
        current: currentIndex,
        total: totalMessages,
        message: `Error processing message ${currentIndex}/${totalMessages}: ${error instanceof Error ? error.message : String(error)}`,
        status: 'error',
      });
    }
  }

  // Notify progress: complete
  console.log(`Replay complete. Generated ${sierraEntries.length} entries from ${totalMessages} user messages`);
  onProgress?.({
    current: totalMessages,
    total: totalMessages,
    message: `Successfully generated Sierra transcript with ${sierraEntries.length} entries`,
    status: 'complete',
  });

  console.log(`Returning ${sierraEntries.length} Sierra entries`);
  return sierraEntries;
}


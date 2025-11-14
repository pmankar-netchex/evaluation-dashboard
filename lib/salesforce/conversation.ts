import { SalesforceSession } from './client';
import {
  SalesforceQueryResponse,
  SalesforceCase,
  SalesforceMessagingSession,
  SalesforceConversation,
  ConversationEntry,
  ConversationEntriesResponse,
} from '@/types/salesforce';

/**
 * Get Conversation Identifier from Case Number via 3-step lookup:
 * 1. Case → Case Id
 * 2. MessagingSession → ConversationId
 * 3. Conversation → ConversationIdentifier
 */
export async function getConversationIdentifier(
  session: SalesforceSession,
  caseNumber: string,
  apiVersion: string
): Promise<string | null> {
  const instanceUrl = session.getInstanceUrl();
  const baseQueryUrl = `${instanceUrl}/services/data/${apiVersion}/query`;

  // Step 1: Get Case Id
  const caseQuery = `SELECT Id FROM Case WHERE CaseNumber='${caseNumber}' LIMIT 1`;
  const queryUrl = `${baseQueryUrl}?q=${encodeURIComponent(caseQuery)}`;
  let response = await session.makeRequest('GET', queryUrl, {
    headers: {},
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query case: ${response.status} ${errorText}`);
  }

  const caseResult: SalesforceQueryResponse<SalesforceCase> =
    await response.json();

  if (!caseResult.records || caseResult.records.length === 0) {
    throw new Error(`No case found: ${caseNumber}`);
  }

  const caseId = caseResult.records[0].Id;

  // Step 2: Get ConversationId
  const messagingQuery = `SELECT ConversationId FROM MessagingSession WHERE CaseId='${caseId}' LIMIT 1`;
  const messagingQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(messagingQuery)}`;
  response = await session.makeRequest('GET', messagingQueryUrl, {
    headers: {},
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query messaging session: ${response.status} ${errorText}`);
  }

  const messagingResult: SalesforceQueryResponse<SalesforceMessagingSession> =
    await response.json();

  if (!messagingResult.records || messagingResult.records.length === 0) {
    throw new Error('No MessagingSession found for this case');
  }

  const conversationId = messagingResult.records[0].ConversationId;

  // Step 3: Get ConversationIdentifier
  const conversationQuery = `SELECT ConversationIdentifier FROM Conversation WHERE Id='${conversationId}' LIMIT 1`;
  const conversationQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(conversationQuery)}`;
  response = await session.makeRequest('GET', conversationQueryUrl, {
    headers: {},
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query conversation: ${response.status} ${errorText}`);
  }

  const conversationResult: SalesforceQueryResponse<SalesforceConversation> =
    await response.json();

  if (!conversationResult.records || conversationResult.records.length === 0) {
    throw new Error('No Conversation found');
  }

  const conversationIdentifier =
    conversationResult.records[0].ConversationIdentifier;

  return conversationIdentifier;
}

/**
 * Retrieve all conversation entries with pagination support
 */
export async function getConversationEntries(
  session: SalesforceSession,
  conversationIdentifier: string,
  apiVersion: string
): Promise<ConversationEntry[]> {
  const instanceUrl = session.getInstanceUrl();
  let entriesUrl = `${instanceUrl}/services/data/${apiVersion}/connect/conversation/${conversationIdentifier}/entries`;

  const allEntries: ConversationEntry[] = [];
  let pageCount = 0;

  while (entriesUrl) {
    pageCount++;
    const response = await session.makeRequest('GET', entriesUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch conversation entries: ${response.status} ${errorText}`
      );
    }

    const entriesData: ConversationEntriesResponse = await response.json();
    const entries = entriesData.conversationEntries || [];
    allEntries.push(...entries);

    if (entriesData.hasMore && entriesData.nextPageUrl) {
      entriesUrl = `${instanceUrl}${entriesData.nextPageUrl}`;
    } else {
      entriesUrl = '';
    }
  }

  return allEntries;
}

/**
 * Parse conversation entries into a structured format
 * Groups messages by conversation turn (user message + bot/agent response)
 */
export function parseTranscriptEntries(
  entries: ConversationEntry[]
): ConversationEntry[] {
  // Sort by timestamp
  return entries.sort(
    (a, b) => a.clientTimestamp - b.clientTimestamp
  );
}


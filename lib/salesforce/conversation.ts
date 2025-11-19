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
 * Result type for getConversationIdentifier
 */
export interface ConversationIdentifierResult {
  conversationIdentifier: string;
  messagingSessionId: string; // Always required
  messagingSessionName: string | null;
  caseNumber?: string | null; // Optional case number for saving transcript
}

/**
 * Get Conversation Identifier from Case Number via 3-step lookup:
 * 1. Case → Case Id
 * 2. MessagingSession → ConversationId and MessagingSessionId (Id)
 * 3. Conversation → ConversationIdentifier
 */
export async function getConversationIdentifier(
  session: SalesforceSession,
  caseNumber: string,
  apiVersion: string
): Promise<ConversationIdentifierResult | null> {
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

  // Step 2: Get ConversationId, MessagingSessionId (Id), and Name
  const messagingQuery = `SELECT Id, ConversationId, Name FROM MessagingSession WHERE CaseId='${caseId}' LIMIT 1`;
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
  const messagingSessionId = messagingResult.records[0].Id; // This is the MessagingSessionId
  const messagingSessionName = messagingResult.records[0].Name || null; // Name field

  // Ensure messagingSessionId is always present
  if (!messagingSessionId) {
    throw new Error('MessagingSessionId is required but was not found in Salesforce response');
  }

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

  return {
    conversationIdentifier,
    messagingSessionId,
    messagingSessionName,
  };
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

  while (entriesUrl) {
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
 * Check if a string looks like a valid Salesforce ID
 * Salesforce IDs are 15 or 18 characters, alphanumeric
 */
function isValidSalesforceId(id: string): boolean {
  // Salesforce IDs are 15 or 18 characters, alphanumeric (case-sensitive)
  // They typically start with specific prefixes like 0MwNs for MessagingSession
  return /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/.test(id);
}

/**
 * Get Conversation Identifier from MessagingSessionId
 * 1. MessagingSession (by Id or Name) → ConversationId, Name
 * 2. Conversation → ConversationIdentifier
 */
export async function getConversationIdentifierByMessagingSessionId(
  session: SalesforceSession,
  messagingSessionId: string,
  apiVersion: string
): Promise<ConversationIdentifierResult | null> {
  const instanceUrl = session.getInstanceUrl();
  const baseQueryUrl = `${instanceUrl}/services/data/${apiVersion}/query`;

  // Step 1: Get ConversationId and Name from MessagingSession
  // Try by Id first if it looks like a valid Salesforce ID, otherwise try by Name
  const escapedId = messagingSessionId.replace(/'/g, "''");
  const isId = isValidSalesforceId(messagingSessionId);
  
  let messagingQuery: string;
  if (isId) {
    messagingQuery = `SELECT Id, ConversationId, Name, CaseId FROM MessagingSession WHERE Id='${escapedId}' LIMIT 1`;
  } else {
    // If it doesn't look like an ID, try querying by Name
    messagingQuery = `SELECT Id, ConversationId, Name, CaseId FROM MessagingSession WHERE Name='${escapedId}' LIMIT 1`;
  }
  
  const messagingQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(messagingQuery)}`;
  const response = await session.makeRequest('GET', messagingQueryUrl, {
    headers: {},
  });

  if (!response.ok) {
    const errorText = await response.text();
    // If querying by ID failed and it looked like an ID, try by Name as fallback
    if (isId && response.status === 400) {
      console.log(`Query by ID failed, trying by Name as fallback for: ${messagingSessionId}`);
      const fallbackQuery = `SELECT Id, ConversationId, Name, CaseId FROM MessagingSession WHERE Name='${escapedId}' LIMIT 1`;
      const fallbackQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(fallbackQuery)}`;
      const fallbackResponse = await session.makeRequest('GET', fallbackQueryUrl, {
        headers: {},
      });
      
      if (fallbackResponse.ok) {
        const fallbackResult: SalesforceQueryResponse<SalesforceMessagingSession> =
          await fallbackResponse.json();
        
        if (fallbackResult.records && fallbackResult.records.length > 0) {
          // Use the fallback result
          const conversationId = fallbackResult.records[0].ConversationId;
          const messagingSessionName = fallbackResult.records[0].Name || null;
          const caseId = fallbackResult.records[0].CaseId;
          const actualMessagingSessionId = fallbackResult.records[0].Id;

          // Continue with conversation lookup
          const conversationQuery = `SELECT ConversationIdentifier FROM Conversation WHERE Id='${conversationId}' LIMIT 1`;
          const conversationQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(conversationQuery)}`;
          const conversationResponse = await session.makeRequest('GET', conversationQueryUrl, {
            headers: {},
          });

          if (!conversationResponse.ok) {
            const errorText = await conversationResponse.text();
            throw new Error(`Failed to query conversation: ${conversationResponse.status} ${errorText}`);
          }

          const conversationResult: SalesforceQueryResponse<SalesforceConversation> =
            await conversationResponse.json();

          if (!conversationResult.records || conversationResult.records.length === 0) {
            throw new Error('No Conversation found');
          }

          const conversationIdentifier =
            conversationResult.records[0].ConversationIdentifier;

          // Get Case Number for saving transcript
          let caseNumber: string | null = null;
          if (caseId) {
            const caseQuery = `SELECT CaseNumber FROM Case WHERE Id='${caseId.replace(/'/g, "''")}' LIMIT 1`;
            const caseQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(caseQuery)}`;
            const caseResponse = await session.makeRequest('GET', caseQueryUrl, {
              headers: {},
            });

            if (caseResponse.ok) {
              const caseResult: SalesforceQueryResponse<SalesforceCase> =
                await caseResponse.json();
              if (caseResult.records && caseResult.records.length > 0) {
                caseNumber = caseResult.records[0].CaseNumber;
              }
            }
          }

          return {
            conversationIdentifier,
            messagingSessionId: actualMessagingSessionId,
            messagingSessionName,
            caseNumber,
          };
        }
      }
    }
    
    throw new Error(`Failed to query messaging session: ${response.status} ${errorText}`);
  }

  let messagingResult: SalesforceQueryResponse<SalesforceMessagingSession> =
    await response.json();

  // If no results and we tried by ID, try by Name as fallback
  if ((!messagingResult.records || messagingResult.records.length === 0) && isId) {
    console.log(`No MessagingSession found by Id, trying by Name: ${messagingSessionId}`);
    const nameQuery = `SELECT Id, ConversationId, Name, CaseId FROM MessagingSession WHERE Name='${escapedId}' LIMIT 1`;
    const nameQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(nameQuery)}`;
    const nameResponse = await session.makeRequest('GET', nameQueryUrl, {
      headers: {},
    });

    if (nameResponse.ok) {
      messagingResult = await nameResponse.json();
    }
  }

  if (!messagingResult.records || messagingResult.records.length === 0) {
    throw new Error(`No MessagingSession found with Id or Name: ${messagingSessionId}`);
  }

  const conversationId = messagingResult.records[0].ConversationId;
  const messagingSessionName = messagingResult.records[0].Name || null;
  const caseId = messagingResult.records[0].CaseId;
  const actualMessagingSessionId = messagingResult.records[0].Id;

  // Ensure messagingSessionId is always present
  if (!actualMessagingSessionId) {
    throw new Error('MessagingSessionId is required but was not found in Salesforce response');
  }

  // Step 2: Get ConversationIdentifier
  const conversationQuery = `SELECT ConversationIdentifier FROM Conversation WHERE Id='${conversationId}' LIMIT 1`;
  const conversationQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(conversationQuery)}`;
  const conversationResponse = await session.makeRequest('GET', conversationQueryUrl, {
    headers: {},
  });

  if (!conversationResponse.ok) {
    const errorText = await conversationResponse.text();
    throw new Error(`Failed to query conversation: ${conversationResponse.status} ${errorText}`);
  }

  const conversationResult: SalesforceQueryResponse<SalesforceConversation> =
    await conversationResponse.json();

  if (!conversationResult.records || conversationResult.records.length === 0) {
    throw new Error('No Conversation found');
  }

  const conversationIdentifier =
    conversationResult.records[0].ConversationIdentifier;

  // Step 3: Get Case Number for saving transcript
  let caseNumber: string | null = null;
  if (caseId) {
    const caseQuery = `SELECT CaseNumber FROM Case WHERE Id='${caseId}' LIMIT 1`;
    const caseQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(caseQuery)}`;
    const caseResponse = await session.makeRequest('GET', caseQueryUrl, {
      headers: {},
    });

    if (caseResponse.ok) {
      const caseResult: SalesforceQueryResponse<SalesforceCase> =
        await caseResponse.json();
      if (caseResult.records && caseResult.records.length > 0) {
        caseNumber = caseResult.records[0].CaseNumber;
      }
    }
  }

  return {
    conversationIdentifier,
    messagingSessionId: actualMessagingSessionId, // Use the actual ID from Salesforce
    messagingSessionName,
    caseNumber, // Include case number for saving
  };
}

/**
 * Get Conversation Identifier from MessagingSessionName
 * 1. MessagingSession (by Name) → ConversationId, Id, CaseId
 * 2. Conversation → ConversationIdentifier
 */
export async function getConversationIdentifierByMessagingSessionName(
  session: SalesforceSession,
  messagingSessionName: string,
  apiVersion: string
): Promise<ConversationIdentifierResult | null> {
  const instanceUrl = session.getInstanceUrl();
  const baseQueryUrl = `${instanceUrl}/services/data/${apiVersion}/query`;

  // Step 1: Get ConversationId, Id, and CaseId from MessagingSession by Name
  const messagingQuery = `SELECT Id, ConversationId, Name, CaseId FROM MessagingSession WHERE Name='${messagingSessionName.replace(/'/g, "''")}' LIMIT 1`;
  const messagingQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(messagingQuery)}`;
  const response = await session.makeRequest('GET', messagingQueryUrl, {
    headers: {},
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to query messaging session: ${response.status} ${errorText}`);
  }

  const messagingResult: SalesforceQueryResponse<SalesforceMessagingSession> =
    await response.json();

  if (!messagingResult.records || messagingResult.records.length === 0) {
    throw new Error(`No MessagingSession found with Name: ${messagingSessionName}`);
  }

  const conversationId = messagingResult.records[0].ConversationId;
  const messagingSessionId = messagingResult.records[0].Id;
  const caseId = messagingResult.records[0].CaseId;

  // Ensure messagingSessionId is always present
  if (!messagingSessionId) {
    throw new Error('MessagingSessionId is required but was not found in Salesforce response');
  }

  // Step 2: Get ConversationIdentifier
  const conversationQuery = `SELECT ConversationIdentifier FROM Conversation WHERE Id='${conversationId}' LIMIT 1`;
  const conversationQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(conversationQuery)}`;
  const conversationResponse = await session.makeRequest('GET', conversationQueryUrl, {
    headers: {},
  });

  if (!conversationResponse.ok) {
    const errorText = await conversationResponse.text();
    throw new Error(`Failed to query conversation: ${conversationResponse.status} ${errorText}`);
  }

  const conversationResult: SalesforceQueryResponse<SalesforceConversation> =
    await conversationResponse.json();

  if (!conversationResult.records || conversationResult.records.length === 0) {
    throw new Error('No Conversation found');
  }

  const conversationIdentifier =
    conversationResult.records[0].ConversationIdentifier;

  // Step 3: Get Case Number for saving transcript
  let caseNumber: string | null = null;
  if (caseId) {
    const caseQuery = `SELECT CaseNumber FROM Case WHERE Id='${caseId}' LIMIT 1`;
    const caseQueryUrl = `${baseQueryUrl}?q=${encodeURIComponent(caseQuery)}`;
    const caseResponse = await session.makeRequest('GET', caseQueryUrl, {
      headers: {},
    });

    if (caseResponse.ok) {
      const caseResult: SalesforceQueryResponse<SalesforceCase> =
        await caseResponse.json();
      if (caseResult.records && caseResult.records.length > 0) {
        caseNumber = caseResult.records[0].CaseNumber;
      }
    }
  }

  return {
    conversationIdentifier,
    messagingSessionId, // Always present, validated above
    messagingSessionName: messagingResult.records[0].Name || null,
    caseNumber, // Include case number for saving
  };
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


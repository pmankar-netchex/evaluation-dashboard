export interface SalesforceAuthResponse {
  access_token: string;
  instance_url: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceQueryResponse<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

export interface SalesforceCase {
  Id: string;
  CaseNumber: string;
}

export interface SalesforceMessagingSession {
  Id: string;
  ConversationId: string;
  CaseId: string;
}

export interface SalesforceConversation {
  Id: string;
  ConversationIdentifier: string;
}

export interface ConversationEntry {
  identifier: string;
  messageText: string;
  clientTimestamp: number;
  serverReceivedTimestamp: number;
  sender: {
    role: string;
    appType?: string;
    subject?: string;
  };
  type?: string;
  clientDuration?: number;
  relatedRecords?: string[];
}

export interface ConversationEntriesResponse {
  conversationEntries: ConversationEntry[];
  hasMore: boolean;
  nextPageUrl?: string;
}


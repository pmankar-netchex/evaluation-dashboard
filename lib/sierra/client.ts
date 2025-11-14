import { ConversationEntry } from '@/types/salesforce';

export interface MessageAttachment {
  // Define attachment structure if needed
  [key: string]: any;
}

export interface SierraClientEvent {
  type: 'message' | 'request-complete' | 'start';
  message?: { 
    content: string; 
    attachments?: MessageAttachment[] 
  }; // Only used for type `message`
  reason?: string; // Only used for type `request-complete`
}

export interface SierraRequest {
  /** The agent token (included above) */
  token: string;
  /** Client Event */
  clientEvent: SierraClientEvent;
  /** Conversation state, if this message is for an existing conversation. */
  state?: string;
  /** Conversation identifier, client generated conversation identifier used instead of the `state` parameter. */
  conversationId?: string;
  /** Variables to pass to the given agent. */
  variables?: { [key: string]: string };
  /** Secrets to pass to the agent, for example a customer auth token */
  secrets?: { [key: string]: string };
  /** If true, secrets passed in the request will be updated */
  updateSecrets?: boolean;
  /** If true, variables passed in the request will be updated */
  updateVariables?: boolean;
  /** If true, we send a non-streaming response (see below) */
  disableStreaming?: boolean;
  /** Customer's locale, formatted as IETF BCP 47 language tag, e.g. "en-US" or "zh-CN" */
  locale?: string;
  /** Customer's time zone, formatted as an IANA time zone identifier, e.g. "America/New_York" */
  timeZone?: string;
  /** Customer's device type (a UserDevice value). If not specified, will be inferred from the user agent. */
  device?: string;
  /** Release ID or target name (e.g. "QA"), omitted in most circumstances */
  release?: string;
}

export interface SierraResponse {
  serverEvent?: {
    type: string;
    message?: {
      content: string;
    };
    [key: string]: any;
  };
  token?: string; // Sierra may return an updated token
  [key: string]: any;
}

export interface SierraMessageResponse {
  message: string;
  token?: string; // Updated token for next message
}

export class SierraClient {
  private apiUrl: string;
  private apiKey: string;
  private apiToken: string;
  private compatibilityDate: string;
  private conversationState: string | undefined;

  constructor(
    apiUrl: string,
    apiKey: string,
    apiToken: string,
    compatibilityDate = '2025-02-01',
    conversationState?: string // Case ID or conversation state identifier
  ) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.apiToken = apiToken;
    this.compatibilityDate = compatibilityDate;
    this.conversationState = conversationState;
  }

  /**
   * Send a message to Sierra API and return both the response and any token/state updates
   * The state parameter ensures a single conversation per case ID
   * The token maintains conversation state - if Sierra returns a new token, use it for subsequent messages
   */
  async sendMessage(message: string): Promise<SierraMessageResponse> {
    // Validate and clean message
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }

    // Trim and ensure message is not empty
    const cleanedMessage = message.trim();
    if (!cleanedMessage) {
      throw new Error('Message cannot be empty');
    }

    const requestBody: SierraRequest = {
      token: this.apiToken,
      clientEvent: {
        type: 'message',
        message: {
          content: cleanedMessage,
        },
      },
      // Only include state if we have it from a previous response
      // First request should NOT include state - Sierra will return it
      ...(this.conversationState && { state: this.conversationState }),
    };

    // Stringify the request body
    const requestBodyJson = JSON.stringify(requestBody);
    
    // Log the request for debugging (remove sensitive data in production)
    console.log('Sierra API Request:', {
      url: `${this.apiUrl}/chat`,
      body: requestBodyJson,
      headers: {
        'Sierra-API-Compatibility-Date': this.compatibilityDate,
        'Content-Type': 'application/json',
        'X-Sierra-Force-Headless-API-Authorization': 'true',
        'Authorization': 'Bearer [REDACTED]',
      },
    });

    let response: Response;
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      try {
        response = await fetch(`${this.apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Sierra-API-Compatibility-Date': this.compatibilityDate,
            'Content-Type': 'application/json',
            'X-Sierra-Force-Headless-API-Authorization': 'true',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: requestBodyJson,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (fetchError: any) {
      // Handle network errors
      if (fetchError.name === 'AbortError' || fetchError.message?.includes('aborted')) {
        throw new Error(`Sierra API request timed out after 30 seconds. Please check your network connection and Sierra API availability.`);
      }
      if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED' || fetchError.message?.includes('fetch failed')) {
        throw new Error(`Cannot connect to Sierra API at ${this.apiUrl}. Please check: 1) API URL is correct, 2) Network connection, 3) API credentials are valid. Error: ${fetchError.message || fetchError.toString()}`);
      }
      throw new Error(`Sierra API network error: ${fetchError.message || fetchError.toString()}`);
    }

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unable to read error response';
      }
      throw new Error(
        `Sierra API request failed: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`
      );
    }

    // Get response text first to handle potential JSON parsing issues
    const responseText = await response.text();
    
    // Log response for debugging
    console.log('Sierra API Response:', {
      status: response.status,
      statusText: response.statusText,
      bodyLength: responseText.length,
      bodyPreview: responseText.substring(0, 500),
    });
    
    // Sierra API returns streaming format with multiple JSON objects separated by newlines
    // Format: {"type":"message","message":{"role":"assistant","text":"fragment"}}\n
    // We need to parse all message objects and combine the text fragments
    // Also check for token updates that maintain conversation state
    
    const lines = responseText.split('\n').filter(line => line.trim());
    const messageTexts: string[] = [];
    let updatedToken: string | undefined = undefined;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || !trimmedLine.startsWith('{')) {
        continue;
      }
      
      try {
        const parsed = JSON.parse(trimmedLine);
        
        // Check for token updates (maintains conversation state)
        if (parsed.token && typeof parsed.token === 'string') {
          updatedToken = parsed.token;
          console.log('Sierra returned updated token for conversation state');
        }
        
        // Check for state updates (Sierra returns state in response - use it for subsequent requests)
        if (parsed.state && typeof parsed.state === 'string') {
          this.conversationState = parsed.state;
          console.log('Sierra returned conversation state:', parsed.state.substring(0, 50) + '...');
        }
        
        // Handle message type objects
        if (parsed.type === 'message' && parsed.message) {
          // Sierra returns messages with "text" field, not "content"
          if (parsed.message.text) {
            messageTexts.push(parsed.message.text);
          } else if (parsed.message.content) {
            messageTexts.push(parsed.message.content);
          }
        }
        
        // Also check for serverEvent format (legacy)
        if (parsed.serverEvent?.message?.content) {
          messageTexts.push(parsed.serverEvent.message.content);
        }
        if (parsed.serverEvent?.message?.text) {
          messageTexts.push(parsed.serverEvent.message.text);
        }
        
        // Check for token in serverEvent as well
        if (parsed.serverEvent?.token && typeof parsed.serverEvent.token === 'string') {
          updatedToken = parsed.serverEvent.token;
        }
        
        // Check for state in serverEvent as well
        if (parsed.serverEvent?.state && typeof parsed.serverEvent.state === 'string') {
          this.conversationState = parsed.serverEvent.state;
          console.log('Sierra returned conversation state in serverEvent:', parsed.serverEvent.state.substring(0, 50) + '...');
        }
      } catch (parseError) {
        // Skip invalid JSON lines (like state objects or incomplete JSON)
        continue;
      }
    }
    
    // Combine all message fragments into a single message
    if (messageTexts.length > 0) {
      const combinedMessage = messageTexts.join('');
      console.log(`Combined ${messageTexts.length} message fragments into: ${combinedMessage.substring(0, 100)}...`);
      
      // Update token if Sierra returned a new one
      if (updatedToken) {
        this.apiToken = updatedToken;
        console.log('Updated conversation token for maintaining state');
      }
      
      // Log if state was received (important for first message)
      if (this.conversationState) {
        console.log('Conversation state maintained:', this.conversationState.substring(0, 50) + '...');
      }
      
      console.log('Returning Sierra response successfully');
      return {
        message: combinedMessage,
        token: updatedToken,
      };
    }
    
    // Fallback: try to find any text content in the response
    console.warn('No message fragments found in Sierra response, attempting fallback parsing');
    
    // Try to parse as single JSON object (legacy format)
    try {
      const singleJson = JSON.parse(responseText.trim());
      
      // Check for token in single JSON response
      if (singleJson.token && typeof singleJson.token === 'string') {
        updatedToken = singleJson.token;
        this.apiToken = updatedToken;
      }
      
      // Check for state in single JSON response
      if (singleJson.state && typeof singleJson.state === 'string') {
        this.conversationState = singleJson.state;
        console.log('Sierra returned conversation state in single JSON:', singleJson.state.substring(0, 50) + '...');
      }
      
      // Also check for state in serverEvent of single JSON response
      if (singleJson.serverEvent?.state && typeof singleJson.serverEvent.state === 'string') {
        this.conversationState = singleJson.serverEvent.state;
        console.log('Sierra returned conversation state in serverEvent (single JSON):', singleJson.serverEvent.state.substring(0, 50) + '...');
      }
      
      if (singleJson.serverEvent?.message?.content) {
        return {
          message: singleJson.serverEvent.message.content,
          token: updatedToken,
        };
      }
      if (singleJson.serverEvent?.message?.text) {
        return {
          message: singleJson.serverEvent.message.text,
          token: updatedToken,
        };
      }
      if (singleJson.message?.text) {
        return {
          message: singleJson.message.text,
          token: updatedToken,
        };
      }
      if (singleJson.message?.content) {
        return {
          message: singleJson.message.content,
          token: updatedToken,
        };
      }
    } catch {
      // Not a single JSON object
    }
    
    // If no content found, log and return empty string
    console.error('Could not extract message content from Sierra response:', responseText.substring(0, 500));
    return {
      message: '',
      token: updatedToken,
    };
  }
  
  /**
   * Get the current conversation token
   */
  getToken(): string {
    return this.apiToken;
  }

  /**
   * Get the current conversation state (case ID)
   */
  getState(): string | undefined {
    return this.conversationState;
  }

  /**
   * Set the conversation state (case ID)
   */
  setState(state: string): void {
    this.conversationState = state;
  }
}


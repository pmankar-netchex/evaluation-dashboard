import {
  SalesforceAuthResponse,
  SalesforceQueryResponse,
  SalesforceCase,
  SalesforceMessagingSession,
  SalesforceConversation,
  ConversationEntriesResponse,
} from '@/types/salesforce';

export class SalesforceSession {
  private clientId: string;
  private clientSecret: string;
  private oauthUrl: string;
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private tokenTimestamp: number | null = null;
  private readonly tokenLifetime = 3600; // 1 hour in seconds

  constructor(
    clientId: string,
    clientSecret: string,
    oauthUrl: string
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.oauthUrl = oauthUrl;
  }

  async authenticate(): Promise<void> {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', this.clientId);
    formData.append('client_secret', this.clientSecret);

    const response = await fetch(this.oauthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Salesforce authentication failed: ${response.status} ${errorText}`
      );
    }

    const authData: SalesforceAuthResponse = await response.json();
    this.accessToken = authData.access_token;
    this.instanceUrl = authData.instance_url;
    this.tokenTimestamp = Date.now() / 1000;
  }

  async getToken(forceRefresh = false): Promise<string> {
    const tokenAge =
      this.tokenTimestamp !== null
        ? Date.now() / 1000 - this.tokenTimestamp
        : Infinity;

    if (
      forceRefresh ||
      !this.accessToken ||
      tokenAge > this.tokenLifetime
    ) {
      if (tokenAge > this.tokenLifetime) {
        console.log(
          `Token expired (${Math.floor(tokenAge / 60)} minutes old), refreshing...`
        );
      }
      await this.authenticate();
    }

    if (!this.accessToken) {
      throw new Error('Failed to obtain access token');
    }

    return this.accessToken;
  }

  async makeRequest(
    method: string,
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let response = await fetch(url, {
      ...options,
      method,
      headers,
    });

    // Retry with refreshed token on 401
    if (response.status === 401) {
      console.log('Received 401 error, refreshing token and retrying...');
      const refreshedToken = await this.getToken(true);
      headers.Authorization = `Bearer ${refreshedToken}`;
      response = await fetch(url, {
        ...options,
        method,
        headers,
      });
    }

    return response;
  }

  getInstanceUrl(): string {
    if (!this.instanceUrl) {
      throw new Error('Instance URL not available. Authenticate first.');
    }
    return this.instanceUrl;
  }
}


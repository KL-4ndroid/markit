import type {
  GmailAccessTokenProvider,
  GmailHistoryPage,
  GmailMailboxProfile,
  GmailMessageListPage,
  GmailTransportPort,
} from '@/lib/platform/contracts/gmail';
import type { GmailMessageEnvelope } from '@market-mail/core';

export type GmailTransportErrorCode =
  | 'AUTH_REQUIRED'
  | 'HISTORY_EXPIRED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'HTTP_ERROR';

export class GmailTransportError extends Error {
  readonly code: GmailTransportErrorCode;
  readonly status: number | null;

  constructor(code: GmailTransportErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = 'GmailTransportError';
    this.code = code;
    this.status = status;
  }
}

export interface WebGmailTransportOptions {
  getAccessToken: GmailAccessTokenProvider;
  fetchImpl?: typeof fetch;
  apiBaseUrl?: string;
}

function nonEmptyToken(value: string): string {
  const token = value.trim();
  if (!token) throw new GmailTransportError('AUTH_REQUIRED', 'Gmail access token is unavailable.');
  return token;
}

function encodeQuery(params: Record<string, string | number | null | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : '';
}

export function createWebGmailTransport(options: WebGmailTransportOptions): GmailTransportPort {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (!fetchImpl) throw new Error('fetch is unavailable for the Web Gmail transport.');
  const baseUrl = (options.apiBaseUrl ?? 'https://gmail.googleapis.com/gmail/v1').replace(/\/+$/u, '');

  async function requestJson<T>(path: string): Promise<T> {
    const token = nonEmptyToken(await options.getAccessToken());
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      throw new GmailTransportError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Gmail network request failed.',
      );
    }

    if (!response.ok) {
      let providerMessage = '';
      try {
        const payload = await response.json() as { error?: { message?: string } };
        providerMessage = payload?.error?.message?.trim() ?? '';
      } catch {
        providerMessage = '';
      }

      const message = providerMessage || `Gmail API request failed with HTTP ${response.status}.`;
      if (response.status === 401 || response.status === 403) {
        throw new GmailTransportError('AUTH_REQUIRED', message, response.status);
      }
      if (response.status === 404 && path.startsWith('/users/me/history')) {
        throw new GmailTransportError('HISTORY_EXPIRED', message, response.status);
      }
      if (response.status === 429) {
        throw new GmailTransportError('RATE_LIMITED', message, response.status);
      }
      throw new GmailTransportError('HTTP_ERROR', message, response.status);
    }

    try {
      return await response.json() as T;
    } catch {
      throw new GmailTransportError('INVALID_RESPONSE', 'Gmail API returned invalid JSON.', response.status);
    }
  }

  return {
    async getProfile(): Promise<GmailMailboxProfile> {
      return requestJson<GmailMailboxProfile>('/users/me/profile');
    },

    async listMessages(request): Promise<GmailMessageListPage> {
      return requestJson<GmailMessageListPage>(
        `/users/me/messages${encodeQuery({
          pageToken: request.pageToken,
          q: request.query,
          maxResults: request.maxResults,
        })}`,
      );
    },

    async listHistory(request): Promise<GmailHistoryPage> {
      return requestJson<GmailHistoryPage>(
        `/users/me/history${encodeQuery({
          startHistoryId: request.startHistoryId,
          pageToken: request.pageToken,
          maxResults: request.maxResults,
          historyTypes: 'messageAdded',
        })}`,
      );
    },

    async getMessageFull(messageId: string): Promise<GmailMessageEnvelope> {
      const id = messageId.trim();
      if (!id) throw new Error('messageId is required.');
      return requestJson<GmailMessageEnvelope>(`/users/me/messages/${encodeURIComponent(id)}?format=full`);
    },
  };
}

import type { GmailMessageEnvelope } from '@market-mail/core';

export interface GmailMessageRef {
  id: string;
  threadId?: string | null;
}

export interface GmailMessageListPage {
  messages?: GmailMessageRef[];
  nextPageToken?: string | null;
}

export interface GmailHistoryMessageAdded {
  message: GmailMessageRef;
}

export interface GmailHistoryRecord {
  id: string;
  messagesAdded?: GmailHistoryMessageAdded[];
}

export interface GmailHistoryPage {
  history?: GmailHistoryRecord[];
  nextPageToken?: string | null;
  historyId?: string | null;
}

export interface GmailMailboxProfile {
  emailAddress?: string | null;
  historyId: string;
}

/**
 * Platform-owned Gmail network boundary.
 *
 * Implementations may use browser fetch today and a future Capacitor/native
 * adapter later. Access tokens and provider network calls must stay outside
 * @market-mail/core.
 */
export interface GmailTransportPort {
  getProfile(): Promise<GmailMailboxProfile>;
  listMessages(request: {
    pageToken?: string | null;
    query?: string | null;
    maxResults?: number;
  }): Promise<GmailMessageListPage>;
  listHistory(request: {
    startHistoryId: string;
    pageToken?: string | null;
    maxResults?: number;
  }): Promise<GmailHistoryPage>;
  getMessageFull(messageId: string): Promise<GmailMessageEnvelope>;
}

export type GmailAccessTokenProvider = () => Promise<string>;

import type { GmailTransportPort } from '@/lib/platform/contracts/gmail';
import {
  dryRunLocalGmailBatch,
  type GmailDryRunResponse,
  type GmailMessageEnvelope,
} from '@/lib/market-mail/local-core';

export type MarketMailGmailSyncMode = 'FOREGROUND_FULL' | 'FOREGROUND_INCREMENTAL';

export interface MarketMailSyncPlan {
  mode: MarketMailGmailSyncMode;
  account_key: string;
  source_cursor: string | null;
  next_cursor: string;
  fetched_messages: number;
  dry_run: GmailDryRunResponse;
}

export interface MarketMailSyncOptions {
  account_key: string;
  transport: GmailTransportPort;
  processed_idempotency_keys?: string[] | Set<string>;
  resolutions?: Parameters<typeof dryRunLocalGmailBatch>[0]['resolutions'];
  query?: string | null;
  page_size?: number;
  max_messages?: number;
  fetch_concurrency?: number;
}

export interface MarketMailIncrementalSyncOptions extends MarketMailSyncOptions {
  start_history_id: string;
}

export interface MarketMailSyncCommitPort {
  /** Persist normalized decisions/state first. Raw Gmail bodies must not be persisted here. */
  persistDryRun(plan: MarketMailSyncPlan): Promise<void>;
  /** Advance the Gmail history cursor only after normalized persistence succeeds. */
  commitHistoryCursor(input: {
    account_key: string;
    source_cursor: string | null;
    next_cursor: string;
  }): Promise<void>;
}

function positiveInteger(value: number | undefined, fallback: number, name: string): number {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return result;
}

function uniqueMessageIds(refs: Array<{ id: string }>): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const id = ref?.id?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const result = new Array<R>(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      result[index] = await mapper(items[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
  return result;
}

function emptyDryRun(syncCursor: string | null): GmailDryRunResponse {
  return {
    dry_run: true,
    sync_cursor: syncCursor,
    total_messages: 0,
    processed_messages: 0,
    error_messages: 0,
    actionable_messages: 0,
    ignored_messages: 0,
    items: [],
  };
}

function runDryBatches(
  accountKey: string,
  messages: GmailMessageEnvelope[],
  syncCursor: string,
  options: MarketMailSyncOptions,
): GmailDryRunResponse {
  if (messages.length === 0) return emptyDryRun(syncCursor);

  const combined = emptyDryRun(syncCursor);
  for (let offset = 0; offset < messages.length; offset += 500) {
    const batch = messages.slice(offset, offset + 500);
    const result = dryRunLocalGmailBatch({
      account_key: accountKey,
      messages: batch,
      processed_idempotency_keys: options.processed_idempotency_keys,
      resolutions: options.resolutions,
      sync_cursor: syncCursor,
    });
    combined.total_messages += result.total_messages;
    combined.processed_messages += result.processed_messages;
    combined.error_messages += result.error_messages;
    combined.actionable_messages += result.actionable_messages;
    combined.ignored_messages += result.ignored_messages;
    combined.items.push(...result.items);
  }
  return combined;
}

async function fetchFullMessages(
  transport: GmailTransportPort,
  messageIds: string[],
  concurrency: number,
): Promise<GmailMessageEnvelope[]> {
  return mapWithConcurrency(messageIds, concurrency, (id) => transport.getMessageFull(id));
}

function enforceMessageLimit(messageIds: string[], maxMessages: number): void {
  if (messageIds.length > maxMessages) {
    throw new Error(
      `Gmail sync discovered ${messageIds.length} messages, exceeding max_messages=${maxMessages}.`,
    );
  }
}

/**
 * Capture the Gmail history cursor before listing the initial mailbox window.
 * Messages arriving during the full scan will therefore be visible to the next
 * incremental sync instead of being silently skipped.
 */
export async function prepareForegroundFullSync(
  options: MarketMailSyncOptions,
): Promise<MarketMailSyncPlan> {
  const pageSize = positiveInteger(options.page_size, 100, 'page_size');
  const maxMessages = positiveInteger(options.max_messages, 2000, 'max_messages');
  const concurrency = positiveInteger(options.fetch_concurrency, 6, 'fetch_concurrency');

  const profile = await options.transport.getProfile();
  const baselineHistoryId = profile.historyId?.trim();
  if (!baselineHistoryId) throw new Error('Gmail profile did not provide a historyId.');

  const refs: Array<{ id: string }> = [];
  let pageToken: string | null | undefined = null;
  do {
    const page = await options.transport.listMessages({
      pageToken,
      query: options.query ?? null,
      maxResults: pageSize,
    });
    refs.push(...(page.messages ?? []));
    pageToken = page.nextPageToken ?? null;
  } while (pageToken);

  const messageIds = uniqueMessageIds(refs);
  enforceMessageLimit(messageIds, maxMessages);
  const messages = await fetchFullMessages(options.transport, messageIds, concurrency);

  return {
    mode: 'FOREGROUND_FULL',
    account_key: options.account_key,
    source_cursor: null,
    next_cursor: baselineHistoryId,
    fetched_messages: messages.length,
    dry_run: runDryBatches(options.account_key, messages, baselineHistoryId, options),
  };
}

/**
 * Only Gmail history `messagesAdded` records are treated as new-email evidence.
 * Label-only changes are intentionally ignored.
 */
export async function prepareForegroundIncrementalSync(
  options: MarketMailIncrementalSyncOptions,
): Promise<MarketMailSyncPlan> {
  const startHistoryId = options.start_history_id?.trim();
  if (!startHistoryId) throw new Error('start_history_id is required for incremental Gmail sync.');

  const pageSize = positiveInteger(options.page_size, 100, 'page_size');
  const maxMessages = positiveInteger(options.max_messages, 2000, 'max_messages');
  const concurrency = positiveInteger(options.fetch_concurrency, 6, 'fetch_concurrency');

  const refs: Array<{ id: string }> = [];
  let nextCursor = startHistoryId;
  let pageToken: string | null | undefined = null;

  do {
    const page = await options.transport.listHistory({
      startHistoryId,
      pageToken,
      maxResults: pageSize,
    });
    for (const history of page.history ?? []) {
      for (const added of history.messagesAdded ?? []) refs.push(added.message);
    }
    if (page.historyId?.trim()) nextCursor = page.historyId.trim();
    pageToken = page.nextPageToken ?? null;
  } while (pageToken);

  const messageIds = uniqueMessageIds(refs);
  enforceMessageLimit(messageIds, maxMessages);
  const messages = await fetchFullMessages(options.transport, messageIds, concurrency);

  return {
    mode: 'FOREGROUND_INCREMENTAL',
    account_key: options.account_key,
    source_cursor: startHistoryId,
    next_cursor: nextCursor,
    fetched_messages: messages.length,
    dry_run: runDryBatches(options.account_key, messages, nextCursor, options),
  };
}

/**
 * Commit normalized state first and history cursor second.
 * If cursor persistence fails, the next sync may replay messages, which is safe
 * because Market Mail decisions are idempotent. The reverse order can lose mail.
 */
export async function commitMarketMailSyncPlan(
  plan: MarketMailSyncPlan,
  port: MarketMailSyncCommitPort,
): Promise<void> {
  await port.persistDryRun(plan);
  await port.commitHistoryCursor({
    account_key: plan.account_key,
    source_cursor: plan.source_cursor,
    next_cursor: plan.next_cursor,
  });
}

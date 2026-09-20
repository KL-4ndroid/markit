import assert from 'node:assert/strict';
import {
  dryRunLocalGmailBatch,
  getMarketMailRuntimeInfo,
  type GmailMessageEnvelope,
} from '../lib/market-mail/local-core';
import {
  commitMarketMailSyncPlan,
  prepareForegroundFullSync,
  prepareForegroundIncrementalSync,
  type MarketMailSyncCommitPort,
} from '../lib/market-mail/gmail-sync';
import { getGmailTransport, installGmailTransport } from '../lib/platform/gmail-capability';
import type { GmailTransportPort } from '../lib/platform/contracts/gmail';
import {
  GmailTransportError,
  createWebGmailTransport,
} from '../lib/platform/web/gmail-adapter.web';

function b64(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function registrationMessage(id = 'gmail-msg-1'): GmailMessageEnvelope {
  return {
    id,
    threadId: 'thread-1',
    internalDate: String(Date.parse('2026-08-20T02:00:00Z')),
    snippet: 'snippet should not win',
    payload: {
      mimeType: 'multipart/alternative',
      headers: [
        { name: 'From', value: '表單回覆回條 <forms-receipts-noreply@google.com>' },
        { name: 'Subject', value: '感謝你填寫這份表單：2026｜12.12 – 12.13 開嘉 · 冬日咖啡城' },
      ],
      parts: [
        {
          mimeType: 'text/plain',
          body: { data: b64('以下是我們收到的回覆。品牌報名資料已提交。') },
        },
      ],
    },
  };
}

console.log('\n=== Market Mail local integration ===');

const runtime = getMarketMailRuntimeInfo();
assert.equal(runtime.engineContractVersion, '1.0');
assert.equal(runtime.capabilities.network_required, false);
assert.equal(runtime.capabilities.raw_email_persistence_required, false);
assert.equal(runtime.capabilities.gmail_input.format, 'users.messages.get(format=full)');
console.log('PASS @market-mail/core remains local, versioned, and Gmail-full-message compatible');

const parsedBatch = dryRunLocalGmailBatch({
  account_key: 'acct-123',
  messages: [registrationMessage()],
  sync_cursor: 'history-42',
});
assert.equal(parsedBatch.total_messages, 1);
assert.equal(parsedBatch.processed_messages, 1);
assert.equal(parsedBatch.items[0].decision?.action, 'AUTO_IMPORT_REGISTRATION');
assert.equal(parsedBatch.items[0].idempotency_key, 'gmail:acct-123:gmail-msg-1');
console.log('PASS Gmail full-message JSON is parsed and intake-decided locally');

assert.throws(() => getGmailTransport(), /not installed/i);
const fakeTransport: GmailTransportPort = {
  async getProfile() {
    return { emailAddress: 'owner@example.com', historyId: 'history-100' };
  },
  async listMessages({ pageToken }) {
    if (!pageToken) {
      return {
        messages: [{ id: 'gmail-msg-1' }, { id: 'gmail-msg-1' }],
        nextPageToken: 'page-2',
      };
    }
    return { messages: [], nextPageToken: null };
  },
  async listHistory() {
    return { history: [], historyId: 'history-101', nextPageToken: null };
  },
  async getMessageFull(messageId) {
    return registrationMessage(messageId);
  },
};
const restoreTransport = installGmailTransport(fakeTransport);
assert.equal(getGmailTransport(), fakeTransport);
restoreTransport();
assert.throws(() => getGmailTransport(), /not installed/i);
console.log('PASS Gmail transport is an installable platform capability with restore semantics');

const fullPlan = await prepareForegroundFullSync({
  account_key: 'acct-123',
  transport: fakeTransport,
});
assert.equal(fullPlan.mode, 'FOREGROUND_FULL');
assert.equal(fullPlan.source_cursor, null);
assert.equal(fullPlan.next_cursor, 'history-100');
assert.equal(fullPlan.fetched_messages, 1);
assert.equal(fullPlan.dry_run.items[0].decision?.action, 'AUTO_IMPORT_REGISTRATION');
console.log('PASS full sync captures a baseline historyId and de-duplicates message refs');

const incrementalPlan = await prepareForegroundIncrementalSync({
  account_key: 'acct-123',
  transport: fakeTransport,
  start_history_id: 'history-100',
});
assert.equal(incrementalPlan.source_cursor, 'history-100');
assert.equal(incrementalPlan.next_cursor, 'history-101');
assert.equal(incrementalPlan.fetched_messages, 0);
assert.equal(incrementalPlan.dry_run.total_messages, 0);
console.log('PASS empty incremental history is a valid sync and still advances the cursor');

const commitOrder: string[] = [];
const commitPort: MarketMailSyncCommitPort = {
  async persistDryRun() {
    commitOrder.push('persist');
  },
  async commitHistoryCursor() {
    commitOrder.push('cursor');
  },
};
await commitMarketMailSyncPlan(fullPlan, commitPort);
assert.deepEqual(commitOrder, ['persist', 'cursor']);

let cursorCommittedAfterFailure = false;
await assert.rejects(
  commitMarketMailSyncPlan(fullPlan, {
    async persistDryRun() {
      throw new Error('storage failed');
    },
    async commitHistoryCursor() {
      cursorCommittedAfterFailure = true;
    },
  }),
  /storage failed/,
);
assert.equal(cursorCommittedAfterFailure, false);
console.log('PASS normalized persistence always precedes Gmail history cursor commit');

const requests: Array<{ url: string; authorization: string | null }> = [];
const webTransport = createWebGmailTransport({
  getAccessToken: async () => 'access-token',
  fetchImpl: async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    requests.push({ url, authorization: headers.get('Authorization') });
    if (url.includes('/profile')) {
      return new Response(JSON.stringify({ emailAddress: 'owner@example.com', historyId: 'h1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('/history')) {
      return new Response(JSON.stringify({ history: [], historyId: 'h2' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(registrationMessage('remote-1')), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});
await webTransport.getProfile();
await webTransport.listHistory({ startHistoryId: 'h1', maxResults: 50 });
await webTransport.getMessageFull('remote-1');
assert.ok(requests.every((request) => request.authorization === 'Bearer access-token'));
assert.match(requests[1].url, /historyTypes=messageAdded/);
assert.match(requests[2].url, /format=full/);
console.log('PASS Web adapter injects ephemeral auth and requests only Gmail full-message/history surfaces');

const expiredTransport = createWebGmailTransport({
  getAccessToken: async () => 'access-token',
  fetchImpl: async () => new Response(
    JSON.stringify({ error: { message: 'Requested historyId is too old.' } }),
    { status: 404, headers: { 'Content-Type': 'application/json' } },
  ),
});
await assert.rejects(
  expiredTransport.listHistory({ startHistoryId: 'old-history' }),
  (error: unknown) => error instanceof GmailTransportError && error.code === 'HISTORY_EXPIRED',
);
console.log('PASS expired Gmail history is classified for foreground full-sync recovery');

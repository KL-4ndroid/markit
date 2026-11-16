import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccountDeletionPage from '../app/settings/account/deletion/page';
import { RoleProvider } from '../lib/role-context';
import { createAccountDeletionRouteHandlers, GET } from '../app/api/account-deletion/route';
import { POST as confirmDefault } from '../app/api/account-deletion/confirm/route';
import { POST as cancelDefault } from '../app/api/account-deletion/cancel/route';
import { createAccountDeletionActionHandler, isAccountDeletionWorkflowEnabled, verifiedBearerReauthenticationTime } from '../lib/subscription/account-deletion-request-workflow.server';
import { createAccountDeletionClient } from '../lib/subscription/account-deletion-client';
import { evaluateDeletionDeviceCheck } from '../lib/subscription/account-deletion-experience';
import { ACCOUNT_DELETION_POLICY_REVISION } from '../lib/subscription/account-deletion-contract';
import { parseAccountDeletionActionRequest } from '../lib/subscription/account-deletion-api-contract';
import { deletionWorkflowFixture } from './fixtures/account-deletion-workflow-fixture';
import { evaluateAccountDeletionRecentReauth } from '../lib/subscription/account-deletion-reauth.server';
import type { LocalPendingWriteReport } from '../lib/sync/local-pending-write-report';

async function main() {
const f = deletionWorkflowFixture();
const body = { policyRevision: ACCOUNT_DELETION_POLICY_REVISION, preflightResolution: 'clean' as const,
  idempotencyKey: 'synthetic-deletion-request-key-0001', acknowledgeStoreBillingContinues: true as const };
const req = (value?: unknown) => new Request('http://127.0.0.1/api/account-deletion', value === undefined ? undefined
  : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
const handlers = createAccountDeletionRouteHandlers(f.deps);
const action = (name: 'confirm' | 'cancel', value: unknown) => createAccountDeletionActionHandler(name, f.deps)(req(value));
const statusOf = async (response: Response) => (await response.json()).request;

assert.equal((await handlers.GET(req())).status, 404);
const row = await statusOf(await handlers.POST(req(body)));
assert.equal(row.status, 'requested');
assert.equal((await statusOf(await handlers.POST(req(body)))).requestId, row.requestId);
assert.equal(f.writes(), 1);
f.setActor(f.staff);
assert.equal((await action('confirm', { requestId: row.requestId, expectedStatus: 'requested' })).status, 404);
assert.equal((await action('cancel', { requestId: row.requestId, expectedStatus: 'requested' })).status, 404);
f.setActor(f.owner); f.setFresh(false);
assert.equal((await action('confirm', { requestId: row.requestId, expectedStatus: 'requested' })).status, 409);
f.setFresh(true);
assert.equal((await statusOf(await action('confirm', { requestId: row.requestId, expectedStatus: 'requested' }))).status, 'identity_confirmed');
assert.equal((await action('cancel', { requestId: row.requestId, expectedStatus: 'requested' })).status, 409, 'stale cancellation must re-read');
assert.equal((await statusOf(await action('cancel', { requestId: row.requestId, expectedStatus: 'identity_confirmed' }))).status, 'cancelled');
assert.equal((await statusOf(await handlers.GET(req()))).status, 'cancelled', 'reopen retains withdrawal result');
assert.equal((await action('confirm', { requestId: row.requestId, expectedStatus: 'requested' })).status, 409);
f.setActor(f.staff);
const staffRow = await statusOf(await handlers.POST(req(body)));
assert.notEqual(staffRow.requestId, row.requestId);
assert.equal((await statusOf(await action('cancel', { requestId: staffRow.requestId, expectedStatus: 'requested' }))).status, 'cancelled');
f.setActor(null);
assert.equal((await action('cancel', { requestId: row.requestId, expectedStatus: 'requested' })).status, 401);

for (const extra of ['actorId', 'ownerId', 'email', 'completed', 'objectKey']) {
  assert.equal(parseAccountDeletionActionRequest({ requestId: row.requestId, expectedStatus: 'requested', [extra]: 'bad' }, 'confirm'), null);
}
const localEnv = { ACCOUNT_DELETION_REQUEST_WORKFLOW_ENABLED: '1', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321', NODE_ENV: 'test' };
assert.equal(isAccountDeletionWorkflowEnabled(localEnv), true);
for (const overrides of [{ NODE_ENV: 'production' }, { APP_ENV: ' Production ' }, { VERCEL_ENV: 'preview' }, { VERCEL: '1' },
  { NEXT_PUBLIC_SUPABASE_URL: 'https://fgejncfsvvsayiequubm.supabase.co' }, { NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1.attacker.test' }, { ACCOUNT_DELETION_REQUEST_WORKFLOW_ENABLED: '0' }]) {
  assert.equal(isAccountDeletionWorkflowEnabled({ ...localEnv, ...overrides }), false);
}
for (const handler of [GET, confirmDefault, cancelDefault]) {
  assert.equal((await handler(req({}))).status, 501, 'default handler must not initialize live storage');
}

const jwt = (overrides: Record<string, unknown> = {}) => ['header', Buffer.from(JSON.stringify({
  sub: f.owner, role: 'authenticated', session_id: f.staff, amr: [{ method: 'password', timestamp: f.now / 1000 - 30 }], ...overrides,
})).toString('base64url'), 'verified-by-test-boundary'].join('.');
assert.equal(verifiedBearerReauthenticationTime(jwt(), f.owner), new Date(f.now - 30000).toISOString());
const oldSessionProof = verifiedBearerReauthenticationTime(jwt({ iat: f.now / 1000,
  amr: [{ method: 'password', timestamp: f.now / 1000 - 600 }, { method: 'token_refresh', timestamp: f.now / 1000 }] }), f.owner);
assert.equal(evaluateAccountDeletionRecentReauth({ lastSignInAt: oldSessionProof, nowMs: f.now }).accepted, false,
  'a freshly issued token/global sign-in cannot freshen another session authentication');
for (const claims of [{ sub: f.staff }, { session_id: undefined }, { amr: [] }, { is_anonymous: true },
  { amr: [{ method: 'token_refresh', timestamp: f.now / 1000 }] }, { amr: [{ method: 'password', timestamp: 'bad' }] }]) {
  assert.equal(verifiedBearerReauthenticationTime(jwt(claims), f.owner), undefined);
}
const report = { userId: f.owner, isOnline: true, syncLocked: false, pendingEventCount: 0, unfinishedSyncQueueCount: 0,
  pendingSalesPhotoEvidenceCreationCount: 0, pendingSalesPhotoEvidencePayloadCount: 0, pendingProductCoverPhotoUploadCount: 0,
  pendingProductCoverPhotoPayloadCount: 0, blockingReasonCodes: [], isClean: true } as unknown as LocalPendingWriteReport;
assert.equal(evaluateDeletionDeviceCheck(report, f.owner, 0).ready, true);
for (const change of [{ pendingEventCount: 1 }, { pendingProductCoverPhotoPayloadCount: 1 }, { isOnline: false },
  { syncLocked: true }, { userId: f.staff }, { blockingReasonCodes: ['read_failed'] }, { pendingMarketCashDraftCount: 1 }, { pendingEventCount: NaN }]) {
  assert.equal(evaluateDeletionDeviceCheck({ ...report, ...change } as LocalPendingWriteReport, f.owner, 0).ready, false);
}
assert.equal(evaluateDeletionDeviceCheck(report, f.owner, 1).ready, false);

const api = deletionWorkflowFixture();
const rootHandlers = createAccountDeletionRouteHandlers(api.deps);
let posted = 0;
const client = createAccountDeletionClient({ accessToken: 'synthetic-owner', apiUrl: { configuredBaseUrl: 'http://127.0.0.1', runtimeProtocol: 'http:' },
  checkDevice: async () => ({ ready: true, message: 'synthetic' }), reauthenticate: async () => true, openBilling: async () => true,
  fetchImpl: async (url, init) => {
    const request = new Request(url, init);
    if (init?.method === 'POST') { posted++; return rootHandlers.POST(request); }
    return rootHandlers.GET(request);
  } });
api.dropResponse();
const lost = await client.create(body);
assert.equal(lost.ok, false);
assert.ok(!lost.ok && lost.uncertain);
const recovered = await client.read();
assert.ok(recovered.ok && recovered.request?.status === 'requested');
assert.equal(posted, 1, 'read recovery never resubmits a write');
assert.equal(api.writes(), 1);
const malformed = createAccountDeletionClient({ accessToken: 'synthetic',
  apiUrl: { configuredBaseUrl: 'http://127.0.0.1', runtimeProtocol: 'http:' },
  checkDevice: client.checkDevice, reauthenticate: client.reauthenticate, openBilling: client.openBilling,
  fetchImpl: async () => new Response('{"ok":true,"request":{}}', { status: 202 }) });
const malformedResult = await malformed.create(body);
assert.ok(!malformedResult.ok && malformedResult.uncertain, 'malformed success cannot be interpreted as definitely unsent');
const source = readFileSync('components/settings/AccountDeletionPanel.tsx', 'utf8');
assert.doesNotMatch(source, /localStorage|sessionStorage|clearAllData|forceDiscard|setInterval|setTimeout/);
assert.match(source, /generation\.current !== current/);
assert.match(source, /boundClient !== client/);
assert.match(readFileSync('app/settings/account/page.tsx', 'utf8'), /accountDeletionWorkflowUiEnabled\(\) &&/);
const closedUi = renderToStaticMarkup(React.createElement(RoleProvider, null, React.createElement(AccountDeletionPage)));
assert.match(closedUi, /此環境尚未開放帳號刪除/);
assert.match(closedUi, /aria-label="返回帳號與同步"/);
assert.doesNotMatch(closedUi, /提出刪除申請|type="password"/);
console.log('PASS deletion workflow: actor isolation, reauth, state conflicts, retained withdrawal, pending data, lost response, disabled live routes');
}
void main();

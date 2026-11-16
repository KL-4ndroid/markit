import { authenticateAppApiRequest, getAppApiBearerToken, type AppApiActor } from '@/lib/api/server/auth';
import { createAppApiJsonResponse } from '@/lib/api/server/response';
import type { AccountDeletionRouteDeps } from '@/app/api/account-deletion/route';
import { parseAccountDeletionActionRequest, parseAccountDeletionSafeStatus, type AccountDeletionAction } from './account-deletion-api-contract';
import { evaluateAccountDeletionRecentReauth } from './account-deletion-reauth.server';
import { isDeletionLoopbackDatabase } from './account-deletion-workflow-gate';

type Env = Record<string, string | undefined>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** First slice is deliberately incapable of connecting to a deployed/remote DB. */
export function isAccountDeletionWorkflowEnabled(env: Env): boolean {
  if (env.ACCOUNT_DELETION_REQUEST_WORKFLOW_ENABLED !== '1' || env.VERCEL || env.VERCEL_ENV) return false;
  if ([env.NODE_ENV, env.APP_ENV].some(value => value?.trim().toLowerCase() === 'production')) return false;
  return isDeletionLoopbackDatabase(env.NEXT_PUBLIC_SUPABASE_URL);
}

/** Only call after the *same bearer* was verified by the Auth service. Not a JWT verifier. */
export function verifiedBearerReauthenticationTime(token: string, actorId: string): string | undefined {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
    if (claims.sub !== actorId || claims.role !== 'authenticated' || claims.is_anonymous === true
      || typeof claims.session_id !== 'string' || !UUID.test(claims.session_id) || !Array.isArray(claims.amr)) return;
    const accepted = new Set(['password', 'oauth', 'otp', 'totp', 'sso/saml', 'magiclink']);
    const times = claims.amr.flatMap(entry => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      return typeof item.method === 'string' && accepted.has(item.method)
        && typeof item.timestamp === 'number' && Number.isSafeInteger(item.timestamp) && item.timestamp > 0
        ? [item.timestamp * 1000] : [];
    });
    if (!times.length) return;
    const timestamp = Math.max(...times);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
  } catch { return; }
}

export async function resolveAccountDeletionActor(request: Request): Promise<AppApiActor | 'unavailable' | null> {
  const result = await authenticateAppApiRequest(request);
  if (!result.ok) return result.code === 'authentication_unavailable' ? 'unavailable' : null;
  return {
    actorId: result.actor.actorId,
    // Ignore the global user.last_sign_in_at: another device may have updated it.
    lastSignInAt: verifiedBearerReauthenticationTime(getAppApiBearerToken(request) ?? '', result.actor.actorId),
  };
}

export async function readAccountDeletionJson(request: Request): Promise<unknown | null> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return null;
  if (Number(request.headers.get('content-length')) > 4096 || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export class AccountDeletionWorkflowConflict extends Error {
  constructor(readonly code: 'account_deletion_not_found' | 'account_deletion_conflict') { super(code); }
}

export function createAccountDeletionActionHandler(action: AccountDeletionAction, deps: AccountDeletionRouteDeps) {
  const fail = (status: number, code: string) => createAppApiJsonResponse({ ok: false, code }, { status });
  return async (request: Request): Promise<Response> => {
    if (!deps.isEnabled()) return fail(501, 'account_deletion_disabled');
    const actor = await deps.resolveActor(request);
    if (actor === 'unavailable') return fail(503, 'authentication_unavailable');
    if (!actor || !UUID.test(actor.actorId)) return fail(401, 'authentication_required');
    const proof = evaluateAccountDeletionRecentReauth({ lastSignInAt: actor.lastSignInAt, nowMs: deps.nowMs() });
    if (!proof.accepted) return fail(409, proof.code);
    const body = parseAccountDeletionActionRequest(await readAccountDeletionJson(request), action);
    if (!body) return fail(400, 'invalid_request');
    try {
      const repository = await deps.createRepository();
      const mutate = action === 'confirm' ? repository?.confirmForActor : repository?.cancelForActor;
      if (!mutate) return fail(503, 'account_deletion_unavailable');
      const raw = await mutate.call(repository, { actorId: actor.actorId, ...body });
      const status = parseAccountDeletionSafeStatus(raw);
      const allowed = action === 'confirm' ? ['identity_confirmed'] : ['cancelled'];
      return status && status.requestId === body.requestId && allowed.includes(status.status)
        ? createAppApiJsonResponse({ ok: true, request: status })
        : fail(503, 'account_deletion_unavailable');
    } catch (error) {
      if (error instanceof AccountDeletionWorkflowConflict) return fail(error.code === 'account_deletion_not_found' ? 404 : 409, error.code);
      return fail(503, 'account_deletion_unavailable');
    }
  };
}

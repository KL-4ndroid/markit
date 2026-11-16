import { buildAppApiUrl, type BuildAppApiUrlOptions } from '@/lib/api/client';
import { fetchAppApi } from '@/lib/api/transport';
import { parseAccountDeletionSafeStatus, type AccountDeletionAction, type AccountDeletionActionRequest, type AccountDeletionCreateRequest, type AccountDeletionSafeStatus } from './account-deletion-api-contract';
import type { DeletionDeviceCheck } from './account-deletion-experience';

export type DeletionResult = { ok: true; request: AccountDeletionSafeStatus | null }
  | { ok: false; code: string; uncertain: boolean };
export type AccountDeletionClient = {
  read(): Promise<DeletionResult>;
  create(input: AccountDeletionCreateRequest): Promise<DeletionResult>;
  act(action: AccountDeletionAction, input: AccountDeletionActionRequest): Promise<DeletionResult>;
  checkDevice(): Promise<DeletionDeviceCheck>;
  reauthenticate(password: string): Promise<boolean>;
  openBilling(store: 'apple' | 'google'): Promise<boolean>;
};

export function createAccountDeletionClient(options: {
  accessToken: string; apiUrl?: BuildAppApiUrlOptions; fetchImpl?: typeof fetch;
  checkDevice: AccountDeletionClient['checkDevice']; reauthenticate: AccountDeletionClient['reauthenticate'];
  openBilling: AccountDeletionClient['openBilling'];
}): AccountDeletionClient {
  async function request(action?: AccountDeletionAction | 'create', input?: unknown): Promise<DeletionResult> {
    if (!options.accessToken.trim()) return { ok: false, code: 'authentication_required', uncertain: false };
    try {
      const response = await fetchAppApi(buildAppApiUrl(`/api/account-deletion${action && action !== 'create' ? `/${action}` : ''}`, options.apiUrl), {
        method: action ? 'POST' : 'GET', cache: 'no-store',
        headers: { Authorization: `Bearer ${options.accessToken}`, ...(action ? { 'Content-Type': 'application/json' } : {}) },
        ...(action ? { body: JSON.stringify(input) } : {}),
      }, { fetchImpl: options.fetchImpl, timeoutMs: 8000 });
      const body = await response.json() as { ok?: unknown; request?: unknown; code?: unknown };
      if (!action && response.status === 404 && body.code === 'account_deletion_not_found') return { ok: true, request: null };
      const status = body.ok === true && response.ok ? parseAccountDeletionSafeStatus(body.request) : null;
      const expectedId = action && action !== 'create' && input && typeof input === 'object'
        ? (input as AccountDeletionActionRequest).requestId : undefined;
      if (status && (!expectedId || status.requestId === expectedId)) return { ok: true, request: status };
      return { ok: false, code: typeof body.code === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(body.code)
        ? body.code : 'account_deletion_unavailable', uncertain: Boolean(action) && (response.ok || response.status >= 500) };
    } catch { return { ok: false, code: 'account_deletion_unavailable', uncertain: Boolean(action) }; }
  }
  return { read: () => request(), create: input => request('create', input), act: (action, input) => request(action, input),
    checkDevice: options.checkDevice, reauthenticate: options.reauthenticate, openBilling: options.openBilling };
}

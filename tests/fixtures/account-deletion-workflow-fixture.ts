import { v4 as uuid } from 'uuid';
import type { AccountDeletionRouteDeps, AccountDeletionRouteRepository } from '../../app/api/account-deletion/route';
import type { AccountDeletionSafeStatus } from '../../lib/subscription/account-deletion-api-contract';
import { AccountDeletionWorkflowConflict } from '../../lib/subscription/account-deletion-request-workflow.server';

/** Synthetic repository for unit tests and loopback harness only. Never imported by app code. */
export function deletionWorkflowFixture() {
  const owner = 'a1000000-0000-4000-8000-000000000001';
  const staff = 'a1000000-0000-4000-8000-000000000002';
  const records = new Map<string, AccountDeletionSafeStatus>();
  const keys = new Map<string, AccountDeletionSafeStatus>();
  let actor: string | null = owner;
  let fresh = true;
  let dropNextWrite = false;
  let writes = 0;
  const now = Date.parse('2026-11-01T08:00:00Z');
  const repository: AccountDeletionRouteRepository = {
    async readCurrentForActor(id) { return records.get(id) ?? null; },
    async createForActor(input) {
      const existing = keys.get(input.idempotencyHash);
      if (existing) return existing;
      if (records.get(input.actorId)?.status !== 'cancelled' && records.has(input.actorId)) return records.get(input.actorId)!;
      const row: AccountDeletionSafeStatus = { requestId: uuid(), status: 'requested', safeErrorCode: null,
        requestedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), nextActionAfter: null };
      records.set(input.actorId, row); keys.set(input.idempotencyHash, row); writes++;
      if (dropNextWrite) { dropNextWrite = false; throw new Error('synthetic response loss after commit'); }
      return row;
    },
    async confirmForActor(input) {
      const row = records.get(input.actorId);
      if (!row || row.requestId !== input.requestId) throw new AccountDeletionWorkflowConflict('account_deletion_not_found');
      if (!['requested', 'identity_confirmed'].includes(row.status)) throw new AccountDeletionWorkflowConflict('account_deletion_conflict');
      const next: AccountDeletionSafeStatus = { ...row, status: 'identity_confirmed' };
      records.set(input.actorId, next); writes++;
      return next;
    },
    async cancelForActor(input) {
      const row = records.get(input.actorId);
      if (!row || row.requestId !== input.requestId) throw new AccountDeletionWorkflowConflict('account_deletion_not_found');
      if (row.status !== 'cancelled' && row.status !== input.expectedStatus) throw new AccountDeletionWorkflowConflict('account_deletion_conflict');
      const next: AccountDeletionSafeStatus = { ...row, status: 'cancelled' };
      records.set(input.actorId, next); writes++;
      return next;
    },
  };
  const deps: AccountDeletionRouteDeps = {
    isEnabled: () => true, nowMs: () => now, resolveHashSecret: () => 'synthetic-local-secret-not-for-production-0000',
    resolveActor: async () => actor ? { actorId: actor, lastSignInAt: new Date(now - (fresh ? 1000 : 600000)).toISOString() } : null,
    createRepository: async () => repository,
  };
  return { owner, staff, now, records, repository, deps, setActor: (id: string | null) => { actor = id; },
    setFresh: (value: boolean) => { fresh = value; }, dropResponse: () => { dropNextWrite = true; }, writes: () => writes };
}

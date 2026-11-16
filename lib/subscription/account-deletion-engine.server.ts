import { createHash } from 'node:crypto';
import type { AccountDeletionAccountKind, AccountDeletionStepCode } from './account-deletion-contract';
import type { AccountDeletionSagaStepExecutor, AccountDeletionSagaStepResult } from './account-deletion-saga.server';

export const ACCOUNT_DELETION_ENGINE_RELEASE_READY = false;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const DELETION_OBJECT_BATCH_SIZE = 20;
export type DeletionLease = Readonly<{ requestId: string; leaseToken: string; accountKind: AccountDeletionAccountKind; stepCode: AccountDeletionStepCode }>;
export type DeletionObject = Readonly<{ key: string; deleted: boolean; absent: boolean }>;
export type DeletionContext = Readonly<{ actorId: string; objects: readonly DeletionObject[]; totalObjects: number }>;
export type DeletionDatabasePort = {
  /** Must lock request, check live lease AND next required step on every call. */
  context(lease: DeletionLease): Promise<DeletionContext>;
  execute(lease: DeletionLease): Promise<{ affectedCount: number; evidenceHash: string }>;
  acknowledgeObject(lease: DeletionLease, key: string): Promise<void>;
  completeExternal(lease: DeletionLease): Promise<{ affectedCount: number; evidenceHash: string }>;
};
export type DeletionObjectPort = {
  deleteObject(key: string): Promise<void>;
  isAbsent(key: string): Promise<boolean>;
};
export type DeletionIdentityPort = {
  freeze(actorId: string): Promise<void>;
  deleteIdentity(actorId: string): Promise<void>;
  isAbsent(actorId: string): Promise<boolean>;
};
export class DeletionEngineFailure extends Error {
  constructor(readonly disposition: 'failed_retryable' | 'manual_review', readonly safeCode: string) {
    super('Account deletion step stopped.');
  }
}

/** No URL, caller-supplied prefix, wildcard, or bucket-wide deletion is accepted. */
export function isOwnedDeletionObjectKey(key: string, actorId: string): boolean {
  if (!UUID.test(actorId) || key.length > 1024 || /[\\\s%?#]/u.test(key) || key.includes('..') || key.includes('//')) return false;
  const id = '[0-9a-f-]{36}';
  return new RegExp(`^product-cover-photos/${actorId}/${id}/${id}/v[1-9][0-9]*/(display|thumbnail)\\.(webp|jpg|jpeg)$`, 'i').test(key)
    || new RegExp(`^sales-evidence(?:-thumbs)?/7d/${actorId}/[A-Za-z0-9_./-]+\\.(webp|jpg|jpeg)$`, 'i').test(key);
}

export function deletionEvidence(requestId: string, step: string, count: number): string {
  return createHash('sha256').update(`deletion-engine-v1:${requestId}:${step}:${count}`).digest('hex');
}

/** Server execution only. Scheduling and retry remain explicit; no browser/device APIs. */
export function createAccountDeletionStepExecutor(ports: {
  database: DeletionDatabasePort; objects: DeletionObjectPort; identity: DeletionIdentityPort;
}): AccountDeletionSagaStepExecutor {
  return async lease => {
    try {
      if (!UUID.test(lease.requestId) || !UUID.test(lease.leaseToken)) throw new DeletionEngineFailure('manual_review', 'engine_invalid_lease');
      let context = await ports.database.context(lease);
      if (!UUID.test(context.actorId) || !Number.isSafeInteger(context.totalObjects) || context.totalObjects < 0
        || context.objects.length > DELETION_OBJECT_BATCH_SIZE || context.objects.length > context.totalObjects) {
        throw new DeletionEngineFailure('manual_review', 'engine_invalid_context');
      }
      const external = ['access_frozen', 'r2_objects_deleted', 'r2_absence_verified', 'auth_user_deleted', 'sessions_revoked'].includes(lease.stepCode);
      if (!external) return { outcome: 'completed', ...await ports.database.execute(lease) };
      if (lease.stepCode === 'access_frozen') {
        // DB fence is installed before banning Auth. A failed ban never records completion.
        await ports.database.execute(lease);
        await ports.database.context(lease);
        await ports.identity.freeze(context.actorId);
      } else if (lease.stepCode === 'r2_objects_deleted' || lease.stepCode === 'r2_absence_verified') {
        if (lease.accountKind !== 'owner') throw new DeletionEngineFailure('manual_review', 'engine_scope_mismatch');
        for (const object of context.objects) {
          if (!isOwnedDeletionObjectKey(object.key, context.actorId)) throw new DeletionEngineFailure('manual_review', 'engine_object_scope');
          // Recheck fencing immediately before EACH external side effect/read; no cached authorization.
          await ports.database.context(lease);
          if (lease.stepCode === 'r2_objects_deleted') await ports.objects.deleteObject(object.key);
          else if (!await ports.objects.isAbsent(object.key)) throw new DeletionEngineFailure('failed_retryable', 'engine_object_present');
          await ports.database.acknowledgeObject(lease, object.key);
        }
        context = await ports.database.context(lease);
        if (context.objects.length) return { outcome: 'processing', safeErrorCode: 'engine_batch_pending' };
      } else if (lease.stepCode === 'auth_user_deleted') {
        if (!await ports.identity.isAbsent(context.actorId)) {
          await ports.database.context(lease);
          await ports.identity.deleteIdentity(context.actorId);
        }
        if (!await ports.identity.isAbsent(context.actorId)) throw new DeletionEngineFailure('failed_retryable', 'engine_auth_present');
      } else if (!await ports.identity.isAbsent(context.actorId)) {
        throw new DeletionEngineFailure('manual_review', 'engine_auth_present');
      }
      return { outcome: 'completed', ...await ports.database.completeExternal(lease) };
    } catch (error) {
      if (error instanceof DeletionEngineFailure) return { outcome: error.disposition, safeErrorCode: error.safeCode };
      // Never persist/provider-log raw errors, credentials, object keys, or customer data.
      return { outcome: 'failed_retryable', safeErrorCode: 'engine_dependency_unavailable' } satisfies AccountDeletionSagaStepResult;
    }
  };
}

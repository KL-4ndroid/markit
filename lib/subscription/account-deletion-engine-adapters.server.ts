import { DeleteObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DeletionEngineFailure, type DeletionContext, type DeletionDatabasePort, type DeletionIdentityPort, type DeletionLease, type DeletionObjectPort } from './account-deletion-engine.server';

type Rpc = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }> };

export function requireIsolatedEndpoint(value: string): void {
  const u = new URL(value);
  if (u.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)
    || !u.port || u.username || u.password || u.search || u.hash) throw new Error('Isolated loopback deletion endpoint required.');
}

/** Explicit client injection; no process.env/default production credentials or runtime route. */
export function createDeletionDatabasePort(client: Rpc, endpoint: string): DeletionDatabasePort {
  requireIsolatedEndpoint(endpoint);
  async function call(lease: DeletionLease, action: string, key: string | null = null): Promise<unknown> {
    const { data, error } = await client.rpc('bff_account_deletion_engine', {
      p_request_id: lease.requestId, p_lease_token: lease.leaseToken, p_step: lease.stepCode,
      p_kind: lease.accountKind, p_action: action, p_key: key,
    });
    if (error) {
      if (error.code === '55P03') throw new DeletionEngineFailure('failed_retryable', 'engine_uploads_in_flight');
      if (error.code === '55000') throw new DeletionEngineFailure('manual_review', 'engine_fence_or_scope');
      throw new DeletionEngineFailure('failed_retryable', 'engine_database_unavailable');
    }
    return data;
  }
  async function receipt(lease: DeletionLease, action: string) {
    const row = await call(lease, action) as { affectedCount?: number; evidenceHash?: string } | null;
    if (!row || !Number.isSafeInteger(row.affectedCount) || row.affectedCount! < 0 || !/^[a-f0-9]{64}$/.test(row.evidenceHash ?? '')) throw new DeletionEngineFailure('manual_review', 'engine_invalid_receipt');
    return { affectedCount: row.affectedCount!, evidenceHash: row.evidenceHash! };
  }
  return {
    async context(lease) { return await call(lease, 'context') as DeletionContext; },
    execute: lease => receipt(lease, 'execute'),
    acknowledgeObject: async (lease, key) => { await call(lease, 'ack_object', key); },
    completeExternal: lease => receipt(lease, 'complete_external'),
  };
}

export function createDeletionIdentityPort(client: Pick<SupabaseClient, 'auth'>, endpoint: string): DeletionIdentityPort {
  requireIsolatedEndpoint(endpoint);
  const admin = client.auth.admin;
  return {
    async freeze(id) {
      const { error } = await admin.updateUserById(id, { ban_duration: '876000h' });
      if (error) throw new DeletionEngineFailure('failed_retryable', 'engine_auth_freeze_failed');
    },
    async deleteIdentity(id) {
      const { error } = await admin.deleteUser(id, false);
      if (error) throw new DeletionEngineFailure('failed_retryable', 'engine_auth_delete_failed');
    },
    async isAbsent(id) {
      const { data, error } = await admin.getUserById(id);
      // Only GoTrue's explicit user_not_found is absence; an arbitrary 404/403/network error is not.
      if (error?.code === 'user_not_found') return true;
      if (error || !data.user || data.user.id !== id) throw new DeletionEngineFailure('failed_retryable', 'engine_auth_read_failed');
      return false;
    },
  };
}

/** Only a provider-confirmed missing key is absence; never a permission/network failure. */
export function isExplicitDeletionObjectAbsence(error: unknown): boolean {
  const e = error as { name?: string; $metadata?: { httpStatusCode?: number } } | null;
  return e?.$metadata?.httpStatusCode === 404 && ['NotFound', 'NoSuchKey'].includes(e.name ?? '');
}

export function createDeletionObjectPort(input: { client: Pick<S3Client, 'send'>; bucket: string; endpoint: string }): DeletionObjectPort {
  requireIsolatedEndpoint(input.endpoint);
  if (!input.bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(input.bucket)) throw new Error('Invalid deletion bucket.');
  return {
    async deleteObject(key) { await input.client.send(new DeleteObjectCommand({ Bucket: input.bucket, Key: key })); },
    async isAbsent(key) {
      try { await input.client.send(new HeadObjectCommand({ Bucket: input.bucket, Key: key })); return false; }
      catch (error) {
        // Permission failures/timeouts/unknown response are never proof of absence.
        if (isExplicitDeletionObjectAbsence(error)) return true;
        throw new DeletionEngineFailure('failed_retryable', 'engine_object_read_failed');
      }
    },
  };
}

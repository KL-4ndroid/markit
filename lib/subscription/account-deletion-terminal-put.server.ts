import { createHash, randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { requireIsolatedEndpoint } from './account-deletion-engine-adapters.server';
import { DeletionEngineFailure, isOwnedDeletionObjectKey } from './account-deletion-engine.server';
import type { UploadDrainPort, UploadReviewIdentity, UploadReviewScope } from './account-deletion-upload-reconciliation.server';

type Rpc = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data?: unknown; error: unknown | null }> };
export type TerminalPutTarget = Readonly<{ endpoint: string; bucket: string; mode: 'isolated' | 'staging-disposable' | 'preview-photos' }>;
const digest = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
const HASH = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function stopped(): never { throw new DeletionEngineFailure('manual_review', 'terminal_put_unconfirmed'); }

export function requirePreviewPhotoDatabase(endpoint: string, expectedRef: string): void {
  const url = new URL(endpoint);
  if (!/^[a-z0-9]{20}$/.test(expectedRef) || expectedRef === 'fgejncfsvvsayiequubm'
    || ![`https://${expectedRef}.supabase.co`, `https://${expectedRef}.supabase.co/`].includes(endpoint)
    || url.origin !== `https://${expectedRef}.supabase.co`) stopped();
}

export function terminalPutTargetHash(t: TerminalPutTarget): string {
  const u = new URL(t.endpoint);
  const expectedBucket = t.mode === 'preview-photos' ? 'markit-account-deletion-preview' : 'markit-sales-photo-staging';
  if (u.pathname !== '/' || u.username || u.password || u.search || u.hash || t.bucket !== expectedBucket) stopped();
  if (t.mode === 'isolated') requireIsolatedEndpoint(t.endpoint);
  else if ((t.mode !== 'staging-disposable' && t.mode !== 'preview-photos') || u.protocol !== 'https:'
    || u.port || !/^[a-f0-9]{32}(\.eu|\.fedramp)?\.r2\.cloudflarestorage\.com$/.test(u.hostname)) stopped();
  return digest(JSON.stringify(['s3-single-put-200-v1', u.origin, t.bucket]));
}

/** Single, bounded, create-only PUT against a scoped test target. */
export function createTerminalPutWriter(input: {
  databaseEndpoint: string; client: Rpc; attemptId: string; token: string; target: TerminalPutTarget;
  credentials: { accessKeyId: string; secretAccessKey: string }; assertKey(key: string): void;
  photoScope?: { ownerId: string; keys: readonly string[] };
  previewProjectRef?: string;
}) {
  if (input.target.mode === 'preview-photos') {
    if (process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'preview') stopped();
    requirePreviewPhotoDatabase(input.databaseEndpoint, input.previewProjectRef ?? '');
    if (!input.photoScope) stopped();
  } else {
    requireIsolatedEndpoint(input.databaseEndpoint);
    if (process.env.VERCEL || process.env.VERCEL_ENV) stopped();
  }
  if (!UUID.test(input.attemptId) || !UUID.test(input.token)) stopped();
  const targetHash = terminalPutTargetHash(input.target);
  const photoScope = input.photoScope;
  if (photoScope && (input.target.mode === 'staging-disposable' || photoScope.keys.length !== 2
    || photoScope.keys.some(k => !isOwnedDeletionObjectKey(k, photoScope.ownerId)))) stopped();
  const created = new Set<string>();
  const sdk = new S3Client({ region: 'auto', endpoint: input.target.endpoint, credentials: input.credentials,
    maxAttempts: 1, followRegionRedirects: false, forcePathStyle: true, requestChecksumCalculation: 'WHEN_REQUIRED' });
  async function record(key: string, action: string, data: Record<string, unknown>) {
    try {
      const r = await input.client.rpc('bff_record_deletion_upload_put', { p_id: input.attemptId, p_token: input.token, p_key: key, p_action: action, p_data: data });
      if (r.error) stopped();
    } catch { stopped(); }
  }
  return {
    targetHash,
    async write(key: string, payload: Uint8Array, runId: string, contentType = 'application/octet-stream'): Promise<true> {
      input.assertKey(key);
      if (!UUID.test(runId) || (photoScope ? !photoScope.keys.includes(key) || !['image/webp','image/jpeg'].includes(contentType)
        : !key.includes(`/__deletion_acceptance/${runId}/`)) || payload.byteLength < 1 || payload.byteLength > 1024 * 1024) stopped();
      const body = new Uint8Array(payload), ticket = randomUUID(), bodyHash = digest(body);
      const intent = { ticket, targetHash, bodyHash };
      await record(key, 'issue', intent); // A lost issue response never permits a PUT retry.
      try {
        const result = await sdk.send(new PutObjectCommand({ Bucket: input.target.bucket, Key: key, Body: body,
          ContentType: contentType, ContentLength: body.byteLength, IfNoneMatch: '*',
          ContentMD5: createHash('md5').update(body).digest('base64'), Metadata: { 'deletion-test-run': runId } }),
        { abortSignal: AbortSignal.timeout(15000) });
        if (result.$metadata.httpStatusCode !== 200 || result.$metadata.attempts !== 1 || typeof result.ETag !== 'string'
          || result.ETag.length < 2 || result.ETag.length > 256 || /[\r\n]/.test(result.ETag)) stopped();
        created.add(key); // Safe compensation only for a create confirmed in this attempt.
        await record(key, 'ack', { ...intent, profile: 's3-single-put-200-v1', status: 200, attempts: 1,
          etagHash: digest(result.ETag) });
        return true;
      } catch { stopped(); } // Network/403/412/abort are held, never inferred from HEAD.
    },
    canCompensate(key: string) { return created.has(key); },
    destroy() { sdk.destroy(); },
  };
}

/** Attests durable single-PUT provider receipts for the EXACT frozen SQL scope.
 * A new process can read these receipts; process exit or an SDK rejection is not proof. */
export function createReceiptBackedUploadDrain(input: { endpoint: string; client: Rpc; identity: UploadReviewIdentity; target: TerminalPutTarget }): UploadDrainPort {
  requireIsolatedEndpoint(input.endpoint);
  const targetHash = terminalPutTargetHash(input.target);
  async function proof(scope: UploadReviewScope) {
    if (scope.attemptId !== input.identity.attemptId) stopped();
    const r = await input.client.rpc('bff_get_deletion_upload_drain', { p_request: input.identity.requestId,
      p_token: input.identity.leaseToken, p_id: scope.attemptId, p_source: scope.sourceHash, p_target: targetHash });
    const p = r.data as { scopeHash?: string; evidenceHash?: string; expiresAt?: string } | null;
    if (r.error || p?.scopeHash !== scope.sourceHash || !HASH.test(p?.evidenceHash ?? '') || typeof p?.expiresAt !== 'string') stopped();
    return { scopeHash: p.scopeHash, evidenceHash: p.evidenceHash!, expiresAt: p.expiresAt };
  }
  return {
    verify: proof,
    async assertStillDrained(scope, previous) { if ((await proof(scope)).evidenceHash !== previous.evidenceHash) stopped(); },
  };
}

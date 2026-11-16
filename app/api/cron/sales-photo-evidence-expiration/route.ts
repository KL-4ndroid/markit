import { createHash, timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { normalizeAppApiErrorBody } from '@/lib/api/contract';
import {
  getSafeOperationalErrorName,
  recordServerOperationalEvent,
} from '@/lib/observability/server-operational-event';
import { isSalesPhotoEvidenceObjectKeyBoundToIdentity } from '@/lib/sales/photo-evidence-model';
import type { SalesPhotoEvidenceR2UploadAdapter } from '@/lib/sales/photo-evidence-r2-upload-adapter';
import type {
  SalesPhotoEvidenceExpirationRepository,
} from '@/lib/supabase/sales-photo-evidence-expiration-repository.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type ExpirationRouteEnv = Record<string, string | undefined>;

export type SalesPhotoEvidenceExpirationRouteDeps = {
  isEnabled(): boolean;
  isAuthorized(request: Request): boolean;
  createRepository(): Promise<SalesPhotoEvidenceExpirationRepository | null>;
  createR2DeleteAdapter(): Promise<SalesPhotoEvidenceR2UploadAdapter | null>;
};

const CLEANUP_LIMIT = 25;
const OPERATIONAL_ROUTE = '/api/cron/sales-photo-evidence-expiration';

function jsonResponse(body: unknown, status: number): NextResponse {
  const normalized = body && typeof body === 'object' && !Array.isArray(body)
    && (body as Record<string, unknown>).ok === false
    ? normalizeAppApiErrorBody(body as Record<string, unknown>, status)
    : body;
  return NextResponse.json(normalized, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function keysAreBound(candidate: Awaited<ReturnType<SalesPhotoEvidenceExpirationRepository['listExpired']>>[number]): boolean {
  return isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    key: candidate.imageObjectKey,
    ownerId: candidate.ownerId,
    marketId: candidate.marketId,
    saleId: candidate.saleId,
    evidenceId: candidate.id,
    kind: 'image',
  }) && isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    key: candidate.thumbnailObjectKey,
    ownerId: candidate.ownerId,
    marketId: candidate.marketId,
    saleId: candidate.saleId,
    evidenceId: candidate.id,
    kind: 'thumbnail',
  });
}

export function createSalesPhotoEvidenceExpirationRouteHandlers(
  deps: SalesPhotoEvidenceExpirationRouteDeps
) {
  async function getInternal(request: Request, startedAt: number): Promise<Response> {
    if (!deps.isEnabled()) {
      return jsonResponse({
        ok: false,
        code: 'sales_photo_evidence_expiration_disabled',
        message: 'Sales photo evidence expiration cleanup is not enabled.',
      }, 501);
    }
    if (!deps.isAuthorized(request)) {
      return jsonResponse({
        ok: false,
        code: 'cron_authentication_required',
        message: 'Cron authentication is required.',
      }, 401);
    }

    const repository = await deps.createRepository();
    const adapter = await deps.createR2DeleteAdapter();
    if (!repository || !adapter) {
      recordServerOperationalEvent({
        level: 'error',
        event: 'media.sales_photo.expiration.run',
        outcome: 'failure',
        code: 'expiration_dependencies_unavailable',
        route: OPERATIONAL_ROUTE,
        durationMs: Date.now() - startedAt,
      });
      return jsonResponse({
        ok: false,
        code: 'expiration_dependencies_unavailable',
        message: 'Sales photo evidence expiration dependencies are unavailable.',
      }, 503);
    }

    const candidates = await repository.listExpired(CLEANUP_LIMIT);
    let expiredCount = 0;
    let failedCount = 0;
    let invalidBindingCount = 0;

    for (const candidate of candidates) {
      try {
        if (!keysAreBound(candidate)) {
          failedCount += 1;
          invalidBindingCount += 1;
          continue;
        }

        const thumbnailDelete = await adapter.deleteObject({ key: candidate.thumbnailObjectKey });
        if (!thumbnailDelete.ok) {
          failedCount += 1;
          continue;
        }
        const imageDelete = await adapter.deleteObject({ key: candidate.imageObjectKey });
        if (!imageDelete.ok) {
          failedCount += 1;
          continue;
        }

        await repository.finalizeExpiration(candidate);
        expiredCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    if (failedCount > 0) {
      recordServerOperationalEvent({
        level: 'error',
        event: 'media.sales_photo.expiration.run',
        outcome: 'partial',
        code: 'expiration_cleanup_incomplete',
        route: OPERATIONAL_ROUTE,
        durationMs: Date.now() - startedAt,
        metrics: {
          scannedCount: candidates.length,
          completedCount: expiredCount,
          failedCount,
          invalidBindingCount,
        },
      });
      return jsonResponse({
        ok: false,
        code: 'expiration_cleanup_incomplete',
        message: 'Sales photo evidence expiration cleanup did not finish.',
        cleanupIncomplete: true,
      }, 503);
    }

    recordServerOperationalEvent({
      level: 'info',
      event: 'media.sales_photo.expiration.run',
      outcome: 'success',
      code: 'expiration_cleanup_completed',
      route: OPERATIONAL_ROUTE,
      durationMs: Date.now() - startedAt,
      metrics: {
        scannedCount: candidates.length,
        completedCount: expiredCount,
        failedCount,
        invalidBindingCount,
      },
    });
    return jsonResponse({
      ok: true,
      scannedCount: candidates.length,
      expiredCount,
    }, 200);
  }

  async function get(request: Request): Promise<Response> {
    const startedAt = Date.now();
    try {
      return await getInternal(request, startedAt);
    } catch (error) {
      recordServerOperationalEvent({
        level: 'error',
        event: 'media.sales_photo.expiration.run',
        outcome: 'failure',
        code: 'expiration_route_unavailable',
        route: OPERATIONAL_ROUTE,
        durationMs: Date.now() - startedAt,
        errorName: getSafeOperationalErrorName(error),
      });
      return jsonResponse({
        ok: false,
        code: 'expiration_route_unavailable',
        message: 'Sales photo evidence expiration cleanup is temporarily unavailable.',
      }, 503);
    }
  }

  return { GET: get };
}

export function isSalesPhotoEvidenceExpirationRouteEnabledForEnv(env: ExpirationRouteEnv): boolean {
  if (env.SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ENABLED !== '1') return false;
  const deploymentEnv = env.VERCEL_ENV ?? env.APP_ENV ?? env.NODE_ENV;
  return deploymentEnv !== 'production'
    || env.SALES_PHOTO_EVIDENCE_EXPIRATION_ROUTE_ALLOW_PRODUCTION === '1';
}

export function isSalesPhotoEvidenceExpirationCronAuthorized(
  request: Request,
  env: ExpirationRouteEnv = process.env
): boolean {
  const secret = env.CRON_SECRET;
  if (!secret || secret.length < 32 || secret.length > 1_024 || secret !== secret.trim()) return false;
  const expected = `Bearer ${secret}`;
  const actual = request.headers.get('authorization') ?? '';
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

// Match the audited production storage target without returning configuration values.
const AUDITED_R2_ENDPOINT_SHA256 = '87f2a86a63f1ec243c4b2d652b29babd9240f0bca85b0be42845a82f3d240551';

export function verifyProductionR2Target(request: Request, env: ExpirationRouteEnv): Response {
  const headers = new Headers({ 'Cache-Control': 'private, no-store' });
  if (request.method !== 'HEAD' || env.VERCEL_ENV !== 'production'
    || !isSalesPhotoEvidenceExpirationCronAuthorized(request, env)) {
    return new Response(null, { status: 404, headers });
  }
  const nonce = request.headers.get('x-r2-verification-nonce') ?? '';
  if (!/^[0-9a-f]{64}$/.test(nonce)) return new Response(null, { status: 400, headers });

  const deploymentId = env.VERCEL_DEPLOYMENT_ID ?? '';
  if (!/^dpl_[A-Za-z0-9]+$/.test(deploymentId)) return new Response(null, { status: 503, headers });

  const accountId = env.R2_ACCOUNT_ID?.trim();
  const endpoint = env.R2_ENDPOINT?.trim() || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const endpointHash = createHash('sha256').update(endpoint.replace(/\/$/, '')).digest('hex');
  const matches = endpointHash === AUDITED_R2_ENDPOINT_SHA256
    && env.R2_BUCKET_NAME?.trim() === 'markit-media-production';

  headers.set('x-r2-verification-nonce', nonce);
  headers.set('x-r2-verification-deployment', deploymentId);
  return new Response(null, { status: matches ? 204 : 409, headers });
}

export const HEAD = (request: Request) => verifyProductionR2Target(request, process.env);

async function createRepository(): Promise<SalesPhotoEvidenceExpirationRepository | null> {
  if (!isSalesPhotoEvidenceExpirationRouteEnabledForEnv(process.env)) return null;
  const {
    createSalesPhotoEvidenceExpirationRepository,
  } = await import('@/lib/supabase/sales-photo-evidence-expiration-repository.server');
  return createSalesPhotoEvidenceExpirationRepository({ env: process.env });
}

async function createR2DeleteAdapter(): Promise<SalesPhotoEvidenceR2UploadAdapter | null> {
  if (!isSalesPhotoEvidenceExpirationRouteEnabledForEnv(process.env)) return null;
  const {
    createCloudflareR2SalesPhotoEvidenceUploadAdapter,
    createSalesPhotoEvidenceR2ServerConfigFromEnv,
  } = await import('@/lib/sales/photo-evidence-r2-upload-adapter.server');
  const result = createSalesPhotoEvidenceR2ServerConfigFromEnv(process.env);
  return result.ok ? createCloudflareR2SalesPhotoEvidenceUploadAdapter({ config: result.config }) : null;
}

export const GET = (request: Request) => createSalesPhotoEvidenceExpirationRouteHandlers({
  isEnabled: () => isSalesPhotoEvidenceExpirationRouteEnabledForEnv(process.env),
  isAuthorized: value => isSalesPhotoEvidenceExpirationCronAuthorized(value, process.env),
  createRepository,
  createR2DeleteAdapter,
}).GET(request);

import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { normalizeAppApiErrorBody } from '@/lib/api/contract';
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
  async function getInternal(request: Request): Promise<Response> {
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
      return jsonResponse({
        ok: false,
        code: 'expiration_dependencies_unavailable',
        message: 'Sales photo evidence expiration dependencies are unavailable.',
      }, 503);
    }

    const candidates = await repository.listExpired(CLEANUP_LIMIT);
    let expiredCount = 0;
    let failedCount = 0;

    for (const candidate of candidates) {
      try {
        if (!keysAreBound(candidate)) {
          failedCount += 1;
          console.error('sales photo evidence expiration rejected invalid object binding', {
            evidenceId: candidate.id,
          });
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
      } catch (error) {
        failedCount += 1;
        console.error('sales photo evidence expiration item failed', {
          evidenceId: candidate.id,
          name: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }

    if (failedCount > 0) {
      return jsonResponse({
        ok: false,
        code: 'expiration_cleanup_incomplete',
        message: 'Sales photo evidence expiration cleanup did not finish.',
        cleanupIncomplete: true,
      }, 503);
    }

    return jsonResponse({
      ok: true,
      scannedCount: candidates.length,
      expiredCount,
    }, 200);
  }

  async function get(request: Request): Promise<Response> {
    try {
      return await getInternal(request);
    } catch (error) {
      console.error('sales photo evidence expiration route failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
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
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

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

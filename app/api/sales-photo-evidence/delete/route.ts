import { NextResponse } from 'next/server';

import { normalizeAppApiErrorBody } from '@/lib/api/contract';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import { isSalesPhotoEvidenceObjectKeyBoundToIdentity } from '@/lib/sales/photo-evidence-model';
import type { SalesPhotoEvidenceR2UploadAdapter } from '@/lib/sales/photo-evidence-r2-upload-adapter';
import type {
  SalesPhotoEvidenceDeletePreparedRow,
  SalesPhotoEvidenceDeleteRepository,
} from '@/lib/supabase/sales-photo-evidence-delete-repository.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

type DeleteRouteActor = { actorId: string };
type DeleteRouteEnv = Record<string, string | undefined>;

export type SalesPhotoEvidenceDeleteRouteDeps = {
  isEnabled(): boolean;
  resolveActor(request: Request): Promise<DeleteRouteActor | 'unavailable' | null>;
  createDeleteRepository(actorId: string): Promise<SalesPhotoEvidenceDeleteRepository | null>;
  createR2DeleteAdapter(): Promise<SalesPhotoEvidenceR2UploadAdapter | null>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function disabledResponse(): NextResponse {
  return jsonResponse({
    ok: false,
    code: 'sales_photo_evidence_delete_disabled',
    message: 'Sales photo evidence deletion is not enabled.',
  }, 501);
}

function capabilityResponse(enabled: boolean): NextResponse {
  return jsonResponse({ ok: true, enabled }, 200);
}

function getEvidenceId(request: Request): string | null {
  const evidenceId = new URL(request.url).searchParams.get('evidenceId')?.trim() ?? '';
  return UUID_PATTERN.test(evidenceId) ? evidenceId : null;
}

function keysAreBound(row: SalesPhotoEvidenceDeletePreparedRow): boolean {
  return isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    key: row.imageObjectKey,
    ownerId: row.ownerId,
    marketId: row.marketId,
    saleId: row.saleId,
    evidenceId: row.id,
    kind: 'image',
  }) && isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    key: row.thumbnailObjectKey,
    ownerId: row.ownerId,
    marketId: row.marketId,
    saleId: row.saleId,
    evidenceId: row.id,
    kind: 'thumbnail',
  });
}

export function createSalesPhotoEvidenceDeleteRouteHandlers(deps: SalesPhotoEvidenceDeleteRouteDeps) {
  async function deleteInternal(request: Request): Promise<Response> {
    if (!deps.isEnabled()) return disabledResponse();

    const evidenceId = getEvidenceId(request);
    if (!evidenceId) {
      return jsonResponse({ ok: false, code: 'invalid_request', message: 'Evidence id is invalid.' }, 400);
    }

    const actor = await deps.resolveActor(request);
    if (actor === 'unavailable') {
      return jsonResponse({
        ok: false,
        code: 'authentication_unavailable',
        message: 'Sales photo evidence authentication is temporarily unavailable.',
      }, 503);
    }
    if (!actor) {
      return jsonResponse({
        ok: false,
        code: 'authentication_required',
        message: 'Sales photo evidence deletion requires authentication.',
      }, 401);
    }

    const repository = await deps.createDeleteRepository(actor.actorId);
    if (!repository) return disabledResponse();

    let row: SalesPhotoEvidenceDeletePreparedRow;
    try {
      row = await repository.prepareDeletion(evidenceId);
    } catch {
      return jsonResponse({
        ok: false,
        code: 'evidence_not_deletable',
        message: 'Sales photo evidence is not available for deletion.',
      }, 409);
    }

    if (row.ownerId !== actor.actorId) {
      return jsonResponse({
        ok: false,
        code: 'unauthorized_actor',
        message: 'Only the market owner may delete sales photo evidence.',
      }, 403);
    }
    if (row.deletedAt !== null || row.status !== 'uploaded' || !keysAreBound(row)) {
      return jsonResponse({
        ok: false,
        code: 'evidence_not_deletable',
        message: 'Sales photo evidence is not available for deletion.',
      }, 409);
    }

    const adapter = await deps.createR2DeleteAdapter();
    if (!adapter) return disabledResponse();

    const thumbnailDelete = await adapter.deleteObject({ key: row.thumbnailObjectKey });
    if (!thumbnailDelete.ok) {
      return jsonResponse({
        ok: false,
        code: 'r2_delete_failed',
        message: 'Sales photo evidence storage deletion failed.',
        cleanupIncomplete: true,
      }, 502);
    }

    const imageDelete = await adapter.deleteObject({ key: row.imageObjectKey });
    if (!imageDelete.ok) {
      return jsonResponse({
        ok: false,
        code: 'r2_delete_failed',
        message: 'Sales photo evidence storage deletion failed.',
        cleanupIncomplete: true,
      }, 502);
    }

    try {
      await repository.finalizeDeletion(row);
    } catch {
      return jsonResponse({
        ok: false,
        code: 'metadata_finalize_failed',
        message: 'Sales photo evidence metadata deletion did not finish.',
        cleanupIncomplete: true,
      }, 503);
    }

    return jsonResponse({ ok: true, evidenceId: row.id }, 200);
  }

  async function deleteRequest(request: Request): Promise<Response> {
    try {
      return await deleteInternal(request);
    } catch (error) {
      console.error('sales photo evidence delete route failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      return jsonResponse({
        ok: false,
        code: 'delete_route_unavailable',
        message: 'Sales photo evidence deletion is temporarily unavailable.',
      }, 503);
    }
  }

  return {
    GET: async () => capabilityResponse(deps.isEnabled()),
    POST: async () => disabledResponse(),
    PUT: async () => disabledResponse(),
    PATCH: async () => disabledResponse(),
    DELETE: deleteRequest,
  };
}

export function isSalesPhotoEvidenceDeleteRouteEnabledForEnv(env: DeleteRouteEnv): boolean {
  if (env.SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ENABLED !== '1') return false;
  const deploymentEnv = env.VERCEL_ENV ?? env.APP_ENV ?? env.NODE_ENV;
  return deploymentEnv !== 'production'
    || env.SALES_PHOTO_EVIDENCE_DELETE_ROUTE_ALLOW_PRODUCTION === '1';
}

async function resolveActor(request: Request): Promise<DeleteRouteActor | 'unavailable' | null> {
  const result = await authenticateAppApiRequest(request);
  if (result.ok) return result.actor;
  return result.code === 'authentication_unavailable' ? 'unavailable' : null;
}

async function createDeleteRepository(actorId: string): Promise<SalesPhotoEvidenceDeleteRepository | null> {
  if (!isSalesPhotoEvidenceDeleteRouteEnabledForEnv(process.env)) return null;
  const {
    createSalesPhotoEvidenceDeleteRepository,
  } = await import('@/lib/supabase/sales-photo-evidence-delete-repository.server');
  return createSalesPhotoEvidenceDeleteRepository(actorId, { env: process.env });
}

async function createR2DeleteAdapter(): Promise<SalesPhotoEvidenceR2UploadAdapter | null> {
  if (!isSalesPhotoEvidenceDeleteRouteEnabledForEnv(process.env)) return null;
  const {
    createCloudflareR2SalesPhotoEvidenceUploadAdapter,
    createSalesPhotoEvidenceR2ServerConfigFromEnv,
  } = await import('@/lib/sales/photo-evidence-r2-upload-adapter.server');
  const result = createSalesPhotoEvidenceR2ServerConfigFromEnv(process.env);
  return result.ok ? createCloudflareR2SalesPhotoEvidenceUploadAdapter({ config: result.config }) : null;
}

async function runWithCors(request: Request, handler: () => Promise<Response>): Promise<Response> {
  const rejection = createAppApiCorsRejectionResponse(request, { allowedMethods: ['GET', 'DELETE', 'OPTIONS'] });
  if (rejection) return rejection;
  return applyAppApiCors(request, await handler(), { allowedMethods: ['GET', 'DELETE', 'OPTIONS'] });
}

export const DELETE = (request: Request) => runWithCors(request, () => (
  createSalesPhotoEvidenceDeleteRouteHandlers({
    isEnabled: () => isSalesPhotoEvidenceDeleteRouteEnabledForEnv(process.env),
    resolveActor,
    createDeleteRepository,
    createR2DeleteAdapter,
  }).DELETE(request)
));
export const GET = (request: Request) => runWithCors(request, () => (
  createSalesPhotoEvidenceDeleteRouteHandlers({
    isEnabled: () => isSalesPhotoEvidenceDeleteRouteEnabledForEnv(process.env),
    resolveActor,
    createDeleteRepository,
    createR2DeleteAdapter,
  }).GET()
));
export const POST = () => disabledResponse();
export const PUT = () => disabledResponse();
export const PATCH = () => disabledResponse();
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, {
  allowedMethods: ['GET', 'DELETE', 'OPTIONS'],
});

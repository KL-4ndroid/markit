import { NextResponse } from 'next/server';

import { normalizeAppApiErrorBody } from '@/lib/api/contract';
import {
  authenticateAppApiRequest,
  createAppApiUserSupabaseClient,
} from '@/lib/api/server/auth';
import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import {
  isSalesPhotoEvidenceObjectKeyBoundToIdentity,
  isSalesPhotoEvidenceStatus,
} from '@/lib/sales/photo-evidence-model';
import { createSalesPhotoEvidenceSignedReadContract } from '@/lib/sales/photo-evidence-upload-contract';
import type { SalesPhotoEvidenceR2ReadAdapter } from '@/lib/sales/photo-evidence-r2-read-adapter.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

type SalesPhotoEvidenceImageRouteEnv = Record<string, string | undefined>;

type SalesPhotoEvidenceImageRouteActor = {
  actorId: string;
};

type SalesPhotoEvidenceImageRouteRow = {
  id: string;
  owner_id: string;
  market_id: string;
  sale_id: string;
  captured_by_staff_id: string | null;
  status: string;
  r2_object_key: string | null;
  r2_thumbnail_key: string | null;
  expires_at: string | null;
  deleted_at: string | null;
};

type SalesPhotoEvidenceImageRouteDeps = {
  isEnabled(): boolean;
  resolveActor(request: Request): Promise<SalesPhotoEvidenceImageRouteActor | 'unavailable' | null>;
  getEvidenceRow(input: { evidenceId: string }): Promise<SalesPhotoEvidenceImageRouteRow | null>;
  createR2ReadAdapter(): Promise<SalesPhotoEvidenceR2ReadAdapter | null>;
  now?: () => Date;
};

function jsonResponse(body: unknown, status: number): NextResponse {
  const responseBody = (
    body
    && typeof body === 'object'
    && !Array.isArray(body)
    && (body as Record<string, unknown>).ok === false
  )
    ? normalizeAppApiErrorBody(body as Record<string, unknown>, status)
    : body;
  return NextResponse.json(responseBody, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

function disabledResponse(): NextResponse {
  return jsonResponse({
    ok: false,
    code: 'sales_photo_evidence_image_read_disabled',
    message: 'Sales photo evidence image read is not enabled yet.',
  }, 501);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getQuery(request: Request): { evidenceId: string; variant: 'image' | 'thumbnail' } | null {
  const url = new URL(request.url);
  const evidenceId = url.searchParams.get('evidenceId');
  const variant = url.searchParams.get('variant') ?? 'thumbnail';

  if (!isNonEmptyString(evidenceId)) return null;
  if (variant !== 'image' && variant !== 'thumbnail') return null;

  return { evidenceId, variant };
}

export function createSalesPhotoEvidenceImageRouteHandlers(deps: SalesPhotoEvidenceImageRouteDeps) {
  async function getInternal(request: Request): Promise<Response> {
    if (!deps.isEnabled()) return disabledResponse();

    const query = getQuery(request);
    if (!query) {
      return jsonResponse({
        ok: false,
        code: 'invalid_request',
        message: 'Sales photo evidence image request is invalid.',
      }, 400);
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
        message: 'Sales photo evidence image read requires an authenticated user.',
      }, 401);
    }

    const row = await deps.getEvidenceRow({ evidenceId: query.evidenceId });
    if (!row || row.deleted_at !== null) {
      return jsonResponse({
        ok: false,
        code: 'not_found',
        message: 'Sales photo evidence image was not found.',
      }, 404);
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : Number.NaN;
    if (!Number.isFinite(expiresAt)) {
      return jsonResponse({
        ok: false,
        code: 'invalid_evidence_expiration',
        message: 'Sales photo evidence expiration is invalid.',
      }, 409);
    }
    if (expiresAt <= (deps.now?.() ?? new Date()).getTime()) {
      return jsonResponse({
        ok: false,
        code: 'evidence_expired',
        message: 'Sales photo evidence has expired.',
      }, 410);
    }

    const objectKey = query.variant === 'thumbnail' ? row.r2_thumbnail_key : row.r2_object_key;
    if (!isSalesPhotoEvidenceStatus(row.status)) {
      return jsonResponse({
        ok: false,
        code: 'invalid_evidence_status',
        message: 'Sales photo evidence status is invalid.',
      }, 400);
    }
    if (!isSalesPhotoEvidenceObjectKeyBoundToIdentity({
      key: objectKey,
      ownerId: row.owner_id,
      marketId: row.market_id,
      saleId: row.sale_id,
      evidenceId: row.id,
      kind: query.variant,
    })) {
      return jsonResponse({
        ok: false,
        code: 'invalid_object_binding',
        message: 'Sales photo evidence image object is unavailable.',
      }, 404);
    }

    const contract = createSalesPhotoEvidenceSignedReadContract({
      actorId: actor.actorId,
      actorRole: 'owner',
      ownerId: row.owner_id,
      capturedByStaffId: row.captured_by_staff_id,
      status: row.status,
      objectKey,
      variantKind: query.variant,
      requestedTtlSeconds: 60,
    });
    if (contract.action !== 'prepare_signed_read_contract') {
      return jsonResponse({
        ok: false,
        code: contract.reason,
        message: contract.message,
      }, contract.reason === 'unauthorized_actor' ? 403 : 400);
    }

    const adapter = await deps.createR2ReadAdapter();
    if (!adapter) return disabledResponse();

    const result = await adapter.readObject({ key: contract.contract.objectKey });
    if (!result.ok) {
      return jsonResponse({
        ok: false,
        code: result.code,
        message: 'Sales photo evidence image storage read failed.',
      }, 502);
    }

    if (
      (result.contentType !== 'image/webp' && result.contentType !== 'image/jpeg')
      || result.body.byteLength <= 0
      || result.body.byteLength > 1_000_000
    ) {
      return jsonResponse({
        ok: false,
        code: 'invalid_image_object',
        message: 'Sales photo evidence image object is invalid.',
      }, 502);
    }

    const body = new ArrayBuffer(result.body.byteLength);
    new Uint8Array(body).set(result.body);

    return new Response(body, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': result.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  async function get(request: Request): Promise<Response> {
    try {
      return await getInternal(request);
    } catch (error) {
      console.error('sales photo evidence image route failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      return jsonResponse({
        ok: false,
        code: 'image_route_unavailable',
        message: 'Sales photo evidence image route is temporarily unavailable.',
      }, 503);
    }
  }

  return {
    GET: get,
    POST: async () => disabledResponse(),
    PUT: async () => disabledResponse(),
    PATCH: async () => disabledResponse(),
    DELETE: async () => disabledResponse(),
  };
}

export function isSalesPhotoEvidenceImageReadRouteEnabledForEnv(
  env: SalesPhotoEvidenceImageRouteEnv
): boolean {
  if (env.SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ENABLED !== '1') return false;

  const deploymentEnv = env.VERCEL_ENV ?? env.APP_ENV ?? env.NODE_ENV;
  if (
    deploymentEnv === 'production' &&
    env.SALES_PHOTO_EVIDENCE_IMAGE_READ_ROUTE_ALLOW_PRODUCTION !== '1'
  ) {
    return false;
  }

  return true;
}

async function resolveActorFromRequest(
  request: Request
): Promise<SalesPhotoEvidenceImageRouteActor | 'unavailable' | null> {
  const result = await authenticateAppApiRequest(request);
  if (result.ok) return result.actor;
  return result.code === 'authentication_unavailable' ? 'unavailable' : null;
}

function createSupabaseClientForRequest(request: Request) {
  return createAppApiUserSupabaseClient(request);
}

async function getEvidenceRowFromSupabase(
  request: Request,
  evidenceId: string
): Promise<SalesPhotoEvidenceImageRouteRow | null> {
  const client = createSupabaseClientForRequest(request);
  if (!client) return null;

  const { data, error } = await client
    .from('sale_photo_evidence')
    .select('id,owner_id,market_id,sale_id,captured_by_staff_id,status,r2_object_key,r2_thumbnail_key,expires_at,deleted_at')
    .eq('id', evidenceId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error('Sales photo evidence metadata lookup failed.');
  if (!data) return null;
  return data as SalesPhotoEvidenceImageRouteRow;
}

async function createDefaultR2ReadAdapter(): Promise<SalesPhotoEvidenceR2ReadAdapter | null> {
  if (!isSalesPhotoEvidenceImageReadRouteEnabledForEnv(process.env)) return null;
  const { createCloudflareR2SalesPhotoEvidenceReadAdapter } = await import(
    '@/lib/sales/photo-evidence-r2-read-adapter.server'
  );
  return createCloudflareR2SalesPhotoEvidenceReadAdapter({ env: process.env });
}

async function runImageRouteWithCors(
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const corsRejection = createAppApiCorsRejectionResponse(request);
  if (corsRejection) return corsRejection;
  return applyAppApiCors(request, await handler());
}

export const GET = (request: Request) => runImageRouteWithCors(request, () => (
  createSalesPhotoEvidenceImageRouteHandlers({
    isEnabled: () => isSalesPhotoEvidenceImageReadRouteEnabledForEnv(process.env),
    resolveActor: resolveActorFromRequest,
    getEvidenceRow: ({ evidenceId }) => getEvidenceRowFromSupabase(request, evidenceId),
    createR2ReadAdapter: createDefaultR2ReadAdapter,
  }).GET(request)
));
export const POST = (request?: Request) => request
  ? runImageRouteWithCors(request, async () => disabledResponse())
  : disabledResponse();
export const PUT = (request?: Request) => request
  ? runImageRouteWithCors(request, async () => disabledResponse())
  : disabledResponse();
export const PATCH = (request?: Request) => request
  ? runImageRouteWithCors(request, async () => disabledResponse())
  : disabledResponse();
export const DELETE = (request?: Request) => request
  ? runImageRouteWithCors(request, async () => disabledResponse())
  : disabledResponse();
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, {
  allowedMethods: ['GET', 'OPTIONS'],
});

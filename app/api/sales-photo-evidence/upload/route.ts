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
  executeSalesPhotoEvidenceMetadataClaimAdapter,
  type SalesPhotoEvidenceMetadataClaimAdapterResult,
  type SalesPhotoEvidenceMetadataClaimedRow,
} from '@/lib/sales/photo-evidence-metadata-claim-adapter';
import {
  buildSalesPhotoEvidenceObjectKey,
  getSalesPhotoEvidenceExpiresAt,
} from '@/lib/sales/photo-evidence-model';
import type { SalesPhotoEvidenceR2UploadAdapter } from '@/lib/sales/photo-evidence-r2-upload-adapter';
import type { SalesPhotoEvidenceUploadMimeType } from '@/lib/sales/photo-evidence-upload-contract';
import { parseAndValidateSalesPhotoEvidenceUploadFormData } from '@/lib/sales/photo-evidence-upload-form-data';
import {
  createSalesPhotoEvidenceMetadataClaimSupabaseRepository,
  type SalesPhotoEvidenceMetadataClaimSupabaseClient,
  type SalesPhotoEvidenceServerMutationRepository,
} from '@/lib/supabase/sales-photo-evidence-metadata-claim-repository';
import type { SalesPhotoEvidenceUploadMetadataRepository } from '@/lib/supabase/sales-photo-evidence-metadata-claim-repository';
import { createSalesPhotoEvidenceServerMutationRepository } from '@/lib/supabase/sales-photo-evidence-server-mutation-repository.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

type SalesPhotoEvidenceUploadRouteActor = {
  actorId: string;
};

export type SalesPhotoEvidenceUploadRouteDeps = {
  isMetadataClaimEnabled(): boolean;
  isR2UploadEnabled?(): boolean;
  resolveActor(request: Request): Promise<SalesPhotoEvidenceUploadRouteActor | 'unavailable' | null>;
  createRepository(request: Request): SalesPhotoEvidenceMetadataClaimSupabaseClient;
  createMutationRepository?(
    actor: SalesPhotoEvidenceUploadRouteActor,
    attemptId: string
  ): SalesPhotoEvidenceServerMutationRepository | null;
  r2UploadAdapter?: SalesPhotoEvidenceR2UploadAdapter;
  createR2UploadAdapter?(): Promise<SalesPhotoEvidenceR2UploadAdapter | null>;
  now?(): Date;
};

export type SalesPhotoEvidenceMetadataClaimRouteEnv = Record<string, string | undefined>;

export type SalesPhotoEvidenceFinalizeUploadedInput = {
  evidenceId: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  imageObjectKey: string;
  thumbnailObjectKey: string;
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  capturedAt: string;
  uploadedAt: string;
  expiresAt: string;
};

export type SalesPhotoEvidenceMarkUploadFailedInput = {
  evidenceId: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  reason: 'r2_image_upload_failed' | 'r2_thumbnail_upload_failed' | 'metadata_finalize_failed';
};

const DISABLED_RESPONSE_BODY = Object.freeze({
  ok: false,
  code: 'sales_photo_evidence_upload_disabled',
  message: 'Sales photo evidence upload is not enabled yet.',
});

// 1.5 MB validated binary payload plus a bounded amount of multipart metadata.
const SALES_PHOTO_EVIDENCE_MAX_MULTIPART_REQUEST_BYTES = 2_000_000;

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

function disabledUploadResponse(): NextResponse {
  return jsonResponse(DISABLED_RESPONSE_BODY, 501);
}

function disabledR2UploadResponse(): NextResponse {
  return jsonResponse({
    ok: false,
    code: 'sales_photo_evidence_r2_upload_disabled',
    message: 'Sales photo evidence R2 upload is not enabled yet.',
    shouldKeepLocalPayload: true,
  }, 501);
}

function serverMutationUnavailableResponse(): NextResponse {
  return jsonResponse({
    ok: false,
    code: 'sales_photo_evidence_server_mutation_unavailable',
    message: 'Sales photo evidence server mutation is temporarily unavailable.',
    shouldKeepLocalPayload: true,
  }, 503);
}

function isMultipartFormDataRequest(request: Request): boolean {
  return request.headers.get('content-type')?.toLowerCase().includes('multipart/form-data') ?? false;
}

function isMultipartRequestTooLarge(request: Request): boolean {
  const value = request.headers.get('content-length');
  if (!value) return false;
  const contentLength = Number(value);
  return !Number.isSafeInteger(contentLength)
    || contentLength < 0
    || contentLength > SALES_PHOTO_EVIDENCE_MAX_MULTIPART_REQUEST_BYTES;
}

function getTrustedCapturedByStaffId(
  actor: SalesPhotoEvidenceUploadRouteActor,
  ownerId: string
): string | null {
  return actor.actorId === ownerId ? null : actor.actorId;
}

function mapClaimResultToResponse(result: SalesPhotoEvidenceMetadataClaimAdapterResult): NextResponse {
  switch (result.action) {
    case 'metadata_claim_disabled':
      return disabledUploadResponse();
    case 'metadata_claim_rejected':
      return jsonResponse({
        ok: false,
        code: result.plan.reason,
        message: result.plan.message,
        shouldKeepLocalPayload: true,
      }, result.plan.reason === 'permission_denied' ? 403 : 400);
    case 'metadata_claim_failed':
      return jsonResponse({
        ok: false,
        code: result.reason,
        message: result.message,
        shouldKeepLocalPayload: true,
      }, 500);
    case 'metadata_claim_skipped_uploaded':
      return jsonResponse({
        ok: true,
        action: result.action,
        evidenceId: result.evidenceId,
        shouldDeleteLocalPayloadAfterSuccess: result.shouldDeleteLocalPayloadAfterSuccess,
        shouldUploadAfterMetadataClaim: false,
      }, 200);
    case 'metadata_claim_created':
    case 'metadata_claim_reused':
      return jsonResponse({
        ok: true,
        action: result.action,
        row: result.row,
        shouldKeepLocalPayloadUntilServerSuccess: true,
        shouldUploadAfterMetadataClaim: result.shouldUploadAfterMetadataClaim,
        nextAction: 'r2_upload_not_implemented',
      }, 200);
  }
}

export function createSalesPhotoEvidenceUploadRouteHandlers(deps: SalesPhotoEvidenceUploadRouteDeps) {
  const isR2UploadEnabled = deps.isR2UploadEnabled ?? (() => false);

  async function postInternal(request: Request): Promise<NextResponse> {
    if (!deps.isMetadataClaimEnabled()) {
      return disabledUploadResponse();
    }

    const wantsR2Upload = isMultipartFormDataRequest(request);
    if (!wantsR2Upload) {
      return jsonResponse({
        ok: false,
        code: 'unsupported_media_type',
        message: 'Sales photo evidence upload requires multipart form data.',
        shouldKeepLocalPayload: true,
      }, 415);
    }
    if (wantsR2Upload && !isR2UploadEnabled()) {
      return disabledR2UploadResponse();
    }
    if (wantsR2Upload && isMultipartRequestTooLarge(request)) {
      return jsonResponse({
        ok: false,
        code: 'upload_request_too_large',
        message: 'Sales photo evidence upload request is too large.',
        shouldKeepLocalPayload: true,
      }, 413);
    }

    const actor = await deps.resolveActor(request);
    if (actor === 'unavailable') {
      return jsonResponse({
        ok: false,
        code: 'authentication_unavailable',
        message: 'Sales photo evidence authentication is temporarily unavailable.',
        shouldKeepLocalPayload: true,
      }, 503);
    }
    if (!actor) {
      return jsonResponse({
        ok: false,
        code: 'authentication_required',
        message: 'Sales photo evidence upload requires an authenticated user.',
      }, 401);
    }

    return handleFormDataUpload(request, actor);
  }

  async function post(request: Request): Promise<NextResponse> {
    try {
      return await postInternal(request);
    } catch (error) {
      console.error('sales photo evidence upload route failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      return jsonResponse({
        ok: false,
        code: 'upload_route_unexpected_error',
        message: 'Sales photo evidence upload route failed unexpectedly.',
        shouldKeepLocalPayload: true,
      }, 500);
    }
  }

  async function markUploadFailedIfPossible(
    row: SalesPhotoEvidenceMetadataClaimedRow,
    reason: SalesPhotoEvidenceMarkUploadFailedInput['reason'],
    repository: SalesPhotoEvidenceUploadMetadataRepository
  ): Promise<void> {
    const input = {
      evidenceId: row.id,
      ownerId: row.ownerId,
      marketId: row.marketId,
      saleId: row.saleId,
      reason,
    };

    try {
      await repository.markEvidenceUploadFailed(input);
    } catch (error) {
      console.error('sales photo evidence failure status update failed', {
        reason,
        name: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  async function compensateConfirmedR2Uploads(
    adapter: SalesPhotoEvidenceR2UploadAdapter,
    objectKeys: readonly string[]
  ): Promise<{ cleanupIncomplete: boolean }> {
    let cleanupIncomplete = false;

    for (const key of objectKeys) {
      try {
        const result = await adapter.deleteObject({ key });
        if (!result.ok) {
          cleanupIncomplete = true;
          console.error('sales photo evidence R2 compensation failed', {
            code: result.code,
          });
        }
      } catch (error) {
        cleanupIncomplete = true;
        console.error('sales photo evidence R2 compensation failed', {
          name: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }

    return { cleanupIncomplete };
  }

  async function handleFormDataUpload(
    request: Request,
    actor: SalesPhotoEvidenceUploadRouteActor
  ): Promise<NextResponse> {
    const r2UploadAdapter = deps.r2UploadAdapter ?? await deps.createR2UploadAdapter?.();
    if (!r2UploadAdapter) {
      return disabledR2UploadResponse();
    }

    const parsed = await parseAndValidateSalesPhotoEvidenceUploadFormData(await request.formData());
    if (!parsed.ok) {
      return jsonResponse({
        ok: false,
        code: parsed.code,
        message: parsed.message,
        shouldKeepLocalPayload: true,
      }, 400);
    }

    const body = parsed.request;
    const uploadAttemptId = crypto.randomUUID();
    const mutationRepository = deps.createMutationRepository?.(actor, uploadAttemptId) ?? null;
    if (!mutationRepository) {
      return serverMutationUnavailableResponse();
    }

    const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(
      deps.createRepository(request),
      mutationRepository
    );
    const result = await executeSalesPhotoEvidenceMetadataClaimAdapter({
      actorId: actor.actorId,
      actorRole: actor.actorId === body.ownerId ? 'owner' : 'staff',
      ownerId: body.ownerId,
      marketId: body.marketId,
      saleEventId: body.saleEventId,
      capturedByStaffId: getTrustedCapturedByStaffId(actor, body.ownerId),
      capturedAt: body.capturedAt,
      saleCompletedAt: body.saleCompletedAt,
      hasLocalPayload: true,
      writeEnabled: true,
    }, repository);

    if (result.action === 'metadata_claim_skipped_uploaded') {
      return mapClaimResultToResponse(result);
    }
    if (result.action !== 'metadata_claim_created' && result.action !== 'metadata_claim_reused') {
      return mapClaimResultToResponse(result);
    }

    const row = result.row;
    const imageContentType = body.imageMetadata.mimeType as SalesPhotoEvidenceUploadMimeType;
    const thumbnailContentType = body.thumbnailMetadata.mimeType as SalesPhotoEvidenceUploadMimeType;
    const imageObjectKey = buildSalesPhotoEvidenceObjectKey({
      ownerId: body.ownerId,
      marketId: body.marketId,
      saleId: body.saleEventId,
      evidenceId: row.id,
      kind: 'image',
      extension: imageContentType === 'image/jpeg' ? 'jpg' : 'webp',
    });
    const thumbnailObjectKey = buildSalesPhotoEvidenceObjectKey({
      ownerId: body.ownerId,
      marketId: body.marketId,
      saleId: body.saleEventId,
      evidenceId: row.id,
      kind: 'thumbnail',
      extension: thumbnailContentType === 'image/jpeg' ? 'jpg' : 'webp',
    });

    const imageUpload = await r2UploadAdapter.uploadObject({
      key: imageObjectKey,
      body: body.image,
      contentType: imageContentType,
      contentLength: body.imageMetadata.fileSizeBytes,
    });
    if (!imageUpload.ok) {
      await markUploadFailedIfPossible(row, 'r2_image_upload_failed', repository);
      return jsonResponse({
        ok: false,
        code: 'r2_image_upload_failed',
        message: 'Sales photo evidence image storage failed.',
        shouldKeepLocalPayload: true,
        cleanupIncomplete: false,
      }, 500);
    }

    const thumbnailUpload = await r2UploadAdapter.uploadObject({
      key: thumbnailObjectKey,
      body: body.thumbnail,
      contentType: thumbnailContentType,
      contentLength: body.thumbnailMetadata.fileSizeBytes,
    });
    if (!thumbnailUpload.ok) {
      const cleanup = await compensateConfirmedR2Uploads(r2UploadAdapter, [imageObjectKey]);
      await markUploadFailedIfPossible(row, 'r2_thumbnail_upload_failed', repository);
      return jsonResponse({
        ok: false,
        code: 'r2_thumbnail_upload_failed',
        message: 'Sales photo evidence thumbnail storage failed.',
        shouldKeepLocalPayload: true,
        cleanupIncomplete: cleanup.cleanupIncomplete,
      }, 500);
    }

    const uploadedAt = (deps.now?.() ?? new Date()).toISOString();
    const finalizeInput = {
      evidenceId: row.id,
      ownerId: row.ownerId,
      marketId: row.marketId,
      saleId: row.saleId,
      imageObjectKey,
      thumbnailObjectKey,
      mimeType: imageContentType,
      width: body.imageMetadata.width,
      height: body.imageMetadata.height,
      fileSizeBytes: body.imageMetadata.fileSizeBytes,
      capturedAt: body.capturedAt,
      uploadedAt,
      expiresAt: getSalesPhotoEvidenceExpiresAt(uploadedAt),
    };

    try {
      await repository.finalizeEvidenceUploaded(finalizeInput);
    } catch (error) {
      const cleanup = await compensateConfirmedR2Uploads(r2UploadAdapter, [
        thumbnailObjectKey,
        imageObjectKey,
      ]);
      await markUploadFailedIfPossible(row, 'metadata_finalize_failed', repository);
      return jsonResponse({
        ok: false,
        code: 'metadata_finalize_failed',
        message: 'Sales photo evidence metadata finalize failed.',
        shouldKeepLocalPayload: true,
        cleanupIncomplete: cleanup.cleanupIncomplete,
      }, 500);
    }

    return jsonResponse({
      ok: true,
      action: 'upload_completed',
      evidenceId: row.id,
      status: 'uploaded',
      shouldDeleteLocalPayloadAfterSuccess: true,
      shouldRetryWithLocalPayload: false,
    }, 200);
  }

  return {
    GET: async () => disabledUploadResponse(),
    POST: post,
    PUT: async () => disabledUploadResponse(),
    PATCH: async () => disabledUploadResponse(),
    DELETE: async () => disabledUploadResponse(),
  };
}

export function isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv(
  env: SalesPhotoEvidenceMetadataClaimRouteEnv
): boolean {
  if (env.SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED !== '1') return false;

  const deploymentEnv = env.VERCEL_ENV ?? env.APP_ENV ?? env.NODE_ENV;
  if (
    deploymentEnv === 'production' &&
    env.SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION !== '1'
  ) {
    return false;
  }

  return true;
}

export function isSalesPhotoEvidenceR2UploadRouteEnabledForEnv(
  env: SalesPhotoEvidenceMetadataClaimRouteEnv
): boolean {
  if (env.SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED !== '1') return false;

  const deploymentEnv = env.VERCEL_ENV ?? env.APP_ENV ?? env.NODE_ENV;
  if (
    deploymentEnv === 'production' &&
    env.SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ALLOW_PRODUCTION !== '1'
  ) {
    return false;
  }

  return true;
}

function isMetadataClaimRouteEnabled(): boolean {
  return isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv(process.env);
}

function isR2UploadRouteEnabled(): boolean {
  return isSalesPhotoEvidenceR2UploadRouteEnabledForEnv(process.env);
}

async function resolveActorFromBearerToken(
  request: Request
): Promise<SalesPhotoEvidenceUploadRouteActor | 'unavailable' | null> {
  const result = await authenticateAppApiRequest(request);
  if (result.ok) return result.actor;
  return result.code === 'authentication_unavailable' ? 'unavailable' : null;
}

function createRouteSupabaseClient(request: Request): SalesPhotoEvidenceMetadataClaimSupabaseClient {
  const client = createAppApiUserSupabaseClient(request);
  if (!client) throw new Error('Authenticated Supabase client is unavailable.');
  return client as unknown as SalesPhotoEvidenceMetadataClaimSupabaseClient;
}

function createRouteServerMutationRepository(
  actor: SalesPhotoEvidenceUploadRouteActor,
  attemptId: string
): SalesPhotoEvidenceServerMutationRepository | null {
  return createSalesPhotoEvidenceServerMutationRepository(actor.actorId, attemptId);
}

async function createDefaultR2UploadAdapter(): Promise<SalesPhotoEvidenceR2UploadAdapter | null> {
  const {
    createCloudflareR2SalesPhotoEvidenceUploadAdapter,
    createSalesPhotoEvidenceR2ServerConfigFromEnv,
  } = await import('@/lib/sales/photo-evidence-r2-upload-adapter.server');
  const configResult = createSalesPhotoEvidenceR2ServerConfigFromEnv(process.env);

  if (!configResult.ok) return null;
  return createCloudflareR2SalesPhotoEvidenceUploadAdapter({ config: configResult.config });
}

const routeHandlers = createSalesPhotoEvidenceUploadRouteHandlers({
  isMetadataClaimEnabled: isMetadataClaimRouteEnabled,
  isR2UploadEnabled: isR2UploadRouteEnabled,
  resolveActor: resolveActorFromBearerToken,
  createRepository: createRouteSupabaseClient,
  createMutationRepository: createRouteServerMutationRepository,
  createR2UploadAdapter: createDefaultR2UploadAdapter,
});

async function runUploadRouteWithCors(
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const corsRejection = createAppApiCorsRejectionResponse(request);
  if (corsRejection) return corsRejection;
  return applyAppApiCors(request, await handler());
}

export const GET = (request?: Request) => request
  ? runUploadRouteWithCors(request, routeHandlers.GET)
  : routeHandlers.GET();
export const POST = (request: Request) => runUploadRouteWithCors(
  request,
  () => routeHandlers.POST(request)
);
export const PUT = (request?: Request) => request
  ? runUploadRouteWithCors(request, routeHandlers.PUT)
  : routeHandlers.PUT();
export const PATCH = (request?: Request) => request
  ? runUploadRouteWithCors(request, routeHandlers.PATCH)
  : routeHandlers.PATCH();
export const DELETE = (request?: Request) => request
  ? runUploadRouteWithCors(request, routeHandlers.DELETE)
  : routeHandlers.DELETE();
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, {
  allowedMethods: ['POST', 'OPTIONS'],
});

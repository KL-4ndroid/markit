import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
import { parseSalesPhotoEvidenceUploadFormData } from '@/lib/sales/photo-evidence-upload-form-data';
import {
  createSalesPhotoEvidenceMetadataClaimSupabaseRepository,
  type SalesPhotoEvidenceMetadataClaimSupabaseClient,
} from '@/lib/supabase/sales-photo-evidence-metadata-claim-repository';
import type { SalesPhotoEvidenceUploadMetadataRepository } from '@/lib/supabase/sales-photo-evidence-metadata-claim-repository';

export const dynamic = 'force-dynamic';

type SalesPhotoEvidenceUploadRouteActor = {
  actorId: string;
};

type SalesPhotoEvidenceUploadRouteBody = {
  ownerId: string;
  marketId: string;
  saleEventId: string;
  capturedByStaffId: string | null;
  capturedAt: string;
  saleCompletedAt: string;
  hasLocalPayload: boolean;
};

export type SalesPhotoEvidenceUploadRouteDeps = {
  isMetadataClaimEnabled(): boolean;
  isR2UploadEnabled?(): boolean;
  resolveActor(request: Request): Promise<SalesPhotoEvidenceUploadRouteActor | null>;
  createRepository(request: Request): SalesPhotoEvidenceMetadataClaimSupabaseClient;
  r2UploadAdapter?: SalesPhotoEvidenceR2UploadAdapter;
  createR2UploadAdapter?(): Promise<SalesPhotoEvidenceR2UploadAdapter | null>;
  finalizeUploadedEvidence?(input: SalesPhotoEvidenceFinalizeUploadedInput): Promise<void>;
  markEvidenceUploadFailed?(input: SalesPhotoEvidenceMarkUploadFailedInput): Promise<void>;
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

function jsonResponse(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, {
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseUploadRouteBody(value: unknown): SalesPhotoEvidenceUploadRouteBody | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const capturedByStaffId = record.capturedByStaffId;

  if (
    !isNonEmptyString(record.ownerId) ||
    !isNonEmptyString(record.marketId) ||
    !isNonEmptyString(record.saleEventId) ||
    !(capturedByStaffId === null || isNonEmptyString(capturedByStaffId)) ||
    !isNonEmptyString(record.capturedAt) ||
    typeof record.hasLocalPayload !== 'boolean'
  ) {
    return null;
  }

  return {
    ownerId: record.ownerId,
    marketId: record.marketId,
    saleEventId: record.saleEventId,
    capturedByStaffId,
    capturedAt: record.capturedAt,
    saleCompletedAt: isNonEmptyString(record.saleCompletedAt)
      ? record.saleCompletedAt
      : record.capturedAt,
    hasLocalPayload: record.hasLocalPayload,
  };
}

function isMultipartFormDataRequest(request: Request): boolean {
  return request.headers.get('content-type')?.toLowerCase().includes('multipart/form-data') ?? false;
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
    if (wantsR2Upload && !isR2UploadEnabled()) {
      return disabledR2UploadResponse();
    }

    const actor = await deps.resolveActor(request);
    if (!actor) {
      return jsonResponse({
        ok: false,
        code: 'authentication_required',
        message: 'Sales photo evidence upload requires an authenticated user.',
      }, 401);
    }

    if (wantsR2Upload) {
      return handleFormDataUpload(request, actor);
    }

    const body = parseUploadRouteBody(await request.json());
    if (!body) {
      return jsonResponse({
        ok: false,
        code: 'invalid_request',
        message: 'Sales photo evidence upload request is invalid.',
      }, 400);
    }

    const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(deps.createRepository(request));
    const result = await executeSalesPhotoEvidenceMetadataClaimAdapter({
      actorId: actor.actorId,
      actorRole: actor.actorId === body.ownerId ? 'owner' : 'staff',
      ownerId: body.ownerId,
      marketId: body.marketId,
      saleEventId: body.saleEventId,
      capturedByStaffId: body.capturedByStaffId,
      capturedAt: body.capturedAt,
      saleCompletedAt: body.saleCompletedAt,
      hasLocalPayload: body.hasLocalPayload,
      writeEnabled: true,
    }, repository);

    return mapClaimResultToResponse(result);
  }

  async function post(request: Request): Promise<NextResponse> {
    try {
      return await postInternal(request);
    } catch (error) {
      console.error('sales photo evidence upload route failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown upload route failure',
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
      if (deps.markEvidenceUploadFailed) {
        await deps.markEvidenceUploadFailed(input);
        return;
      }

      await repository.markEvidenceUploadFailed(input);
    } catch (error) {
      console.error('sales photo evidence failure status update failed', {
        reason,
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : 'Unknown metadata failure update error',
      });
    }
  }

  async function handleFormDataUpload(
    request: Request,
    actor: SalesPhotoEvidenceUploadRouteActor
  ): Promise<NextResponse> {
    const r2UploadAdapter = deps.r2UploadAdapter ?? await deps.createR2UploadAdapter?.();
    if (!r2UploadAdapter) {
      return disabledR2UploadResponse();
    }

    const parsed = parseSalesPhotoEvidenceUploadFormData(await request.formData());
    if (!parsed.ok) {
      return jsonResponse({
        ok: false,
        code: parsed.code,
        message: parsed.message,
        shouldKeepLocalPayload: true,
      }, 400);
    }

    const body = parsed.request;
    const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(deps.createRepository(request));
    const result = await executeSalesPhotoEvidenceMetadataClaimAdapter({
      actorId: actor.actorId,
      actorRole: actor.actorId === body.ownerId ? 'owner' : 'staff',
      ownerId: body.ownerId,
      marketId: body.marketId,
      saleEventId: body.saleEventId,
      capturedByStaffId: body.capturedByStaffId,
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
        message: imageUpload.message,
        shouldKeepLocalPayload: true,
      }, 500);
    }

    const thumbnailUpload = await r2UploadAdapter.uploadObject({
      key: thumbnailObjectKey,
      body: body.thumbnail,
      contentType: thumbnailContentType,
      contentLength: body.thumbnailMetadata.fileSizeBytes,
    });
    if (!thumbnailUpload.ok) {
      await markUploadFailedIfPossible(row, 'r2_thumbnail_upload_failed', repository);
      return jsonResponse({
        ok: false,
        code: 'r2_thumbnail_upload_failed',
        message: thumbnailUpload.message,
        shouldKeepLocalPayload: true,
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
      if (deps.finalizeUploadedEvidence) {
        await deps.finalizeUploadedEvidence(finalizeInput);
      } else {
        await repository.finalizeEvidenceUploaded(finalizeInput);
      }
    } catch (error) {
      await markUploadFailedIfPossible(row, 'metadata_finalize_failed', repository);
      return jsonResponse({
        ok: false,
        code: 'metadata_finalize_failed',
        message: 'Sales photo evidence metadata finalize failed.',
        shouldKeepLocalPayload: true,
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

function getSupabaseRouteConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice('Bearer '.length).trim() || null;
}

async function resolveActorFromBearerToken(request: Request): Promise<SalesPhotoEvidenceUploadRouteActor | null> {
  const config = getSupabaseRouteConfig();
  const token = getBearerToken(request);
  if (!config || !token) return null;

  const client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.id) return null;

  return { actorId: data.user.id };
}

function createRouteSupabaseClient(request: Request): SalesPhotoEvidenceMetadataClaimSupabaseClient {
  const config = getSupabaseRouteConfig();
  const token = getBearerToken(request);
  if (!config) {
    throw new Error('Supabase route configuration is missing.');
  }
  if (!token) {
    throw new Error('Supabase route authentication token is missing.');
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  }) as unknown as SalesPhotoEvidenceMetadataClaimSupabaseClient;
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
  createR2UploadAdapter: createDefaultR2UploadAdapter,
});

export const GET = routeHandlers.GET;
export const POST = routeHandlers.POST;
export const PUT = routeHandlers.PUT;
export const PATCH = routeHandlers.PATCH;
export const DELETE = routeHandlers.DELETE;

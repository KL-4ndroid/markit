import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import {
  executeSalesPhotoEvidenceMetadataClaimAdapter,
  type SalesPhotoEvidenceMetadataClaimAdapterResult,
} from '@/lib/sales/photo-evidence-metadata-claim-adapter';
import {
  createSalesPhotoEvidenceMetadataClaimSupabaseRepository,
  type SalesPhotoEvidenceMetadataClaimSupabaseClient,
} from '@/lib/supabase/sales-photo-evidence-metadata-claim-repository';

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
  hasLocalPayload: boolean;
};

export type SalesPhotoEvidenceUploadRouteDeps = {
  isMetadataClaimEnabled(): boolean;
  resolveActor(request: Request): Promise<SalesPhotoEvidenceUploadRouteActor | null>;
  createRepository(request: Request): SalesPhotoEvidenceMetadataClaimSupabaseClient;
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
    hasLocalPayload: record.hasLocalPayload,
  };
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
  async function post(request: Request): Promise<NextResponse> {
    if (!deps.isMetadataClaimEnabled()) {
      return disabledUploadResponse();
    }

    const actor = await deps.resolveActor(request);
    if (!actor) {
      return jsonResponse({
        ok: false,
        code: 'authentication_required',
        message: 'Sales photo evidence upload requires an authenticated user.',
      }, 401);
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
      hasLocalPayload: body.hasLocalPayload,
      writeEnabled: true,
    }, repository);

    return mapClaimResultToResponse(result);
  }

  return {
    GET: async () => disabledUploadResponse(),
    POST: post,
    PUT: async () => disabledUploadResponse(),
    PATCH: async () => disabledUploadResponse(),
    DELETE: async () => disabledUploadResponse(),
  };
}

function isMetadataClaimRouteEnabled(): boolean {
  return process.env.SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED === '1';
}

function getSupabaseRouteConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

const routeHandlers = createSalesPhotoEvidenceUploadRouteHandlers({
  isMetadataClaimEnabled: isMetadataClaimRouteEnabled,
  resolveActor: resolveActorFromBearerToken,
  createRepository: createRouteSupabaseClient,
});

export const GET = routeHandlers.GET;
export const POST = routeHandlers.POST;
export const PUT = routeHandlers.PUT;
export const PATCH = routeHandlers.PATCH;
export const DELETE = routeHandlers.DELETE;

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { isSalesPhotoEvidenceStatus } from '@/lib/sales/photo-evidence-model';
import { createSalesPhotoEvidenceSignedReadContract } from '@/lib/sales/photo-evidence-upload-contract';
import type { SalesPhotoEvidenceR2ReadAdapter } from '@/lib/sales/photo-evidence-r2-read-adapter.server';

export const dynamic = 'force-dynamic';

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
  deleted_at: string | null;
};

type SalesPhotoEvidenceImageRouteDeps = {
  isEnabled(): boolean;
  resolveActor(request: Request): Promise<SalesPhotoEvidenceImageRouteActor | null>;
  getEvidenceRow(input: { evidenceId: string }): Promise<SalesPhotoEvidenceImageRouteRow | null>;
  createR2ReadAdapter(): Promise<SalesPhotoEvidenceR2ReadAdapter | null>;
};

function jsonResponse(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, {
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
  async function get(request: Request): Promise<Response> {
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

    const objectKey = query.variant === 'thumbnail' ? row.r2_thumbnail_key : row.r2_object_key;
    if (!isSalesPhotoEvidenceStatus(row.status)) {
      return jsonResponse({
        ok: false,
        code: 'invalid_evidence_status',
        message: 'Sales photo evidence status is invalid.',
      }, 400);
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
        message: result.message,
      }, 502);
    }

    const body = new ArrayBuffer(result.body.byteLength);
    new Uint8Array(body).set(result.body);

    return new Response(body, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': result.contentType,
      },
    });
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

function getSupabaseRouteConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

async function resolveActorFromRequest(request: Request): Promise<SalesPhotoEvidenceImageRouteActor | null> {
  const config = getSupabaseRouteConfig();
  const token = getBearerToken(request);
  if (!config || !token) return null;

  const client = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { actorId: data.user.id };
}

function createSupabaseClientForRequest(request: Request) {
  const config = getSupabaseRouteConfig();
  const token = getBearerToken(request);
  if (!config || !token) return null;

  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

async function getEvidenceRowFromSupabase(
  request: Request,
  evidenceId: string
): Promise<SalesPhotoEvidenceImageRouteRow | null> {
  const client = createSupabaseClientForRequest(request);
  if (!client) return null;

  const { data, error } = await client
    .from('sale_photo_evidence')
    .select('id,owner_id,market_id,sale_id,captured_by_staff_id,status,r2_object_key,r2_thumbnail_key,deleted_at')
    .eq('id', evidenceId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) return null;
  return data as SalesPhotoEvidenceImageRouteRow;
}

async function createDefaultR2ReadAdapter(): Promise<SalesPhotoEvidenceR2ReadAdapter | null> {
  if (!isSalesPhotoEvidenceImageReadRouteEnabledForEnv(process.env)) return null;
  const { createCloudflareR2SalesPhotoEvidenceReadAdapter } = await import(
    '@/lib/sales/photo-evidence-r2-read-adapter.server'
  );
  return createCloudflareR2SalesPhotoEvidenceReadAdapter({ env: process.env });
}

export const GET = async (request: Request) => createSalesPhotoEvidenceImageRouteHandlers({
  isEnabled: () => isSalesPhotoEvidenceImageReadRouteEnabledForEnv(process.env),
  resolveActor: resolveActorFromRequest,
  getEvidenceRow: ({ evidenceId }) => getEvidenceRowFromSupabase(request, evidenceId),
  createR2ReadAdapter: createDefaultR2ReadAdapter,
}).GET(request);
export const POST = async () => disabledResponse();
export const PUT = async () => disabledResponse();
export const PATCH = async () => disabledResponse();
export const DELETE = async () => disabledResponse();

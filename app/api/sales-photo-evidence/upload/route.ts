import {
  createSalesPhotoEvidenceUploadRouteHandlers,
  isSalesPhotoEvidenceMetadataClaimRouteEnabledForEnv,
  isSalesPhotoEvidenceR2UploadRouteEnabledForEnv,
} from '@/lib/sales/photo-evidence-upload-route-handlers';
import {
  authenticateAppApiRequest,
  createAppApiUserSupabaseClient,
} from '@/lib/api/server/auth';
import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import { resolveSalesPhotoEvidenceFaultInjection } from '@/lib/sales/photo-evidence-fault-injection.server';
import { createSalesPhotoEvidenceServerMutationRepository } from '@/lib/supabase/sales-photo-evidence-server-mutation-repository.server';
import type { SalesPhotoEvidenceMetadataClaimSupabaseClient } from '@/lib/supabase/sales-photo-evidence-metadata-claim-repository';
import type { SalesPhotoEvidenceServerMutationRepository } from '@/lib/supabase/sales-photo-evidence-metadata-claim-repository';
import type { SalesPhotoEvidenceR2UploadAdapter } from '@/lib/sales/photo-evidence-r2-upload-adapter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

type SalesPhotoEvidenceUploadRouteActor = {
  actorId: string;
};

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
  resolveFaultInjection: input => resolveSalesPhotoEvidenceFaultInjection({
    ...input,
    env: process.env,
  }),
});

async function runUploadRouteWithCors(
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const corsRejection = createAppApiCorsRejectionResponse(request);
  if (corsRejection) return corsRejection;
  return applyAppApiCors(request, await handler());
}

export const GET = (request: Request) => runUploadRouteWithCors(request, routeHandlers.GET);
export const POST = (request: Request) => runUploadRouteWithCors(
  request,
  () => routeHandlers.POST(request)
);
export const PUT = (request: Request) => runUploadRouteWithCors(request, routeHandlers.PUT);
export const PATCH = (request: Request) => runUploadRouteWithCors(request, routeHandlers.PATCH);
export const DELETE = (request: Request) => runUploadRouteWithCors(request, routeHandlers.DELETE);
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, {
  allowedMethods: ['POST', 'OPTIONS'],
});

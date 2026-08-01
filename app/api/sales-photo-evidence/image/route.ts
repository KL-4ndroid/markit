import {
  createSalesPhotoEvidenceImageRouteHandlers,
  isSalesPhotoEvidenceImageReadRouteEnabledForEnv,
  type SalesPhotoEvidenceImageRouteRow,
} from '@/lib/sales/photo-evidence-image-route-handlers';
import {
  authenticateAppApiRequest,
  createAppApiUserSupabaseClient,
} from '@/lib/api/server/auth';
import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import { disabledResponse } from '@/lib/sales/photo-evidence-image-route-handlers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

export const GET = async (request: Request) => {
  const corsRejection = createAppApiCorsRejectionResponse(request);
  if (corsRejection) return corsRejection;
  return applyAppApiCors(
    request,
    await createSalesPhotoEvidenceImageRouteHandlers({
      isEnabled: () => isSalesPhotoEvidenceImageReadRouteEnabledForEnv(process.env),
      resolveActor: async (request) => {
        const result = await authenticateAppApiRequest(request);
        if (result.ok) return result.actor;
        return result.code === 'authentication_unavailable' ? 'unavailable' : null;
      },
      getEvidenceRow: async ({ evidenceId }) => {
        const client = createAppApiUserSupabaseClient(request);
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
      },
      createR2ReadAdapter: async () => {
        if (!isSalesPhotoEvidenceImageReadRouteEnabledForEnv(process.env)) return null;
        const { createCloudflareR2SalesPhotoEvidenceReadAdapter } = await import('@/lib/sales/photo-evidence-r2-read-adapter.server');
        return createCloudflareR2SalesPhotoEvidenceReadAdapter({ env: process.env });
      },
    }).GET(request)
  );
};

export const POST = (request: Request) => {
  const corsRejection = createAppApiCorsRejectionResponse(request);
  if (corsRejection) return corsRejection;
  return applyAppApiCors(request, disabledResponse());
};

export const PUT = (request: Request) => {
  const corsRejection = createAppApiCorsRejectionResponse(request);
  if (corsRejection) return corsRejection;
  return applyAppApiCors(request, disabledResponse());
};

export const PATCH = (request: Request) => {
  const corsRejection = createAppApiCorsRejectionResponse(request);
  if (corsRejection) return corsRejection;
  return applyAppApiCors(request, disabledResponse());
};

export const DELETE = (request: Request) => {
  const corsRejection = createAppApiCorsRejectionResponse(request);
  if (corsRejection) return corsRejection;
  return applyAppApiCors(request, disabledResponse());
};

export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, {
  allowedMethods: ['GET', 'OPTIONS'],
});

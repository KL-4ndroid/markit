import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import { createAppApiJsonResponse } from '@/lib/api/server/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 5;

const HEALTH_RESPONSE_BODY = Object.freeze({
  ok: true,
  status: 'healthy',
});

export function GET(request: Request): Response {
  const corsRejection = createAppApiCorsRejectionResponse(request);
  if (corsRejection) return corsRejection;

  return applyAppApiCors(
    request,
    createAppApiJsonResponse(HEALTH_RESPONSE_BODY, { status: 200 })
  );
}

export function OPTIONS(request: Request): Response {
  return createAppApiCorsPreflightResponse(request, {
    allowedMethods: ['GET', 'OPTIONS'],
  });
}

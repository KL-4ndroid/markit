import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import {
  authenticateAppApiRequest,
  getAppApiBearerToken,
  getAppApiSupabasePublicConfig,
} from '@/lib/api/server/auth';
import { createAppApiJsonResponse } from '@/lib/api/server/response';
import {
  runAuthenticatedSubscriptionPriceFoundationSmoke,
  type SubscriptionPriceFoundationSmokeSummary,
} from '@/lib/subscription/subscription-price-foundation-smoke.server';
import { isSubscriptionSimulationRequestAllowed } from '@/lib/subscription/subscription-simulation.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const ALLOWED_METHODS = ['GET', 'OPTIONS'] as const;

type SmokeRouteActor = { actorId: string };

export type SubscriptionPriceFoundationSmokeRouteDeps = {
  resolveActor(request: Request): Promise<SmokeRouteActor | 'unavailable' | null>;
  runSmoke(request: Request): Promise<SubscriptionPriceFoundationSmokeSummary | null>;
};

function errorResponse(status: number, code: string, message: string): Response {
  return createAppApiJsonResponse({ ok: false, code, message }, { status });
}

export function createSubscriptionPriceFoundationSmokeRouteHandler(
  deps: SubscriptionPriceFoundationSmokeRouteDeps,
) {
  return async function GET(request: Request): Promise<Response> {
    const actor = await deps.resolveActor(request);
    if (actor === 'unavailable') {
      return errorResponse(503, 'authentication_unavailable', 'Smoke authentication is unavailable.');
    }
    if (!actor) {
      return errorResponse(401, 'authentication_required', 'Smoke requires authentication.');
    }

    const summary = await deps.runSmoke(request);
    if (!summary) {
      return errorResponse(503, 'smoke_unavailable', 'Price foundation smoke is unavailable.');
    }
    return createAppApiJsonResponse({ ok: true, available: true, ...summary });
  };
}

async function resolveActor(request: Request): Promise<SmokeRouteActor | 'unavailable' | null> {
  const result = await authenticateAppApiRequest(request);
  if (result.ok) return result.actor;
  return result.code === 'authentication_unavailable' ? 'unavailable' : null;
}

async function runSmoke(request: Request): Promise<SubscriptionPriceFoundationSmokeSummary | null> {
  const config = getAppApiSupabasePublicConfig();
  const accessToken = getAppApiBearerToken(request);
  if (!config || !accessToken) return null;
  return runAuthenticatedSubscriptionPriceFoundationSmoke({
    supabaseUrl: config.url,
    publicKey: config.publicKey,
    accessToken,
  });
}

const handler = createSubscriptionPriceFoundationSmokeRouteHandler({ resolveActor, runSmoke });

async function runWithCors(request: Request): Promise<Response> {
  if (!isSubscriptionSimulationRequestAllowed(request)) {
    return errorResponse(404, 'dev_tool_unavailable', 'Development tool is unavailable.');
  }
  const rejection = createAppApiCorsRejectionResponse(request, { allowedMethods: ALLOWED_METHODS });
  if (rejection) return rejection;
  return applyAppApiCors(request, await handler(request), { allowedMethods: ALLOWED_METHODS });
}

export const GET = runWithCors;
export const OPTIONS = (request: Request) => (
  isSubscriptionSimulationRequestAllowed(request)
    ? createAppApiCorsPreflightResponse(request, { allowedMethods: ALLOWED_METHODS })
    : errorResponse(404, 'dev_tool_unavailable', 'Development tool is unavailable.')
);

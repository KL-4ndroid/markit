import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import { createAppApiJsonResponse } from '@/lib/api/server/response';
import {
  clearSubscriptionSimulation,
  isSubscriptionSimulationRequestAllowed,
  readSubscriptionSimulation,
  setSubscriptionSimulation,
  type SubscriptionSimulationState,
} from '@/lib/subscription/subscription-simulation.server';
import { isAccountPlanCode, type AccountPlanCode } from '@/lib/subscription/subscription-plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 5;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'] as const;

type SimulationRouteActor = { actorId: string };

export type SubscriptionSimulationRouteDeps = {
  resolveActor(request: Request): Promise<SimulationRouteActor | 'unavailable' | null>;
  readState(actorId: string, nowMs: number): SubscriptionSimulationState;
  setState(actorId: string, planCode: AccountPlanCode, nowMs: number): SubscriptionSimulationState;
  clearState(actorId: string): SubscriptionSimulationState;
  now(): number;
};

function errorResponse(status: number, code: string, message: string): Response {
  return createAppApiJsonResponse({ ok: false, code, message }, { status });
}

function successResponse(state: SubscriptionSimulationState): Response {
  return createAppApiJsonResponse({
    ok: true,
    available: true,
    ...state,
  });
}

async function resolveValidActor(
  request: Request,
  deps: SubscriptionSimulationRouteDeps,
): Promise<SimulationRouteActor | Response> {
  const actor = await deps.resolveActor(request);
  if (actor === 'unavailable') {
    return errorResponse(503, 'authentication_unavailable', 'Simulation authentication is unavailable.');
  }
  if (!actor) {
    return errorResponse(401, 'authentication_required', 'Simulation requires authentication.');
  }
  if (!UUID_PATTERN.test(actor.actorId)) {
    return errorResponse(503, 'simulation_unavailable', 'Subscription simulation is unavailable.');
  }
  return actor;
}

export function createSubscriptionSimulationRouteHandlers(deps: SubscriptionSimulationRouteDeps) {
  return {
    async GET(request: Request): Promise<Response> {
      const actor = await resolveValidActor(request, deps);
      if (actor instanceof Response) return actor;
      return successResponse(deps.readState(actor.actorId, deps.now()));
    },
    async POST(request: Request): Promise<Response> {
      const actor = await resolveValidActor(request, deps);
      if (actor instanceof Response) return actor;

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse(400, 'invalid_request', 'Simulation request is invalid.');
      }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return errorResponse(400, 'invalid_request', 'Simulation request is invalid.');
      }

      const input = body as Record<string, unknown>;
      if (input.enabled === false) return successResponse(deps.clearState(actor.actorId));
      if (input.enabled !== true || !isAccountPlanCode(input.planCode)) {
        return errorResponse(400, 'invalid_request', 'Simulation plan is invalid.');
      }

      return successResponse(deps.setState(actor.actorId, input.planCode, deps.now()));
    },
  };
}

async function resolveActor(request: Request): Promise<SimulationRouteActor | 'unavailable' | null> {
  const result = await authenticateAppApiRequest(request);
  if (result.ok) return result.actor;
  return result.code === 'authentication_unavailable' ? 'unavailable' : null;
}

const handlers = createSubscriptionSimulationRouteHandlers({
  resolveActor,
  readState: readSubscriptionSimulation,
  setState: setSubscriptionSimulation,
  clearState: clearSubscriptionSimulation,
  now: Date.now,
});

async function runWithCors(request: Request, method: 'GET' | 'POST'): Promise<Response> {
  if (!isSubscriptionSimulationRequestAllowed(request)) {
    return errorResponse(404, 'dev_tool_unavailable', 'Development tool is unavailable.');
  }
  const rejection = createAppApiCorsRejectionResponse(request, { allowedMethods: ALLOWED_METHODS });
  if (rejection) return rejection;
  const response = await handlers[method](request);
  return applyAppApiCors(request, response, { allowedMethods: ALLOWED_METHODS });
}

export const GET = (request: Request) => runWithCors(request, 'GET');
export const POST = (request: Request) => runWithCors(request, 'POST');
export const OPTIONS = (request: Request) => (
  isSubscriptionSimulationRequestAllowed(request)
    ? createAppApiCorsPreflightResponse(request, { allowedMethods: ALLOWED_METHODS })
    : errorResponse(404, 'dev_tool_unavailable', 'Development tool is unavailable.')
);

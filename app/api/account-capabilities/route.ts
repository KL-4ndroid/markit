import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import { createAppApiJsonResponse } from '@/lib/api/server/response';
import {
  resolveServerAccountCapabilities,
  type ServerAccountCapabilityResolution,
} from '@/lib/subscription/account-capability-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 5;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_METHODS = ['GET', 'OPTIONS'] as const;

type CapabilityRouteActor = { actorId: string };

export type AccountCapabilityRouteDeps = {
  resolveActor(request: Request): Promise<CapabilityRouteActor | 'unavailable' | null>;
  resolveCapabilities(input: {
    actorId: string;
    ownerId: string;
  }): Promise<ServerAccountCapabilityResolution>;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return createAppApiJsonResponse({ ok: false, code, message }, { status });
}

export function createAccountCapabilityRouteHandlers(deps: AccountCapabilityRouteDeps) {
  return {
    async GET(request: Request): Promise<Response> {
      const actor = await deps.resolveActor(request);
      if (actor === 'unavailable') {
        return errorResponse(503, 'authentication_unavailable', 'Account capability authentication is unavailable.');
      }
      if (!actor) {
        return errorResponse(401, 'authentication_required', 'Account capability access requires authentication.');
      }

      if (!UUID_PATTERN.test(actor.actorId)) {
        return errorResponse(503, 'capability_unavailable', 'Account capabilities are temporarily unavailable.');
      }

      const resolution = await deps.resolveCapabilities({
        actorId: actor.actorId,
        ownerId: actor.actorId,
      });
      if (resolution.outcome === 'forbidden') {
        return errorResponse(403, 'owner_workspace_forbidden', 'The requested owner workspace is not available.');
      }
      if (resolution.outcome === 'unavailable') {
        return errorResponse(503, 'capability_unavailable', 'Account capabilities are temporarily unavailable.');
      }

      return createAppApiJsonResponse(resolution.response, { status: 200 });
    },
  };
}

async function resolveActor(request: Request): Promise<CapabilityRouteActor | 'unavailable' | null> {
  const result = await authenticateAppApiRequest(request);
  if (result.ok) return result.actor;
  return result.code === 'authentication_unavailable' ? 'unavailable' : null;
}

async function resolveCapabilities(input: {
  actorId: string;
  ownerId: string;
}): Promise<ServerAccountCapabilityResolution> {
  const { createAccountCapabilityRepository } = await import(
    '@/lib/subscription/account-capability-storage.server'
  );
  const repository = createAccountCapabilityRepository();
  if (!repository) return { outcome: 'unavailable' };
  return resolveServerAccountCapabilities({
    ...input,
    repository,
    nowMs: Date.now(),
  });
}

async function runWithCors(request: Request): Promise<Response> {
  const rejection = createAppApiCorsRejectionResponse(request, { allowedMethods: ALLOWED_METHODS });
  if (rejection) return rejection;
  const response = await createAccountCapabilityRouteHandlers({
    resolveActor,
    resolveCapabilities,
  }).GET(request);
  return applyAppApiCors(request, response, { allowedMethods: ALLOWED_METHODS });
}

export const GET = (request: Request) => runWithCors(request);
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, {
  allowedMethods: ALLOWED_METHODS,
});

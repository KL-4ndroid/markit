import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import { authenticateAppApiRequest, type AppApiActor } from '@/lib/api/server/auth';
import { createAppApiJsonResponse } from '@/lib/api/server/response';
import {
  parseAccountDeletionCreateRequest,
  parseAccountDeletionSafeStatus,
  type AccountDeletionSafeStatus,
} from '@/lib/subscription/account-deletion-api-contract';
import {
  deriveAccountDeletionRequestHashes,
  evaluateAccountDeletionRecentReauth,
} from '@/lib/subscription/account-deletion-reauth.server';
import { createAccountDeletionStorageRepository } from '@/lib/subscription/account-deletion-storage.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 5;

const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'] as const;
const MAX_JSON_BYTES = 4_096;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type RouteEnv = Record<string, string | undefined>;

export type AccountDeletionRouteRepository = {
  readCurrentForActor(actorId: string): Promise<unknown | null>;
  createForActor(input: {
    actorId: string;
    subjectRefHash: string;
    idempotencyHash: string;
    policyRevision: string;
    preflightResolution: string;
  }): Promise<unknown>;
};

export type AccountDeletionRouteDeps = {
  isEnabled(): boolean;
  nowMs(): number;
  resolveActor(request: Request): Promise<AppApiActor | 'unavailable' | null>;
  resolveHashSecret(): string | null;
  createRepository(): Promise<AccountDeletionRouteRepository | null>;
};

function errorResponse(status: number, code: string, message: string): Response {
  return createAppApiJsonResponse({ ok: false, code, message }, { status });
}

function disabledResponse(): Response {
  return errorResponse(501, 'account_deletion_disabled', 'Account deletion is not enabled.');
}

async function parseBoundedJson(request: Request): Promise<unknown | null> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) return null;
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_JSON_BYTES) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function safeSuccess(status: AccountDeletionSafeStatus, httpStatus = 200): Response {
  return createAppApiJsonResponse({ ok: true, request: status }, { status: httpStatus });
}

async function resolveRequiredActor(
  request: Request,
  deps: AccountDeletionRouteDeps,
): Promise<AppApiActor | Response> {
  const actor = await deps.resolveActor(request);
  if (actor === 'unavailable') {
    return errorResponse(503, 'authentication_unavailable', 'Authentication is temporarily unavailable.');
  }
  if (!actor || !UUID_PATTERN.test(actor.actorId)) {
    return errorResponse(401, 'authentication_required', 'Account deletion requires authentication.');
  }
  return actor;
}

export function createAccountDeletionRouteHandlers(deps: AccountDeletionRouteDeps) {
  return {
    async GET(request: Request): Promise<Response> {
      if (!deps.isEnabled()) return disabledResponse();
      const actor = await resolveRequiredActor(request, deps);
      if (actor instanceof Response) return actor;
      const repository = await deps.createRepository();
      if (!repository) {
        return errorResponse(503, 'account_deletion_unavailable', 'Account deletion is temporarily unavailable.');
      }
      try {
        const raw = await repository.readCurrentForActor(actor.actorId);
        if (raw === null) {
          return errorResponse(404, 'account_deletion_not_found', 'No account deletion request was found.');
        }
        const status = parseAccountDeletionSafeStatus(raw);
        return status
          ? safeSuccess(status)
          : errorResponse(503, 'account_deletion_unavailable', 'Account deletion status is unavailable.');
      } catch {
        return errorResponse(503, 'account_deletion_unavailable', 'Account deletion status is unavailable.');
      }
    },

    async POST(request: Request): Promise<Response> {
      if (!deps.isEnabled()) return disabledResponse();
      const actor = await resolveRequiredActor(request, deps);
      if (actor instanceof Response) return actor;

      const reauth = evaluateAccountDeletionRecentReauth({
        lastSignInAt: actor.lastSignInAt,
        nowMs: deps.nowMs(),
      });
      if (!reauth.accepted) {
        return errorResponse(409, reauth.code, 'Recent reauthentication is required.');
      }

      const body = parseAccountDeletionCreateRequest(await parseBoundedJson(request));
      if (!body) return errorResponse(400, 'invalid_request', 'Account deletion request is invalid.');

      const secret = deps.resolveHashSecret();
      const hashes = secret ? deriveAccountDeletionRequestHashes({
        secret,
        actorId: actor.actorId,
        idempotencyKey: body.idempotencyKey,
      }) : null;
      if (!hashes) {
        return errorResponse(503, 'account_deletion_unavailable', 'Account deletion is temporarily unavailable.');
      }

      const repository = await deps.createRepository();
      if (!repository) {
        return errorResponse(503, 'account_deletion_unavailable', 'Account deletion is temporarily unavailable.');
      }
      try {
        const raw = await repository.createForActor({
          actorId: actor.actorId,
          ...hashes,
          policyRevision: body.policyRevision,
          preflightResolution: body.preflightResolution,
        });
        const status = parseAccountDeletionSafeStatus(raw);
        return status
          ? safeSuccess(status, 202)
          : errorResponse(503, 'account_deletion_unavailable', 'Account deletion request was not accepted.');
      } catch {
        return errorResponse(503, 'account_deletion_unavailable', 'Account deletion request was not accepted.');
      }
    },
  };
}

export function isAccountDeletionRouteEnabledForEnv(env: RouteEnv): boolean {
  if (
    env.ACCOUNT_DELETION_ROUTE_ENABLED !== '1'
    || env.ACCOUNT_DELETION_AD2_REPOSITORY_READY !== '1'
  ) return false;
  const deploymentEnv = env.VERCEL_ENV ?? env.APP_ENV ?? env.NODE_ENV;
  return deploymentEnv !== 'production'
    || env.ACCOUNT_DELETION_ROUTE_ALLOW_PRODUCTION === '1';
}

async function resolveActor(request: Request): Promise<AppApiActor | 'unavailable' | null> {
  const result = await authenticateAppApiRequest(request);
  if (result.ok) return result.actor;
  return result.code === 'authentication_unavailable' ? 'unavailable' : null;
}

async function createRepository(): Promise<AccountDeletionRouteRepository | null> {
  return createAccountDeletionStorageRepository();
}

const deps: AccountDeletionRouteDeps = {
  isEnabled: () => isAccountDeletionRouteEnabledForEnv(process.env),
  nowMs: () => Date.now(),
  resolveActor,
  resolveHashSecret: () => process.env.ACCOUNT_DELETION_HMAC_SECRET?.trim() || null,
  createRepository,
};

async function runWithCors(request: Request, handler: () => Promise<Response>): Promise<Response> {
  const rejection = createAppApiCorsRejectionResponse(request, { allowedMethods: ALLOWED_METHODS });
  if (rejection) return rejection;
  return applyAppApiCors(request, await handler(), { allowedMethods: ALLOWED_METHODS });
}

export const GET = (request: Request) => runWithCors(
  request,
  () => createAccountDeletionRouteHandlers(deps).GET(request),
);
export const POST = (request: Request) => runWithCors(
  request,
  () => createAccountDeletionRouteHandlers(deps).POST(request),
);
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, {
  allowedMethods: ALLOWED_METHODS,
});

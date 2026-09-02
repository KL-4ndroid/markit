import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import { createAppApiJsonResponse } from '@/lib/api/server/response';
import {
  parseSyncIncidentReport,
  type SyncIncidentReport,
} from '@/lib/observability/sync-incident-contract';
import {
  recordServerOperationalEvent,
  type ServerOperationalEventInput,
} from '@/lib/observability/server-operational-event';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 5;

const ALLOWED_METHODS = ['POST', 'OPTIONS'] as const;
const MAX_REQUEST_BYTES = 512;

type SyncIncidentActor = Readonly<{ actorId: string }>;
type BodyReadResult =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false; code: 'body_invalid' | 'body_too_large' }>;

export type SyncIncidentRouteDeps = Readonly<{
  resolveActor(request: Request): Promise<SyncIncidentActor | 'unavailable' | null>;
  recordIncident(input: ServerOperationalEventInput): void;
}>;

function errorResponse(status: number, code: string, message: string): Response {
  return createAppApiJsonResponse({ ok: false, code, message }, { status });
}

function isJsonRequest(request: Request): boolean {
  return request.headers.get('content-type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase() === 'application/json';
}

async function readBoundedJson(request: Request): Promise<BodyReadResult> {
  const contentLengthValue = request.headers.get('content-length');
  if (contentLengthValue) {
    const contentLength = Number(contentLengthValue);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return { ok: false, code: 'body_invalid' };
    }
    if (contentLength > MAX_REQUEST_BYTES) {
      return { ok: false, code: 'body_too_large' };
    }
  }

  if (!request.body) return { ok: false, code: 'body_invalid' };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let body = '';

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      byteCount += chunk.value.byteLength;
      if (byteCount > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return { ok: false, code: 'body_too_large' };
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    return { ok: true, value: JSON.parse(body) as unknown };
  } catch {
    return { ok: false, code: 'body_invalid' };
  } finally {
    reader.releaseLock();
  }
}

function operationalEventFor(report: SyncIncidentReport): ServerOperationalEventInput {
  if (report.kind === 'permission_blocked') {
    return {
      level: 'warn',
      event: 'sync.permission_blocked',
      outcome: 'failure',
      code: 'permission_sync_blocked',
      route: '/api/operational-events/sync',
      metrics: { pendingCount: report.pendingCount },
    };
  }

  return {
    level: 'error',
    event: 'sync.unexpected_failure',
    outcome: 'failure',
    code: 'unexpected_sync_failure',
    route: '/api/operational-events/sync',
    metrics: { pendingCount: report.pendingCount },
  };
}

export function createSyncIncidentRouteHandlers(deps: SyncIncidentRouteDeps) {
  return {
    async POST(request: Request): Promise<Response> {
      const actor = await deps.resolveActor(request);
      if (actor === 'unavailable') {
        return errorResponse(503, 'authentication_unavailable', 'Sync incident authentication is unavailable.');
      }
      if (!actor) {
        return errorResponse(401, 'authentication_required', 'Sync incident reporting requires authentication.');
      }
      if (!isJsonRequest(request)) {
        return errorResponse(415, 'content_type_unsupported', 'Sync incident reports require JSON.');
      }

      const body = await readBoundedJson(request);
      if (!body.ok) {
        return body.code === 'body_too_large'
          ? errorResponse(413, 'sync_incident_too_large', 'Sync incident report is too large.')
          : errorResponse(400, 'sync_incident_invalid', 'Sync incident report is invalid.');
      }

      const report = parseSyncIncidentReport(body.value);
      if (!report) {
        return errorResponse(400, 'sync_incident_invalid', 'Sync incident report is invalid.');
      }

      deps.recordIncident(operationalEventFor(report));
      return createAppApiJsonResponse({ ok: true }, { status: 202 });
    },
  };
}

async function resolveActor(request: Request): Promise<SyncIncidentActor | 'unavailable' | null> {
  const result = await authenticateAppApiRequest(request);
  if (result.ok) return result.actor;
  return result.code === 'authentication_unavailable' ? 'unavailable' : null;
}

const handlers = createSyncIncidentRouteHandlers({
  resolveActor,
  recordIncident: recordServerOperationalEvent,
});

async function runWithCors(request: Request): Promise<Response> {
  const rejection = createAppApiCorsRejectionResponse(request, { allowedMethods: ALLOWED_METHODS });
  if (rejection) return rejection;
  const response = await handlers.POST(request);
  return applyAppApiCors(request, response, { allowedMethods: ALLOWED_METHODS });
}

export const POST = (request: Request) => runWithCors(request);
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, {
  allowedMethods: ALLOWED_METHODS,
});

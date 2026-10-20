import {
  applyAppApiCors,
  createAppApiCorsPreflightResponse,
  createAppApiCorsRejectionResponse,
} from '@/lib/api/server/cors';
import { createAppApiJsonResponse } from '@/lib/api/server/response';
import { APP_METADATA } from '@/lib/app-metadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 5;

export type HealthReleaseIdentity = {
  version: string;
  commitSha: string;
  buildTime: string | null;
};

const VERSION_PATTERN = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}$/;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

export function createHealthReleaseIdentity(input: {
  version: string;
  commitSha: string;
  buildTime: string;
}): HealthReleaseIdentity {
  const version = input.version.trim();
  const commitSha = input.commitSha.trim();
  const buildTime = input.buildTime.trim();
  const buildTimestamp = Date.parse(buildTime);

  return {
    version: VERSION_PATTERN.test(version) ? version : 'unknown',
    commitSha: COMMIT_SHA_PATTERN.test(commitSha) ? commitSha.toLowerCase() : 'unknown',
    buildTime: buildTime && Number.isFinite(buildTimestamp)
      ? new Date(buildTimestamp).toISOString()
      : null,
  };
}

const HEALTH_RELEASE_IDENTITY = Object.freeze(createHealthReleaseIdentity(APP_METADATA));

const HEALTH_RESPONSE_BODY = Object.freeze({
  ok: true,
  status: 'healthy',
  release: HEALTH_RELEASE_IDENTITY,
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

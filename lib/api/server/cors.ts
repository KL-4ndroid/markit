import {
  createAppApiJsonResponse,
  createAppApiNoContentResponse,
} from '@/lib/api/server/response';

export const APP_API_CORS_ALLOWED_ORIGINS_ENV_NAME = 'APP_API_CORS_ALLOWED_ORIGINS';

export const APP_API_CORS_ALLOWED_REQUEST_HEADERS = [
  'Authorization',
  'Content-Type',
  'X-Request-Id',
] as const;

const DEFAULT_ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'] as const;
const ALLOWED_REQUEST_HEADER_NAMES = new Set(
  APP_API_CORS_ALLOWED_REQUEST_HEADERS.map(header => header.toLowerCase())
);

export type AppApiCorsOptions = {
  /** Pass null to use an empty cross-origin allowlist in deterministic tests. */
  configuredAllowedOrigins?: string | null;
  allowedMethods?: readonly string[];
};

export type AppApiCorsAllowedOriginsParseResult =
  | {
      ok: true;
      origins: ReadonlySet<string>;
    }
  | {
      ok: false;
      code: 'cors_allowed_origins_invalid';
      invalidEntries: readonly string[];
    };

type AppApiCorsDecision =
  | {
      action: 'allow';
      responseOrigin: string | null;
    }
  | {
      action: 'reject';
      status: 403 | 500;
      code: 'cors_origin_denied' | 'cors_configuration_invalid' | 'cors_preflight_denied';
    };

function normalizeConfiguredOrigin(value: string): string | null {
  if (value === '*' || value.toLowerCase() === 'null') return null;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    parsed.username.length > 0
    || parsed.password.length > 0
    || parsed.search.length > 0
    || parsed.hash.length > 0
    || (parsed.pathname !== '' && parsed.pathname !== '/')
  ) {
    return null;
  }

  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    return parsed.origin;
  }

  if (
    parsed.protocol === 'capacitor:'
    && parsed.hostname === 'localhost'
    && parsed.port.length === 0
  ) {
    return 'capacitor://localhost';
  }

  return null;
}

export function parseAppApiCorsAllowedOrigins(
  configuredValue: string | null | undefined
): AppApiCorsAllowedOriginsParseResult {
  if (configuredValue === null || configuredValue === undefined || configuredValue.trim() === '') {
    return {
      ok: true,
      origins: new Set<string>(),
    };
  }

  const entries = configuredValue.split(',').map(entry => entry.trim());
  const invalidEntries: string[] = [];
  const origins = new Set<string>();

  for (const entry of entries) {
    if (entry.length === 0) {
      invalidEntries.push(entry);
      continue;
    }

    const normalized = normalizeConfiguredOrigin(entry);
    if (!normalized) {
      invalidEntries.push(entry);
      continue;
    }

    origins.add(normalized);
  }

  if (invalidEntries.length > 0) {
    return {
      ok: false,
      code: 'cors_allowed_origins_invalid',
      invalidEntries,
    };
  }

  return {
    ok: true,
    origins,
  };
}

function readConfiguredAllowedOrigins(options: AppApiCorsOptions): string | null | undefined {
  if (options.configuredAllowedOrigins !== undefined) {
    return options.configuredAllowedOrigins;
  }

  return process.env[APP_API_CORS_ALLOWED_ORIGINS_ENV_NAME];
}

function getRequestHttpOrigin(request: Request): string | null {
  try {
    const parsed = new URL(request.url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.origin
      : null;
  } catch {
    return null;
  }
}

function decideAppApiCors(request: Request, options: AppApiCorsOptions): AppApiCorsDecision {
  const parsedAllowlist = parseAppApiCorsAllowedOrigins(readConfiguredAllowedOrigins(options));
  if (!parsedAllowlist.ok) {
    return {
      action: 'reject',
      status: 500,
      code: 'cors_configuration_invalid',
    };
  }

  const requestOriginValue = request.headers.get('Origin');
  if (requestOriginValue === null) {
    return {
      action: 'allow',
      responseOrigin: null,
    };
  }

  const requestOrigin = normalizeConfiguredOrigin(requestOriginValue.trim());
  if (!requestOrigin) {
    return {
      action: 'reject',
      status: 403,
      code: 'cors_origin_denied',
    };
  }

  const sameOrigin = getRequestHttpOrigin(request);
  if (requestOrigin === sameOrigin || parsedAllowlist.origins.has(requestOrigin)) {
    return {
      action: 'allow',
      responseOrigin: requestOrigin,
    };
  }

  return {
    action: 'reject',
    status: 403,
    code: 'cors_origin_denied',
  };
}

function appendVaryOrigin(headers: Headers): void {
  const existing = headers.get('Vary')
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean) ?? [];

  if (!existing.some(value => value.toLowerCase() === 'origin')) {
    existing.push('Origin');
  }

  headers.set('Vary', existing.join(', '));
}

function applyAllowedOriginHeader(headers: Headers, responseOrigin: string | null): void {
  appendVaryOrigin(headers);
  headers.delete('Access-Control-Allow-Credentials');

  if (responseOrigin) {
    headers.set('Access-Control-Allow-Origin', responseOrigin);
  } else {
    headers.delete('Access-Control-Allow-Origin');
  }
}

function createCorsRejectionResponse(decision: Extract<AppApiCorsDecision, { action: 'reject' }>): Response {
  const message = decision.code === 'cors_configuration_invalid'
    ? 'Application API CORS configuration is invalid.'
    : decision.code === 'cors_preflight_denied'
      ? 'Application API preflight request is not allowed.'
      : 'Application API origin is not allowed.';
  const response = createAppApiJsonResponse({
    ok: false,
    code: decision.code,
    message,
  }, {
    status: decision.status,
  });
  appendVaryOrigin(response.headers);
  return response;
}

/**
 * Rejects an invalid CORS configuration or disallowed Origin before a route
 * executes authentication, storage, or other side-effecting business logic.
 */
export function createAppApiCorsRejectionResponse(
  request: Request,
  options: AppApiCorsOptions = {}
): Response | null {
  const decision = decideAppApiCors(request, options);
  return decision.action === 'reject'
    ? createCorsRejectionResponse(decision)
    : null;
}

function normalizeAllowedMethods(methods: readonly string[] | undefined): string[] {
  const normalized = (methods ?? DEFAULT_ALLOWED_METHODS).map(method => method.toUpperCase());
  if (!normalized.includes('OPTIONS')) normalized.push('OPTIONS');
  return [...new Set(normalized)];
}

function preflightRequestIsAllowed(request: Request, allowedMethods: readonly string[]): boolean {
  const requestedMethod = request.headers.get('Access-Control-Request-Method');
  if (requestedMethod && !allowedMethods.includes(requestedMethod.toUpperCase())) return false;

  const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
  if (!requestedHeaders) return true;

  return requestedHeaders
    .split(',')
    .map(header => header.trim().toLowerCase())
    .filter(Boolean)
    .every(header => ALLOWED_REQUEST_HEADER_NAMES.has(header));
}

export function createAppApiCorsPreflightResponse(
  request: Request,
  options: AppApiCorsOptions = {}
): Response {
  const decision = decideAppApiCors(request, options);
  if (decision.action === 'reject') return createCorsRejectionResponse(decision);

  const allowedMethods = normalizeAllowedMethods(options.allowedMethods);
  if (!preflightRequestIsAllowed(request, allowedMethods)) {
    return createCorsRejectionResponse({
      action: 'reject',
      status: 403,
      code: 'cors_preflight_denied',
    });
  }

  const response = createAppApiNoContentResponse({
    'Access-Control-Allow-Headers': APP_API_CORS_ALLOWED_REQUEST_HEADERS.join(', '),
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
  });
  applyAllowedOriginHeader(response.headers, decision.responseOrigin);
  return response;
}

export function applyAppApiCors(
  request: Request,
  response: Response,
  options: AppApiCorsOptions = {}
): Response {
  const decision = decideAppApiCors(request, options);
  if (decision.action === 'reject') return createCorsRejectionResponse(decision);

  const headers = new Headers(response.headers);
  applyAllowedOriginHeader(headers, decision.responseOrigin);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

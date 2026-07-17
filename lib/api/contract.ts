export type AppApiErrorBody = {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
  [key: string]: unknown;
};

export type ParsedAppApiError = {
  code: string;
  status: number;
  retryable: boolean;
  requestId: string | null;
};

const SAFE_ERROR_CODE = /^[a-z][a-z0-9_]{0,63}$/;
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export function isRetryableAppApiStatus(status: number): boolean {
  return RETRYABLE_HTTP_STATUSES.has(status);
}

function safeErrorCode(value: unknown, status: number): string {
  return typeof value === 'string' && SAFE_ERROR_CODE.test(value)
    ? value
    : `http_${status}`;
}

function safeRequestId(value: unknown): string | null {
  return typeof value === 'string' && SAFE_REQUEST_ID.test(value) ? value : null;
}

export function normalizeAppApiErrorBody(
  body: Record<string, unknown>,
  status: number
): AppApiErrorBody {
  const normalized: AppApiErrorBody = {
    ok: false,
    code: safeErrorCode(body.code, status),
    message: typeof body.message === 'string' && body.message.length <= 500
      ? body.message
      : 'The application API request failed.',
    retryable: typeof body.retryable === 'boolean'
      ? body.retryable
      : isRetryableAppApiStatus(status),
  };

  const requestId = safeRequestId(body.requestId);
  if (requestId) normalized.requestId = requestId;

  // Endpoint-specific recovery instructions are explicit booleans. Arbitrary
  // fields such as stack, cause, details, env, or secret are never forwarded.
  if (typeof body.shouldKeepLocalPayload === 'boolean') {
    normalized.shouldKeepLocalPayload = body.shouldKeepLocalPayload;
  }
  if (typeof body.shouldRetryWithLocalPayload === 'boolean') {
    normalized.shouldRetryWithLocalPayload = body.shouldRetryWithLocalPayload;
  }

  return normalized;
}

export async function parseAppApiErrorResponse(response: Response): Promise<ParsedAppApiError> {
  let body: Record<string, unknown> = {};
  try {
    const parsed = await response.json() as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // Non-JSON upstream responses are mapped to a stable HTTP error code.
  }

  const headerRequestId = response.headers.get('x-request-id');
  return {
    code: safeErrorCode(body.code, response.status),
    status: response.status,
    retryable: typeof body.retryable === 'boolean'
      ? body.retryable
      : isRetryableAppApiStatus(response.status),
    requestId: safeRequestId(body.requestId) ?? safeRequestId(headerRequestId),
  };
}

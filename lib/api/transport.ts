import { isRetryableAppApiStatus } from '@/lib/api/contract';

export const DEFAULT_APP_API_REQUEST_TIMEOUT_MS = 15_000;
export const DEFAULT_APP_API_RETRY_DELAY_MS = 250;

const MAX_IDEMPOTENT_RETRIES = 1;
const TIMEOUT_SENTINEL = Symbol('app-api-request-timeout');

export type AppApiRequestErrorCode =
  | 'network_error'
  | 'request_aborted'
  | 'request_policy_invalid'
  | 'request_timeout';

const SAFE_ERROR_MESSAGES: Record<AppApiRequestErrorCode, string> = {
  network_error: 'The application API request could not reach the server.',
  request_aborted: 'The application API request was cancelled.',
  request_policy_invalid: 'The application API request policy is invalid.',
  request_timeout: 'The application API request timed out.',
};

export class AppApiRequestError extends Error {
  readonly code: AppApiRequestErrorCode;
  readonly attempts: number;
  readonly retryable: boolean;

  constructor(code: AppApiRequestErrorCode, attempts: number) {
    super(SAFE_ERROR_MESSAGES[code]);
    this.name = 'AppApiRequestError';
    this.code = code;
    this.attempts = attempts;
    this.retryable = code === 'network_error' || code === 'request_timeout';
  }
}

export type AppApiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type AppApiSleep = (milliseconds: number) => Promise<void>;

export type AppApiRequestPolicyOptions = {
  fetchImpl?: AppApiFetch;
  sleepImpl?: AppApiSleep;
  timeoutMs?: number;
  retryDelayMs?: number;
};

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function resolveRequestMethod(input: RequestInfo | URL, init: RequestInit): string {
  if (init.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.method.toUpperCase();
  }
  return 'GET';
}

function isIdempotentRetryMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function validatePolicyNumber(value: number, allowZero: boolean): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && (allowZero ? value >= 0 : value > 0);
}

async function discardResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // A failed cleanup must not change the retry decision.
  }
}

async function executeFetchAttempt(
  input: RequestInfo | URL,
  init: RequestInit,
  fetchImpl: AppApiFetch,
  timeoutMs: number,
  attempt: number
): Promise<Response> {
  const controller = new AbortController();
  const callerSignal = init.signal;
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const forwardCallerAbort = () => controller.abort();
  callerSignal?.addEventListener('abort', forwardCallerAbort, { once: true });

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(TIMEOUT_SENTINEL);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetchImpl(input, { ...init, signal: controller.signal }),
      timeout,
    ]);
  } catch (error) {
    if (timedOut || error === TIMEOUT_SENTINEL) {
      throw new AppApiRequestError('request_timeout', attempt);
    }
    if (callerSignal?.aborted || isAbortError(error)) {
      throw new AppApiRequestError('request_aborted', attempt);
    }
    throw new AppApiRequestError('network_error', attempt);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', forwardCallerAbort);
  }
}

export function isAppApiRequestError(error: unknown): error is AppApiRequestError {
  return error instanceof AppApiRequestError;
}

export function isRetryableAppApiResponseStatus(status: number): boolean {
  return isRetryableAppApiStatus(status);
}

/**
 * Executes an application API request under the shared client policy.
 *
 * GET and HEAD may retry once after a network/timeout failure or an explicitly
 * retryable response status. Mutating methods are attempted exactly once.
 * HTTP responses are returned unchanged so endpoint clients can parse their
 * structured error contracts; only transport failures throw AppApiRequestError.
 */
export async function fetchAppApi(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: AppApiRequestPolicyOptions = {}
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleepImpl = options.sleepImpl ?? defaultSleep;
  const timeoutMs = options.timeoutMs ?? DEFAULT_APP_API_REQUEST_TIMEOUT_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_APP_API_RETRY_DELAY_MS;

  if (
    !validatePolicyNumber(timeoutMs, false)
    || !validatePolicyNumber(retryDelayMs, true)
  ) {
    throw new AppApiRequestError('request_policy_invalid', 0);
  }

  if (init.signal?.aborted) {
    throw new AppApiRequestError('request_aborted', 0);
  }

  const method = resolveRequestMethod(input, init);
  const canRetry = isIdempotentRetryMethod(method);
  const maxAttempts = canRetry ? MAX_IDEMPOTENT_RETRIES + 1 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await executeFetchAttempt(input, init, fetchImpl, timeoutMs, attempt);
      const hasRetryAttempt = canRetry && attempt < maxAttempts;

      if (hasRetryAttempt && isRetryableAppApiResponseStatus(response.status)) {
        await discardResponseBody(response);
        await sleepImpl(retryDelayMs);
        if (init.signal?.aborted) {
          throw new AppApiRequestError('request_aborted', attempt);
        }
        continue;
      }

      return response;
    } catch (error) {
      const hasRetryAttempt = canRetry && attempt < maxAttempts;
      if (
        hasRetryAttempt
        && error instanceof AppApiRequestError
        && error.retryable
      ) {
        await sleepImpl(retryDelayMs);
        if (init.signal?.aborted) {
          throw new AppApiRequestError('request_aborted', attempt);
        }
        continue;
      }
      throw error;
    }
  }

  throw new AppApiRequestError('network_error', maxAttempts);
}

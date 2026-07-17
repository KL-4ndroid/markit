export const APP_API_BASE_URL_ENV_NAME = 'NEXT_PUBLIC_API_BASE_URL';

export type AppApiUrlErrorCode =
  | 'api_base_url_invalid'
  | 'api_base_url_insecure'
  | 'api_base_url_required'
  | 'api_path_invalid';

export class AppApiUrlError extends Error {
  readonly code: AppApiUrlErrorCode;

  constructor(code: AppApiUrlErrorCode, message: string) {
    super(message);
    this.name = 'AppApiUrlError';
    this.code = code;
  }
}

export type BuildAppApiUrlOptions = {
  /** Overrides NEXT_PUBLIC_API_BASE_URL. Pass null to exercise the fallback. */
  configuredBaseUrl?: string | null;
  /** Overrides the browser protocol for deterministic tests. */
  runtimeProtocol?: string | null;
  /** Overrides the compile-time Web/mobile target for deterministic tests. */
  buildTarget?: 'web' | 'mobile' | null;
};

function readConfiguredBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_BASE_URL;
}

function readRuntimeProtocol(): string | null {
  return typeof window === 'undefined' ? null : window.location.protocol;
}

function readBuildTarget(): string | null {
  return process.env.NEXT_PUBLIC_APP_BUILD_TARGET ?? null;
}

function normalizeApiPath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new AppApiUrlError(
      'api_path_invalid',
      'Application API paths must start with exactly one slash.'
    );
  }

  return path;
}

function normalizeConfiguredBaseUrl(value: string): { url: string; protocol: string } {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AppApiUrlError(
      'api_base_url_invalid',
      `${APP_API_BASE_URL_ENV_NAME} must be an absolute HTTP(S) URL.`
    );
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    || parsed.username.length > 0
    || parsed.password.length > 0
    || parsed.search.length > 0
    || parsed.hash.length > 0
  ) {
    throw new AppApiUrlError(
      'api_base_url_invalid',
      `${APP_API_BASE_URL_ENV_NAME} must be an absolute HTTP(S) URL without credentials, query, or fragment.`
    );
  }

  const pathPrefix = parsed.pathname.replace(/\/+$/, '');
  return {
    url: `${parsed.origin}${pathPrefix}`,
    protocol: parsed.protocol,
  };
}

/**
 * Builds an application API URL without coupling callers to a Next.js route.
 *
 * Web deployments may omit NEXT_PUBLIC_API_BASE_URL and keep using their
 * same-origin /api handlers. Non-Web origins (for example capacitor: or file:)
 * must configure an absolute remote API base URL instead of silently targeting
 * the bundled application origin.
 */
export function buildAppApiUrl(
  path: string,
  options: BuildAppApiUrlOptions = {}
): string {
  const normalizedPath = normalizeApiPath(path);
  const configuredBaseUrl = options.configuredBaseUrl === undefined
    ? readConfiguredBaseUrl()
    : options.configuredBaseUrl;
  const runtimeProtocol = options.runtimeProtocol === undefined
    ? readRuntimeProtocol()
    : options.runtimeProtocol;
  const buildTarget = options.buildTarget === undefined
    ? readBuildTarget()
    : options.buildTarget;

  if (configuredBaseUrl?.trim()) {
    const normalizedBase = normalizeConfiguredBaseUrl(configuredBaseUrl.trim());
    const requiresHttps = (
      buildTarget === 'mobile'
      || (runtimeProtocol !== null && runtimeProtocol !== 'http:' && runtimeProtocol !== 'https:')
    );
    if (requiresHttps && normalizedBase.protocol !== 'https:') {
      throw new AppApiUrlError(
        'api_base_url_insecure',
        `${APP_API_BASE_URL_ENV_NAME} must use HTTPS for a mobile or non-Web origin.`
      );
    }
    return `${normalizedBase.url}${normalizedPath}`;
  }

  if (buildTarget === 'mobile') {
    throw new AppApiUrlError(
      'api_base_url_required',
      `${APP_API_BASE_URL_ENV_NAME} is required for a mobile build.`
    );
  }

  if (runtimeProtocol === null || runtimeProtocol === 'http:' || runtimeProtocol === 'https:') {
    return normalizedPath;
  }

  throw new AppApiUrlError(
    'api_base_url_required',
    `${APP_API_BASE_URL_ENV_NAME} is required outside an HTTP(S) Web origin.`
  );
}

export function isAppApiUrlError(error: unknown): error is AppApiUrlError {
  return error instanceof AppApiUrlError;
}

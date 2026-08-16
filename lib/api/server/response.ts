import { normalizeAppApiErrorBody } from '@/lib/api/contract';

export const APP_API_NO_STORE_CACHE_CONTROL = 'no-store';

export function createAppApiJsonResponse(
  body: unknown,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', APP_API_NO_STORE_CACHE_CONTROL);
  headers.set('Content-Type', 'application/json; charset=utf-8');

  const responseBody = (
    body
    && typeof body === 'object'
    && !Array.isArray(body)
    && (body as Record<string, unknown>).ok === false
  )
    ? normalizeAppApiErrorBody(body as Record<string, unknown>, init.status ?? 500)
    : body;

  return new Response(JSON.stringify(responseBody), {
    ...init,
    headers,
  });
}

export function createAppApiNoContentResponse(headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', APP_API_NO_STORE_CACHE_CONTROL);

  return new Response(null, {
    status: 204,
    headers: responseHeaders,
  });
}

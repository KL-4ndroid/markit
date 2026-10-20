import assert from 'node:assert/strict';

import {
  normalizeAppApiErrorBody,
  parseAppApiErrorResponse,
} from '../lib/api/contract';

console.log('\n=== Application API error contract ===');

async function main(): Promise<void> {
  const normalized = normalizeAppApiErrorBody({
    ok: false,
    code: 'temporary_failure',
    message: 'Try again later.',
    shouldKeepLocalPayload: true,
    cleanupIncomplete: true,
    stack: 'sensitive stack',
    cause: { secret: 'must-not-leak' },
    env: { R2_SECRET_ACCESS_KEY: 'must-not-leak' },
    details: 'internal detail',
  }, 503);
  assert.deepEqual(normalized, {
    ok: false,
    code: 'temporary_failure',
    message: 'Try again later.',
    retryable: true,
    shouldKeepLocalPayload: true,
    cleanupIncomplete: true,
  });
  assert.equal('stack' in normalized, false);
  assert.equal('cause' in normalized, false);
  assert.equal('env' in normalized, false);
  assert.equal('details' in normalized, false);
  console.log('PASS normalizes server errors while preserving endpoint fields');

  const parsed = await parseAppApiErrorResponse(new Response(JSON.stringify({
    ok: false,
    code: 'permission_denied',
    message: 'Internal detail ignored by callers.',
    retryable: false,
    requestId: 'request-12345678',
  }), {
    status: 403,
    headers: { 'content-type': 'application/json' },
  }));
  assert.deepEqual(parsed, {
    code: 'permission_denied',
    status: 403,
    retryable: false,
    requestId: 'request-12345678',
  });
  console.log('PASS parses only stable routing fields from a JSON error');

  const malformed = await parseAppApiErrorResponse(new Response('<html>bad gateway</html>', {
    status: 502,
    headers: { 'x-request-id': 'bad id with spaces' },
  }));
  assert.deepEqual(malformed, {
    code: 'http_502',
    status: 502,
    retryable: true,
    requestId: null,
  });
  console.log('PASS maps malformed upstream errors without exposing their body');
}

void main();

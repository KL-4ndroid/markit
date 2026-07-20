import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  SALES_PHOTO_EVIDENCE_FAULT_HEADER,
  SALES_PHOTO_EVIDENCE_FAULT_TOKEN_HEADER,
  resolveSalesPhotoEvidenceFaultInjection,
} from '../lib/sales/photo-evidence-fault-injection.server';

const IDS = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  marketId: '22222222-2222-4222-8222-222222222222',
  saleId: '33333333-3333-4333-8333-333333333333',
  staffId: '44444444-4444-4444-8444-444444444444',
};
const TOKEN = 'fault_token_abcdefghijklmnopqrstuvwxyz_123456';

function env(overrides: Record<string, string | undefined> = {}) {
  return {
    VERCEL_ENV: 'production',
    SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ENABLED: '1',
    SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ALLOW_PRODUCTION: '1',
    SALES_PHOTO_EVIDENCE_FAULT_INJECTION_TOKEN: TOKEN,
    SALES_PHOTO_EVIDENCE_FAULT_INJECTION_OWNER_ID: IDS.ownerId,
    SALES_PHOTO_EVIDENCE_FAULT_INJECTION_MARKET_ID: IDS.marketId,
    SALES_PHOTO_EVIDENCE_FAULT_INJECTION_SALE_ID: IDS.saleId,
    ...overrides,
  };
}

function request(mode?: string, token?: string): Request {
  const headers = new Headers();
  if (mode !== undefined) headers.set(SALES_PHOTO_EVIDENCE_FAULT_HEADER, mode);
  if (token !== undefined) headers.set(SALES_PHOTO_EVIDENCE_FAULT_TOKEN_HEADER, token);
  return new Request('https://example.test/api/sales-photo-evidence/upload', { headers });
}

function resolve(input: {
  request?: Request;
  actorId?: string;
  ownerId?: string;
  marketId?: string;
  saleEventId?: string;
  env?: Record<string, string | undefined>;
} = {}) {
  return resolveSalesPhotoEvidenceFaultInjection({
    request: input.request ?? request(),
    actorId: input.actorId ?? IDS.ownerId,
    ownerId: input.ownerId ?? IDS.ownerId,
    marketId: input.marketId ?? IDS.marketId,
    saleEventId: input.saleEventId ?? IDS.saleId,
    env: input.env ?? env(),
  });
}

console.log('\n=== Sales photo evidence server-only fault injection gate ===');

assert.deepEqual(resolve(), { action: 'none' });
console.log('PASS ordinary requests remain unaffected without test headers');

for (const badRequest of [
  request('unknown_mode', TOKEN),
  request('thumbnail_upload_failed'),
  request(undefined, TOKEN),
  request('thumbnail_upload_failed', 'wrong_token_abcdefghijklmnopqrstuvwxyz_12'),
]) {
  assert.deepEqual(resolve({ request: badRequest }), { action: 'reject' });
}
console.log('PASS malformed partial and wrong-token fault requests fail closed');

for (const badEnv of [
  env({ SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ENABLED: '0' }),
  env({ SALES_PHOTO_EVIDENCE_FAULT_INJECTION_ALLOW_PRODUCTION: '0' }),
  env({ SALES_PHOTO_EVIDENCE_FAULT_INJECTION_TOKEN: '' }),
  env({ SALES_PHOTO_EVIDENCE_FAULT_INJECTION_OWNER_ID: IDS.staffId }),
  env({ SALES_PHOTO_EVIDENCE_FAULT_INJECTION_MARKET_ID: '' }),
  env({ SALES_PHOTO_EVIDENCE_FAULT_INJECTION_SALE_ID: 'not-a-uuid' }),
]) {
  assert.deepEqual(resolve({
    request: request('thumbnail_upload_failed', TOKEN),
    env: badEnv,
  }), { action: 'reject' });
}
console.log('PASS disabled incomplete and production-unapproved configurations fail closed');

for (const scopedInput of [
  { actorId: IDS.staffId },
  { ownerId: IDS.staffId },
  { marketId: IDS.staffId },
  { saleEventId: IDS.staffId },
]) {
  assert.deepEqual(resolve({
    request: request('thumbnail_upload_failed', TOKEN),
    ...scopedInput,
  }), { action: 'reject' });
}
console.log('PASS only the verified owner and exact owner market sale scope can inject');

assert.deepEqual(resolve({
  request: request('thumbnail_upload_failed', TOKEN),
}), { action: 'inject', mode: 'thumbnail_upload_failed' });
assert.deepEqual(resolve({
  request: request('metadata_finalize_failed', TOKEN),
}), { action: 'inject', mode: 'metadata_finalize_failed' });
console.log('PASS the two approved exact-scope modes can inject');

const projectRoot = join(__dirname, '..');
const source = readFileSync(
  join(projectRoot, 'lib/sales/photo-evidence-fault-injection.server.ts'),
  'utf8'
);
const routeSource = readFileSync(
  join(projectRoot, 'app/api/sales-photo-evidence/upload/route.ts'),
  'utf8'
);
const manifest = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');
assert.match(source, /timingSafeEqual/);
assert.doesNotMatch(source, /NEXT_PUBLIC_|localStorage|sessionStorage|console\.|process\.env/);
assert.doesNotMatch(source, /react|window|document|navigator/);
assert.match(routeSource, /photo-evidence-fault-injection\.server/);
assert.match(manifest, /tsx tests\/sales-photo-evidence-fault-injection-server\.test\.ts/);
console.log('PASS the gate stays server-only secret-safe and in the full manifest');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  validateSalesPhotoEvidenceR2ServerConfig,
  validateSalesPhotoEvidenceR2UploadObjectInput,
  type SalesPhotoEvidenceR2UploadAdapter,
} from '../lib/sales/photo-evidence-r2-upload-adapter';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

const VALID_KEY = [
  'sales-evidence',
  '7d',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444.webp',
].join('/');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const adapterSource = readProjectFile('lib/sales/photo-evidence-r2-upload-adapter.ts');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function validInput() {
  return {
    key: VALID_KEY,
    body: new Uint8Array([1, 2, 3]),
    contentType: 'image/webp' as const,
    contentLength: 3,
  };
}

console.log('\n=== Sales photo evidence R2 upload adapter interface ===');

runTest('validates upload object keys content type length and body', () => {
  assert.equal(validateSalesPhotoEvidenceR2UploadObjectInput(validInput()), null);
  assert.equal(validateSalesPhotoEvidenceR2UploadObjectInput({
    ...validInput(),
    key: VALID_KEY.replace('sales-evidence/', 'sales-evidence-thumbs/'),
    contentType: 'image/jpeg',
  }), null);
});

runTest('rejects unsafe or unrelated object keys before upload', () => {
  for (const key of [
    '',
    '/sales-evidence/7d/a.webp',
    'sales-evidence/7d/../a.webp',
    'sales-evidence/7d/a//b.webp',
    'other-prefix/7d/a.webp',
    'sales-evidence\\7d\\a.webp',
  ]) {
    const result = validateSalesPhotoEvidenceR2UploadObjectInput({ ...validInput(), key });
    assert.equal(result?.ok, false, key);
    assert.equal(result?.code, 'invalid_upload_object', key);
  }
});

runTest('rejects unsupported content metadata before upload', () => {
  assert.equal(validateSalesPhotoEvidenceR2UploadObjectInput({
    ...validInput(),
    contentType: 'image/png' as 'image/webp',
  })?.code, 'invalid_upload_object');
  assert.equal(validateSalesPhotoEvidenceR2UploadObjectInput({
    ...validInput(),
    contentLength: 0,
  })?.code, 'invalid_upload_object');
  assert.equal(validateSalesPhotoEvidenceR2UploadObjectInput({
    ...validInput(),
    contentLength: 1_000_001,
  })?.code, 'invalid_upload_object');
  assert.equal(validateSalesPhotoEvidenceR2UploadObjectInput({
    ...validInput(),
    body: null as unknown as Uint8Array,
  })?.code, 'invalid_upload_object');
});

runTest('R2 server config validation is explicit and does not read process env directly', () => {
  assert.deepEqual(validateSalesPhotoEvidenceR2ServerConfig({}), {
    ok: false,
    code: 'missing_r2_config',
    missing: ['accountId', 'accessKeyId', 'secretAccessKey', 'bucketName'],
  });
  assert.deepEqual(validateSalesPhotoEvidenceR2ServerConfig({
    accountId: 'account',
    accessKeyId: 'access',
    secretAccessKey: 'secret',
    bucketName: 'bucket',
    endpoint: '',
  }), {
    ok: true,
    config: {
      accountId: 'account',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      bucketName: 'bucket',
      endpoint: undefined,
    },
  });
});

runTest('adapter interface is dependency-injected and fakeable without SDK imports', async () => {
  const fakeAdapter: SalesPhotoEvidenceR2UploadAdapter = {
    async uploadObject(input) {
      return { ok: true, key: input.key, etag: 'fake-etag' };
    },
  };

  assert.deepEqual(await fakeAdapter.uploadObject(validInput()), {
    ok: true,
    key: VALID_KEY,
    etag: 'fake-etag',
  });
});

runTest('adapter source stays interface-only without runtime R2 or route wiring', () => {
  assert.doesNotMatch(adapterSource, /@aws-sdk|aws-sdk|S3Client|PutObjectCommand|createPresignedPost|getSignedUrl/);
  assert.doesNotMatch(adapterSource, /process\.env|NEXT_PUBLIC_R2|SERVICE_ROLE|service_role/);
  assert.doesNotMatch(adapterSource, /fetch\s*\(|formData\s*\(|NextResponse|supabase|createClient/i);
});

runTest('execution plan and manifest record Slice 7B-4B', () => {
  assert.match(executionPlanSource, /Slice 7B-4B Status/);
  assert.match(executionPlanSource, /R2 adapter interface only/);
  assert.match(executionPlanSource, /does not install an SDK, read env, call R2, parse `FormData`, wire the route, or upload/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-r2-upload-adapter\.test\.ts/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence R2 upload adapter interface tests failed`);
  }
}

main();

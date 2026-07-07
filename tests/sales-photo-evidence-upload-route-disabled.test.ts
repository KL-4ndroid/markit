import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
} from '../app/api/sales-photo-evidence/upload/route';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const routeSource = readProjectFile('app/api/sales-photo-evidence/upload/route.ts');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

async function assertDisabledResponse(methodName: string, handler: () => Promise<Response>): Promise<void> {
  const response = await handler();
  const body = await response.json() as {
    ok: boolean;
    code: string;
    message: string;
  };

  assert.equal(response.status, 501, methodName);
  assert.equal(response.headers.get('cache-control'), 'no-store', methodName);
  assert.deepEqual(body, {
    ok: false,
    code: 'sales_photo_evidence_upload_disabled',
    message: 'Sales photo evidence upload is not enabled yet.',
  });
}

console.log('\n=== Sales photo evidence upload route disabled shell ===');

runTest('all upload route methods return the same disabled response', async () => {
  await assertDisabledResponse('GET', GET);
  await assertDisabledResponse('POST', POST);
  await assertDisabledResponse('PUT', PUT);
  await assertDisabledResponse('PATCH', PATCH);
  await assertDisabledResponse('DELETE', DELETE);
});

runTest('disabled route shell does not parse requests or write cloud data', () => {
  const forbiddenPatterns = [
    /\bformData\s*\(/,
    /\brequest\.json\s*\(/,
    /\barrayBuffer\s*\(/,
    /\bblob\s*\(/,
    /createClient/,
    /supabase/i,
    /sale_photo_evidence/,
    /from ['"].*@aws-sdk/,
    /S3Client/,
    /PutObjectCommand/,
    /GetObjectCommand/,
    /R2_/,
    /process\.env/,
    /NEXT_PUBLIC/,
    /pendingSalesPhotoEvidence/i,
    /deletePendingSalesPhotoEvidencePayload/,
    /drain/i,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(routeSource, pattern);
  }
});

runTest('disabled route shell imports only NextResponse', () => {
  const imports = routeSource
    .split('\n')
    .filter(line => line.startsWith('import '));

  assert.deepEqual(imports, ["import { NextResponse } from 'next/server';"]);
});

runTest('execution plan and package test script record 7B-2 disabled route scope', () => {
  assert.match(executionPlanSource, /Slice 7B-2 Status/);
  assert.match(executionPlanSource, /app\/api\/sales-photo-evidence\/upload\/route\.ts/);
  assert.match(executionPlanSource, /rejects every request with a 501 disabled response/);
  assert.match(executionPlanSource, /does not parse requests, read files, call Supabase, call R2, write metadata, delete local payloads, drain queues, issue signed URLs, or enable runtime upload/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-upload-route-disabled\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence upload route disabled tests failed`);
  }
}

main();

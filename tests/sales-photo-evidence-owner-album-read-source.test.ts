import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SALES_PHOTO_EVIDENCE_OWNER_ALBUM_READ_COLUMNS,
  buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan,
} from '../lib/sales/photo-evidence-owner-album-read-source';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const readSourceSource = readProjectFile('lib/sales/photo-evidence-owner-album-read-source.ts');
const readModelSource = readProjectFile('lib/sales/photo-evidence-owner-album-read-model.ts');
const migrationSource = readProjectFile('supabase/migrations/055_add_sales_photo_evidence_schema.sql');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence owner album read source ===');

runTest('read source rejects non-owner and missing scope before any read plan', () => {
  assert.deepEqual(
    buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan({
      actorRole: 'staff',
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
    }),
    {
      action: 'reject_owner_album_read_source',
      reason: 'owner_only',
      message: 'Sales photo evidence owner album read source is owner-only.',
    }
  );

  assert.equal(
    buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan({
      actorRole: 'owner',
      ownerId: null,
      marketId: MARKET_ID,
    }).reason,
    'invalid_scope'
  );
});

runTest('read source creates a narrow owner market table plan', () => {
  const decision = buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan({
    actorRole: 'owner',
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
  });

  assert.equal(decision.action, 'allow_owner_album_read_source');
  if (decision.action !== 'allow_owner_album_read_source') throw new Error('expected allowed plan');

  assert.equal(decision.plan.table, 'sale_photo_evidence');
  assert.deepEqual(decision.plan.selectColumns, SALES_PHOTO_EVIDENCE_OWNER_ALBUM_READ_COLUMNS);
  assert.deepEqual(decision.plan.filters, [
    { column: 'owner_id', operator: 'eq', value: OWNER_ID },
    { column: 'market_id', operator: 'eq', value: MARKET_ID },
    { column: 'deleted_at', operator: 'is', value: null },
  ]);
  assert.deepEqual(decision.plan.orderBy, { column: 'sale_completed_at', direction: 'desc' });
  assert.equal(decision.plan.limit, 100);
  assert.equal(decision.plan.requiresAuthenticatedOwner, true);
  assert.equal(decision.plan.allowsSignedReadUrl, false);
  assert.equal(decision.plan.allowsStorageAccess, false);
  assert.equal(decision.plan.allowsMutation, false);
});

runTest('read source caps and normalizes limit without widening scope', () => {
  assert.equal(
    buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan({
      actorRole: 'owner',
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      limit: 999,
    }).action,
    'allow_owner_album_read_source'
  );

  const capped = buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan({
    actorRole: 'owner',
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    limit: 999,
  });
  const zero = buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan({
    actorRole: 'owner',
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    limit: Number.NaN,
  });

  if (capped.action !== 'allow_owner_album_read_source') throw new Error('expected capped plan');
  if (zero.action !== 'allow_owner_album_read_source') throw new Error('expected zero plan');

  assert.equal(capped.plan.limit, 250);
  assert.equal(zero.plan.limit, 0);
});

runTest('read columns exist in migration and map to the owner album read model', () => {
  for (const column of SALES_PHOTO_EVIDENCE_OWNER_ALBUM_READ_COLUMNS) {
    assert.match(migrationSource, new RegExp(`\\b${column}\\b`), column);
  }

  for (const field of [
    'owner_id',
    'market_id',
    'sale_id',
    'captured_by_staff_id',
    'sale_completed_at',
    'uploaded_at',
    'expires_at',
    'r2_object_key',
    'r2_thumbnail_key',
    'deleted_at',
  ]) {
    assert.match(readModelSource, new RegExp(field), field);
  }
});

runTest('read source contract stays free of runtime IO and sensitive image access', () => {
  assert.doesNotMatch(readSourceSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(readSourceSource, /@\/lib\/supabase|supabase|from\(/i);
  assert.doesNotMatch(readSourceSource, /fetch\(|XMLHttpRequest|navigator\.|window\.|document\.|canvas|getUserMedia/i);
  assert.doesNotMatch(readSourceSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/i);
  assert.doesNotMatch(readSourceSource, /\.(insert|update|delete|put|bulkPut|clear)\s*\(/);
  assert.doesNotMatch(
    readSourceSource,
    /getSignedUrl|signedUrl\s*\(|signed_url\s*\(|createPresignedPost|S3Client|PutObjectCommand|GetObjectCommand/i
  );
});

runTest('plan records Slice 9D as read-source contract only', () => {
  assert.match(planSource, /Slice 9D Status/);
  assert.match(planSource, /read-source contract/);
  assert.match(planSource, /does not execute Supabase queries/);
  assert.match(planSource, /does not request signed read URLs/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-owner-album-read-source\.test\.ts/);
});

function main(): void {
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence owner album read source tests failed`);
  }
}

main();

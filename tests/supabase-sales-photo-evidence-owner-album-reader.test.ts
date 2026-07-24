import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  listOwnerSalesPhotoEvidenceAlbumMetadataRows,
  type SalesPhotoEvidenceOwnerAlbumSupabaseClient,
} from '../lib/supabase/sales-photo-evidence';
import type { SalesPhotoEvidenceAlbumSourceRow } from '../lib/sales/photo-evidence-owner-album-read-model';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const readerSource = readProjectFile('lib/supabase/sales-photo-evidence.ts');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';

type RecordedCall =
  | { method: 'from'; table: string }
  | { method: 'select'; columns: string }
  | { method: 'eq'; column: string; value: string }
  | { method: 'is'; column: string; value: null }
  | { method: 'order'; column: string; ascending: boolean }
  | { method: 'limit'; limit: number };

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function createClientFixture(options: {
  rows?: SalesPhotoEvidenceAlbumSourceRow[] | null;
  error?: unknown | null;
}) {
  const calls: RecordedCall[] = [];

  const query = {
    eq(column: string, value: string) {
      calls.push({ method: 'eq', column, value });
      return query;
    },
    is(column: string, value: null) {
      calls.push({ method: 'is', column, value });
      return query;
    },
    order(column: string, { ascending }: { ascending: boolean }) {
      calls.push({ method: 'order', column, ascending });
      return query;
    },
    async limit(limit: number) {
      calls.push({ method: 'limit', limit });
      return {
        data: options.rows ?? [],
        error: options.error ?? null,
      };
    },
  };

  const client: SalesPhotoEvidenceOwnerAlbumSupabaseClient = {
    from(table) {
      calls.push({ method: 'from', table });
      return {
        select(columns: string) {
          calls.push({ method: 'select', columns });
          return query;
        },
      };
    },
  };

  return { client, calls };
}

console.log('\n=== Supabase sales photo evidence owner album reader ===');

runTest('reader rejects non-owner before touching Supabase', async () => {
  const { client, calls } = createClientFixture({});

  const result = await listOwnerSalesPhotoEvidenceAlbumMetadataRows(
    {
      actorRole: 'staff',
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
    },
    { client }
  );

  assert.equal(result.action, 'read_rejected');
  assert.equal(result.reason, 'owner_only');
  assert.deepEqual(calls, []);
});

runTest('reader issues the approved metadata-only owner market query', async () => {
  const rows: SalesPhotoEvidenceAlbumSourceRow[] = [
    {
      id: 'evidence-1',
      owner_id: OWNER_ID,
      market_id: MARKET_ID,
      sale_id: 'sale-1',
      status: 'uploaded',
      sale_completed_at: '2026-07-05T10:00:00.000Z',
      uploaded_at: '2026-07-05T10:02:00.000Z',
      expires_at: '2026-07-12T10:02:00.000Z',
      r2_object_key: 'sales-evidence/7d/owner/market/sale/evidence.webp',
      r2_thumbnail_key: 'sales-evidence-thumbs/7d/owner/market/sale/evidence.webp',
      deleted_at: null,
    },
  ];
  const { client, calls } = createClientFixture({ rows });

  const result = await listOwnerSalesPhotoEvidenceAlbumMetadataRows(
    {
      actorRole: 'owner',
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
    },
    { client }
  );

  assert.equal(result.action, 'rows_loaded');
  if (result.action !== 'rows_loaded') throw new Error('expected rows_loaded');

  assert.deepEqual(result.rows, rows);
  assert.deepEqual(calls, [
    { method: 'from', table: 'sale_photo_evidence' },
    {
      method: 'select',
      columns:
        'id,owner_id,market_id,sale_id,captured_by_staff_id,status,sale_completed_at,uploaded_at,expires_at,r2_object_key,r2_thumbnail_key,deleted_at',
    },
    { method: 'eq', column: 'owner_id', value: OWNER_ID },
    { method: 'eq', column: 'market_id', value: MARKET_ID },
    { method: 'is', column: 'deleted_at', value: null },
    { method: 'order', column: 'sale_completed_at', ascending: false },
    { method: 'limit', limit: 100 },
  ]);
});

runTest('reader returns read_failed instead of throwing on Supabase error', async () => {
  const error = { code: 'PGRST000', message: 'test failure' };
  const { client } = createClientFixture({ error });

  const result = await listOwnerSalesPhotoEvidenceAlbumMetadataRows(
    {
      actorRole: 'owner',
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
    },
    { client }
  );

  assert.deepEqual(result, {
    action: 'read_failed',
    reason: 'supabase_error',
    message: 'Sales photo evidence owner album metadata read failed.',
    error,
  });
});

runTest('reader source stays read-only and avoids signed image access', () => {
  assert.match(readerSource, /from\(plan\.table\)/);
  assert.match(readerSource, /select\(plan\.selectColumns\.join\(','\)\)/);
  assert.match(readerSource, /query\.eq\(filter\.column, filter\.value\)/);
  assert.match(readerSource, /query\.is\(filter\.column, filter\.value\)/);
  assert.match(readerSource, /order\(plan\.orderBy\.column/);
  assert.match(readerSource, /limit\(plan\.limit\)/);

  assert.doesNotMatch(readerSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(readerSource, /fetch\(|XMLHttpRequest|navigator\.|window\.|document\.|canvas|getUserMedia/i);
  assert.doesNotMatch(readerSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/i);
  assert.doesNotMatch(readerSource, /\.(insert|update|delete|put|bulkPut|clear|upsert|rpc)\s*\(/);
  assert.doesNotMatch(
    readerSource,
    /getSignedUrl|signedUrl\s*\(|signed_url\s*\(|createPresignedPost|S3Client|PutObjectCommand|GetObjectCommand/i
  );
});

runTest('plan records Slice 9E as read-only metadata reader only', () => {
  assert.match(planSource, /Slice 9E Status/);
  assert.match(planSource, /read-only Supabase metadata reader/);
  assert.match(planSource, /does not mount UI/);
  assert.match(planSource, /does not request signed read URLs/);
  assert.match(testManifestSource, /tsx tests\/supabase-sales-photo-evidence-owner-album-reader\.test\.ts/);
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
    throw new Error(`${failed} Supabase sales photo evidence owner album reader tests failed`);
  }
}

void main();

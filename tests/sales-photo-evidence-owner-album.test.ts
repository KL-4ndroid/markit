import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSalesPhotoEvidenceOwnerAlbumViewModel,
  type SalesPhotoEvidenceAlbumSourceRow,
} from '../lib/sales/photo-evidence-owner-album-read-model';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const readModelSource = readProjectFile('lib/sales/photo-evidence-owner-album-read-model.ts');
const shellSource = readProjectFile('components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_OWNER_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_MARKET_ID = '44444444-4444-4444-8444-444444444444';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function row(overrides: Partial<SalesPhotoEvidenceAlbumSourceRow>): SalesPhotoEvidenceAlbumSourceRow {
  return {
    id: 'evidence-base',
    owner_id: OWNER_ID,
    market_id: MARKET_ID,
    sale_id: 'sale-base',
    captured_by_staff_id: 'staff-base',
    status: 'pending_capture',
    sale_completed_at: '2026-07-05T10:00:00.000Z',
    uploaded_at: null,
    expires_at: null,
    r2_object_key: null,
    r2_thumbnail_key: null,
    deleted_at: null,
    ...overrides,
  };
}

console.log('\n=== Sales photo evidence owner album ===');

runTest('owner album is owner-only and requires owner market scope', () => {
  assert.deepEqual(
    buildSalesPhotoEvidenceOwnerAlbumViewModel({
      actorRole: 'staff',
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      rows: [],
    }),
    {
      action: 'reject_owner_album',
      reason: 'owner_only',
      message: 'Sales photo evidence album is owner-only.',
    }
  );

  assert.equal(
    buildSalesPhotoEvidenceOwnerAlbumViewModel({
      actorRole: 'owner',
      ownerId: '',
      marketId: MARKET_ID,
      rows: [],
    }).reason,
    'invalid_scope'
  );
});

runTest('owner album filters deleted rows and rows outside owner market scope', () => {
  const decision = buildSalesPhotoEvidenceOwnerAlbumViewModel({
    actorRole: 'owner',
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    rows: [
      row({ id: 'visible-1', sale_id: 'sale-1' }),
      row({ id: 'deleted', deleted_at: '2026-07-05T11:00:00.000Z' }),
      row({ id: 'other-owner', owner_id: OTHER_OWNER_ID }),
      row({ id: 'other-market', market_id: OTHER_MARKET_ID }),
    ],
  });

  assert.equal(decision.action, 'show_owner_album');
  if (decision.action !== 'show_owner_album') throw new Error('expected owner album');

  assert.deepEqual(decision.viewModel.items.map(item => item.id), ['visible-1']);
  assert.equal(decision.viewModel.summary.totalCount, 1);
});

runTest('owner album sorts newest first and summarizes display statuses', () => {
  const decision = buildSalesPhotoEvidenceOwnerAlbumViewModel({
    actorRole: 'owner',
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    now: '2026-07-06T10:00:00.000Z',
    rows: [
      row({
        id: 'old-uploaded',
        sale_id: 'sale-old',
        status: 'uploaded',
        sale_completed_at: '2026-07-04T10:00:00.000Z',
        uploaded_at: '2026-07-04T10:05:00.000Z',
        expires_at: '2026-07-11T10:05:00.000Z',
        r2_object_key: 'sales-evidence/7d/owner/market/sale/evidence.webp',
        r2_thumbnail_key: 'sales-evidence-thumbs/7d/owner/market/sale/evidence.webp',
      }),
      row({
        id: 'new-pending',
        sale_id: 'sale-new',
        status: 'pending_capture',
        sale_completed_at: '2026-07-05T10:00:00.000Z',
      }),
      row({
        id: 'failed',
        sale_id: 'sale-failed',
        status: 'upload_failed',
        sale_completed_at: '2026-07-05T09:00:00.000Z',
      }),
    ],
  });

  assert.equal(decision.action, 'show_owner_album');
  if (decision.action !== 'show_owner_album') throw new Error('expected owner album');

  assert.deepEqual(decision.viewModel.items.map(item => item.id), [
    'new-pending',
    'failed',
    'old-uploaded',
  ]);
  assert.equal(decision.viewModel.summary.countByDisplayStatus.pending, 1);
  assert.equal(decision.viewModel.summary.countByDisplayStatus.upload_failed, 1);
  assert.equal(decision.viewModel.summary.countByDisplayStatus.uploaded_private, 1);
  assert.equal(decision.viewModel.summary.hasUploadedPrivateObjects, true);
  assert.equal(decision.viewModel.summary.signedReadAvailable, false);
});

runTest('uploaded private objects do not expose signed read URLs', () => {
  const decision = buildSalesPhotoEvidenceOwnerAlbumViewModel({
    actorRole: 'owner',
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    rows: [
      row({
        id: 'uploaded',
        status: 'uploaded',
        r2_object_key: 'sales-evidence/7d/owner/market/sale/evidence.webp',
        r2_thumbnail_key: 'sales-evidence-thumbs/7d/owner/market/sale/evidence.webp',
      }),
    ],
  });

  assert.equal(decision.action, 'show_owner_album');
  if (decision.action !== 'show_owner_album') throw new Error('expected owner album');

  assert.equal(decision.viewModel.items[0].displayStatus, 'uploaded_private');
  assert.equal(decision.viewModel.items[0].thumbnailState, 'private_object_available_without_signed_url');
  assert.equal(decision.viewModel.items[0].hasPrivateImageObject, true);
  assert.equal(decision.viewModel.items[0].hasPrivateThumbnailObject, true);
  assert.equal(decision.viewModel.items[0].signedReadUrl, null);
});

runTest('owner album treats expired uploaded rows as expired without metadata mutation', () => {
  const decision = buildSalesPhotoEvidenceOwnerAlbumViewModel({
    actorRole: 'owner',
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    now: '2026-07-12T00:00:00.000Z',
    rows: [
      row({
        id: 'expired-by-time',
        status: 'uploaded',
        expires_at: '2026-07-11T10:00:00.000Z',
      }),
    ],
  });

  assert.equal(decision.action, 'show_owner_album');
  if (decision.action !== 'show_owner_album') throw new Error('expected owner album');

  assert.equal(decision.viewModel.items[0].displayStatus, 'expired');
  assert.equal(decision.viewModel.summary.countByDisplayStatus.expired, 1);
});

runTest('owner album read model and shell stay read-only and avoid cloud image access', () => {
  for (const [label, source] of [
    ['read model', readModelSource],
    ['shell', shellSource],
  ] as const) {
    assert.doesNotMatch(source, /@\/lib\/db|db\.|Dexie|indexedDB/i, label);
    assert.doesNotMatch(source, /@\/lib\/supabase|supabase|from\(/i, label);
    assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|navigator\.|window\.|document\.|canvas|getUserMedia/i, label);
    assert.doesNotMatch(source, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/i, label);
    assert.doesNotMatch(source, /\.(insert|update|delete|put|bulkPut|clear)\s*\(/, label);
    assert.doesNotMatch(source, /getSignedUrl|signedUrl\s*\(|signed_url\s*\(|createPresignedPost|S3Client|PutObjectCommand|GetObjectCommand/i, label);
  }
});

runTest('execution plan records Slice 9A as read-only owner album shell', () => {
  assert.match(planSource, /Slice 9A Status/);
  assert.match(planSource, /read-only owner album model and UI shell/);
  assert.match(planSource, /does not request signed read URLs, render private images, call R2, write Supabase, mutate expiration, upload, or enable runtime enqueue/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-owner-album\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence owner album tests failed`);
  }
}

main();

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildSalesPhotoEvidenceTransactionIndex,
  findSalesPhotoEvidenceOwnerImageForSale,
} from '../lib/sales/photo-evidence-owner-view';
import type { SalesPhotoEvidenceAlbumSourceRow } from '../lib/sales/photo-evidence-owner-album-read-model';
import type { DealClosedPayload, Event } from '../types/db';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function deal(overrides: Partial<Event<DealClosedPayload>> = {}): Event<DealClosedPayload> {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    type: 'deal_closed',
    timestamp: Date.parse('2026-07-15T10:00:00.000Z'),
    payload: {
      market_id: '22222222-2222-4222-8222-222222222222',
      items: [],
      totalAmount: 1280,
      paymentMethod: 'mobile',
    },
    ...overrides,
  };
}

function row(overrides: Partial<SalesPhotoEvidenceAlbumSourceRow> = {}): SalesPhotoEvidenceAlbumSourceRow {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    sale_id: '11111111-1111-4111-8111-111111111111',
    status: 'uploaded',
    expires_at: '2026-07-22T10:00:00.000Z',
    r2_object_key: 'sales-evidence/7d/owner/market/sale/evidence.webp',
    r2_thumbnail_key: 'sales-evidence-thumbs/7d/owner/market/sale/evidence.webp',
    deleted_at: null,
    ...overrides,
  };
}

console.log('\n=== Sales photo evidence owner transaction view ===');

runTest('transaction index exposes amount and payment method by sale event id', () => {
  const index = buildSalesPhotoEvidenceTransactionIndex([
    deal(),
    deal({ id: undefined }),
  ]);

  assert.deepEqual(index.get('11111111-1111-4111-8111-111111111111'), {
    amount: 1280,
    paymentMethod: 'mobile',
  });
  assert.equal(index.size, 1);
});

runTest('detail image descriptor resolves private thumbnail and original variants', () => {
  assert.deepEqual(
    findSalesPhotoEvidenceOwnerImageForSale(
      [row()],
      '11111111-1111-4111-8111-111111111111',
      '2026-07-16T00:00:00.000Z'
    ),
    {
      evidenceId: '33333333-3333-4333-8333-333333333333',
      previewVariant: 'thumbnail',
      fullVariant: 'image',
    }
  );
});

runTest('detail image descriptor hides missing pending deleted and expired photos', () => {
  const saleId = '11111111-1111-4111-8111-111111111111';
  const now = '2026-07-16T00:00:00.000Z';

  assert.equal(findSalesPhotoEvidenceOwnerImageForSale([], saleId, now), null);
  assert.equal(findSalesPhotoEvidenceOwnerImageForSale([row({ status: 'pending_capture' })], saleId, now), null);
  assert.equal(findSalesPhotoEvidenceOwnerImageForSale([row({ deleted_at: '2026-07-15T12:00:00.000Z' })], saleId, now), null);
  assert.equal(findSalesPhotoEvidenceOwnerImageForSale([row({ expires_at: '2026-07-15T12:00:00.000Z' })], saleId, now), null);
  assert.equal(findSalesPhotoEvidenceOwnerImageForSale([row({ sale_id: 'another-sale' })], saleId, now), null);
});

runTest('owner UI renders transaction metadata and on-demand full image entry points', () => {
  const shellSource = readProjectFile('components/markets/SalesPhotoEvidenceOwnerAlbumShell.tsx');
  const imageSource = readProjectFile('components/markets/SalesPhotoEvidenceOwnerAlbumImage.tsx');
  const dealDetailSource = readProjectFile('components/markets/DealDetailModal.tsx');
  const marketDetailSource = readProjectFile('components/markets/MarketDetailScreen.tsx');

  assert.match(shellSource, /transactionBySaleId\.get\(item\.saleId\)/);
  assert.match(shellSource, /NT\$ \{transaction\.amount\.toLocaleString\(\)\}/);
  assert.match(shellSource, /SALES_PAYMENT_METHOD_LABELS\[transaction\.paymentMethod\]/);
  assert.match(imageSource, /aria-label="放大查看成交照片"/);
  assert.match(imageSource, /canLoad && allowFullscreen && isViewerOpen/);
  assert.match(imageSource, /fullImage\.objectUrl \?\? preview\.objectUrl/);
  assert.match(dealDetailSource, /\{photoEvidence && \(/);
  assert.match(dealDetailSource, /fullVariant=\{photoEvidence\.fullVariant\}/);
  assert.match(marketDetailSource, /photoEvidence=\{selectedDealPhotoEvidence\}/);
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
    throw new Error(`${failed} sales photo evidence owner transaction view tests failed`);
  }
}

main();

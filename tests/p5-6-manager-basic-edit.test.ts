/**
 * P5-6 Manager Basic Edit boundary tests.
 *
 * Confirmed scope:
 * - Manager may edit existing market schedule/time/notes only.
 * - Manager may edit existing product price/stock/description/isActive only.
 * - Manager may not edit market name/location, product name/category/cost.
 * - Manager may not create market/product or delete owner records.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertFreshStaffCapability,
  MANAGER_MARKET_UPDATE_FIELDS,
  MANAGER_PRODUCT_UPDATE_FIELDS,
  RoleFreshnessError,
} from '../lib/permissions/role-freshness';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const staffMarketViewSource = readFileSync(
  join(projectRoot, 'components/markets/StaffMarketDetailView.tsx'),
  'utf-8'
);
const editMarketFormSource = readFileSync(
  join(projectRoot, 'components/markets/EditMarketForm.tsx'),
  'utf-8'
);
const productsPageSource = readFileSync(
  join(projectRoot, 'app/products/page.tsx'),
  'utf-8'
);
const editProductFormSource = readFileSync(
  join(projectRoot, 'components/products/EditProductForm.tsx'),
  'utf-8'
);
const productFormFieldsSource = readFileSync(
  join(projectRoot, 'components/products/ProductFormFields.tsx'),
  'utf-8'
);
const productCardSource = readFileSync(
  join(projectRoot, 'components/products/ProductCard.tsx'),
  'utf-8'
);

function extractConstObject(source: string, constName: string): string {
  const match = source.match(new RegExp(`const\\s+${constName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\s*\\};`));
  assert.ok(match, `Expected ${constName} object in source`);
  return match[1];
}

function roleCache(staffRole: 'viewer' | 'operator' | 'manager', timestamp = Date.now()): string {
  return JSON.stringify({
    userId: 'staff-1',
    role: {
      isStaff: true,
      staffRole,
    },
    timestamp,
  });
}

function assertBlocked(fn: () => void, code: string): void {
  assert.throws(
    fn,
    (error: unknown) => error instanceof RoleFreshnessError && error.code === code
  );
}

runTest('manager market whitelist matches confirmed P5-6 scope', () => {
  assert.deepEqual(MANAGER_MARKET_UPDATE_FIELDS, [
    'dates',
    'startDate',
    'endDate',
    'earlyEntryEnabled',
    'earlyEntryTime',
    'checkInTime',
    'operatingStartTime',
    'operatingEndTime',
    'notes',
  ]);
});

runTest('manager product whitelist matches confirmed P5-6 scope', () => {
  assert.deepEqual(MANAGER_PRODUCT_UPDATE_FIELDS, [
    'price',
    'stock',
    'unlimitedStock',
    'description',
    'isActive',
  ]);
});

runTest('manager can update allowed market fields', () => {
  assert.doesNotThrow(() => {
    assertFreshStaffCapability({
      userId: 'staff-1',
      eventType: 'market_updated',
      rawCache: roleCache('manager'),
      payload: {
        market_id: 'market-1',
        updates: {
          dates: ['2026-07-01'],
          startDate: '2026-07-01',
          endDate: '2026-07-01',
          earlyEntryEnabled: true,
          earlyEntryTime: '09:00',
          checkInTime: '09:30',
          operatingStartTime: '10:00',
          operatingEndTime: '18:00',
          notes: 'ok',
        },
      },
    });
  });
});

runTest('manager cannot update market name/location or finance fields', () => {
  for (const field of ['name', 'location', 'boothCost', 'deposit', 'commissionRate']) {
    assertBlocked(() => {
      assertFreshStaffCapability({
        userId: 'staff-1',
        eventType: 'market_updated',
        rawCache: roleCache('manager'),
        payload: {
          market_id: 'market-1',
          updates: { [field]: 'blocked' },
        },
      });
    }, 'staff_write_field_denied');
  }
});

runTest('manager can update allowed product fields', () => {
  assert.doesNotThrow(() => {
    assertFreshStaffCapability({
      userId: 'staff-1',
      eventType: 'product_updated',
      rawCache: roleCache('manager'),
      payload: {
        productId: 'product-1',
        updates: {
          price: 100,
          stock: 3,
          unlimitedStock: false,
          description: 'ok',
          isActive: true,
        },
      },
    });
  });
});

runTest('manager cannot update product name/category/cost', () => {
  for (const field of ['name', 'category', 'cost']) {
    assertBlocked(() => {
      assertFreshStaffCapability({
        userId: 'staff-1',
        eventType: 'product_updated',
        rawCache: roleCache('manager'),
        payload: {
          productId: 'product-1',
          updates: { [field]: 'blocked' },
        },
      });
    }, 'staff_write_field_denied');
  }
});

runTest('staff owner-only events are blocked', () => {
  for (const eventType of [
    'market_created',
    'product_created',
    'market_deleted',
    'product_deleted',
    'market_status_changed',
    'settings_updated',
  ] as const) {
    assertBlocked(() => {
      assertFreshStaffCapability({
        userId: 'staff-1',
        eventType,
        rawCache: roleCache('manager'),
        payload: {},
      });
    }, 'staff_role_capability_denied');
  }
});

runTest('operator still cannot update market/product', () => {
  for (const eventType of ['market_updated', 'product_updated'] as const) {
    assertBlocked(() => {
      assertFreshStaffCapability({
        userId: 'staff-1',
        eventType,
        rawCache: roleCache('operator'),
        payload: { updates: {} },
      });
    }, 'staff_role_capability_denied');
  }
});

runTest('StaffMarketDetailView exposes manager market edit only through canEditMarketBasic', () => {
  assert.match(staffMarketViewSource, /hasCapability\(roleCapabilities,\s*['"]canEditMarketBasic['"]\)/);
  assert.match(staffMarketViewSource, /\{canEditMarketBasic\s*&&\s*\(/);
  assert.match(staffMarketViewSource, /<EditMarketForm[\s\S]*mode=["']manager["']/);
});

runTest('EditMarketForm manager mode strips owner-only market fields from submit payload', () => {
  const managerUpdatesBlock = extractConstObject(editMarketFormSource, 'managerUpdates');
  assert.match(editMarketFormSource, /mode\?:\s*['"]owner['"]\s*\|\s*['"]manager['"]/);
  assert.match(editMarketFormSource, /const\s+isManagerMode\s*=\s*mode\s*===\s*['"]manager['"]/);
  assert.match(managerUpdatesBlock, /dates:/);
  assert.match(managerUpdatesBlock, /notes:/);
  assert.doesNotMatch(managerUpdatesBlock, /name:/);
  assert.doesNotMatch(managerUpdatesBlock, /location:/);
  assert.doesNotMatch(managerUpdatesBlock, /boothCost:/);
});

runTest('ProductsPage routes manager edits through detail while keeping add owner-only', () => {
  assert.match(productsPageSource, /hasCapability\(roleCapabilities,\s*['"]canEditProductBasic['"]\)/);
  assert.match(productsPageSource, /canEdit=\{canEditProductBasic\}/);
  assert.match(productsPageSource, /router\.push\(buildProductDetailHref\(product\.id\)\)/);
  assert.match(productsPageSource, /!\s*isStaffMode\s*&&\s*\(/, 'AddProductForm trigger remains owner-only');
});

runTest('ProductCard labels edit intent only when its capability prop is enabled', () => {
  assert.match(productCardSource, /canEdit\?:\s*boolean/);
  assert.match(productCardSource, /canEdit\s*=\s*false/);
  assert.match(productCardSource, /canEdit\s*\?\s*['"]查看與編輯['"]\s*:\s*['"]查看商品['"]/);
});

runTest('EditProductForm manager mode strips product name/category/cost/delete', () => {
  const managerUpdatesBlock = extractConstObject(editProductFormSource, 'managerUpdates');
  assert.match(editProductFormSource, /mode\?:\s*['"]owner['"]\s*\|\s*['"]manager['"]/);
  assert.match(editProductFormSource, /const\s+isManagerMode\s*=\s*mode\s*===\s*['"]manager['"]/);
  assert.match(managerUpdatesBlock, /price:/);
  assert.match(managerUpdatesBlock, /isActive:/);
  assert.doesNotMatch(managerUpdatesBlock, /name:/);
  assert.doesNotMatch(managerUpdatesBlock, /category:/);
  assert.doesNotMatch(managerUpdatesBlock, /cost:/);
  assert.match(productFormFieldsSource, /label="售價"/);
  assert.match(productFormFieldsSource, /!isManagerMode\s*&&\s*\([\s\S]*?label="商品名稱"/);
  assert.match(productFormFieldsSource, /!isManagerMode\s*&&\s*\([\s\S]*?label="成本"/);
  assert.match(editProductFormSource, /\{!isManagerMode\s*&&\s*\([\s\S]*?setShowDeleteConfirm/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`ok - ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

void main();

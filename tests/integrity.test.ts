import assert from 'node:assert/strict';
import { checkBackupIntegrity, type BackupData } from '../lib/db/integrity';
import type { Event, Market, Product, Settings } from '../types/db';

const now = 1_700_000_000_000;

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: 'market-1',
    name: 'Test Market',
    location: 'Taipei',
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    status: 'registered',
    registrationFee: 100,
    boothCost: 200,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Test Product',
    category: 'other',
    price: 100,
    stock: 10,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 1,
    theme: 'auto',
    language: 'zh-TW',
    defaultCurrency: 'TWD',
    enableNotifications: true,
    autoBackup: false,
    updatedAt: now,
    ...overrides,
  };
}

function event<T>(overrides: Partial<Event<T>> & Pick<Event<T>, 'type' | 'payload'>): Event<T> {
  return {
    id: `${overrides.type}-1`,
    timestamp: now,
    actor_id: 'local',
    sync_status: 'local_only',
    ...overrides,
  };
}

function backup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    version: 1,
    exportedAt: now,
    events: [],
    markets: [market()],
    products: [product()],
    dailyStats: [],
    settings: [settings()],
    ...overrides,
  };
}

function runTest(name: string, test: () => void): void {
  try {
    test();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('accepts a valid minimal backup', () => {
  const result = checkBackupIntegrity(backup());

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

runTest('rejects invalid daily stat numeric cache values', () => {
  const result = checkBackupIntegrity(backup({
    dailyStats: [{
      id: 1,
      date: '2026-01-01',
      marketId: 'market-1',
      touchCount: 0,
      inquiryCount: 0,
      dealCount: 1,
      revenue: 100,
      cost: Number.NaN,
      profit: 100,
      productsSold: [],
      updatedAt: now,
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('dailyStats[0] cost 無效'));
});

runTest('rejects tombstone events that point to the wrong event type', () => {
  const result = checkBackupIntegrity(backup({
    events: [
      event({
        id: 'interaction-1',
        type: 'interaction_recorded',
        market_id: 'market-1',
        payload: { marketId: 'market-1', type: 'touch' },
      }),
      event({
        id: 'deal-delete-1',
        type: 'deal_deleted',
        market_id: 'market-1',
        payload: {
          eventId: 'interaction-1',
          marketId: 'market-1',
          dealDate: '2026-01-01',
          totalAmount: 100,
          totalCost: 0,
          dealCount: 1,
        },
      }),
    ],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('events[1] deal_deleted references interaction_recorded; expected deal_closed'));
});

runTest('rejects deal item product references that do not exist', () => {
  const result = checkBackupIntegrity(backup({
    events: [
      event({
        id: 'deal-1',
        type: 'deal_closed',
        market_id: 'market-1',
        payload: {
          marketId: 'market-1',
          totalAmount: 100,
          paymentMethod: 'cash',
          items: [{ productId: 'missing-product', quantity: 1, price: 100 }],
        },
      }),
    ],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('events[0] deal_closed.items[0] references missing product: missing-product'));
});

import assert from 'node:assert/strict';
import {
  checkBackupIntegrity,
  parseBackupData,
  validateBackupReplayReadiness,
  type BackupData,
} from '../lib/db/integrity';
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

runTest('accepts staff-sanitized daily stats without cost or profit', () => {
  const result = checkBackupIntegrity(backup({
    dailyStats: [{
      id: 1,
      date: '2026-01-01',
      marketId: 'market-1',
      touchCount: 0,
      inquiryCount: 0,
      dealCount: 1,
      revenue: 100,
      productsSold: [],
      updatedAt: now,
    } as any],
  }));

  assert.equal(result.ok, true);
  assert.equal(result.errors.some(error => error.includes('dailyStats[0] cost')), false);
  assert.equal(result.errors.some(error => error.includes('dailyStats[0] profit')), false);
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

runTest('parses supported backup data', () => {
  const parsed = parseBackupData(JSON.stringify(backup()));

  assert.equal(parsed.version, 1);
  assert.equal(parsed.markets.length, 1);
});

runTest('rejects unsupported backup versions', () => {
  assert.throws(
    () => parseBackupData(JSON.stringify({ ...backup(), version: 999 })),
    /不支援的備份版本/
  );
});

runTest('accepts valid deal tombstone references', () => {
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
          items: [{ productId: 'product-1', quantity: 1, price: 100 }],
        },
      }),
      event({
        id: 'deal-delete-1',
        type: 'deal_deleted',
        market_id: 'market-1',
        payload: {
          eventId: 'deal-1',
          marketId: 'market-1',
          dealDate: '2026-01-01',
          totalAmount: 100,
          totalCost: 0,
          dealCount: 1,
        },
      }),
    ],
  }));

  assert.equal(result.ok, true);
});

runTest('warns but accepts tombstone references missing from local snapshot', () => {
  const result = checkBackupIntegrity(backup({
    events: [
      event({
        id: 'deal-delete-1',
        type: 'deal_deleted',
        market_id: 'market-1',
        payload: {
          eventId: 'missing-deal-event',
          marketId: 'market-1',
          dealDate: '2026-01-01',
          totalAmount: 100,
          totalCost: 0,
          dealCount: 1,
        },
      }),
    ],
  }));

  assert.equal(result.ok, true, `Unexpected errors: ${result.errors.join('; ')}`);
  assert.ok(
    result.warnings.some(warning => warning.includes('deal_deleted') && warning.includes('missing-deal-event')),
    `Expected missing tombstone target warning, got: ${result.warnings.join('; ')}`
  );
});

runTest('accepts snake_case event_id tombstone references', () => {
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
          items: [{ productId: 'product-1', quantity: 1, price: 100 }],
        },
      }),
      event({
        id: 'deal-delete-1',
        type: 'deal_deleted',
        market_id: 'market-1',
        payload: {
          event_id: 'deal-1',
          marketId: 'market-1',
          dealDate: '2026-01-01',
          totalAmount: 100,
          totalCost: 0,
          dealCount: 1,
        },
      }),
    ],
  }));

  assert.equal(result.ok, true, `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects tombstone events that point to themselves', () => {
  const result = checkBackupIntegrity(backup({
    events: [
      event({
        id: 'deal-delete-1',
        type: 'deal_deleted',
        market_id: 'market-1',
        payload: {
          eventId: 'deal-delete-1',
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
  assert.ok(result.errors.includes('events[0] deal_deleted cannot tombstone itself'));
});

runTest('warns when payload marketId differs from event market_id', () => {
  const result = checkBackupIntegrity(backup({
    markets: [market(), market({ id: 'market-2' })],
    events: [
      event({
        id: 'interaction-1',
        type: 'interaction_recorded',
        market_id: 'market-1',
        payload: { marketId: 'market-2', type: 'touch' },
      }),
    ],
  }));

  assert.equal(result.ok, true);
  assert.ok(result.warnings.includes('events[0] interaction_recorded payload marketId differs from event.market_id'));
});

runTest('rejects tombstones that replay before their target event', () => {
  const result = validateBackupReplayReadiness(backup({
    events: [
      event({
        id: 'deal-delete-1',
        type: 'deal_deleted',
        timestamp: now,
        market_id: 'market-1',
        payload: {
          eventId: 'deal-1',
          marketId: 'market-1',
          dealDate: '2026-01-01',
          totalAmount: 100,
          totalCost: 0,
          dealCount: 1,
        },
      }),
      event({
        id: 'deal-1',
        type: 'deal_closed',
        timestamp: now + 1,
        market_id: 'market-1',
        payload: {
          marketId: 'market-1',
          totalAmount: 100,
          paymentMethod: 'cash',
          items: [{ productId: 'product-1', quantity: 1, price: 100 }],
        },
      }),
    ],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('events[0] deal_deleted tombstones an event that has not replayed yet: deal-1'));
});

runTest('rejects duplicate tombstones for the same event', () => {
  const result = validateBackupReplayReadiness(backup({
    events: [
      event({
        id: 'deal-1',
        type: 'deal_closed',
        timestamp: now,
        market_id: 'market-1',
        payload: {
          marketId: 'market-1',
          totalAmount: 100,
          paymentMethod: 'cash',
          items: [{ productId: 'product-1', quantity: 1, price: 100 }],
        },
      }),
      event({
        id: 'deal-delete-1',
        type: 'deal_deleted',
        timestamp: now + 1,
        market_id: 'market-1',
        payload: {
          eventId: 'deal-1',
          marketId: 'market-1',
          dealDate: '2026-01-01',
          totalAmount: 100,
          totalCost: 0,
          dealCount: 1,
        },
      }),
      event({
        id: 'deal-delete-2',
        type: 'deal_deleted',
        timestamp: now + 2,
        market_id: 'market-1',
        payload: {
          eventId: 'deal-1',
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
  assert.ok(result.errors.includes('events[2] deal_deleted duplicates tombstone for event: deal-1'));
});

runTest('rejects deals that replay after their product was deleted', () => {
  const result = validateBackupReplayReadiness(backup({
    events: [
      event({
        id: 'product-delete-1',
        type: 'product_deleted',
        timestamp: now,
        payload: { productId: 'product-1' },
      }),
      event({
        id: 'deal-1',
        type: 'deal_closed',
        timestamp: now + 1,
        market_id: 'market-1',
        payload: {
          marketId: 'market-1',
          totalAmount: 100,
          paymentMethod: 'cash',
          items: [{ productId: 'product-1', quantity: 1, price: 100 }],
        },
      }),
    ],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('events[1] deal_closed.items[0] cannot replay because product is unavailable: product-1'));
});

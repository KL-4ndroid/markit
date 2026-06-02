import assert from 'node:assert/strict';
import {
  validateBackupReplayReadiness,
  type BackupData,
} from '../lib/db/integrity';

const now = 1_700_000_000_000;

function validBackup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    version: 1,
    exportedAt: now,
    events: [],
    markets: [{
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
    }],
    products: [{
      id: 'product-1',
      name: 'Test Product',
      category: 'other',
      price: 100,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }],
    dailyStats: [],
    settings: [{
      id: 1,
      theme: 'auto',
      language: 'zh-TW',
      defaultCurrency: 'TWD',
      enableNotifications: true,
      autoBackup: false,
      updatedAt: now,
    }],
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

runTest('rejects interaction after market deleted', () => {
  const result = validateBackupReplayReadiness(validBackup({
    events: [
      {
        id: 'market-deleted-1',
        type: 'market_deleted',
        timestamp: 100,
        market_id: 'market-1',
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { marketId: 'market-1' },
      },
      {
        id: 'interaction-1',
        type: 'interaction_recorded',
        timestamp: 101,
        market_id: 'market-1',
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { marketId: 'market-1', type: 'touch' },
      },
    ],
  }));

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(e => e.includes('interaction_recorded') && e.includes('cannot replay because market is unavailable: market-1')),
    `Unexpected errors: ${result.errors.join('; ')}`,
  );
});

runTest('rejects product_updated after product deleted', () => {
  const result = validateBackupReplayReadiness(validBackup({
    events: [
      {
        id: 'product-delete-1',
        type: 'product_deleted',
        timestamp: 100,
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { productId: 'product-1' },
      },
      {
        id: 'product-update-1',
        type: 'product_updated',
        timestamp: 101,
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { productId: 'product-1', updates: { price: 150 } },
      },
    ],
  }));

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(e => e.includes('product_updated') && e.includes('cannot replay because product is unavailable: product-1')),
    `Unexpected errors: ${result.errors.join('; ')}`,
  );
});

runTest('rejects deal_closed item after product deleted', () => {
  const result = validateBackupReplayReadiness(validBackup({
    events: [
      {
        id: 'product-delete-1',
        type: 'product_deleted',
        timestamp: 100,
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { productId: 'product-1' },
      },
      {
        id: 'deal-1',
        type: 'deal_closed',
        timestamp: 101,
        market_id: 'market-1',
        actor_id: 'local',
        sync_status: 'local_only',
        payload: {
          marketId: 'market-1',
          totalAmount: 100,
          paymentMethod: 'cash',
          items: [{ productId: 'product-1', quantity: 1, price: 100 }],
        },
      },
    ],
  }));

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(e => e.includes('deal_closed.items[0]') && e.includes('cannot replay because product is unavailable: product-1')),
    `Unexpected errors: ${result.errors.join('; ')}`,
  );
});

runTest('accepts product_updated before product_deleted', () => {
  const result = validateBackupReplayReadiness(validBackup({
    events: [
      {
        id: 'product-update-1',
        type: 'product_updated',
        timestamp: 100,
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { productId: 'product-1', updates: { price: 150 } },
      },
      {
        id: 'product-delete-1',
        type: 'product_deleted',
        timestamp: 101,
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { productId: 'product-1' },
      },
    ],
  }));

  assert.equal(result.ok, true);
});

runTest('accepts market_deleted when market is absent from snapshot', () => {
  const result = validateBackupReplayReadiness(validBackup({
    markets: [],
    events: [
      {
        id: 'market-deleted-1',
        type: 'market_deleted',
        timestamp: 100,
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { marketId: 'market-deleted-orphan' },
      },
    ],
  }));

  assert.equal(result.ok, true, `Expected ok, got errors: ${result.errors.join('; ')}`);
});

runTest('accepts market_deleted when market exists in snapshot', () => {
  const result = validateBackupReplayReadiness(validBackup({
    events: [
      {
        id: 'market-deleted-1',
        type: 'market_deleted',
        timestamp: 100,
        market_id: 'market-1',
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { marketId: 'market-1' },
      },
    ],
  }));

  assert.equal(result.ok, true, `Expected ok, got errors: ${result.errors.join('; ')}`);
});

runTest('accepts interaction after market_created', () => {
  const result = validateBackupReplayReadiness(validBackup({
    markets: [{
      id: 'market-new',
      name: 'New Market',
      location: 'Taipei',
      startDate: '2026-01-01',
      endDate: '2026-01-01',
      status: 'registered',
      registrationFee: 100,
      boothCost: 200,
      createdAt: now,
      updatedAt: now,
    }],
    events: [
      {
        id: 'market-create-1',
        type: 'market_created',
        timestamp: 100,
        actor_id: 'local',
        sync_status: 'local_only',
        payload: {
          name: 'New Market',
          location: 'Taipei',
          startDate: '2026-01-01',
          endDate: '2026-01-01',
          registrationFee: 100,
          boothCost: 200,
          marketId: 'market-new',
        },
      },
      {
        id: 'interaction-1',
        type: 'interaction_recorded',
        timestamp: 101,
        market_id: 'market-new',
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { marketId: 'market-new', type: 'touch' },
      },
    ],
  }));

  assert.equal(result.ok, true);
});

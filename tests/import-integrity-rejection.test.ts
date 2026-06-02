import assert from 'node:assert/strict';
import {
  checkBackupIntegrity,
  type BackupData,
} from '../lib/db/integrity';

const now = 1_700_000_000_000;

function validBackup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    version: 1,
    exportedAt: now,
    events: [{
      id: 'event-1',
      type: 'market_created',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        name: 'Test Market',
        location: 'Taipei',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        registrationFee: 100,
        boothCost: 200,
      },
    }],
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

runTest('rejects event missing valid id', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: '',
      type: 'market_created',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        name: 'Test Market',
        location: 'Taipei',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        registrationFee: 100,
        boothCost: 200,
      },
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('events[0]') && e.includes('缺少有效 id')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects unsupported event type', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'event-bad-type',
      type: 'unknown_event_type' as import('../types/db').EventType,
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {},
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('events[0]') && e.includes('事件類型不支援')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects invalid event timestamp', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'event-bad-ts',
      type: 'market_created',
      timestamp: NaN,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        name: 'Test Market',
        location: 'Taipei',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        registrationFee: 100,
        boothCost: 200,
      },
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('events[0]') && e.includes('缺少有效 timestamp')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects event payload that is not an object', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'event-bad-payload',
      type: 'market_created',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: 'not-an-object' as unknown as Record<string, unknown>,
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('events[0]') && e.includes('payload 必須是物件')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects market_updated missing marketId', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'event-update-1',
      type: 'market_updated',
      timestamp: now,
      market_id: 'market-1',
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        updates: { name: 'Updated Name' },
      },
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('market_updated') && e.includes('missing marketId')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects market_status_changed missing oldStatus', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'event-status-1',
      type: 'market_status_changed',
      timestamp: now,
      market_id: 'market-1',
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        marketId: 'market-1',
        newStatus: 'ongoing',
      },
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('market_status_changed') && e.includes('missing oldStatus')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects product_created missing name', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'event-prod-1',
      type: 'product_created',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        category: 'food',
        price: 50,
      },
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('product_created') && e.includes('missing name')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects product_updated missing productId', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'event-prod-update-1',
      type: 'product_updated',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        updates: { price: 75 },
      },
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('product_updated') && e.includes('missing productId')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects market missing id', () => {
  const result = checkBackupIntegrity(validBackup({
    markets: [{
      id: '',
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
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('markets[0]') && e.includes('缺少有效 id')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects market invalid startDate', () => {
  const result = checkBackupIntegrity(validBackup({
    markets: [{
      id: 'market-1',
      name: 'Test Market',
      location: 'Taipei',
      startDate: 'not-a-date',
      endDate: '2026-01-01',
      status: 'registered',
      registrationFee: 100,
      boothCost: 200,
      createdAt: now,
      updatedAt: now,
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('markets[0]') && e.includes('startDate 無效')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects market invalid boothCost', () => {
  const result = checkBackupIntegrity(validBackup({
    markets: [{
      id: 'market-1',
      name: 'Test Market',
      location: 'Taipei',
      startDate: '2026-01-01',
      endDate: '2026-01-01',
      status: 'registered',
      registrationFee: 100,
      boothCost: NaN,
      createdAt: now,
      updatedAt: now,
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('markets[0]') && e.includes('boothCost 無效')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects product missing id', () => {
  const result = checkBackupIntegrity(validBackup({
    products: [{
      id: '',
      name: 'Test Product',
      category: 'other',
      price: 100,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('products[0]') && e.includes('缺少有效 id')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects product invalid price', () => {
  const result = checkBackupIntegrity(validBackup({
    products: [{
      id: 'product-1',
      name: 'Test Product',
      category: 'other',
      price: NaN,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('products[0]') && e.includes('price 無效')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects product negative stock', () => {
  const result = checkBackupIntegrity(validBackup({
    products: [{
      id: 'product-1',
      name: 'Test Product',
      category: 'other',
      price: 100,
      stock: -5,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('products[0]') && e.includes('stock 無效或為負數')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects dailyStats productsSold item negative quantity', () => {
  const result = checkBackupIntegrity(validBackup({
    dailyStats: [{
      id: 1,
      date: '2026-01-01',
      marketId: 'market-1',
      touchCount: 0,
      inquiryCount: 0,
      dealCount: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      productsSold: [{
        productId: 'product-1',
        quantity: -3,
        revenue: 0,
      }],
      updatedAt: now,
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('dailyStats[0].productsSold[0]') && e.includes('quantity 無效')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects settings invalid theme', () => {
  const result = checkBackupIntegrity(validBackup({
    settings: [{
      id: 1,
      theme: 'invalid-theme' as import('../types/db').Settings['theme'],
      language: 'zh-TW',
      defaultCurrency: 'TWD',
      enableNotifications: true,
      autoBackup: false,
      updatedAt: now,
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('settings[0]') && e.includes('theme 無效')), `Unexpected errors: ${result.errors.join('; ')}`);
});

// ==================== product_deleted tombstone backward-compat ====================

// product_deleted is a tombstone — the product it references may have been
// deleted before the employee was invited, or may be outside the staff view scope.
// checkBackupIntegrity must not block on this; it is a warning at most.
runTest('accepts product_deleted when product is absent from snapshot (orphan tombstone)', () => {
  const result = checkBackupIntegrity(validBackup({
    products: [
      // Only product-1 in snapshot; product-2 was deleted before employee was invited
      {
        id: 'product-1',
        name: 'Existing Product',
        price: 100,
        stock: 10,
        category: 'other',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        id: 'product-delete-orphan',
        type: 'product_deleted',
        market_id: 'market-1',
        timestamp: now + 1,
        actor_id: 'owner-abc',
        sync_status: 'local_only',
        payload: { productId: 'product-2', marketId: 'market-1' },
      },
    ],
  }));

  assert.equal(result.ok, true, `Unexpected errors: ${result.errors.join('; ')}`);
  assert.ok(
    result.warnings.some(w => w.includes('product_deleted') && w.includes('not in snapshot')),
    `Expected warning about orphan tombstone, got warnings: ${result.warnings.join('; ')}`
  );
});

// Guard: product_updated on a truly missing product is still an error
runTest('still rejects product_updated when product is truly missing from snapshot', () => {
  const result = checkBackupIntegrity(validBackup({
    products: [],
    events: [
      {
        id: 'product-update-1',
        type: 'product_updated',
        market_id: 'market-1',
        timestamp: now,
        actor_id: 'owner-abc',
        sync_status: 'local_only',
        payload: { productId: 'product-missing', marketId: 'market-1', updates: {} },
      },
    ],
  }));

  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(e => e.includes('product_updated') && e.includes('references missing product')),
    `Expected error about missing product, got errors: ${result.errors.join('; ')}`
  );
});

// ==================== Legacy market_created backward-compat ====================

runTest('accepts legacy market_created missing registrationFee and boothCost', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'legacy-market-1',
      type: 'market_created',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        name: 'Legacy Market',
        location: 'Taipei',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        // registrationFee / boothCost 完全不存在
      },
    }],
  }));

  assert.equal(result.ok, true, `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('accepts legacy market_created registrationFee / boothCost = null', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'legacy-market-2',
      type: 'market_created',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        name: 'Legacy Market',
        location: 'Taipei',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        registrationFee: null,
        boothCost: null,
      },
    }],
  }));

  assert.equal(result.ok, true, `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('accepts legacy market_created registrationFee / boothCost = empty string', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'legacy-market-3',
      type: 'market_created',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        name: 'Legacy Market',
        location: 'Taipei',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        registrationFee: '',
        boothCost: '',
      },
    }],
  }));

  assert.equal(result.ok, true, `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects market_created registrationFee / boothCost = non-numeric string', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'bad-market-1',
      type: 'market_created',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        name: 'Bad Market',
        location: 'Taipei',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        registrationFee: 'abc',
        boothCost: 'xyz',
      },
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('registrationFee') && e.includes('invalid')), `Unexpected errors: ${result.errors.join('; ')}`);
  assert.ok(result.errors.some(e => e.includes('boothCost') && e.includes('invalid')), `Unexpected errors: ${result.errors.join('; ')}`);
});

runTest('rejects market_created registrationFee / boothCost = NaN', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'bad-market-2',
      type: 'market_created',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        name: 'Bad Market',
        location: 'Taipei',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        registrationFee: NaN,
        boothCost: NaN,
      },
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('registrationFee') && e.includes('invalid')), `Unexpected errors: ${result.errors.join('; ')}`);
  assert.ok(result.errors.some(e => e.includes('boothCost') && e.includes('invalid')), `Unexpected errors: ${result.errors.join('; ')}`);
});

// Guard: product_created invalid price still fails (global isNumber not relaxed)
runTest('rejects product_created invalid price', () => {
  const result = checkBackupIntegrity(validBackup({
    events: [{
      id: 'product-bad-1',
      type: 'product_created',
      market_id: 'market-1',
      timestamp: now,
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        name: 'Test Product',
        price: 'not-a-number' as unknown as number,
        stock: 10,
        category: 'other',
      },
    }],
  }));

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('product_created') && e.includes('price')), `Unexpected errors: ${result.errors.join('; ')}`);
});

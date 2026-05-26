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

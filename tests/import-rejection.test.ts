import assert from 'node:assert/strict';
import {
  parseBackupData,
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

runTest('rejects non-JSON input', () => {
  assert.throws(
    () => parseBackupData('not json at all'),
    /備份檔不是有效的 JSON/,
  );
});

runTest('rejects null root', () => {
  assert.throws(
    () => parseBackupData('null'),
    /根節點必須是物件/,
  );
});

runTest('rejects array root', () => {
  assert.throws(
    () => parseBackupData('[]'),
    /根節點必須是物件/,
  );
});

runTest('rejects missing version', () => {
  const data = { exportedAt: now, events: [], markets: [], products: [], dailyStats: [], settings: [] };
  assert.throws(
    () => parseBackupData(JSON.stringify(data)),
    /缺少有效版本/,
  );
});

runTest('rejects version that is not a number', () => {
  const data = { version: 'one', exportedAt: now, events: [], markets: [], products: [], dailyStats: [], settings: [] };
  assert.throws(
    () => parseBackupData(JSON.stringify(data)),
    /缺少有效版本/,
  );
});

runTest('rejects unsupported version', () => {
  assert.throws(
    () => parseBackupData(JSON.stringify({ ...validBackup(), version: 999 })),
    /不支援的備份版本/,
  );
});

runTest('rejects version 0', () => {
  assert.throws(
    () => parseBackupData(JSON.stringify({ ...validBackup(), version: 0 })),
    /不支援的備份版本/,
  );
});

runTest('rejects version 2', () => {
  assert.throws(
    () => parseBackupData(JSON.stringify({ ...validBackup(), version: 2 })),
    /不支援的備份版本/,
  );
});

runTest('rejects missing exportedAt', () => {
  const data = { version: 1, events: [], markets: [], products: [], dailyStats: [], settings: [] };
  assert.throws(
    () => parseBackupData(JSON.stringify(data)),
    /缺少有效匯出時間/,
  );
});

runTest('rejects invalid exportedAt (string)', () => {
  const data = { version: 1, exportedAt: 'not-a-number', events: [], markets: [], products: [], dailyStats: [], settings: [] };
  assert.throws(
    () => parseBackupData(JSON.stringify(data)),
    /缺少有效匯出時間/,
  );
});

runTest('rejects events not an array', () => {
  assert.throws(
    () => parseBackupData(JSON.stringify({ ...validBackup(), events: 'not-an-array' })),
    /缺少有效陣列欄位/,
  );
});

runTest('rejects markets not an array', () => {
  assert.throws(
    () => parseBackupData(JSON.stringify({ ...validBackup(), markets: null })),
    /缺少有效陣列欄位/,
  );
});

runTest('rejects products not an array', () => {
  assert.throws(
    () => parseBackupData(JSON.stringify({ ...validBackup(), products: undefined })),
    /缺少有效陣列欄位/,
  );
});

runTest('rejects dailyStats not an array', () => {
  assert.throws(
    () => parseBackupData(JSON.stringify({ ...validBackup(), dailyStats: {} })),
    /缺少有效陣列欄位/,
  );
});

runTest('rejects settings not an array', () => {
  assert.throws(
    () => parseBackupData(JSON.stringify({ ...validBackup(), settings: 0 })),
    /缺少有效陣列欄位/,
  );
});

runTest('accepts minimal valid backup', () => {
  const parsed = parseBackupData(JSON.stringify(validBackup()));
  assert.equal(parsed.version, 1);
  assert.equal(parsed.exportedAt, now);
  assert.deepEqual(parsed.events, []);
  assert.equal(parsed.markets.length, 1);
  assert.equal(parsed.products.length, 1);
  assert.deepEqual(parsed.dailyStats, []);
  assert.equal(parsed.settings.length, 1);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db, importData } from '../lib/db';
import type { BackupData } from '../lib/db/integrity';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const importSource = readFileSync(join(projectRoot, 'lib/db/index.ts'), 'utf8');

const now = 1_700_000_000_000;

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

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

function replayUnsafeBackup(): BackupData {
  return validBackup({
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
        id: 'interaction-after-delete-1',
        type: 'interaction_recorded',
        timestamp: 101,
        market_id: 'market-1',
        actor_id: 'local',
        sync_status: 'local_only',
        payload: { market_id: 'market-1', type: 'touch' },
      },
    ],
  });
}

async function withImportTripwires(fn: () => Promise<void>): Promise<void> {
  const original = {
    transaction: db.transaction,
    eventsToArray: db.events.toArray,
    marketsToArray: db.markets.toArray,
    productsToArray: db.products.toArray,
    dailyStatsToArray: db.dailyStats.toArray,
    settingsToArray: db.settings.toArray,
    consoleError: console.error,
  };

  let transactionCalls = 0;
  let tableReadCalls = 0;

  const failTransaction = (() => {
    transactionCalls++;
    throw new Error('transaction tripwire should not be reached');
  }) as typeof db.transaction;

  const failTableRead = (() => {
    tableReadCalls++;
    throw new Error('table read tripwire should not be reached');
  }) as typeof db.events.toArray;

  try {
    (db as unknown as { transaction: typeof db.transaction }).transaction = failTransaction;
    (db.events as unknown as { toArray: typeof db.events.toArray }).toArray = failTableRead;
    (db.markets as unknown as { toArray: typeof db.markets.toArray }).toArray = failTableRead as typeof db.markets.toArray;
    (db.products as unknown as { toArray: typeof db.products.toArray }).toArray = failTableRead as typeof db.products.toArray;
    (db.dailyStats as unknown as { toArray: typeof db.dailyStats.toArray }).toArray = failTableRead as typeof db.dailyStats.toArray;
    (db.settings as unknown as { toArray: typeof db.settings.toArray }).toArray = failTableRead as typeof db.settings.toArray;
    console.error = () => {};

    await fn();

    assert.equal(transactionCalls, 0);
    assert.equal(tableReadCalls, 0);
  } finally {
    (db as unknown as { transaction: typeof db.transaction }).transaction = original.transaction;
    (db.events as unknown as { toArray: typeof db.events.toArray }).toArray = original.eventsToArray;
    (db.markets as unknown as { toArray: typeof db.markets.toArray }).toArray = original.marketsToArray;
    (db.products as unknown as { toArray: typeof db.products.toArray }).toArray = original.productsToArray;
    (db.dailyStats as unknown as { toArray: typeof db.dailyStats.toArray }).toArray = original.dailyStatsToArray;
    (db.settings as unknown as { toArray: typeof db.settings.toArray }).toArray = original.settingsToArray;
    console.error = original.consoleError;
  }
}

runTest('invalid JSON import stops before backup table reads and transaction', async () => {
  await withImportTripwires(async () => {
    await assert.rejects(
      () => importData('not json'),
      /JSON/
    );
  });
});

runTest('replay-unsafe import precheck stops before backup table reads and transaction', async () => {
  await withImportTripwires(async () => {
    await assert.rejects(
      () => importData(JSON.stringify(replayUnsafeBackup())),
      /cannot replay because market is unavailable/
    );
  });
});

runTest('import replacement clear and bulkAdd operations stay inside one transaction block', () => {
  const transactionStart = importSource.indexOf("await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats, db.settings], async () => {");
  assert.notEqual(transactionStart, -1, 'importData must use one replacement transaction');

  const transactionEnd = importSource.indexOf('\n    });', transactionStart);
  assert.notEqual(transactionEnd, -1, 'importData transaction block must close before post-import validation');

  const transactionBlock = importSource.slice(transactionStart, transactionEnd);

  for (const operation of [
    'await db.events.clear();',
    'await db.markets.clear();',
    'await db.products.clear();',
    'await db.dailyStats.clear();',
    'await db.settings.clear();',
    'await db.events.bulkAdd(data.events);',
    'await db.markets.bulkAdd(data.markets);',
    'await db.products.bulkAdd(data.products);',
    'await db.dailyStats.bulkAdd(data.dailyStats);',
    'await db.settings.bulkAdd(data.settings);',
  ]) {
    assert.match(transactionBlock, new RegExp(operation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const postImportValidation = importSource.indexOf('const postImportData: BackupData', transactionEnd);
  assert.ok(postImportValidation > transactionEnd, 'post-import validation should run after transaction completion');
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
    throw new Error(`${failed} importData rollback boundary tests failed`);
  }
}

main();

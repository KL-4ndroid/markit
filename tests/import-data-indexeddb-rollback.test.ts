import assert from 'node:assert/strict';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import type { BackupData } from '../lib/db/integrity';
import type { DailyStats, Event, Market, Product, Settings } from '../types/db';

type TestFn = () => Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const now = 1_700_000_000_000;

(globalThis as typeof globalThis & { indexedDB: IDBFactory }).indexedDB = indexedDB;
(globalThis as typeof globalThis & { IDBKeyRange: typeof IDBKeyRange }).IDBKeyRange = IDBKeyRange;

const localStorageData = new Map<string, string>();
(globalThis as typeof globalThis & { localStorage: Storage }).localStorage = {
  get length() {
    return localStorageData.size;
  },
  clear: () => localStorageData.clear(),
  getItem: (key: string) => localStorageData.get(key) ?? null,
  key: (index: number) => [...localStorageData.keys()][index] ?? null,
  removeItem: (key: string) => {
    localStorageData.delete(key);
  },
  setItem: (key: string, value: string) => {
    localStorageData.set(key, String(value));
  },
} as Storage;

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function market(id: string, name: string): Market {
  return {
    id,
    name,
    location: 'Taipei',
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    status: 'registered',
    registrationFee: 100,
    boothCost: 200,
    createdAt: now,
    updatedAt: now,
  };
}

function product(id: string, name: string, marketId: string): Product {
  return {
    id,
    market_id: marketId,
    name,
    category: 'other',
    price: 100,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function dailyStat(id: number, date: string, marketId: string): DailyStats {
  return {
    id,
    date,
    marketId,
    touchCount: 0,
    inquiryCount: 0,
    dealCount: 0,
    revenue: 0,
    cost: 0,
    profit: 0,
    productsSold: [],
    updatedAt: now,
  };
}

function settings(id: number): Settings {
  return {
    id,
    theme: 'auto',
    language: 'zh-TW',
    defaultCurrency: 'TWD',
    enableNotifications: true,
    autoBackup: false,
    updatedAt: now,
  };
}

function backup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    version: 1,
    exportedAt: now,
    events: [],
    markets: [market('import-market-1', 'Import Market')],
    products: [product('import-product-1', 'Import Product', 'import-market-1')],
    dailyStats: [],
    settings: [settings(2)],
    ...overrides,
  };
}

async function readCurrentState(db: Awaited<ReturnType<typeof importDb>>['db']) {
  const [events, markets, products, dailyStats, settingsRows] = await Promise.all([
    db.events.toArray(),
    db.markets.toArray(),
    db.products.toArray(),
    db.dailyStats.toArray(),
    db.settings.toArray(),
  ]);

  return { events, markets, products, dailyStats, settings: settingsRows };
}

async function importDb() {
  return import('../lib/db');
}

async function resetIsolatedDb(): Promise<Awaited<ReturnType<typeof importDb>>['db']> {
  const { db } = await importDb();
  await db.delete();
  await db.open();
  localStorage.clear();
  return db;
}

async function seedExistingState(db: Awaited<ReturnType<typeof importDb>>['db']): Promise<void> {
  await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats, db.settings], async () => {
    await db.events.clear();
    await db.markets.clear();
    await db.products.clear();
    await db.dailyStats.clear();
    await db.settings.clear();

    await db.events.add({
      id: 'seed-event-1',
      type: 'market_created',
      timestamp: now,
      market_id: 'seed-market-1',
      actor_id: 'local',
      sync_status: 'local_only',
      payload: {
        marketId: 'seed-market-1',
        name: 'Seed Market',
        location: 'Taipei',
        startDate: '2026-01-01',
        endDate: '2026-01-01',
        registrationFee: 100,
        boothCost: 200,
      },
    } satisfies Event);
    await db.markets.add(market('seed-market-1', 'Seed Market'));
    await db.products.add(product('seed-product-1', 'Seed Product', 'seed-market-1'));
    await db.dailyStats.add(dailyStat(1, '2026-01-01', 'seed-market-1'));
    await db.settings.add(settings(1));
  });
}

function failingImportBackup(): BackupData {
  return backup({
    dailyStats: [dailyStat(2, '2026-02-01', 'import-market-1')],
    settings: [
      settings(2),
      {
        ...settings(3),
        id: { invalid: true },
      } as unknown as Settings,
    ],
  });
}

console.log('\n=== importData isolated IndexedDB rollback ===');

runTest('failed replacement transaction restores the pre-import IndexedDB state', async () => {
  const db = await resetIsolatedDb();
  await seedExistingState(db);

  try {
    const before = await readCurrentState(db);
    const { importData } = await importDb();
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    try {
      console.error = () => {};
      console.warn = () => {};

      await assert.rejects(
        () => importData(JSON.stringify(failingImportBackup())),
        /DataError|invalid key|key.*invalid|A mutation operation in the transaction failed/i
      );
    } finally {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    }

    const after = await readCurrentState(db);
    assert.deepEqual(after, before);
  } finally {
    await db.delete();
    localStorage.clear();
  }
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
    throw new Error(`${failed} importData isolated IndexedDB rollback tests failed`);
  }
}

main();

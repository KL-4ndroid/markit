/**
 * Conflict Resolution 脫敏測試
 *
 * 驗證 `detectAndResolveConflict` 在員工視角下，所有寫入 IndexedDB
 * 的 payload 都已被 PermissionGate 脫敏。
 *
 * ## 場景
 *
 * - 'remote' strategy：雲端資料覆寫本地，員工視角下不應殘留
 *   totalRevenue / totalDeals / totalCost / profitMargin
 * - 'merge' strategy：Math.max 比較時拿的是「員工視角的雲端值」，
 *   合併結果也應只含員工可見的欄位
 * - 老闆（Level 3）不過脫敏（向後相容，預設 infoLevel=3）
 *
 * ## 設計
 *
 * 沿用 daily-stats-repair.test.ts 風格：mock db.markets.update 與
 * db.products.update，把 changes 推到 in-memory Map，斷言 Map 內容。
 */

import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { detectAndResolveConflict } from '../hooks/useSync';

// 吸收 Dexie lazy promise 的 unhandled rejection
process.on('unhandledRejection', () => {});

interface MockStorage {
  markets: Map<string, Record<string, unknown>>;
  products: Map<string, Record<string, unknown>>;
}

function withMockedDb(
  fn: (storage: MockStorage) => Promise<void>
): Promise<void> {
  const storage: MockStorage = { markets: new Map(), products: new Map() };

  const origMarketsUpdate = db.markets.update.bind(db.markets);
  const origProductsUpdate = db.products.update.bind(db.products);

  db.markets.update = ((id: string, changes: Record<string, unknown>) => {
    const existing = storage.markets.get(id);
    storage.markets.set(id, existing ? { ...existing, ...changes } : { ...changes });
    return Promise.resolve(1) as ReturnType<typeof db.markets.update>;
  }) as typeof db.markets.update;

  db.products.update = ((id: string, changes: Record<string, unknown>) => {
    const existing = storage.products.get(id);
    storage.products.set(id, existing ? { ...existing, ...changes } : { ...changes });
    return Promise.resolve(1) as ReturnType<typeof db.products.update>;
  }) as typeof db.products.update;

  return Promise.resolve(fn(storage)).finally(() => {
    db.markets.update = origMarketsUpdate;
    db.products.update = origProductsUpdate;
  });
}

function cloudMarket(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'market-1',
    name: 'San Francisco Sunday Market',
    location: 'Ferry Building',
    start_date: '2026-01-15',
    end_date: '2026-01-15',
    total_revenue: 5000,
    totalRevenue: 5000,
    totalDeals: 25,
    total_deals: 25,
    totalProfit: 2000,
    total_profit: 2000,
    totalCost: 3000,
    total_cost: 3000,
    profitMargin: 0.4,
    profit_margin: 0.4,
    boothCost: 200,
    booth_cost: 200,
    updated_at: 1700000100,
    updatedAt: 1700000100,
    ...overrides,
  };
}

function cloudProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'product-1',
    marketId: 'market-1',
    name: '手工皂',
    price: 100,
    cost: 50,
    supplierInfo: '桃園小農',
    supplier_info: '桃園小農',
    profitMargin: 0.5,
    profit_margin: 0.5,
    stock: 20,
    totalSold: 15,
    total_sold: 15,
    updated_at: 1700000100,
    updatedAt: 1700000100,
    ...overrides,
  };
}

function localMarket(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'market-1',
    name: 'San Francisco Sunday Market',
    totalRevenue: 0,
    totalDeals: 0,
    updatedAt: 1700000050,
    ...overrides,
  };
}

function localProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'product-1',
    marketId: 'market-1',
    name: '手工皂',
    price: 100,
    stock: 20,
    totalSold: 0,
    updatedAt: 1700000050,
    ...overrides,
  };
}

async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

async function main(): Promise<void> {
  // 場景 A：'remote' + Level 0 員工 → 敏感欄位全部移除
  await runTest('[conflict] remote strategy + Level 0 員工：移除所有敏感欄位', async () => {
    await withMockedDb(async (storage) => {
      const result = await detectAndResolveConflict(
        'markets',
        localMarket(),
        cloudMarket(),
        0
      );
      assert.equal(result, true, '應偵測到 remote 衝突');

      const written = storage.markets.get('market-1')!;
      assert.equal(written.totalRevenue, undefined, 'Level 0 不該看到 totalRevenue');
      assert.equal(written.totalDeals, undefined, 'Level 0 不該看到 totalDeals');
      assert.equal(written.totalCost, undefined, 'Level 0 不該看到 totalCost');
      assert.equal(written.profitMargin, undefined, 'Level 0 不該看到 profitMargin');
      assert.equal(written.name, 'San Francisco Sunday Market', '非敏感欄位保留');
    });
  });

  // 場景 B：'remote' + Level 2 員工 → 看得到收入，看不到成本利潤
  await runTest('[conflict] remote strategy + Level 2 員工：保留收入，移除成本/利潤', async () => {
    await withMockedDb(async (storage) => {
      const result = await detectAndResolveConflict(
        'markets',
        localMarket(),
        cloudMarket(),
        2
      );
      assert.equal(result, true);

      const written = storage.markets.get('market-1')!;
      assert.equal(written.totalRevenue, 5000, 'Level 2 可見 totalRevenue');
      assert.equal(written.totalDeals, 25, 'Level 2 可見 totalDeals');
      assert.equal(written.totalCost, undefined, 'Level 2 不該看到 totalCost');
      assert.equal(written.profitMargin, undefined, 'Level 2 不該看到 profitMargin');
    });
  });

  // 場景 C：'remote' + 不傳 infoLevel（向後相容，老闆視角）
  await runTest('[conflict] remote strategy + 預設 infoLevel（老闆）：保留所有欄位', async () => {
    await withMockedDb(async (storage) => {
      const result = await detectAndResolveConflict(
        'markets',
        localMarket(),
        cloudMarket()
      );
      assert.equal(result, true);

      const written = storage.markets.get('market-1')!;
      assert.equal(written.totalRevenue, 5000, '老闆可見 totalRevenue');
      assert.equal(written.totalCost, 3000, '老闆可見 totalCost');
      assert.equal(written.profitMargin, 0.4, '老闆可見 profitMargin');
    });
  });

  // 場景 D：'merge' + Level 0 員工 → Math.max 拿脫敏後的雲端值
  await runTest('[conflict] merge strategy + Level 0 員工：使用脫敏後的雲端值做 Math.max', async () => {
    await withMockedDb(async (storage) => {
      // 觸發 'merge'：updatedAt 相同，統計欄位不一致
      // 員工本地 totalRevenue=100（殘留），雲端=5000
      // 脫敏後雲端變 undefined (= 0)，所以 max(100, 0) = 100
      const local = localMarket({ updatedAt: 1700000100, totalRevenue: 100, totalDeals: 5 });
      const remote = cloudMarket({ updated_at: 1700000100, updatedAt: 1700000100 });

      const result = await detectAndResolveConflict('markets', local, remote, 0);
      assert.equal(result, true);

      const written = storage.markets.get('market-1')!;
      assert.equal(
        written.totalRevenue,
        100,
        '合併結果應是 max(100, 0)=100，不該是 max(100, 5000)=5000'
      );
    });
  });

  // 場景 E：'merge' + Level 0 員工 + product → 成本/利潤不污染合併結果
  await runTest('[conflict] merge strategy + Level 0 員工 + product：成本/供應商不污染合併', async () => {
    await withMockedDb(async (storage) => {
      const local = localProduct({ updatedAt: 1700000100, totalSold: 5 });
      const remote = cloudProduct({ updated_at: 1700000100, updatedAt: 1700000100 });

      const result = await detectAndResolveConflict('products', local, remote, 0);
      assert.equal(result, true);

      const written = storage.products.get('product-1')!;
      assert.equal(written.cost, undefined, 'Level 0 product 不該看到 cost');
      assert.equal(written.price, undefined, 'Level 0 product 不該看到 price');
      assert.equal(written.stock, undefined, 'Level 0 product 不該看到 stock');
      assert.equal(written.supplierInfo, undefined, 'Level 0 product 不該看到 supplierInfo');
      assert.equal(written.profitMargin, undefined, 'Level 0 product 不該看到 profitMargin');
      assert.equal(written.name, '手工皂', '非敏感欄位保留');
    });
  });

  // 場景 F：'local' strategy → 不寫入，無脫敏需要
  await runTest('[conflict] local strategy：不觸發任何寫入', async () => {
    await withMockedDb(async (storage) => {
      // 觸發 'local'：本地 updatedAt 較新
      const local = localMarket({ updatedAt: 1700000200 });
      const remote = cloudMarket({ updated_at: 1700000100, updatedAt: 1700000100 });

      const result = await detectAndResolveConflict('markets', local, remote, 0);
      assert.equal(result, false);
      assert.equal(storage.markets.size, 0, 'local strategy 不應觸發任何寫入');
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

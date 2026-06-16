/**
 * PermissionGate 集成測試
 *
 * 模擬資料從 Supabase 進入本地系統的完整管道：
 * 1. Supabase 返回含敏感欄位的資料（cost, profit, revenue 等）
 * 2. 經 PermissionGate 脫敏（infoLevel 驅動）
 * 3. 寫入 IndexedDB 前斷言敏感欄位已移除
 *
 * 覆蓋場景：
 * - 各 infoLevel (3/2/1/0) 的完整管道
 * - 事件（shouldBlockEvent + sanitizeEvent）
 * - 市場快照（sanitizeMarketProjection）
 * - 每日統計（sanitizeDailyStatsProjection）
 * - 從 Supabase 讀取後直接寫入的 market（hydrate path）
 */

import assert from 'node:assert/strict';
import {
  createPermissionGate,
  sanitizeWithLevel,
  sanitizeEventsWithLevel,
  resolveInfoLevel,
  COST_EVENT_TYPES,
  REVENUE_EVENT_TYPES,
  INTERACTION_EVENT_TYPES,
  type InfoLevel,
} from '../lib/permissions/PermissionGate';

async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

// ─── 模擬角色工廠 ───────────────────────────────────────────────────────────

function ownerRole() {
  return { isStaff: false, ownerId: 'owner-1', permissions: { can_view: true, can_edit: true } };
}
function staffRole() {
  return { isStaff: true, ownerId: 'owner-1', permissions: { can_view: true, can_edit: false } };
}

// ─── 模擬 Supabase 返回的資料 ────────────────────────────────────────────────

/** 模擬 Supabase 返回的市場快照（含所有欄位） */
function cloudMarket() {
  return {
    id: 'market-1',
    name: '南軟市集',
    location: '台北市南港區',
    status: 'active',
    startDate: '2026-03-01',
    endDate: '2026-03-03',
    ownerId: 'owner-1',
    // 成本相關（Level 2 即需移除）
    totalCost: 5000,
    totalProfit: 3000,
    netProfit: 2500,
    profitMargin: 0.5,
    boothCost: 2000,
    registrationFee: 1000,
    deposit: 500,
    tableRental: 300,
    chairRental: 200,
    umbrellaRental: 100,
    tableclothRental: 100,
    commissionRate: 0.05,
    costBreakdown: { booth: 2000, registration: 1000 },
    averageCost: 45,
    costPerItem: 42,
    // 收入相關（Level 1 才移除）
    revenue: 8000,
    totalRevenue: 8000,
    averageDealValue: 400,
    average_deal_value: 400,
    // 互動統計（Level 0 才移除）
    totalInteractions: 50,
    totalDeals: 20,
    interactionCount: 50,
    dealCount: 20,
  };
}

/** 模擬 Supabase 返回的每日統計（含所有欄位） */
function cloudDailyStats() {
  return {
    id: 'stat-1',
    marketId: 'market-1',
    date: '2026-03-01',
    // 成本/利潤（Level 2）
    totalCost: 5000,
    netProfit: 3000,
    profitMargin: 0.5,
    costBreakdown: { booth: 2000 },
    averageCost: 45,
    costPerItem: 42,
    // 收入（Level 1）
    revenue: 8000,
    totalRevenue: 8000,
    averageDealValue: 400,
    average_deal_value: 400,
    // 互動統計（Level 0）
    totalInteractions: 50,
    totalDeals: 20,
  };
}

/** 模擬 Supabase 返回的市場事件 */
function cloudEvent(type: string, extra: Record<string, unknown> = {}) {
  return {
    id: `event-${type}-1`,
    type,
    market_id: 'market-1',
    actor_id: 'owner-1',
    timestamp: Date.now(),
    payload: { name: '南軟市集', revenue: 1000, cost: 500, profit: 500, ...extra },
    ...extra,
  };
}

// ─── 集成測試：員工視角完整管道 ──────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n=== PermissionGate 集成測試 ===\n');

  // ─── 同步路徑1：hydrateMarketsFromCloud ─────────────────────────────────

  await runTest('[hydrate] Supabase→IndexedDB market 完整管道（Level 3 老闆）', () => {
    const market = cloudMarket();
    const gate = createPermissionGate({ infoLevel: 3, entity: 'market' });
    const result = gate.sanitizeMarketProjection(market as unknown as Record<string, unknown>);

    // 老闆看到所有欄位
    assert.equal(result.totalCost, 5000, '老闆可見 totalCost');
    assert.equal(result.totalProfit, 3000, '老闆可見 totalProfit');
    assert.equal(result.revenue, 8000, '老闆可見 revenue');
    assert.equal(result.totalInteractions, 50, '老闆可見 totalInteractions');
    assert.equal(result.netProfit, 2500, '老闆可見 netProfit');
  });

  await runTest('[hydrate] Supabase→IndexedDB market 完整管道（Level 2 員工）', () => {
    const market = cloudMarket();
    const gate = createPermissionGate({ infoLevel: 2, entity: 'market' });
    const result = gate.sanitizeMarketProjection(market as unknown as Record<string, unknown>);

    // Level 2：隱藏成本/利潤，保留收入
    assert.equal(result.totalCost, undefined, 'Level 2 移除 totalCost');
    assert.equal(result.totalProfit, undefined, 'Level 2 移除 totalProfit');
    assert.equal(result.netProfit, undefined, 'Level 2 移除 netProfit');
    assert.equal(result.profitMargin, undefined, 'Level 2 移除 profitMargin');
    assert.equal(result.boothCost, undefined, 'Level 2 移除 boothCost');
    assert.equal(result.costBreakdown, undefined, 'Level 2 移除 costBreakdown');
    assert.equal(result.revenue, 8000, 'Level 2 保留 revenue');
    assert.equal(result.averageDealValue, 400, 'Level 2 保留 averageDealValue');
    assert.equal(result.totalInteractions, 50, 'Level 2 保留 totalInteractions');
    assert.equal(result.name, '南軟市集', 'Level 2 保留 name');
    assert.equal(result.location, '台北市南港區', 'Level 2 保留 location');
  });

  await runTest('[hydrate] Supabase→IndexedDB market 完整管道（Level 1 員工）', () => {
    const market = cloudMarket();
    const gate = createPermissionGate({ infoLevel: 1, entity: 'market' });
    const result = gate.sanitizeMarketProjection(market as unknown as Record<string, unknown>);

    // Level 1：在 Level 2 基礎上，移除 revenue
    assert.equal(result.totalCost, undefined, 'Level 1 移除 totalCost');
    assert.equal(result.revenue, undefined, 'Level 1 移除 revenue');
    assert.equal(result.averageDealValue, undefined, 'Level 1 移除 averageDealValue');
    assert.equal(result.totalInteractions, 50, 'Level 1 保留 totalInteractions');
    assert.equal(result.name, '南軟市集', 'Level 1 保留 name');
  });

  await runTest('[hydrate] Supabase→IndexedDB market 完整管道（Level 0 員工）', () => {
    const market = cloudMarket();
    const gate = createPermissionGate({ infoLevel: 0, entity: 'market' });
    const result = gate.sanitizeMarketProjection(market as unknown as Record<string, unknown>);

    // Level 0：移除幾乎所有數值欄位
    assert.equal(result.totalCost, undefined, 'Level 0 移除 totalCost');
    assert.equal(result.revenue, undefined, 'Level 0 移除 revenue');
    assert.equal(result.totalInteractions, undefined, 'Level 0 移除 totalInteractions');
    assert.equal(result.totalDeals, undefined, 'Level 0 移除 totalDeals');
    assert.equal(result.name, '南軟市集', 'Level 0 保留 name');
    assert.equal(result.location, '台北市南港區', 'Level 0 保留 location');
    assert.equal(result.status, 'active', 'Level 0 保留 status');
    assert.equal(result.startDate, '2026-03-01', 'Level 0 保留 startDate');
  });

  // ─── 同步路徑2：hydrate dailyStats ────────────────────────────────────────

  await runTest('[hydrate] Supabase→IndexedDB dailyStats 完整管道（Level 2）', () => {
    const stats = cloudDailyStats();
    const gate = createPermissionGate({ infoLevel: 2, entity: 'stats' });
    const result = gate.sanitizeDailyStatsProjection(stats as unknown as Record<string, unknown>);

    assert.equal(result.totalCost, undefined, 'Level 2 移除 totalCost');
    assert.equal(result.netProfit, undefined, 'Level 2 移除 netProfit');
    assert.equal(result.profitMargin, undefined, 'Level 2 移除 profitMargin');
    assert.equal(result.costBreakdown, undefined, 'Level 2 移除 costBreakdown');
    assert.equal(result.revenue, 8000, 'Level 2 保留 revenue');
    assert.equal(result.totalInteractions, 50, 'Level 2 保留 totalInteractions');
    assert.equal(result.marketId, 'market-1', 'Level 2 保留 marketId');
  });

  await runTest('[hydrate] Supabase→IndexedDB dailyStats 完整管道（Level 0）', () => {
    const stats = cloudDailyStats();
    const gate = createPermissionGate({ infoLevel: 0, entity: 'stats' });
    const result = gate.sanitizeDailyStatsProjection(stats as unknown as Record<string, unknown>);

    assert.equal(result.totalCost, undefined, 'Level 0 移除 totalCost');
    assert.equal(result.revenue, undefined, 'Level 0 移除 revenue');
    assert.equal(result.totalInteractions, undefined, 'Level 0 移除 totalInteractions');
    assert.equal(result.totalDeals, undefined, 'Level 0 移除 totalDeals');
    assert.equal(result.date, '2026-03-01', 'Level 0 保留 date');
  });

  // ─── 同步路徑3：pullAllEvents shouldBlockEvent ────────────────────────────

  await runTest('[sync] pullAllEvents 成本事件（Level 2）被阻擋', () => {
    for (const type of COST_EVENT_TYPES) {
      const gate = createPermissionGate({ infoLevel: 2, entity: 'event' });
      assert.equal(
        gate.shouldBlockEvent(type),
        true,
        `Level 2 應阻擋成本事件：${type}`
      );
    }
  });

  await runTest('[sync] pullAllEvents 成交事件（Level 1）被阻擋', () => {
    for (const type of REVENUE_EVENT_TYPES) {
      const gate = createPermissionGate({ infoLevel: 1, entity: 'event' });
      assert.equal(
        gate.shouldBlockEvent(type),
        true,
        `Level 1 應阻擋成交事件：${type}`
      );
    }
  });

  await runTest('[sync] pullAllEvents 互動事件（Level 0）被阻擋', () => {
    for (const type of INTERACTION_EVENT_TYPES) {
      const gate = createPermissionGate({ infoLevel: 0, entity: 'event' });
      assert.equal(
        gate.shouldBlockEvent(type),
        true,
        `Level 0 應阻擋互動事件：${type}`
      );
    }
  });

  await runTest('[sync] pullAllEvents Level 3 不阻擋任何事件', () => {
    const allTypes = [...COST_EVENT_TYPES, ...REVENUE_EVENT_TYPES, ...INTERACTION_EVENT_TYPES, 'market_created', 'market_status_changed'];
    const gate = createPermissionGate({ infoLevel: 3, entity: 'event' });
    for (const type of allTypes) {
      assert.equal(
        gate.shouldBlockEvent(type),
        false,
        `Level 3 不阻擋任何事件：${type}`
      );
    }
  });

  // ─── 同步路徑4：pullAllEvents sanitizeEvent ───────────────────────────────

  await runTest('[sync] sanitizeEvent: product_updated payload 被正確脫敏', () => {
    const event = cloudEvent('product_updated', {
      updates: {
        productId: 'product-1',
        name: '手工皂',
        cost: 50,
        profitMargin: 0.4,
        price: 100,
        stock: 20,
      },
    });

    // Level 2
    const gateL2 = createPermissionGate({ infoLevel: 2, entity: 'event' });
    const resultL2 = gateL2.sanitizeEvent(event as unknown as { type: string; payload?: unknown });
    const updatesL2 = (resultL2.payload as Record<string, unknown>)?.updates as Record<string, unknown> | undefined;
    assert.equal(updatesL2?.cost, undefined, 'Level 2 移除 updates.cost');
    assert.equal(updatesL2?.profitMargin, undefined, 'Level 2 移除 updates.profitMargin');
    assert.equal(updatesL2?.price, 100, 'Level 2 保留 updates.price');
    assert.equal(updatesL2?.stock, 20, 'Level 2 保留 updates.stock');
    assert.equal(updatesL2?.name, '手工皂', 'Level 2 保留 updates.name');

    // Level 1
    const gateL1 = createPermissionGate({ infoLevel: 1, entity: 'event' });
    const resultL1 = gateL1.sanitizeEvent(event as unknown as { type: string; payload?: unknown });
    const updatesL1 = (resultL1.payload as Record<string, unknown>)?.updates as Record<string, unknown> | undefined;
    assert.equal(updatesL1?.price, undefined, 'Level 1 移除 updates.price');
    assert.equal(updatesL1?.stock, 20, 'Level 1 保留 updates.stock');
  });

  await runTest('[sync] sanitizeEvent: market_created 保留名稱/位置，移除成本', () => {
    // boothCost 和 totalCost 放在 payload 內（與真實事件結構一致）
    const event = {
      id: 'event-mc-1',
      type: 'market_created',
      market_id: 'market-1',
      actor_id: 'owner-1',
      timestamp: Date.now(),
      payload: {
        name: '南軟市集',
        location: '台北',
        totalCost: 5000,
        boothCost: 2000,
        revenue: 8000,
      },
    };

    const gate = createPermissionGate({ infoLevel: 2, entity: 'event' });
    const result = gate.sanitizeEvent(event as unknown as { type: string; payload?: unknown });
    const payload = result.payload as Record<string, unknown>;

    assert.equal(payload.name, '南軟市集', '保留名稱');
    assert.equal(payload.location, '台北', '保留位置');
    assert.equal(payload.totalCost, undefined, '移除 totalCost');
    assert.equal(payload.boothCost, undefined, '移除 boothCost');
    assert.equal(payload.revenue, 8000, '保留 revenue（Level 2）');
  });

  // C2.30A-1.1：rental 欄位在 event payload 中保留金額（員工可看金額）
  // 員工 sync events replay 時需讀取 tableRental 寫入市集 snapshot
  await runTest('[sync] sanitizeEvent: market_created 保留 rental 金額（員工可見）', () => {
    const event = {
      id: 'event-mc-rental',
      type: 'market_created',
      market_id: 'market-rental-1',
      actor_id: 'owner-1',
      timestamp: Date.now(),
      payload: {
        name: '南軟市集',
        location: '台北',
        tableRental: 500,
        chairRental: 200,
        umbrellaRental: 100,
        tableclothRental: 50,
      },
    };

    const gate = createPermissionGate({ infoLevel: 2, entity: 'event' });
    const result = gate.sanitizeEvent(event as unknown as { type: string; payload?: unknown });
    const payload = result.payload as Record<string, unknown>;

    // 員工需保留 rental 金額（> 0 = 已承租），金額本身不脫敏
    assert.equal(payload.tableRental, 500, '保留 event payload.tableRental 金額給 events replay');
    assert.equal(payload.chairRental, 200, '保留 event payload.chairRental');
    assert.equal(payload.umbrellaRental, 100, '保留 event payload.umbrellaRental');
    assert.equal(payload.tableclothRental, 50, '保留 event payload.tableclothRental');
  });

  await runTest('[sync] sanitizeEventsWithLevel: 過濾+脫敏完整流程', () => {
    const events = [
      cloudEvent('cost_added', { cost: 500 }),
      cloudEvent('deal_closed', { revenue: 1000, cost: 400 }),
      cloudEvent('market_created', { name: '市集A', totalCost: 1000 }),
      cloudEvent('cost_updated', { cost: 600 }),
      cloudEvent('interaction_recorded', { count: 10 }),
    ];

    // Level 2：保留 deal_closed、market_created、interaction_recorded
    // (interaction_recorded 在 Level 0 才被阻擋)
    const resultsL2 = sanitizeEventsWithLevel(events as any[], 2);
    assert.equal(resultsL2.length, 3, 'Level 2 保留 3 個事件（deal_closed, market_created, interaction_recorded）');
    assert.equal(resultsL2[0].type, 'deal_closed', 'Level 2 保留 deal_closed');
    assert.equal(resultsL2[1].type, 'market_created', 'Level 2 保留 market_created');
    assert.equal(resultsL2[2].type, 'interaction_recorded', 'Level 2 保留 interaction_recorded');
    assert.equal((resultsL2[0].payload as Record<string, unknown>).cost, undefined, 'deal_closed payload.cost 被移除');

    // Level 1：cost_added 和 cost_updated 被 COST_EVENT_TYPES 阻擋，
    // deal_closed 被 REVENUE_EVENT_TYPES 阻擋（infoLevel <= 1），
    // 保留 market_created 和 interaction_recorded
    const resultsL1 = sanitizeEventsWithLevel(events as any[], 1);
    assert.equal(resultsL1.length, 2, 'Level 1 保留 2 個事件（market_created, interaction_recorded）');
    const l1Types = resultsL1.map(e => e.type);
    assert.ok(l1Types.includes('market_created'), 'Level 1 保留 market_created');
    assert.ok(l1Types.includes('interaction_recorded'), 'Level 1 保留 interaction_recorded');

    // Level 0：cost_added/cost_updated 被 COST_EVENT_TYPES 阻擋，
    // deal_closed 被 REVENUE_EVENT_TYPES 阻擋，
    // interaction_recorded 被 INTERACTION_EVENT_TYPES 阻擋，
    // 只保留 market_created
    const resultsL0 = sanitizeEventsWithLevel(events as any[], 0);
    assert.equal(resultsL0.length, 1, 'Level 0 保留 1 個事件（market_created）');
    assert.equal(resultsL0[0].type, 'market_created', 'Level 0 只保留 market_created');
  });

  // ─── 同步路徑5：syncMarketsToIndexedDB ─────────────────────────────────

  await runTest('[sync] syncMarketsToIndexedDB market 完整管道（Level 2）', () => {
    const market = cloudMarket();
    const gate = createPermissionGate({ infoLevel: 2, entity: 'market' });
    const result = gate.sanitize(market);

    // 這些欄位不會出現在 IndexedDB 中
    const r = result as Record<string, unknown>;
    assert.equal(r.totalCost, undefined);
    assert.equal(r.profitMargin, undefined);
    assert.equal(r.boothCost, undefined);
    assert.equal(r.costBreakdown, undefined);
    assert.equal(r.revenue, 8000); // Level 2 可見
  });

  // ─── 角色解析集成 ────────────────────────────────────────────────────────

  await runTest('[角色解析] 老闆 → Level 3 → 可見所有敏感資料', () => {
    const role = ownerRole();
    const level = resolveInfoLevel(role);
    assert.equal(level, 3);

    const gate = createPermissionGate({ infoLevel: level, entity: 'market' });
    const result = gate.sanitizeMarketProjection(cloudMarket() as unknown as Record<string, unknown>);

    assert.equal(result.totalCost, 5000, '老闆視角：totalCost 可見');
    assert.equal(result.revenue, 8000, '老闆視角：revenue 可見');
    assert.equal(result.totalInteractions, 50, '老闆視角：totalInteractions 可見');
  });

  await runTest('[角色解析] 員工 → Level 2 → 隱藏成本利潤，保留收入', () => {
    const role = staffRole();
    const level = resolveInfoLevel(role);
    assert.equal(level, 2);

    const gate = createPermissionGate({ infoLevel: level, entity: 'market' });
    const result = gate.sanitizeMarketProjection(cloudMarket() as unknown as Record<string, unknown>);

    assert.equal(result.totalCost, undefined, '員工視角：totalCost 被移除');
    assert.equal(result.totalProfit, undefined, '員工視角：totalProfit 被移除');
    assert.equal(result.revenue, 8000, '員工視角：revenue 保留');
    assert.equal(result.name, '南軟市集', '員工視角：name 保留');
  });

  // ─── 邊界條件 ────────────────────────────────────────────────────────────

  await runTest('空陣列安全處理', () => {
    const results = sanitizeEventsWithLevel([], 2);
    assert.equal(results.length, 0);
  });

  await runTest('空 SensitiveFields（Level 3）不遍歷', () => {
    const market = cloudMarket();
    const gate = createPermissionGate({ infoLevel: 3, entity: 'market' });
    assert.equal(gate.getSensitiveFields().length, 0, 'Level 3 無敏感欄位');
    const result = gate.sanitizeMarketProjection(market as unknown as Record<string, unknown>);
    assert.equal(result.totalCost, 5000, 'Level 3 不做任何脫敏');
  });

  await runTest('snake_case 欄位同步被移除（camelCase 同理）', () => {
    const market = { id: 'm1', total_cost: 5000, totalCost: 5001, revenue: 8000, total_revenue: 8001 };
    const gate = createPermissionGate({ infoLevel: 2, entity: 'market' });
    const result = gate.sanitizeMarketProjection(market as unknown as Record<string, unknown>);

    assert.equal(result.total_cost, undefined, 'snake_case total_cost 被移除');
    assert.equal(result.totalCost, undefined, 'camelCase totalCost 被移除');
    assert.equal(result.revenue, 8000, 'revenue 保留');
    assert.equal(result.total_revenue, 8001, 'total_revenue 保留');
  });

  console.log('\n=== 全部通過 ===');
}

main().catch((error) => {
  console.error('測試執行失敗:', error);
  process.exit(1);
});

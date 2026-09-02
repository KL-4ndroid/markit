/**
 * PermissionGate 單元測試
 *
 * 測試脫敏閘道的 pure functions：
 * - 各 infoLevel 的敏感欄位定義
 * - sanitize 行為
 * - shouldBlockEvent 事件過濾
 * - resolveInfoLevel 解析邏輯
 * - canViewSensitiveData UI helper
 */

import assert from 'node:assert/strict';
import {
  PermissionGate,
  createPermissionGate,
  resolveInfoLevel,
  sanitizeWithLevel,
  sanitizeArrayWithLevel,
  sanitizeEventsWithLevel,
  canViewSensitiveData,
  renderSensitiveData,
  maskSensitiveValue,
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

const ownerRole = { isStaff: false, ownerId: 'owner-1', permissions: { can_view: true, can_edit: true } };
const staffRole = { isStaff: true, ownerId: 'owner-1', permissions: { can_view: true, can_edit: false } };
const nullRole = null;
const undefinedRole = undefined;

async function main(): Promise<void> {
  console.log('\n=== PermissionGate 單元測試 ===\n');

  // ─── resolveInfoLevel ───────────────────────────────────────────────────────

  await runTest('resolveInfoLevel: 老闆 → 3', () => {
    assert.equal(resolveInfoLevel(ownerRole), 3);
  });

  await runTest('resolveInfoLevel: 員工 → 2', () => {
    assert.equal(resolveInfoLevel(staffRole), 2);
  });

  await runTest('resolveInfoLevel: null → 3', () => {
    assert.equal(resolveInfoLevel(nullRole), 3);
  });

  await runTest('resolveInfoLevel: undefined → 3', () => {
    assert.equal(resolveInfoLevel(undefinedRole), 3);
  });

  // ─── canViewSensitiveData ─────────────────────────────────────────────────

  await runTest('canViewSensitiveData: 老闆 → true', () => {
    assert.equal(canViewSensitiveData(ownerRole), true);
  });

  await runTest('canViewSensitiveData: 員工 → false', () => {
    assert.equal(canViewSensitiveData(staffRole), false);
  });

  await runTest('canViewSensitiveData: null → true', () => {
    assert.equal(canViewSensitiveData(nullRole), true);
  });

  // ─── maskSensitiveValue ──────────────────────────────────────────────────

  await runTest('maskSensitiveValue: currency → "***"', () => {
    assert.equal(maskSensitiveValue(1000, 'currency'), '***');
  });

  await runTest('maskSensitiveValue: text → "******"', () => {
    assert.equal(maskSensitiveValue('secret', 'text'), '******');
  });

  // ─── renderSensitiveData ─────────────────────────────────────────────────

  await runTest('renderSensitiveData: 老闆回傳原值', () => {
    assert.equal(renderSensitiveData('NT$1,000', ownerRole), 'NT$1,000');
  });

  await runTest('renderSensitiveData: 員工回傳遮罩值', () => {
    assert.equal(renderSensitiveData('NT$1,000', staffRole), '***');
  });

  await runTest('renderSensitiveData: 自訂遮罩值', () => {
    assert.equal(renderSensitiveData('secret', staffRole, '🔒'), '🔒');
  });

  await runTest('renderSensitiveData: 數字原值與遮罩', () => {
    assert.equal(renderSensitiveData(999, ownerRole), 999);
    assert.equal(renderSensitiveData(999, staffRole), '***');
  });

  // ─── sanitizeWithLevel：Level 3（老闆）不做任何脫敏 ─────────────────────────

  await runTest('sanitize Level 3: market 保留所有欄位', () => {
    const market = {
      id: 'm1',
      name: '南軟市集',
      totalCost: 5000,
      totalProfit: 3000,
      boothCost: 2000,
    };
    const result = sanitizeWithLevel(market, 'market', 3);
    assert.equal(result.totalCost, 5000);
    assert.equal(result.totalProfit, 3000);
    assert.equal(result.boothCost, 2000);
    assert.equal(result.name, '南軟市集');
  });

  await runTest('sanitize Level 3: product 保留所有欄位', () => {
    const product = {
      id: 'p1',
      name: '手工皂',
      cost: 50,
      profitMargin: 0.4,
    };
    const result = sanitizeWithLevel(product, 'product', 3);
    assert.equal(result.cost, 50);
    assert.equal(result.profitMargin, 0.4);
  });

  // ─── sanitizeWithLevel：Level 2（員工完整）隱藏成本/利潤 ───────────────────

  await runTest('sanitize Level 2: market 移除成本利潤欄位', () => {
    const market = {
      id: 'm1',
      name: '南軟市集',
      totalCost: 5000,
      totalProfit: 3000,
      netProfit: 2500,
      boothCost: 2000,
      registrationFee: 1000,
      totalRevenue: 8000,
    };
    const result = sanitizeWithLevel(market, 'market', 2) as Record<string, unknown>;
    assert.equal(result.name, '南軟市集');
    assert.equal(result.totalCost, undefined);
    assert.equal(result.totalProfit, undefined);
    assert.equal(result.netProfit, undefined);
    assert.equal(result.boothCost, undefined);
    assert.equal(result.registrationFee, undefined);
    // revenue 不是 Level 2 的敏感欄位
    assert.equal(result.totalRevenue, 8000);
  });

  await runTest('sanitize Level 2: product 移除成本/利潤欄位', () => {
    const product = {
      id: 'p1',
      name: '手工皂',
      price: 100,
      cost: 50,
      profitMargin: 0.5,
      supplierInfo: '供應商A',
    };
    const result = sanitizeWithLevel(product, 'product', 2) as Record<string, unknown>;
    assert.equal(result.name, '手工皂');
    assert.equal(result.price, 100); // 員工可見定價
    assert.equal(result.cost, undefined);
    assert.equal(result.profitMargin, undefined);
    assert.equal(result.supplierInfo, undefined);
  });

  await runTest('sanitize Level 2: 保留 non-sensitive 欄位', () => {
    const market = {
      id: 'm1',
      name: '南軟市集',
      location: '台北',
      status: 'active',
      ownerId: 'owner-1',
    };
    const result = sanitizeWithLevel(market, 'market', 2) as Record<string, unknown>;
    assert.equal(result.name, '南軟市集');
    assert.equal(result.location, '台北');
    assert.equal(result.status, 'active');
    assert.equal(result.ownerId, 'owner-1');
  });

  // ─── sanitizeWithLevel：Level 1（員工基本）額外隱藏 revenue/price ─────────────

  await runTest('sanitize Level 1: market 移除 revenue', () => {
    const market = {
      id: 'm1',
      name: '南軟市集',
      totalRevenue: 8000,
      totalCost: 5000,
    };
    const result = sanitizeWithLevel(market, 'market', 1) as Record<string, unknown>;
    assert.equal(result.totalRevenue, undefined);
    assert.equal(result.totalCost, undefined);
    assert.equal(result.name, '南軟市集');
  });

  await runTest('sanitize Level 1: product 移除 price', () => {
    const product = {
      id: 'p1',
      name: '手工皂',
      price: 100,
      cost: 50,
    };
    const result = sanitizeWithLevel(product, 'product', 1) as Record<string, unknown>;
    assert.equal(result.price, undefined);
    assert.equal(result.cost, undefined);
  });

  // ─── sanitizeWithLevel：Level 0（員工僅操作）隱藏幾乎所有數值 ─────────────────

  await runTest('sanitize Level 0: market 移除所有數值欄位', () => {
    const market = {
      id: 'm1',
      name: '南軟市集',
      location: '台北',
      totalRevenue: 8000,
      totalInteractions: 50,
      totalDeals: 10,
    };
    const result = sanitizeWithLevel(market, 'market', 0) as Record<string, unknown>;
    assert.equal(result.name, '南軟市集');
    assert.equal(result.location, '台北');
    assert.equal(result.totalRevenue, undefined);
    assert.equal(result.totalInteractions, undefined);
    assert.equal(result.totalDeals, undefined);
  });

  await runTest('sanitize Level 0: 員工只知道在哪裡擺攤', () => {
    const market = {
      id: 'm1',
      name: '南軟市集',
      location: '台北',
      startDate: '2026-03-01',
      endDate: '2026-03-03',
    };
    const result = sanitizeWithLevel(market, 'market', 0) as Record<string, unknown>;
    assert.equal(result.name, '南軟市集');
    assert.equal(result.location, '台北');
    assert.equal(result.startDate, '2026-03-01');
    assert.equal(result.endDate, '2026-03-03');
  });

  // ─── sanitizeArrayWithLevel ──────────────────────────────────────────────

  await runTest('sanitizeArray: 一次脫敏整個陣列', () => {
    const products = [
      { id: 'p1', name: '手工皂', cost: 50, price: 100 },
      { id: 'p2', name: '香氛蠟燭', cost: 80, price: 200 },
    ];
    const results = sanitizeArrayWithLevel(products, 'product', 2) as Array<Record<string, unknown>>;
    assert.equal(results[0].cost, undefined);
    assert.equal(results[0].price, 100);
    assert.equal(results[1].cost, undefined);
    assert.equal(results[1].price, 200);
  });

  await runTest('sanitizeArray: 空陣列安全處理', () => {
    const results = sanitizeArrayWithLevel([], 'market', 2);
    assert.equal(results.length, 0);
  });

  // ─── 巢狀物件脫敏 ──────────────────────────────────────────────────────────

  await runTest('sanitize: 遞迴處理巢狀物件', () => {
    const market = {
      id: 'm1',
      name: '南軟市集',
      costBreakdown: {
        boothCost: 2000,
        registrationFee: 1000,
        totalCost: 3000,
      },
    };
    const result = sanitizeWithLevel(market, 'market', 2) as Record<string, unknown>;
    const breakdown = result.costBreakdown as Record<string, unknown> | undefined;
    assert.equal(breakdown?.boothCost, undefined);
    assert.equal(breakdown?.registrationFee, undefined);
    assert.equal(breakdown?.totalCost, undefined);
  });

  await runTest('sanitize: 遞迴處理巢狀陣列', () => {
    const market = {
      id: 'm1',
      name: '南軟市集',
      costBreakdown: {
        boothCost: 2000,
        registrationFee: 1000,
        totalCost: 3000,
      },
      notes: [
        { text: '注意 A', boothCost: 5000 },
        { text: '注意 B', totalCost: 3000 },
      ],
    };
    const result = sanitizeWithLevel(market, 'market', 2) as Record<string, unknown>;
    // 外層 market 的成本欄位被移除
    const notes = result.notes as Array<Record<string, unknown>>;
    assert.equal(notes[0].boothCost, undefined); // 巢狀陣列中的 market 敏感欄位也應被移除
    assert.equal(notes[1].totalCost, undefined);
    assert.equal(notes[0].text, '注意 A'); // 非敏感欄位保留
    assert.equal(notes[1].text, '注意 B');
  });

  // ─── shouldBlockEvent ────────────────────────────────────────────────────

  await runTest('shouldBlockEvent: Level 3 老闆不禁用任何事件', () => {
    const gate = createPermissionGate({ infoLevel: 3, entity: 'event' });
    assert.equal(gate.shouldBlockEvent('cost_added'), false);
    assert.equal(gate.shouldBlockEvent('deal_closed'), false);
    assert.equal(gate.shouldBlockEvent('interaction_recorded'), false);
  });

  await runTest('shouldBlockEvent: Level 2 員工擋成本事件，允許成交', () => {
    const gate = createPermissionGate({ infoLevel: 2, entity: 'event' });
    assert.equal(gate.shouldBlockEvent('cost_added'), true);
    assert.equal(gate.shouldBlockEvent('cost_updated'), true);
    assert.equal(gate.shouldBlockEvent('cost_deleted'), true);
    assert.equal(gate.shouldBlockEvent('inventory_cost_updated'), true);
    assert.equal(gate.shouldBlockEvent('deal_closed'), false); // Level 2 允許成交
    assert.equal(gate.shouldBlockEvent('interaction_recorded'), false);
  });

  await runTest('shouldBlockEvent: Level 1 員工擋成本+成交事件', () => {
    const gate = createPermissionGate({ infoLevel: 1, entity: 'event' });
    assert.equal(gate.shouldBlockEvent('cost_added'), true);
    assert.equal(gate.shouldBlockEvent('deal_closed'), true); // Level 1 開始擋
    assert.equal(gate.shouldBlockEvent('deal_deleted'), true);
    assert.equal(gate.shouldBlockEvent('interaction_recorded'), false);
  });

  await runTest('shouldBlockEvent: Level 0 員工擋成本+成交+互動事件', () => {
    const gate = createPermissionGate({ infoLevel: 0, entity: 'event' });
    assert.equal(gate.shouldBlockEvent('cost_added'), true);
    assert.equal(gate.shouldBlockEvent('deal_closed'), true);
    assert.equal(gate.shouldBlockEvent('deal_deleted'), true);
    assert.equal(gate.shouldBlockEvent('interaction_recorded'), true); // Level 0 開始擋
    assert.equal(gate.shouldBlockEvent('interaction_deleted'), true);
  });

  // ─── sanitizeEventsWithLevel ──────────────────────────────────────────────

  await runTest('sanitizeEventsWithLevel: 過濾成本事件（Level 2）', () => {
    const events = [
      { id: 'e1', type: 'cost_added', payload: { cost: 500 } },
      { id: 'e2', type: 'deal_closed', payload: { revenue: 1000 } },
      { id: 'e3', type: 'cost_updated', payload: { cost: 600 } },
      { id: 'e4', type: 'interaction_recorded', payload: { count: 5 } },
    ];
    const results = sanitizeEventsWithLevel(events, 2);
    assert.equal(results.length, 2);
    assert.equal(results[0].id, 'e2');
    assert.equal(results[1].id, 'e4');
  });

  await runTest('sanitizeEventsWithLevel: Level 3 不做任何過濾', () => {
    const events = [
      { id: 'e1', type: 'cost_added', payload: { cost: 500 } },
      { id: 'e2', type: 'deal_closed', payload: { revenue: 1000 } },
    ];
    const results = sanitizeEventsWithLevel(events, 3);
    assert.equal(results.length, 2);
  });

  await runTest('sanitizeEventsWithLevel: Level 1 額外過濾成交事件', () => {
    const events = [
      { id: 'e1', type: 'cost_added', payload: { cost: 500 } },
      { id: 'e2', type: 'deal_closed', payload: { revenue: 1000 } },
      { id: 'e3', type: 'interaction_recorded', payload: { count: 5 } },
    ];
    const results = sanitizeEventsWithLevel(events, 1);
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'e3');
  });

  await runTest('sanitizeEventsWithLevel: Level 0 過濾成本+成交+互動', () => {
    const events = [
      { id: 'e1', type: 'cost_added', payload: { cost: 500 } },
      { id: 'e2', type: 'deal_closed', payload: { revenue: 1000 } },
      { id: 'e3', type: 'interaction_recorded', payload: { count: 5 } },
      { id: 'e4', type: 'market_created', payload: { name: '新市集' } },
    ];
    const results = sanitizeEventsWithLevel(events, 0);
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'e4');
  });

  await runTest('sanitizeEventsWithLevel: 保留事件 payload 的非敏感欄位', () => {
    const events = [
      {
        id: 'e1',
        type: 'deal_closed',
        payload: { revenue: 1000, cost: 500, productName: '手工皂' },
      },
    ];
    const results = sanitizeEventsWithLevel(events, 2);
    assert.equal(results.length, 1);
    assert.equal(results[0].payload?.cost, undefined); // cost 是 Level 2 敏感欄位
    assert.equal(results[0].payload?.revenue, 1000);   // revenue 不是 Level 2 敏感欄位，應保留
    assert.equal(results[0].payload?.productName, '手工皂');
  });

  // ─── PermissionGate 實例方法 ──────────────────────────────────────────────

  await runTest('PermissionGate.isOwner: Level 3 → true', () => {
    const gate = createPermissionGate({ infoLevel: 3, entity: 'market' });
    assert.equal(gate.isOwner(), true);
  });

  await runTest('PermissionGate.isOwner: Level 2 → false', () => {
    const gate = createPermissionGate({ infoLevel: 2, entity: 'market' });
    assert.equal(gate.isOwner(), false);
  });

  await runTest('PermissionGate.needsSanitization: Level 3 → false', () => {
    const gate = createPermissionGate({ infoLevel: 3, entity: 'market' });
    assert.equal(gate.needsSanitization(), false);
  });

  await runTest('PermissionGate.needsSanitization: Level 2 → true', () => {
    const gate = createPermissionGate({ infoLevel: 2, entity: 'market' });
    assert.equal(gate.needsSanitization(), true);
  });

  await runTest('PermissionGate.sanitizeMarketProjection: Level 2 清理市場快照', () => {
    const market = {
      id: 'm1',
      name: '南軟市集',
      totalCost: 5000,
      totalProfit: 3000,
    };
    const gate = createPermissionGate({ infoLevel: 2, entity: 'market' });
    const result = gate.sanitizeMarketProjection(market as Record<string, unknown>);
    assert.equal(result.name, '南軟市集');
    assert.equal(result.totalCost, undefined);
    assert.equal(result.totalProfit, undefined);
  });

  await runTest('PermissionGate.sanitizeDailyStatsProjection: Level 2 清理統計快照', () => {
    const stats = {
      id: 's1',
      date: '2026-03-01',
      totalCost: 5000,
      netProfit: 3000,
      revenue: 8000,
    };
    const gate = createPermissionGate({ infoLevel: 2, entity: 'stats' });
    const result = gate.sanitizeDailyStatsProjection(stats as Record<string, unknown>);
    assert.equal(result.totalCost, undefined);
    assert.equal(result.netProfit, undefined);
    assert.equal(result.revenue, 8000); // revenue 不是 Level 2 敏感欄位
  });

  // ─── 邊界條件 ─────────────────────────────────────────────────────────────

  await runTest('sanitize: null 輸入安全處理', () => {
    const result = sanitizeWithLevel(null as unknown as Record<string, unknown>, 'market', 2);
    assert.equal(result, null);
  });

  await runTest('sanitize: 陣列中混合物件安全處理', () => {
    const items = [
      { id: 'p1', cost: 50, price: 100 },
      null,
      { id: 'p2', cost: 80, price: 200 },
    ];
    const results = sanitizeArrayWithLevel(items, 'product', 2) as Array<Record<string, unknown>>;
    assert.equal(results[0].cost, undefined);
    assert.equal(results[1], null);
    assert.equal(results[2].cost, undefined);
  });

  await runTest('sanitize: 原始類型（非物件）安全處理', () => {
    const result = sanitizeWithLevel(123 as unknown as Record<string, unknown>, 'market', 2);
    assert.equal(result, 123);
  });

  await runTest('COST_EVENT_TYPES: 包含所有成本相關事件', () => {
    assert.equal(COST_EVENT_TYPES.has('cost_added'), true);
    assert.equal(COST_EVENT_TYPES.has('cost_updated'), true);
    assert.equal(COST_EVENT_TYPES.has('cost_deleted'), true);
    assert.equal(COST_EVENT_TYPES.has('inventory_cost_updated'), true);
    assert.equal(COST_EVENT_TYPES.has('deal_closed'), false);
  });

  await runTest('REVENUE_EVENT_TYPES: 包含成交相關事件', () => {
    assert.equal(REVENUE_EVENT_TYPES.has('deal_closed'), true);
    assert.equal(REVENUE_EVENT_TYPES.has('deal_deleted'), true);
    assert.equal(REVENUE_EVENT_TYPES.has('cost_added'), false);
  });

  await runTest('INTERACTION_EVENT_TYPES: 包含互動相關事件', () => {
    assert.equal(INTERACTION_EVENT_TYPES.has('interaction_recorded'), true);
    assert.equal(INTERACTION_EVENT_TYPES.has('interaction_deleted'), true);
    assert.equal(INTERACTION_EVENT_TYPES.has('deal_closed'), false);
  });

  console.log('\n=== 全部通過 ===');
}

main().catch((error) => {
  console.error('測試執行失敗:', error);
  process.exit(1);
});

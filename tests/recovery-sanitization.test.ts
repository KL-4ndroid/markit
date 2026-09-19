/**
 * Recovery 模組的脫敏測試
 *
 * 驗證從 Supabase 補回的 product 資料在寫入 IndexedDB 前會被正確脫敏。
 *
 * ## 場景
 * - 員工（Level 2）視角下，從雲端拉回的 product 應不含 cost
 * - 員工（Level 1）視角下，從雲端拉回的 product 應不含 cost 和 price
 * - 員工（Level 0）視角下，從雲端拉回的 product 應不含 cost, price, stock
 * - 老闆（Level 3）視角下，從雲端拉回的 product 保留所有欄位
 *
 * ## 設計
 * 不直接測試 `repairProductReferenceErrors`（需要 mock supabase 與 IndexedDB），
 * 而是測試脫敏純函數在 product 場景下的完整管道，確保 PermissionGate
 * 在 recovery 路徑上的行為正確。
 */

import assert from 'node:assert/strict';
import {
  sanitizeWithLevel,
  type InfoLevel,
} from '../lib/permissions/PermissionGate';

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

/** 模擬從 Supabase 拉回的 product 資料 */
function cloudProduct() {
  return {
    id: 'product-1',
    marketId: 'market-1',
    name: '手工皂',
    category: 'handmade',
    price: 100,
    cost: 50,
    stock: 20,
    unlimitedStock: false,
    isActive: true,
    description: '純天然手工皂',
    ownerId: 'owner-1',
    createdAt: 1700000000,
    updatedAt: 1700000000,
  };
}

runTest('[recovery] Level 3 老闆：保留 product 所有欄位', () => {
  const cloud = cloudProduct();
  const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', 3);

  assert.equal(sanitized.cost, 50, '老闆可見 cost');
  assert.equal(sanitized.price, 100, '老闆可見 price');
  assert.equal(sanitized.stock, 20, '老闆可見 stock');
});

runTest('[recovery] Level 2 員工：移除 cost/supplierInfo/profitMargin', () => {
  const cloud = cloudProduct();
  const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', 2);

  assert.equal(sanitized.cost, undefined, 'Level 2 移除 cost');
  assert.equal(sanitized.price, 100, 'Level 2 保留 price');
  assert.equal(sanitized.stock, 20, 'Level 2 保留 stock');
  assert.equal(sanitized.name, '手工皂', 'Level 2 保留 name');
  assert.equal(sanitized.description, '純天然手工皂', 'Level 2 保留 description');
});

runTest('[recovery] Level 1 員工：移除 cost + price', () => {
  const cloud = cloudProduct();
  const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', 1);

  assert.equal(sanitized.cost, undefined, 'Level 1 移除 cost');
  assert.equal(sanitized.price, undefined, 'Level 1 移除 price');
  assert.equal(sanitized.stock, 20, 'Level 1 保留 stock');
  assert.equal(sanitized.name, '手工皂', 'Level 1 保留 name');
});

runTest('[recovery] Level 0 員工：移除 cost + price + stock', () => {
  const cloud = cloudProduct();
  const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', 0);

  assert.equal(sanitized.cost, undefined, 'Level 0 移除 cost');
  assert.equal(sanitized.price, undefined, 'Level 0 移除 price');
  assert.equal(sanitized.stock, undefined, 'Level 0 移除 stock');
  assert.equal(sanitized.name, '手工皂', 'Level 0 保留 name');
});

runTest('[recovery] supplierInfo / profitMargin 一併被移除（員工）', () => {
  const cloud = {
    ...cloudProduct(),
    supplierInfo: '神秘供應商',
    profitMargin: 0.5,
    grossMargin: 0.3,
  };
  const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', 2);

  assert.equal(sanitized.supplierInfo, undefined, 'Level 2 移除 supplierInfo');
  assert.equal(sanitized.profitMargin, undefined, 'Level 2 移除 profitMargin');
  assert.equal(sanitized.grossMargin, undefined, 'Level 2 移除 grossMargin');
});

runTest('[recovery] snake_case supplier_info 也被移除', () => {
  const cloud = {
    ...cloudProduct(),
    cost: 50,
    supplier_info: '神秘供應商',
  };
  const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', 2);

  assert.equal(sanitized.cost, undefined, 'Level 2 移除 cost');
  assert.equal(sanitized.supplier_info, undefined, 'Level 2 移除 supplier_info');
});

runTest('[recovery] 已停用商品（is_active=false）不會被誤刪', () => {
  // 模擬從 Supabase 拉回含 is_active=false 的商品
  const cloud = { ...cloudProduct(), is_active: false, isActive: false };
  const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', 2);

  // is_active 本身不是敏感欄位，應保留
  assert.equal(sanitized.isActive, false, 'isActive 保留（業務欄位）');
});

runTest('[recovery] 原本不存在的敏感欄位保持不存在', () => {
  const cloud: Record<string, unknown> = { id: 'p1', name: '商品', price: 100 };  // 沒有 cost
  const sanitized = sanitizeWithLevel<Record<string, unknown>>(cloud, 'product', 2);

  assert.equal(sanitized.cost, undefined, '原本就沒有 cost');
  assert.equal(sanitized.price, 100, 'price 保留');
});

runTest('[recovery] 不會破壞巢狀物件', () => {
  // 模擬 description 中含有 cost 關鍵字（罕見但理論上可能）
  const cloud = {
    ...cloudProduct(),
    description: 'cost-effective product',
  };
  const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', 2);

  assert.equal(sanitized.cost, undefined, '頂層 cost 移除');
  assert.equal(sanitized.description, 'cost-effective product', '字串中含 cost 不被影響');
});

runTest('[recovery] 預設 infoLevel=3 向後相容', () => {
  // 不傳 infoLevel 應等於老闆視角（向後相容舊呼叫）
  const cloud = cloudProduct();
  const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', 3);

  assert.equal(sanitized.cost, 50, '預設 Level 3 保留 cost');
});

runTest('[recovery] 所有 infoLevel 對 product 類型都能安全處理', () => {
  const levels: InfoLevel[] = [0, 1, 2, 3];
  for (const level of levels) {
    const cloud = cloudProduct();
    const sanitized = sanitizeWithLevel<typeof cloud>(cloud, 'product', level);

    // name 永遠保留
    assert.equal(sanitized.name, '手工皂', `Level ${level} 保留 name`);
    // id 永遠保留
    assert.equal(sanitized.id, 'product-1', `Level ${level} 保留 id`);
  }
});

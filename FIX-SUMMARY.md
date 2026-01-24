# 問題修復總結

## ✅ 問題 1：市集場次顯示錯誤 - 已修復

### 問題原因
`useMonthlyStats` 使用 `dailyStats` 表來統計市集數量，但 `dailyStats` 是按日期分組的，一天只有一筆記錄。如果同一天有多個市集，只會記錄最後一個市集的 ID，導致市集數量統計錯誤。

### 修復方案
直接從 `markets` 表統計本月的市集數量，並從 `markets` 表累加統計數據。

### 修復位置
- **檔案：** `lib/db/hooks.ts`
- **函數：** `useMonthlyStats()`

### 修復內容
```typescript
// ❌ 修復前（錯誤）
const stats = await db.dailyStats
  .where('date')
  .between(startDate, endDate, true, true)
  .toArray();

const marketIds = new Set<string>();
for (const stat of stats) {
  if (stat.marketId) {
    marketIds.add(stat.marketId);  // 問題：會漏掉同一天的其他市集
  }
}
summary.marketCount = marketIds.size;

// ✅ 修復後（正確）
const markets = await db.markets
  .where('startDate')
  .between(startDate, endDate, true, true)
  .toArray();

summary.marketCount = markets.length;  // 直接使用市集數量

// 從 markets 表累加統計
for (const market of markets) {
  summary.totalRevenue += market.totalRevenue || 0;
  summary.totalProfit += market.totalProfit || 0;
  summary.totalDeals += market.totalDeals || 0;
  summary.totalInteractions += market.totalInteractions || 0;
}
```

### 測試方法
1. 刷新首頁
2. 檢查「市集場次」數字是否正確
3. 應該顯示本月所有市集的數量（包括同一天的多個市集）

---

## ❌ 問題 2：商品沒有同步 - 需要修復

### 問題原因
**商品創建時沒有傳入 `market_id`**，導致：
1. 商品事件的 `market_id` 為 `undefined`
2. Supabase 的 `products` 表有 `market_id` 外鍵約束
3. 插入失敗，商品無法同步

### 問題代碼
**檔案：** `components/products/AddProductForm.tsx`

```typescript
// ❌ 問題：沒有 market_id
const [formData, setFormData] = useState<ProductCreatedPayload>({
  name: '',
  category: 'handmade',
  price: 0,
  cost: 0,
  stock: 0,
  unlimitedStock: false,
  description: '',
  // ❌ 缺少 market_id
});

await createProduct(formData);  // ❌ 沒有 market_id
```

### 修復方案

有兩個選擇：

#### 方案 A：商品不關聯市集（推薦）
商品作為全域資源，不綁定特定市集。

**優點：**
- 商品可以在多個市集重複使用
- 更靈活的商品管理
- 符合實際使用場景（同一個商品可以在不同市集販售）

**修改：**
1. 移除 `products` 表的 `market_id` 外鍵約束
2. 商品創建時不需要 `market_id`
3. 成交時記錄商品 ID 即可

#### 方案 B：商品關聯市集
每個商品必須屬於一個市集。

**優點：**
- 更嚴格的數據關聯
- 可以按市集管理商品

**缺點：**
- 同一個商品在不同市集需要重複創建
- 用戶體驗較差

**修改：**
1. 在商品創建表單添加市集選擇器
2. 傳入 `market_id` 到 `createProduct`

---

## 🎯 推薦修復方案：方案 A

### 理由
1. **符合實際使用場景**：攤販通常會在多個市集販售相同商品
2. **更好的用戶體驗**：不需要為每個市集重複創建商品
3. **更靈活**：商品庫可以跨市集共用

### 實施步驟

#### 步驟 1：修改 Supabase Schema

在 Supabase SQL Editor 執行：

```sql
-- 移除 products 表的 market_id 外鍵約束
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_market_id_fkey;

-- 將 market_id 改為可選
ALTER TABLE products 
ALTER COLUMN market_id DROP NOT NULL;

-- 添加註解
COMMENT ON COLUMN products.market_id IS '可選：商品所屬市集（NULL 表示全域商品）';
```

#### 步驟 2：修改 Supabase Trigger

更新 `002_cqrs_triggers.sql` 中的 `product_created` 處理：

```sql
-- 商品建立事件
WHEN 'product_created' THEN
  INSERT INTO products (
    id,
    market_id,  -- 可以是 NULL
    name,
    category,
    price,
    cost,
    -- ...
  )
  VALUES (
    (NEW.payload->>'productId')::UUID,
    NEW.market_id,  -- 可以是 NULL
    (NEW.payload->>'name')::TEXT,
    -- ...
  )
  ON CONFLICT (id) DO NOTHING;
```

#### 步驟 3：更新本地事件處理器

**檔案：** `lib/db/events.ts`

```typescript
registerEventHandler('product_created', async (event: Event<ProductCreatedPayload>, db) => {
  const { payload } = event;
  const productId = (payload as any).productId || generateUUID();
  
  await db.products.add({
    id: productId,
    market_id: event.market_id || undefined,  // ✅ 可以是 undefined
    name: payload.name,
    category: payload.category,
    // ...
  });
  
  console.log(`📦 商品已建立：${payload.name} (ID: ${productId.substring(0, 8)}...)`);
});
```

#### 步驟 4：更新 TypeScript 類型

**檔案：** `types/db.ts`

```typescript
export interface Product {
  id?: string;
  market_id?: string;  // ✅ 改為可選
  name: string;
  category: ProductCategory;
  // ...
}

export interface ProductCreatedPayload {
  productId?: string;
  market_id?: string;  // ✅ 改為可選
  name: string;
  category: ProductCategory;
  // ...
}
```

---

## 📋 測試清單

### 測試 1：市集場次統計
- [ ] 刷新首頁
- [ ] 檢查市集場次是否正確
- [ ] 創建新市集，檢查數字是否增加

### 測試 2：商品同步（修復後）
- [ ] 在設備 A 創建商品
- [ ] 檢查本地 IndexedDB 是否有商品
- [ ] 檢查 Supabase `events` 表是否有 `product_created` 事件
- [ ] 檢查 Supabase `products` 表是否有商品記錄
- [ ] 在設備 B 登入，等待 30 秒
- [ ] 檢查設備 B 是否看到新商品

---

## 🚀 下一步

1. **立即修復：** 市集場次統計（已完成）
2. **需要決策：** 商品是否關聯市集？
   - 推薦方案 A（商品不關聯市集）
   - 如果選擇方案 B，需要修改 UI 添加市集選擇器

請告訴我你想選擇哪個方案，我會幫你完成修復！

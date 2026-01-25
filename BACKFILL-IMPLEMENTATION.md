# 補登收入功能實作總結

## 📋 實作完成清單

✅ **所有功能已完成實作**

### Phase 1: 資料結構更新
- ✅ 修改 `DealClosedPayload` 類型
  - 添加 `isBackfill` 標記（補登標記）
  - 添加 `isManualEntry` 標記（簡化模式）
  - 添加簡化模式專用欄位（`manualRevenue`, `manualCost`, `manualDealCount`）

### Phase 2: 事件處理器更新
- ✅ 更新 `deal_closed` 事件處理器
  - 支持簡化模式（手動輸入金額）
  - 支持完整模式（選擇商品）
  - 補登時不扣庫存
  - 正確更新 `dailyStats` 和 `markets` 表

### Phase 3: 函數更新
- ✅ 修改 `recordDeal` 函數
  - 補登時跳過庫存檢查
  - 自動設置 `isBackfill` 標記

### Phase 4: UI 組件更新
- ✅ 修復 `DailyRevenueStats` 查詢邏輯
  - 累加所有匹配日期的統計
  - 不再檢查 `marketId`（因為已按日期範圍查詢）

- ✅ 重寫 `AddRevenueDialog` 組件
  - 支持簡化/完整模式切換
  - 簡化模式：直接輸入收入、成本、成交次數
  - 完整模式：選擇商品、數量、價格
  - 自動隱藏/顯示導航列
  - 添加補登提示（不扣庫存）

### Phase 5: Supabase 同步
- ✅ 創建 SQL 更新腳本
  - 更新 `update_market_read_model` 函數
  - 支持 `isBackfill` 和 `isManualEntry` 標記
  - 補登時不扣除 Supabase 的商品庫存

---

## 🎯 功能特點

### 1. 雙模式補登

#### 簡化模式（推薦）
- **適用場景**：快速補登遺漏的收入
- **輸入內容**：
  - 收入金額（必填）
  - 成本金額（可選）
  - 成交次數（必填）
  - 備註（可選）
- **優點**：
  - 快速簡單
  - 不涉及商品和庫存
  - 自動計算利潤

#### 完整模式
- **適用場景**：需要詳細記錄商品資訊
- **輸入內容**：
  - 選擇商品
  - 設定數量和價格
  - 選擇支付方式
  - 備註（可選）
- **優點**：
  - 詳細記錄
  - 更新商品銷售統計
  - 不扣除庫存

### 2. 智能提示
- 補登時顯示明確提示：「補登不會扣除商品庫存」
- 簡化模式自動計算並顯示利潤
- 完整模式顯示每個商品的小計

### 3. UI/UX 優化
- 點擊補登時自動隱藏底部導航列
- 全屏對話框，避免遮擋
- Tab 切換簡化/完整模式
- 關閉時自動顯示導航列

---

## 📊 資料流向

### 簡化模式
```
用戶輸入
  ↓
收入：888 元
成本：200 元
成交：2 筆
  ↓
創建 deal_closed 事件
{
  isBackfill: true,
  isManualEntry: true,
  manualRevenue: 888,
  manualCost: 200,
  manualDealCount: 2,
  dealDate: "2025-01-24"
}
  ↓
本地 Dexie：
- dailyStats[2025-01-24] += 888 (revenue)
- dailyStats[2025-01-24] += 688 (profit)
- dailyStats[2025-01-24] += 2 (dealCount)
- markets.totalRevenue += 888
- markets.totalProfit += 688
- markets.totalDeals += 2
  ↓
同步到 Supabase
（Supabase 觸發器識別 isManualEntry）
```

### 完整模式
```
用戶選擇商品
  ↓
商品 A × 2 = 500 元
商品 B × 1 = 388 元
總計：888 元
  ↓
創建 deal_closed 事件
{
  isBackfill: true,
  isManualEntry: false,
  items: [...],
  dealDate: "2025-01-24"
}
  ↓
本地 Dexie：
- 更新商品銷售統計（totalSold）
- ❌ 不扣庫存（因為 isBackfill = true）
- dailyStats[2025-01-24] += 888
- markets.totalRevenue += 888
  ↓
同步到 Supabase
（Supabase 觸發器識別 isBackfill，不扣庫存）
```

---

## 🔧 技術細節

### 1. 庫存處理邏輯

#### 本地 Dexie（lib/db/events.ts）
```typescript
// 完整模式：更新商品統計
if (!isBackfill && !product.unlimitedStock && product.stock !== undefined) {
  updates.stock = Math.max(0, product.stock - item.quantity);
}
```

#### Supabase（012_update_deal_closed_backfill.sql）
```sql
-- 只有非補登交易才扣除庫存
IF NOT v_is_backfill THEN
  UPDATE products
  SET stock = GREATEST(0, COALESCE(stock, 0) - v_quantity)
  WHERE id = v_product_id AND unlimited_stock = FALSE;
END IF;
```

### 2. 每日統計查詢修復

**問題**：原本檢查 `stat.marketId === market.id`，導致補登數據不顯示

**解決**：累加所有匹配日期的統計
```typescript
stats?.forEach(stat => {
  if (dateRange.includes(stat.date)) {
    const existing = dataMap.get(stat.date);
    dataMap.set(stat.date, {
      revenue: existing.revenue + (stat.revenue || 0),
      profit: existing.profit + (stat.profit || 0),
      deals: existing.deals + (stat.dealCount || 0),
    });
  }
});
```

### 3. 導航列控制

使用 `navigation-store` 統一管理：
```typescript
// 打開對話框時
hideNavigation();

// 關閉對話框時
showNavigation();
```

---

## 📝 Supabase 更新步驟

### 1. 執行 SQL 腳本

在 Supabase SQL Editor 中執行：
```bash
supabase/migrations/012_update_deal_closed_backfill.sql
```

### 2. 驗證更新

檢查函數是否更新成功：
```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_market_read_model';
```

### 3. 測試補登功能

1. 在本地補登一筆收入
2. 檢查 Supabase 的 `events` 表是否有新事件
3. 檢查 `markets` 表的統計是否更新
4. 檢查 `products` 表的庫存是否**未扣除**

---

## ✅ 測試場景

### 場景 1：簡化補登
1. 創建一個多天市集（1/24 - 1/26）
2. 在 1/25 點擊 1/24 的「補登」按鈕
3. 選擇「簡化輸入」模式
4. 輸入：收入 888、成本 200、成交 2 筆
5. 確認補登
6. **預期結果**：
   - 1/24 的收入顯示 888
   - 1/24 的利潤顯示 688
   - 1/24 的成交顯示 2
   - 總計統計增加對應金額
   - 商品庫存不變

### 場景 2：完整補登
1. 在 1/25 點擊 1/24 的「補登」按鈕
2. 選擇「完整輸入」模式
3. 選擇商品 A × 2，商品 B × 1
4. 確認補登
5. **預期結果**：
   - 1/24 的收入增加
   - 商品 A 和 B 的銷售統計增加
   - 商品 A 和 B 的庫存**不變**
   - 總計統計增加對應金額

### 場景 3：導航列隱藏
1. 點擊「補登」按鈕
2. **預期結果**：底部導航列隱藏
3. 關閉對話框
4. **預期結果**：底部導航列顯示

### 場景 4：Supabase 同步
1. 確保已登入 Supabase
2. 執行補登操作
3. 檢查 Supabase 的 `events` 表
4. **預期結果**：
   - 事件已同步
   - payload 包含 `isBackfill` 和 `isManualEntry` 標記
   - 商品庫存未扣除

---

## 🎉 完成狀態

### 本地功能
✅ 簡化補登模式  
✅ 完整補登模式  
✅ 模式切換  
✅ 導航列隱藏  
✅ 庫存不扣除  
✅ 每日統計更新  
✅ 總計統計更新  
✅ 用戶提示  

### Supabase 同步
✅ SQL 更新腳本已創建  
⏳ 需要手動執行 SQL 腳本  
⏳ 需要測試同步功能  

---

## 📚 相關檔案

### 新增檔案
- `supabase/migrations/012_update_deal_closed_backfill.sql` - Supabase 更新腳本

### 修改檔案
- `types/db.ts` - 添加補登相關欄位
- `lib/db/events.ts` - 更新 deal_closed 處理器
- `lib/db/hooks.ts` - 更新 recordDeal 函數
- `components/markets/DailyRevenueStats.tsx` - 修復查詢邏輯
- `components/markets/AddRevenueDialog.tsx` - 重寫為雙模式

---

## 🚀 下一步

1. **測試本地功能**
   - 測試簡化補登
   - 測試完整補登
   - 驗證庫存不扣除
   - 驗證每日統計正確

2. **更新 Supabase**
   - 執行 SQL 腳本
   - 測試同步功能
   - 驗證庫存不扣除

3. **用戶測試**
   - 收集用戶反饋
   - 優化 UI/UX
   - 修復潛在問題

---

## 💡 設計亮點

1. **最小化 Supabase 影響**
   - 使用現有事件類型
   - 通過 payload 標記區分
   - 無需新增表或事件類型

2. **雙模式設計**
   - 簡化模式：快速補登
   - 完整模式：詳細記錄
   - 用戶可自由選擇

3. **防呆設計**
   - 明確提示不扣庫存
   - 自動計算利潤
   - 導航列自動隱藏/顯示

4. **資料一致性**
   - 本地和雲端邏輯一致
   - 事件溯源保證可追溯
   - 統計數據準確

---

**實作完成日期**：2025-01-25  
**實作者**：AI Assistant (Grok)  
**版本**：v1.0

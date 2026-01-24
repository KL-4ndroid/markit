# 同步測試報告

## 📋 測試目標

驗證以下兩個功能的同步是否正常：

1. **互動詳情同步**：各別互動項目（摸摸、詢問等）的次數
2. **租賃設備同步**：桌子、椅子、雨傘、桌巾的租金和免費標記

---

## 🔍 問題分析

### 問題 1：互動詳情同步

**架構說明：**

```
本地 IndexedDB (events 表)
├─ type: 'interaction_recorded'
├─ market_id: 'uuid-xxx'
└─ payload: { type: 'touch', marketId: 'uuid-xxx' }
                    ↓ 同步
Supabase (events 表)
├─ type: 'interaction_recorded'
├─ market_id: 'uuid-xxx'
└─ payload: { type: 'touch', market_id: 'uuid-xxx' }
                    ↓ Trigger 處理
Supabase (markets 表)
└─ total_interactions: 5  ← ⚠️ 只有總數，沒有各別類型次數
```

**結論：**
- ✅ **總互動次數**會同步（存在 `markets.total_interactions`）
- ❌ **各別互動類型次數**不會同步到 `markets` 表（因為 schema 沒有這些欄位）
- ✅ **但是 `events` 表會同步**，前端可以從 `events` 表查詢

**前端查詢邏輯：**

```typescript
// MarketDetailList.tsx (已修復)
const events = await db.events
  .where('market_id')
  .equals(market.id)
  .and(e => e.type === 'interaction_recorded')
  .toArray();

// 統計每種互動類型的次數
const interactionCounts: Record<string, number> = {};
events.forEach(event => {
  const type = event.payload?.type;
  if (type) {
    interactionCounts[type] = (interactionCounts[type] || 0) + 1;
  }
});
```

**修復狀態：** ✅ 已修復（使用 `market_id` 索引查詢）

---

### 問題 2：租賃設備同步

**架構說明：**

```
本地 IndexedDB (events 表)
├─ type: 'market_created'
└─ payload: {
      tableRental: 50,
      tableFree: false,
      chairRental: 30,
      chairFree: false,
      ...
    }
                    ↓ 同步
Supabase (events 表)
├─ type: 'market_created'
└─ payload: {
      table_rental: 50,
      table_free: false,
      chair_rental: 30,
      chair_free: false,
      ...
    }
                    ↓ Trigger 處理
Supabase (markets 表)
├─ table_rental: 50
├─ table_free: false
├─ chair_rental: 30
├─ chair_free: false
└─ ... (所有租賃設備欄位)
```

**Trigger 代碼檢查：**

```sql
-- 012_fix_trigger_naming_compatibility.sql (第 68-71 行)
table_rental NUMERIC(10,2),
chair_rental NUMERIC(10,2),
umbrella_rental NUMERIC(10,2),
tablecloth_rental NUMERIC(10,2),

-- 第 44-51 行
COALESCE((NEW.payload->>'table_rental')::NUMERIC, (NEW.payload->>'tableRental')::NUMERIC),
COALESCE((NEW.payload->>'chair_rental')::NUMERIC, (NEW.payload->>'chairRental')::NUMERIC),
COALESCE((NEW.payload->>'umbrella_rental')::NUMERIC, (NEW.payload->>'umbrellaRental')::NUMERIC),
COALESCE((NEW.payload->>'tablecloth_rental')::NUMERIC, (NEW.payload->>'tableclothRental')::NUMERIC),
```

**結論：**
- ✅ Trigger 已正確處理所有租賃設備欄位
- ✅ 支援駝峰式（tableRental）和底線式（table_rental）命名
- ✅ `MarketCard.tsx` 正確顯示這些欄位

**修復狀態：** ✅ 應該正常工作

---

## 🧪 測試步驟

### 測試 1：互動詳情同步

**步驟：**

1. **設備 A（本地）：**
   - 創建一個新市集
   - 進入市集詳情頁
   - 點擊「開始營業」
   - 記錄 3 次「摸摸」互動
   - 記錄 2 次「詢問」互動
   - 等待同步完成（30 秒內）

2. **設備 B（另一個瀏覽器/設備）：**
   - 登入同一帳號
   - 等待同步完成
   - 進入「分析」頁面
   - 查看「市集明細」區塊
   - **預期結果：**
     - ✅ 總互動次數：5 次
     - ✅ 摸摸：3 次
     - ✅ 詢問：2 次

**檢查點：**

```javascript
// 在設備 B 的瀏覽器 Console 執行
const { db } = await import('./lib/db');
const events = await db.events
  .where('type')
  .equals('interaction_recorded')
  .toArray();

console.table(events.map(e => ({
  id: e.id.substring(0, 8),
  type: e.payload?.type,
  market_id: e.market_id?.substring(0, 8),
  timestamp: new Date(e.timestamp).toLocaleString(),
  sync_status: e.sync_status,
})));
```

---

### 測試 2：租賃設備同步

**步驟：**

1. **設備 A（本地）：**
   - 創建一個新市集，設定：
     - 桌子：NT$50
     - 椅子：免費提供
     - 雨傘：NT$30
     - 桌巾：自備（不填）
   - 等待同步完成（30 秒內）

2. **設備 B（另一個瀏覽器/設備）：**
   - 登入同一帳號
   - 等待同步完成
   - 進入「市集」頁面
   - 查看市集卡片
   - **預期結果：**
     - ✅ 桌子：NT$50
     - ✅ 椅子：(免費)
     - ✅ 雨傘：NT$30
     - ✅ 桌巾：(自備)

**檢查點：**

```javascript
// 在設備 B 的瀏覽器 Console 執行
const { db } = await import('./lib/db');
const markets = await db.markets.toArray();

console.table(markets.map(m => ({
  name: m.name,
  tableRental: m.tableRental,
  tableFree: m.tableFree,
  chairRental: m.chairRental,
  chairFree: m.chairFree,
  umbrellaRental: m.umbrellaRental,
  umbrellaFree: m.umbrellaFree,
  tableclothRental: m.tableclothRental,
  tableclothFree: m.tableclothFree,
  sync_status: m.sync_status,
})));
```

---

## 🐛 已知問題與修復

### 修復 1：MarketDetailList 查詢優化

**問題：**
- 原本使用 `where('type').equals('interaction_recorded')` 查詢所有互動事件
- 然後用 `filter()` 篩選特定市集
- **效率低下**，且可能遺漏同步的事件

**修復：**

```typescript
// ❌ 舊代碼（效率低）
const events = await db.events
  .where('type')
  .equals('interaction_recorded')
  .toArray();
const marketEvents = events.filter(e => e.payload?.marketId === market.id);

// ✅ 新代碼（使用索引）
const events = await db.events
  .where('market_id')
  .equals(market.id)
  .and(e => e.type === 'interaction_recorded')
  .toArray();
```

**優點：**
- ✅ 使用 `market_id` 索引，查詢速度快
- ✅ 支援 UUID 格式
- ✅ 正確處理同步的事件

---

### 修復 2：UI 改進

**變更：**

1. **移除折疊功能**：
   - ❌ 舊版：需要點擊「互動詳情」按鈕展開
   - ✅ 新版：直接顯示在卡片下方

2. **添加成交次數**：
   - ❌ 舊版：只顯示「收入」、「成交」、「轉換」
   - ✅ 新版：顯示「收入」、「成交」、「互動」、「轉換」

3. **總是顯示所有互動類型**：
   - ❌ 舊版：只顯示次數 > 0 的類型
   - ✅ 新版：顯示所有自訂按鈕，次數為 0 也顯示

---

## 📊 測試結果（待填寫）

### 測試 1：互動詳情同步

- [ ] 設備 A 記錄互動成功
- [ ] 設備 B 收到同步事件
- [ ] 設備 B 顯示正確的互動次數
- [ ] 各別互動類型次數正確

**實際結果：**
```
（請在測試後填寫）
```

---

### 測試 2：租賃設備同步

- [ ] 設備 A 創建市集成功
- [ ] 設備 B 收到同步事件
- [ ] 設備 B 顯示正確的租賃設備資訊
- [ ] 免費標記正確顯示

**實際結果：**
```
（請在測試後填寫）
```

---

## 🔧 除錯工具

### 1. 檢查本地事件

```javascript
// 查看所有互動事件
const { db } = await import('./lib/db');
const interactions = await db.events
  .where('type')
  .equals('interaction_recorded')
  .toArray();

console.table(interactions.map(e => ({
  id: e.id.substring(0, 8),
  type: e.payload?.type,
  market_id: e.market_id?.substring(0, 8),
  sync_status: e.sync_status,
  timestamp: new Date(e.timestamp).toLocaleString(),
})));
```

### 2. 檢查市集資料

```javascript
const { db } = await import('./lib/db');
const markets = await db.markets.toArray();

console.table(markets.map(m => ({
  id: m.id?.substring(0, 8),
  name: m.name,
  totalInteractions: m.totalInteractions,
  totalDeals: m.totalDeals,
  tableRental: m.tableRental,
  tableFree: m.tableFree,
  sync_status: m.sync_status,
})));
```

### 3. 檢查同步狀態

```javascript
const { db } = await import('./lib/db');
const pending = await db.events
  .where('sync_status')
  .equals('pending')
  .toArray();

console.log(`待同步事件：${pending.length} 個`);
console.table(pending.map(e => ({
  id: e.id.substring(0, 8),
  type: e.type,
  market_id: e.market_id?.substring(0, 8),
  timestamp: new Date(e.timestamp).toLocaleString(),
})));
```

### 4. 手動觸發同步

```javascript
// 在任何頁面的 Console 執行
window.location.reload(); // 重新載入頁面會自動觸發同步
```

---

## 📝 結論

### 互動詳情同步

**理論分析：** ✅ 應該正常工作

**原因：**
1. `events` 表會完整同步（包含 `payload.type`）
2. 前端使用 `market_id` 索引查詢，效率高且正確
3. UI 已改為直接顯示，無需折疊

**需要測試確認：** 是的，請按照「測試步驟 1」進行驗證

---

### 租賃設備同步

**理論分析：** ✅ 應該正常工作

**原因：**
1. Supabase Trigger 已正確處理所有租賃設備欄位
2. 支援駝峰式和底線式命名
3. `MarketCard.tsx` 正確顯示這些欄位

**需要測試確認：** 是的，請按照「測試步驟 2」進行驗證

---

## 🎯 下一步行動

1. **立即測試**：按照上述測試步驟進行驗證
2. **回報結果**：將測試結果填寫到「測試結果」區塊
3. **如果失敗**：提供錯誤訊息和 Console 輸出，我會進一步除錯

---

## 📌 重要提醒

### 測試環境要求

- ✅ 已登入 Supabase 帳號
- ✅ 網路連線正常
- ✅ 兩個不同的瀏覽器或無痕模式
- ✅ 等待至少 30 秒讓同步完成

### 常見問題

**Q: 為什麼設備 B 沒有收到資料？**
A: 檢查以下幾點：
1. 是否登入同一帳號？
2. 網路是否正常？（檢查 Console 是否有錯誤）
3. 是否等待足夠時間？（預設 30 秒同步一次）
4. 手動重新整理頁面試試

**Q: 互動次數顯示為 0？**
A: 可能原因：
1. 事件尚未同步（等待 30 秒）
2. `market_id` 不匹配（檢查 Console）
3. 查詢邏輯錯誤（已修復）

**Q: 租賃設備顯示不正確？**
A: 可能原因：
1. `market_created` 事件尚未同步
2. Payload 命名不一致（已修復，支援兩種命名）
3. Trigger 未正確執行（檢查 Supabase Logs）

# 員工刪除成交記錄同步失敗 - 修復報告

## 🐛 問題現象

### 錯誤訊息

```
POST https://fgejncfsvvsayiequubm.supabase.co/rest/v1/events 400 (Bad Request)

❌ 未知錯誤：23514 - new row for relation "events" violates check constraint "events_type_check"
```

### 問題分析

員工刪除成交記錄後：
- ✅ 本地 UI 立即更新
- ❌ 同步到 Supabase 時失敗
- ❌ 老闆看不到變化

**根本原因**：
Supabase 資料庫的 `events` 表有一個 CHECK constraint，限制了允許的事件類型。新增的 `deal_deleted` 和 `interaction_deleted` 事件類型沒有在資料庫中註冊。

---

## 🔍 技術分析

### Supabase Schema 問題

**檔案**：`supabase/migrations/001_uuid_schema.sql`

```sql
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (
    type IN (
      'market_created',
      'market_status_changed',
      'market_started',
      'market_ended',
      'product_created',
      'product_updated',
      'product_deleted',
      'interaction_recorded',
      'deal_closed'
      -- ❌ 缺少：'deal_deleted', 'interaction_deleted'
    )
  ),
  -- ...
);
```

**問題**：
- 前端新增了 `deal_deleted` 和 `interaction_deleted` 事件類型
- 但資料庫的 CHECK constraint 不允許這些類型
- 導致插入失敗，返回 400 錯誤

---

## 🔧 修復方案

### 步驟 1：創建 Migration 文件

**檔案**：`supabase/migrations/026_add_delete_event_types.sql`

```sql
-- 1. 刪除舊的 CHECK constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 2. 添加新的 CHECK constraint（包含刪除事件類型）
ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    -- 市集相關事件
    'market_created',
    'market_updated',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',
    -- 商品相關事件
    'product_created',
    'product_updated',
    'product_deleted',
    -- 互動相關事件
    'interaction_recorded',
    'interaction_deleted',      -- ✅ 新增
    'deal_closed',
    'deal_deleted',             -- ✅ 新增
    -- 設定相關事件
    'settings_updated'
  )
);
```

### 步驟 2：執行 Migration

**方法 A：使用 Supabase Dashboard**

1. 登入 Supabase Dashboard
2. 前往 SQL Editor
3. 複製 `026_add_delete_event_types.sql` 的內容
4. 執行 SQL

**方法 B：使用 Supabase CLI**

```bash
# 如果有安裝 Supabase CLI
supabase db push
```

**方法 C：手動執行 SQL**

直接在 Supabase Dashboard 的 SQL Editor 中執行：

```sql
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    'market_created',
    'market_updated',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',
    'product_created',
    'product_updated',
    'product_deleted',
    'interaction_recorded',
    'interaction_deleted',
    'deal_closed',
    'deal_deleted',
    'settings_updated'
  )
);
```

---

## 📊 修復效果

修復後的流程：

### 1. 員工刪除記錄

```typescript
// 記錄刪除事件
await recordEvent('deal_deleted', {
  eventId: event.id!,
  marketId: market_id,
  dealDate: transactionDate,
  totalAmount,
  totalCost,
  dealCount,
});
```

### 2. 同步到 Supabase

```
✅ 事件已記錄：deal_deleted (ID: abc123...)
✅ 上傳事件到 Supabase
✅ 同步成功
```

### 3. 老闆接收更新

```
✅ 下載新事件：deal_deleted
✅ 重放事件到本地
✅ 更新 UI
```

---

## 🎯 完整的事件類型列表

修復後，Supabase 支援的所有事件類型：

| 分類 | 事件類型 | 說明 |
|------|---------|------|
| **市集** | `market_created` | 市集建立 |
| | `market_updated` | 市集更新 |
| | `market_status_changed` | 市集狀態變更 |
| | `market_started` | 市集開始營業 |
| | `market_ended` | 市集結束營業 |
| | `market_deleted` | 市集刪除（軟刪除） |
| **商品** | `product_created` | 商品建立 |
| | `product_updated` | 商品更新 |
| | `product_deleted` | 商品刪除 |
| **互動** | `interaction_recorded` | 記錄互動 |
| | `interaction_deleted` | ✅ **刪除互動記錄** |
| | `deal_closed` | 成交 |
| | `deal_deleted` | ✅ **刪除成交記錄** |
| **設定** | `settings_updated` | 設定更新 |

---

## 🧪 測試計劃

### 測試 1：驗證 Migration

**步驟**：
1. 執行 Migration SQL
2. 在 SQL Editor 中查詢：
```sql
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'events_type_check';
```
3. **驗證**：check_clause 包含 `'deal_deleted'` 和 `'interaction_deleted'`

### 測試 2：員工刪除成交記錄

**步驟**：
1. 員工登入，進入營業中的市集
2. 在「當日流水帳」中刪除一筆成交記錄
3. 打開瀏覽器控制台
4. **驗證**：
   - ✅ 看到 `✅ 事件已記錄：deal_deleted`
   - ✅ 沒有 400 錯誤
   - ✅ 看到同步成功日誌

### 測試 3：老闆接收更新

**步驟**：
1. 老闆重新整理頁面
2. 查看市集統計
3. **驗證**：
   - ✅ 總收入正確（已扣除刪除的金額）
   - ✅ 成交數正確（已扣除）
   - ✅ 流水帳中沒有被刪除的記錄

### 測試 4：檢查 Supabase 資料

**步驟**：
1. 登入 Supabase Dashboard
2. 前往 Table Editor → events
3. 篩選 `type = 'deal_deleted'`
4. **驗證**：
   - ✅ 可以看到刪除事件記錄
   - ✅ payload 包含正確的資訊

---

## 📝 相關修改

### 1. 類型定義（`types/db.ts`）

```typescript
export type EventType =
  // ... 其他事件
  | 'interaction_deleted'      // 刪除互動記錄
  | 'deal_deleted'             // 刪除成交記錄
```

### 2. 事件處理器（`lib/db/events.ts`）

```typescript
registerEventHandler('deal_deleted', async (event, db) => {
  // 1. 刪除原始事件
  // 2. 更新市集統計
  // 3. 更新每日統計
});
```

### 3. 刪除邏輯（`components/markets/DailyTransactionLog.tsx`）

```typescript
// 使用事件溯源方式刪除
await recordEvent('deal_deleted', {
  eventId: event.id!,
  marketId: market_id,
  dealDate: transactionDate,
  totalAmount,
  totalCost,
  dealCount,
});
```

---

## ⚠️ 注意事項

### 1. Migration 順序

確保按順序執行 migration：
- `001_uuid_schema.sql` → 創建基礎表結構
- `026_add_delete_event_types.sql` → 更新事件類型

### 2. 資料一致性

執行 migration 前：
- ✅ 確保沒有正在進行的同步
- ✅ 建議在低峰時段執行
- ✅ 執行前備份資料庫

### 3. 向後兼容

- ✅ 舊的事件類型仍然有效
- ✅ 不會影響現有資料
- ✅ 只是擴充允許的事件類型

---

## 🎉 總結

### 問題根源

✅ **資料庫 CHECK constraint 限制**：
- Supabase 的 `events` 表不允許新的事件類型
- 前端新增了刪除事件，但資料庫沒有更新

### 解決方案

✅ **更新資料庫 schema**：
- 創建 migration 文件
- 更新 CHECK constraint
- 添加 `deal_deleted` 和 `interaction_deleted`

### 預期效果

修復後：
- ✅ 員工可以刪除成交記錄
- ✅ 刪除事件成功同步到 Supabase
- ✅ 老闆可以看到正確的統計數據
- ✅ 資料完全一致

---

**報告完成時間**：2026-02-26  
**問題類型**：🔴 資料庫 Schema 不匹配  
**嚴重度**：🔴 高（阻塞核心功能）  
**建議優先級**：🔴 立即修復（執行 Migration）

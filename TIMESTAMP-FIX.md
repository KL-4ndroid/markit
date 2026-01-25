# 🐛 修復：Supabase 時間戳類型錯誤

## 問題描述

### 錯誤訊息
```
operator does not exist: timestamp with time zone / numeric
```

### 錯誤原因
在 `012_update_deal_closed_backfill.sql` 遷移腳本中，使用了：
```sql
updated_at = to_timestamp(NEW.timestamp / 1000.0)
```

但在 Supabase 的 `events` 表中，`timestamp` 欄位已經是 `timestamp with time zone` 類型，不是 Unix 毫秒時間戳（numeric）。

嘗試將 `timestamp with time zone` 除以 `1000.0` 會導致 PostgreSQL 類型錯誤。

---

## 修復方案

### 修改前
```sql
-- ❌ 錯誤：嘗試將 timestamp 除以數字
updated_at = to_timestamp(NEW.timestamp / 1000.0)
```

### 修改後
```sql
-- ✅ 正確：直接使用 timestamp
updated_at = NEW.timestamp
```

---

## 修改位置

在 `supabase/migrations/012_update_deal_closed_backfill.sql` 中，共修改了 **8 處**：

### 1. 市集建立事件（2 處）
```sql
-- 第 119-120 行
created_at = NEW.timestamp,
updated_at = NEW.timestamp
```

### 2. 成交事件 - 商品統計（2 處）
```sql
-- 第 154 行
updated_at = NEW.timestamp

-- 第 161 行
updated_at = NEW.timestamp
```

### 3. 成交事件 - 市集統計（1 處）
```sql
-- 第 177 行
updated_at = NEW.timestamp
```

### 4. 互動記錄事件（1 處）
```sql
-- 第 186 行
updated_at = NEW.timestamp
```

### 5. 市集狀態變更事件（1 處）
```sql
-- 第 193 行
updated_at = NEW.timestamp
```

### 6. 市集開始營業事件（1 處）
```sql
-- 第 201 行
updated_at = NEW.timestamp
```

### 7. 市集結束營業事件（1 處）
```sql
-- 第 209 行
updated_at = NEW.timestamp
```

### 8. 市集刪除事件（1 處）
```sql
-- 第 217 行
updated_at = NEW.timestamp
```

---

## 為什麼會發生這個錯誤？

### 本地 IndexedDB vs Supabase 的差異

| 項目 | IndexedDB (本地) | Supabase (雲端) |
|------|-----------------|----------------|
| timestamp 類型 | `number` (毫秒) | `timestamp with time zone` |
| 存儲格式 | `1737849600000` | `2026-01-25 12:00:00+00` |
| 需要轉換 | ❌ 否 | ✅ 是（插入時） |

### 正確的處理方式

#### 插入事件時（前端 → Supabase）
```typescript
// ✅ 正確：將毫秒時間戳轉換為 ISO 字串
await supabase.from('events').insert({
  timestamp: new Date(event.timestamp).toISOString()
});
```

#### 觸發器中使用（Supabase 內部）
```sql
-- ✅ 正確：直接使用，已經是 timestamp 類型
updated_at = NEW.timestamp
```

---

## 測試驗證

### 1. 執行遷移腳本

在 Supabase Dashboard → SQL Editor 中執行修復後的腳本。

### 2. 測試補登功能

```javascript
// 在應用中測試補登收入
// 應該不再出現類型錯誤
```

### 3. 檢查同步狀態

```javascript
// 在控制台查看
// 應該看到 "✅ 同步完成"
// 而不是 "❌ 上傳事件失敗"
```

---

## 相關文件

- `supabase/migrations/012_update_deal_closed_backfill.sql` - 已修復
- `hooks/useSync.ts` - 同步邏輯（無需修改）
- `lib/db/events.ts` - 事件處理（無需修改）

---

## 預防措施

### 1. 類型檢查清單

在編寫 SQL 函數時，確認：
- [ ] `NEW.timestamp` 在 Supabase 中是 `timestamp with time zone`
- [ ] 不需要 `to_timestamp()` 轉換
- [ ] 不需要除以 1000

### 2. 測試流程

- [ ] 在 Supabase SQL Editor 中測試函數
- [ ] 使用真實數據測試觸發器
- [ ] 檢查錯誤日誌

### 3. 文檔參考

- [PostgreSQL Timestamp Types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)

---

## 總結

**問題**：將 `timestamp with time zone` 類型除以數字
**原因**：混淆了本地 IndexedDB（毫秒）和 Supabase（timestamp）的類型
**修復**：直接使用 `NEW.timestamp`，不進行轉換

✅ 修復完成後，補登功能應該可以正常同步到 Supabase！

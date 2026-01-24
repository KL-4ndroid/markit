# 市集軟刪除功能說明

## 📋 功能概述

市集現在支援軟刪除功能，區分「已取消」和「已刪除」兩種不同的狀態：

### 兩種狀態的區別

| 狀態 | 類型 | 顯示在列表 | 用途 |
|------|------|-----------|------|
| **已取消** (`status = 'cancelled'`) | 業務狀態 | ✅ 顯示 | 市集因故取消，但保留記錄供查看 |
| **已刪除** (`isDeleted = true`) | 軟刪除標記 | ❌ 不顯示 | 用戶不想再看到此市集，從列表中隱藏 |

---

## 🎯 使用場景

### 場景 1：市集取消（業務狀態）

```typescript
// 市集因故取消（例如：天氣、主辦方取消）
await updateMarketStatus(marketId, 'cancelled', '主辦方取消活動');

// 結果：
// - status = 'cancelled'
// - isDeleted = false
// - 仍然顯示在列表中（可以查看歷史記錄）
```

### 場景 2：刪除市集（軟刪除）

```typescript
// 用戶不想再看到此市集
await deleteMarket(marketId, '不再需要此記錄');

// 結果：
// - status = 保持原狀（例如：'cancelled'）
// - isDeleted = true
// - 不顯示在列表中
```

---

## 🔧 技術實現

### 1. 資料庫結構

```sql
ALTER TABLE markets 
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_markets_is_deleted ON markets(is_deleted);
```

### 2. TypeScript 類型

```typescript
export interface Market {
  id?: string;
  name: string;
  status: MarketStatus;  // 'registered' | 'cancelled' | ...
  isDeleted?: boolean;   // ✅ 軟刪除標記
  // ...
}

export type EventType =
  | 'market_created'
  | 'market_status_changed'
  | 'market_deleted'  // ✅ 新增事件類型
  // ...
```

### 3. 事件處理

```typescript
// 註冊事件處理器
registerEventHandler('market_deleted', async (event, db) => {
  const { marketId } = event.payload;
  
  await db.markets.update(marketId, {
    isDeleted: true,
    updatedAt: event.timestamp,
  });
  
  console.log(`🗑️ 市集已刪除（軟刪除）：ID ${marketId}`);
});
```

### 4. 查詢過濾

```typescript
// 自動過濾已刪除的市集
export function useMarkets(options?: {
  includeDeleted?: boolean;  // 預設 false
}) {
  return useLiveQuery(async () => {
    const markets = await db.markets.toArray();
    
    // ✅ 過濾已刪除的市集（除非明確要求包含）
    return options?.includeDeleted 
      ? markets 
      : markets.filter(m => !m.isDeleted);
  }, [options?.includeDeleted]);
}
```

---

## 📱 前端使用

### 刪除市集

```typescript
import { deleteMarket } from '@/lib/db/hooks';

// 在市集卡片或詳情頁
const handleDelete = async () => {
  if (confirm('確定要刪除此市集嗎？刪除後將不再顯示在列表中。')) {
    await deleteMarket(marketId, '用戶手動刪除');
    toast.success('市集已刪除');
  }
};
```

### 查詢市集（自動過濾）

```typescript
import { useMarkets } from '@/lib/db/hooks';

// 預設不包含已刪除的市集
const markets = useMarkets();

// 如果需要包含已刪除的市集（例如：回收站功能）
const allMarkets = useMarkets({ includeDeleted: true });
```

### 恢復已刪除的市集

```typescript
// 如果需要恢復功能，可以手動更新
await db.markets.update(marketId, {
  isDeleted: false,
  updatedAt: Date.now(),
});
```

---

## 🔄 同步機制

### 本地刪除

```typescript
// 1. 用戶刪除市集
await deleteMarket(marketId);

// 2. 記錄 market_deleted 事件
{
  type: 'market_deleted',
  payload: { marketId, reason: '...' },
  timestamp: Date.now(),
  sync_status: 'pending',
}

// 3. 本地更新 markets 表
UPDATE markets SET is_deleted = true WHERE id = marketId;
```

### 雲端同步

```typescript
// 4. 事件上傳到 Supabase
INSERT INTO events (type, payload, ...) VALUES ('market_deleted', ...);

// 5. Trigger 自動更新 markets 表
UPDATE markets SET is_deleted = true WHERE id = marketId;

// 6. 其他設備下載事件並重放
// 本地也會設置 is_deleted = true
```

---

## 🎨 UI 建議

### 市集卡片操作菜單

```tsx
<DropdownMenu>
  <DropdownMenuTrigger>⋮</DropdownMenuTrigger>
  <DropdownMenuContent>
    {/* 業務狀態變更 */}
    <DropdownMenuItem onClick={() => updateStatus('cancelled')}>
      ❌ 標記為已取消
    </DropdownMenuItem>
    
    {/* 軟刪除 */}
    <DropdownMenuItem 
      onClick={handleDelete}
      className="text-red-600"
    >
      🗑️ 刪除市集
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 確認對話框

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>確定要刪除此市集嗎？</AlertDialogTitle>
      <AlertDialogDescription>
        刪除後將不再顯示在列表中，但數據仍會保留。
        如果只是市集取消，建議使用「標記為已取消」功能。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        確定刪除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 📊 統計影響

### 自動過濾已刪除的市集

```typescript
// 本月統計（自動過濾已刪除的市集）
export function useMonthlyStats() {
  return useLiveQuery(async () => {
    const markets = await db.markets
      .where('startDate')
      .between(startDate, endDate)
      .toArray();
    
    // ✅ 過濾已刪除的市集
    const activeMarkets = markets.filter(m => !m.isDeleted);
    
    return {
      marketCount: activeMarkets.length,
      totalRevenue: activeMarkets.reduce((sum, m) => sum + (m.totalRevenue || 0), 0),
      // ...
    };
  }, []);
}
```

---

## 🔍 查詢範例

### 查詢所有未刪除的市集

```typescript
const markets = await db.markets
  .filter(m => !m.isDeleted)
  .toArray();
```

### 查詢已刪除的市集（回收站）

```typescript
const deletedMarkets = await db.markets
  .filter(m => m.isDeleted === true)
  .toArray();
```

### 查詢已取消但未刪除的市集

```typescript
const cancelledMarkets = await db.markets
  .where('status')
  .equals('cancelled')
  .filter(m => !m.isDeleted)
  .toArray();
```

---

## ⚠️ 注意事項

### 1. 軟刪除 vs 硬刪除

- ✅ **軟刪除**（推薦）：設置 `isDeleted = true`，數據保留
- ❌ **硬刪除**（不推薦）：真正刪除記錄，無法恢復

### 2. 關聯數據

刪除市集時，相關數據（商品、事件、統計）**不會被刪除**：

```typescript
// 市集被軟刪除後
market.isDeleted = true;  // ✅ 市集隱藏

// 但相關數據仍然存在
events.filter(e => e.market_id === marketId);  // ✅ 事件保留
products.filter(p => p.market_id === marketId);  // ✅ 商品保留
```

### 3. 恢復功能

如果需要恢復功能，可以添加：

```typescript
export async function restoreMarket(marketId: string): Promise<void> {
  await db.markets.update(marketId, {
    isDeleted: false,
    updatedAt: Date.now(),
  });
}
```

---

## 🎉 優勢

### 1. 用戶體驗

- ✅ 清爽的列表（不顯示不需要的市集）
- ✅ 保留歷史數據（可以恢復）
- ✅ 明確的狀態區分（取消 vs 刪除）

### 2. 數據安全

- ✅ 不會真正刪除數據
- ✅ 可以隨時恢復
- ✅ 保留完整的事件歷史

### 3. 性能優化

- ✅ 添加索引（`idx_markets_is_deleted`）
- ✅ 快速過濾查詢
- ✅ 不影響現有功能

---

## 📝 部署步驟

### 1. 執行 Supabase Migration

```sql
-- 執行 016_market_soft_delete.sql
```

### 2. 驗證結構

```sql
-- 檢查欄位
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'markets' AND column_name = 'is_deleted';

-- 檢查索引
SELECT indexname FROM pg_indexes 
WHERE tablename = 'markets' AND indexname = 'idx_markets_is_deleted';
```

### 3. 測試功能

```typescript
// 創建測試市集
const marketId = await createMarket({ name: '測試市集', ... });

// 刪除市集
await deleteMarket(marketId);

// 驗證不顯示在列表中
const markets = await db.markets.filter(m => !m.isDeleted).toArray();
console.log('應該不包含測試市集:', markets);
```

---

## 🎯 總結

軟刪除功能讓用戶可以：
- ✅ 隱藏不需要的市集（保持列表清爽）
- ✅ 保留完整的歷史數據（可以恢復）
- ✅ 區分業務狀態和顯示狀態（取消 vs 刪除）

這是一個簡單、安全、高效的解決方案！ 🎉

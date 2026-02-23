# 修復：SubTransactionError - Table products not included in parent transaction

## 問題描述

在修改市集狀態時出現以下錯誤：

```
DexieError: SubTransactionError
Table products not included in parent transaction.
```

## 錯誤原因

在 `lib/db/hooks.ts` 的 `updateMarketStatus` 函數中，創建了一個只包含 `db.markets` 和 `db.events` 的事務：

```typescript
await db.transaction('rw', db.markets, db.events, async () => {
  // ...
  await recordEvent('market_status_changed', { ... });
});
```

但在這個事務內部調用的 `recordEvent` 函數又嘗試創建一個包含 `db.products` 的新事務：

```typescript
await db.transaction(
  'rw',
  [db.events, db.markets, db.products, db.dailyStats],
  async () => {
    // ...
  }
);
```

這導致了嵌套事務錯誤，因為子事務嘗試訪問父事務未包含的表。

## 解決方案

移除 `updateMarketStatus` 中的外層事務，讓 `recordEvent` 自己管理事務：

### 修改前：

```typescript
export async function updateMarketStatus(
  marketId: string,
  newStatus: MarketStatus,
  reason?: string
): Promise<void> {
  await db.transaction('rw', db.markets, db.events, async () => {
    const market = await db.markets.get(marketId);
    if (!market) {
      throw new Error(`市集不存在：ID ${marketId.substring(0, 8)}...`);
    }
    
    if (market.status === newStatus) {
      return;
    }
    
    await recordEvent('market_status_changed', {
      market_id: marketId,
      oldStatus: market.status,
      newStatus,
      reason,
    });
  });
}
```

### 修改後：

```typescript
export async function updateMarketStatus(
  marketId: string,
  newStatus: MarketStatus,
  reason?: string
): Promise<void> {
  // 先查詢市集
  const market = await db.markets.get(marketId);
  if (!market) {
    throw new Error(`市集不存在：ID ${marketId.substring(0, 8)}...`);
  }
  
  // 如果狀態相同，直接返回
  if (market.status === newStatus) {
    return;
  }
  
  // 記錄事件（recordEvent 內部會管理自己的事務）
  await recordEvent('market_status_changed', {
    market_id: marketId,
    oldStatus: market.status,
    newStatus,
    reason,
  });
}
```

## 關鍵改進

1. **移除嵌套事務**：不在 `updateMarketStatus` 中創建事務，讓 `recordEvent` 統一管理
2. **保持原子性**：`recordEvent` 內部的事務仍然確保操作的原子性
3. **簡化邏輯**：減少事務嵌套，降低複雜度

## 為什麼 recordEvent 需要包含所有表？

`recordEvent` 的事務包含 `[db.events, db.markets, db.products, db.dailyStats]` 是為了：

1. **通用性**：支持所有類型的事件處理器
2. **一致性**：避免為不同事件類型設置不同的事務範圍
3. **簡化**：統一的事務管理，減少條件判斷

雖然 `market_status_changed` 事件只需要 `db.markets` 表，但其他事件（如 `deal_closed`）需要訪問多個表。為了保持代碼簡潔，使用統一的事務範圍是合理的。

## 測試驗證

修復後，以下操作應該正常工作：

- ✅ 點擊報名狀態 Stepper 切換狀態
- ✅ 點擊「已延期」按鈕
- ✅ 點擊「已取消」按鈕
- ✅ 自動狀態流轉（已報名 → 已錄取 → 已繳費 → 如期舉行）

## 相關文件

- `lib/db/hooks.ts` - 修改 `updateMarketStatus` 函數
- `lib/db/events.ts` - `recordEvent` 函數（未修改）

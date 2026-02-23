# 市集編輯同步修復文檔

## 問題描述

用戶在市集詳情頁面編輯市集資料（例如：市集時間軸的時間），點擊「儲存變更」後：
- ✅ 本地 IndexedDB 更新成功
- ✅ 下次進入市集詳情頁面顯示正確
- ❌ 但這些編輯的資料最終沒有上傳到 Supabase

## 根本原因

`EditMarketForm` 組件在儲存變更時，直接調用了 `db.markets.update()` 更新本地資料庫，**沒有記錄事件（Event）**。

在事件溯源架構中，所有資料變更都必須透過記錄事件來觸發，這樣才能：
1. 觸發同步機制（上傳到 Supabase）
2. 保留完整的歷史記錄
3. 支援多人協作和衝突解決

## 修復方案

### 1. 新增 `market_updated` 事件類型

**檔案：`types/db.ts`**

```typescript
export type EventType =
  // 市集相關事件
  | 'market_created'           // 市集建立
  | 'market_updated'           // 市集更新 ✅ 新增
  | 'market_status_changed'    // 市集狀態變更
  | 'market_started'           // 市集開始營業
  | 'market_ended'             // 市集結束營業
  | 'market_deleted'           // 市集刪除（軟刪除）
  // ...
```

### 2. 新增 `MarketUpdatedPayload` 介面

**檔案：`types/db.ts`**

```typescript
/**
 * 市集更新事件的 Payload
 */
export interface MarketUpdatedPayload {
  market_id: string;           // 市集 UUID
  updates: Partial<Omit<Market, 'id' | 'createdAt' | 'updatedAt'>>;
}
```

### 3. 註冊 `market_updated` 事件處理器

**檔案：`lib/db/events.ts`**

```typescript
/**
 * 處理「市集更新」事件
 * 
 * 當 market_updated 事件發生時：
 * 更新 markets 表中對應市集的資料
 */
registerEventHandler('market_updated', async (event: Event<{ market_id: string; updates: Partial<Market> }>, db) => {
  const { market_id, updates } = event.payload;
  
  // 更新市集資料
  await db.markets.update(market_id, {
    ...updates,
    updatedAt: event.timestamp,
  });
  
  // ✅ 轉換 payload 為底線式命名（用於 Supabase 同步）
  const snakeCaseUpdates: Record<string, unknown> = {};
  
  // 基本資訊
  if (updates.name !== undefined) snakeCaseUpdates.name = updates.name;
  if (updates.location !== undefined) snakeCaseUpdates.location = updates.location;
  if (updates.dates !== undefined) snakeCaseUpdates.dates = updates.dates;
  if (updates.startDate !== undefined) snakeCaseUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) snakeCaseUpdates.end_date = updates.endDate;
  
  // 時間軸資訊
  if (updates.earlyEntryEnabled !== undefined) snakeCaseUpdates.early_entry_enabled = updates.earlyEntryEnabled;
  if (updates.earlyEntryTime !== undefined) snakeCaseUpdates.early_entry_time = updates.earlyEntryTime;
  if (updates.checkInTime !== undefined) snakeCaseUpdates.check_in_time = updates.checkInTime;
  if (updates.operatingStartTime !== undefined) snakeCaseUpdates.operating_start_time = updates.operatingStartTime;
  if (updates.operatingEndTime !== undefined) snakeCaseUpdates.operating_end_time = updates.operatingEndTime;
  
  // 財務資訊
  if (updates.boothCost !== undefined) snakeCaseUpdates.booth_cost = updates.boothCost;
  if (updates.deposit !== undefined) snakeCaseUpdates.deposit = updates.deposit;
  if (updates.tableRental !== undefined) snakeCaseUpdates.table_rental = updates.tableRental;
  if (updates.chairRental !== undefined) snakeCaseUpdates.chair_rental = updates.chairRental;
  if (updates.umbrellaRental !== undefined) snakeCaseUpdates.umbrella_rental = updates.umbrellaRental;
  if (updates.commissionRate !== undefined) snakeCaseUpdates.commission_rate = updates.commissionRate;
  
  // 免費提供標記
  if (updates.tableFree !== undefined) snakeCaseUpdates.table_free = updates.tableFree;
  if (updates.chairFree !== undefined) snakeCaseUpdates.chair_free = updates.chairFree;
  if (updates.umbrellaFree !== undefined) snakeCaseUpdates.umbrella_free = updates.umbrellaFree;
  
  // 備註
  if (updates.notes !== undefined) snakeCaseUpdates.notes = updates.notes;
  
  // 更新事件的 payload 為底線式命名
  await db.events.update(event.id!, {
    payload: {
      market_id,
      updates: snakeCaseUpdates,
    },
  });
  
  console.log(`📅 市集已更新：ID ${market_id.substring(0, 8)}...`);
});
```

### 4. 新增 `updateMarket` 函數

**檔案：`lib/db/hooks.ts`**

```typescript
/**
 * 更新市集資料（UUID 版本）
 * 
 * @param marketId - 市集 ID（UUID）
 * @param updates - 要更新的欄位
 */
export async function updateMarket(
  marketId: string,
  updates: Partial<Omit<Market, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await recordEvent('market_updated', {
    market_id: marketId,
    updates,
  });
}
```

### 5. 修改 `EditMarketForm` 組件

**檔案：`components/markets/EditMarketForm.tsx`**

**修改前：**
```typescript
import { db } from '@/lib/db';

// ...

await db.markets.update(market.id!, {
  name: formData.name,
  location: formData.location,
  // ... 其他欄位
  updatedAt: Date.now(),
});
```

**修改後：**
```typescript
import { updateMarket } from '@/lib/db/hooks';

// ...

await updateMarket(market.id!, {
  name: formData.name,
  location: formData.location,
  dates: formData.dates,
  startDate: formData.startDate,
  endDate: formData.endDate,
  earlyEntryEnabled: !noEarlyEntry,
  earlyEntryTime: formData.earlyEntryTime,
  checkInTime: formData.checkInTime,
  operatingStartTime: formData.operatingStartTime,
  operatingEndTime: formData.operatingEndTime,
  boothCost: formData.boothCost,
  deposit: formData.deposit,
  tableRental: tableFree ? 0 : formData.tableRental,
  chairRental: chairFree ? 0 : formData.chairRental,
  umbrellaRental: umbrellaFree ? 0 : formData.umbrellaRental,
  tableFree,
  chairFree,
  umbrellaFree,
  commissionRate: formData.commissionRate,
  notes: formData.notes,
});
```

## 修復效果

修復後的流程：

1. **用戶編輯市集資料** → 點擊「儲存變更」
2. **調用 `updateMarket()`** → 記錄 `market_updated` 事件
3. **事件處理器執行**：
   - 更新本地 IndexedDB
   - 轉換 payload 為底線式命名
4. **觸發同步機制**：
   - `window.dispatchEvent('trigger-sync')` 被觸發
   - `useSync` hook 檢測到待同步事件
   - 上傳事件到 Supabase `events` 表
5. **Supabase 觸發器執行**：
   - 根據事件類型更新 `markets` 表
   - 資料成功同步到雲端

## 測試步驟

1. **編輯市集時間軸**：
   - 進入市集詳情頁面
   - 點擊右上角「編輯」按鈕
   - 修改「市集時間軸」中的時間（例如：報到時間、營業開始時間）
   - 點擊「儲存變更」

2. **檢查本地更新**：
   - 關閉編輯表單
   - 確認市集詳情頁面顯示更新後的時間
   - 重新進入市集詳情，確認資料持久化

3. **檢查事件記錄**：
   - 打開瀏覽器開發者工具 → Application → IndexedDB → `market_pulse` → `events`
   - 查找最新的 `market_updated` 事件
   - 確認 `sync_status` 為 `pending`（待同步）

4. **檢查同步狀態**：
   - 觀察頁面右上角的同步狀態指示器
   - 應該會顯示「同步中...」然後變為「已同步」
   - 或者會彈出「增量同步」的 Toast 提示

5. **檢查 Supabase**：
   - 登入 Supabase Dashboard
   - 進入 `events` 表，查找該 `market_updated` 事件
   - 進入 `markets` 表，確認市集資料已更新

6. **跨設備驗證**：
   - 在另一台設備或瀏覽器登入同一帳號
   - 進入該市集詳情頁面
   - 確認顯示最新的編輯資料

## 相關檔案

- `types/db.ts` - 事件類型定義
- `lib/db/events.ts` - 事件處理器
- `lib/db/hooks.ts` - 資料庫操作函數
- `components/markets/EditMarketForm.tsx` - 編輯市集表單
- `hooks/useSync.ts` - 同步邏輯

## 注意事項

1. **事件溯源原則**：所有資料變更都必須透過 `recordEvent()` 記錄事件，不要直接調用 `db.*.update()`
2. **命名轉換**：前端使用駝峰式（camelCase），Supabase 使用底線式（snake_case），事件處理器負責轉換
3. **同步觸發**：`recordEvent()` 會自動觸發 `trigger-sync` 事件，`useSync` hook 會監聽並執行同步
4. **錯誤處理**：如果同步失敗，事件會被標記為 `local_only`，不會影響本地操作

## 未來改進

1. **批次更新**：如果用戶快速連續編輯，可以考慮批次上傳事件
2. **衝突解決**：如果多人同時編輯同一市集，需要實作衝突解決機制
3. **離線支援**：確保離線時編輯的資料在重新連線後能正確同步

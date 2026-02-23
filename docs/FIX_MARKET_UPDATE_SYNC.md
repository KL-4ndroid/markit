# 市集更新同步問題修復

## 問題描述

當老闆編輯市集詳情並儲存後，員工帳號無法看到更新的內容，即使手動同步或重新登入也無法更新。

## 問題原因

### 根本原因：命名格式不一致

當員工從 Supabase 下載 `market_updated` 事件時，存在命名格式轉換問題：

1. **老闆端（本地）**：
   - 編輯市集 → `updateMarket()` → 記錄 `market_updated` 事件
   - Payload 使用**駝峰式命名**（camelCase）：`{ market_id, updates: { checkInTime, operatingStartTime, ... } }`
   - 事件處理器將 payload 轉換為**底線式命名**（snake_case）並上傳到 Supabase

2. **Supabase（雲端）**：
   - 儲存的 payload 是**底線式命名**：`{ market_id, updates: { check_in_time, operating_start_time, ... } }`
   - 觸發器正確處理並更新 `markets` 表 ✅

3. **員工端（本地）**：
   - 下載 `market_updated` 事件 → Payload 是**底線式命名**
   - 重放事件 → 事件處理器期望**駝峰式命名** ❌
   - **結果：更新失敗，員工看不到變更** ❌

### 技術細節

```typescript
// 老闆端記錄事件（駝峰式）
await recordEvent('market_updated', {
  market_id: 'xxx',
  updates: {
    checkInTime: '09:00',      // 駝峰式
    operatingStartTime: '10:00'
  }
});

// 事件處理器轉換為底線式並上傳
await db.events.update(event.id!, {
  payload: {
    market_id: 'xxx',
    updates: {
      check_in_time: '09:00',      // 底線式
      operating_start_time: '10:00'
    }
  }
});

// 員工端下載事件（底線式）
const event = {
  type: 'market_updated',
  payload: {
    market_id: 'xxx',
    updates: {
      check_in_time: '09:00',      // 底線式
      operating_start_time: '10:00'
    }
  }
};

// 事件處理器期望駝峰式，但收到底線式 → 更新失敗 ❌
await db.markets.update(market_id, {
  ...updates,  // { check_in_time: '09:00' } → 無法匹配 checkInTime 欄位
  updatedAt: event.timestamp,
});
```

## 解決方案

### 修改位置

`hooks/useSync.ts` - 在兩個地方添加命名格式轉換邏輯：

1. **`pullAllEvents()` 函數**：全量同步時的事件重放
2. **`replayEvents()` 函數**：快照同步時的事件重放

### 修改內容

在重放 `market_updated` 事件之前，將 Supabase 的底線式 payload 轉換為駝峰式：

```typescript
// 重放事件處理器
const { eventHandlers } = await import('@/lib/db/events');
const handler = eventHandlers[event.type as keyof typeof eventHandlers];

if (handler) {
  // ✅ 修復：將 Supabase 的底線式 payload 轉換為駝峰式
  let processedPayload = event.payload;
  
  if (event.type === 'market_updated' && event.payload?.updates) {
    const updates = event.payload.updates;
    const camelCaseUpdates: Record<string, unknown> = {};
    
    // 轉換所有欄位：底線式 → 駝峰式
    if (updates.check_in_time !== undefined) 
      camelCaseUpdates.checkInTime = updates.check_in_time;
    if (updates.operating_start_time !== undefined) 
      camelCaseUpdates.operatingStartTime = updates.operating_start_time;
    // ... 其他欄位
    
    processedPayload = {
      market_id: event.payload.market_id,
      updates: camelCaseUpdates,
    };
  }
  
  await handler({
    id: event.id,
    type: event.type,
    payload: processedPayload,  // 使用轉換後的 payload
    timestamp: new Date(event.timestamp).getTime(),
    actor_id: event.actor_id,
    market_id: event.market_id,
  } as Event, db);
}
```

### 轉換的欄位

**基本資訊：**
- `start_date` → `startDate`
- `end_date` → `endDate`
- `start_time` → `startTime`
- `end_time` → `endTime`

**時間軸資訊：**
- `early_entry_enabled` → `earlyEntryEnabled`
- `early_entry_time` → `earlyEntryTime`
- `check_in_time` → `checkInTime`
- `operating_start_time` → `operatingStartTime`
- `operating_end_time` → `operatingEndTime`

**財務資訊：**
- `registration_fee` → `registrationFee`
- `booth_cost` → `boothCost`
- `table_rental` → `tableRental`
- `chair_rental` → `chairRental`
- `umbrella_rental` → `umbrellaRental`
- `tablecloth_rental` → `tableclothRental`
- `commission_rate` → `commissionRate`

**免費提供標記：**
- `table_free` → `tableFree`
- `chair_free` → `chairFree`
- `umbrella_free` → `umbrellaFree`
- `tablecloth_free` → `tableclothFree`

## 測試步驟

### 1. 老闆編輯市集

1. 使用老闆帳號登入
2. 進入市集詳情頁面
3. 點擊「編輯」按鈕
4. 修改市集時間軸（例如：報到時間、營業開始時間）
5. 點擊「儲存變更」
6. 確認本地顯示已更新 ✅

### 2. 員工同步更新

1. 使用員工帳號登入
2. 進入同一個市集的詳情頁面
3. 等待自動同步（30 秒內）或手動點擊同步按鈕
4. **預期結果：員工端顯示更新後的市集資訊** ✅

### 3. 驗證雲端數據

1. 打開 Supabase Dashboard
2. 查看 `events` 表，找到 `market_updated` 事件
3. 檢查 `payload` 欄位，確認是底線式命名
4. 查看 `markets` 表，確認市集資料已更新 ✅

### 4. 測試重新登入

1. 員工帳號登出
2. 重新登入
3. 進入市集詳情頁面
4. **預期結果：顯示最新的市集資訊** ✅

## 相關文件

- `lib/db/events.ts` - 事件處理器定義
- `lib/db/hooks.ts` - `updateMarket()` 函數
- `hooks/useSync.ts` - 同步邏輯（已修復）
- `supabase/migrations/020_add_market_updated_trigger.sql` - Supabase 觸發器

## 注意事項

1. **命名格式一致性**：
   - 本地 IndexedDB：駝峰式（camelCase）
   - Supabase PostgreSQL：底線式（snake_case）
   - 需要在上傳和下載時進行轉換

2. **其他事件類型**：
   - 目前只修復了 `market_updated` 事件
   - 如果其他事件類型也有類似問題，需要添加相應的轉換邏輯

3. **向後兼容**：
   - 修改後的代碼同時支援駝峰式和底線式 payload
   - 不會影響現有的事件記錄

## 修復日期

2026-02-22

## 修復作者

AI Assistant (Grok)

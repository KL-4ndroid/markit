# 並發衝突分析與解決方案

## 📋 問題描述

**用戶反饋：**
> 我使用電腦和手機，進入同一個帳號，但是當我操作電腦時，手機的數據有時候更新，有時不會更新，並且有時候數據是同步的，有時候數據不是同步的。我在思考，如果我電腦和手機同時成交一筆交易，那這筆交易是如何更新給彼此？是否會有衝突？

---

## 🔍 當前架構分析

### 同步機制

```
電腦 (Device A)                    Supabase                    手機 (Device B)
     │                                │                              │
     │ 1. 本地記錄事件                │                              │
     │    event_id: uuid-A            │                              │
     │    timestamp: 1000             │                              │
     │    sync_status: 'local_only'   │                              │
     │                                │                              │
     ├────── Push (30秒後) ──────────►│                              │
     │                                │                              │
     │                                │ Trigger 更新 markets 表      │
     │                                │                              │
     │                                │◄────── Pull (30秒後) ────────┤
     │                                │                              │
     │                                │                              │ 2. 本地記錄事件
     │                                │                              │    event_id: uuid-B
     │                                │                              │    timestamp: 1001
     │                                │                              │    sync_status: 'local_only'
     │                                │                              │
     │                                │◄────── Push (30秒後) ────────┤
     │                                │                              │
     │                                │ Trigger 更新 markets 表      │
     │                                │                              │
     │◄────── Pull (30秒後) ──────────┤                              │
     │                                │                              │
     │ 3. 重放事件 uuid-B             │                              │
     │    本地更新統計                │                              │
```

**關鍵參數：**
- 同步間隔：30 秒
- 節流延遲：5 秒
- 同步方式：定期輪詢（Polling）

---

## 🐛 問題 1：為什麼有時更新，有時不更新？

### 原因分析

#### 1. 同步延遲（最常見）

```
T0: 電腦記錄成交 NT$100
    - 電腦顯示：收入 NT$100 ✅
    - 手機顯示：收入 NT$0   ← ⚠️ 尚未同步

T1-T29: 等待同步...
    - 電腦顯示：收入 NT$100 ✅
    - 手機顯示：收入 NT$0   ← ⚠️ 仍未同步

T30: 電腦 Push 事件到 Supabase
    - Supabase 收入：NT$100 ✅

T31-T59: 等待手機同步...
    - 手機顯示：收入 NT$0   ← ⚠️ 仍未同步

T60: 手機 Pull 事件從 Supabase
    - 手機顯示：收入 NT$100 ✅
```

**結論：** 最長可能需要 **60 秒**才能同步！

---

#### 2. 網路狀態

```javascript
// useSync.ts (第 73 行)
if (!navigator.onLine) {
  setState(prev => ({ ...prev, status: SyncStatus.OFFLINE }));
  return;
}
```

**影響：**
- ✅ 線上：自動同步
- ❌ 離線：等待上線後才同步
- ⚠️ 不穩定：可能同步失敗

---

#### 3. 頁面狀態

**影響：**
- ✅ 頁面開啟：自動同步
- ❌ 頁面關閉：不同步
- ⚠️ 背景執行：可能不同步（瀏覽器節能機制）

---

#### 4. 同步失敗

```javascript
// useSync.ts (第 103 行)
if (error.message?.includes('Failed to fetch') || 
    error.message?.includes('ERR_CONNECTION') ||
    error.code === 'ECONNREFUSED') {
  setState(prev => ({
    ...prev,
    status: SyncStatus.OFFLINE,
    error: '網路連線失敗',
  }));
  return;
}
```

**影響：**
- 網路錯誤：等待下次同步（30 秒後）
- 權限錯誤：清除本地資料
- 其他錯誤：標記為失敗

---

## 🎯 問題 2：同時成交會有衝突嗎？

### 答案：✅ 不會有衝突！

**原因：使用「事件溯源」架構**

---

### 場景模擬：電腦和手機同時成交

```
初始狀態：
- 市集收入：NT$0
- 成交次數：0

═══════════════════════════════════════════════════════════════

T0: 電腦和手機都讀取到相同狀態
    - 電腦本地：收入 NT$0，成交 0 次
    - 手機本地：收入 NT$0，成交 0 次
    - Supabase：收入 NT$0，成交 0 次

═══════════════════════════════════════════════════════════════

T1: 電腦記錄成交 NT$100
    ┌─────────────────────────────────────────┐
    │ 事件 uuid-A                              │
    │ type: 'deal_closed'                     │
    │ payload: { totalAmount: 100 }           │
    │ timestamp: 1000                         │
    │ sync_status: 'local_only'               │
    └─────────────────────────────────────────┘
    
    本地事件處理器執行：
    - 電腦本地：收入 = 0 + 100 = NT$100 ✅
    - 電腦本地：成交 = 0 + 1 = 1 ✅

═══════════════════════════════════════════════════════════════

T2: 手機記錄成交 NT$200
    ┌─────────────────────────────────────────┐
    │ 事件 uuid-B                              │
    │ type: 'deal_closed'                     │
    │ payload: { totalAmount: 200 }           │
    │ timestamp: 1001                         │
    │ sync_status: 'local_only'               │
    └─────────────────────────────────────────┘
    
    本地事件處理器執行：
    - 手機本地：收入 = 0 + 200 = NT$200 ✅
    - 手機本地：成交 = 0 + 1 = 1 ✅

    ⚠️ 注意：手機基於「舊狀態」計算，但這沒關係！

═══════════════════════════════════════════════════════════════

T30: 電腦 Push 事件 uuid-A 到 Supabase
    
    Supabase Trigger 執行：
    ```sql
    UPDATE markets
    SET 
      total_revenue = total_revenue + 100,  -- 0 + 100 = 100
      total_deals = total_deals + 1,        -- 0 + 1 = 1
      updated_at = NOW()
    WHERE id = 'market-xxx';
    ```
    
    - Supabase：收入 = NT$100，成交 = 1 ✅

═══════════════════════════════════════════════════════════════

T31: 手機 Push 事件 uuid-B 到 Supabase
    
    Supabase Trigger 執行：
    ```sql
    UPDATE markets
    SET 
      total_revenue = total_revenue + 200,  -- 100 + 200 = 300 ✅
      total_deals = total_deals + 1,        -- 1 + 1 = 2 ✅
      updated_at = NOW()
    WHERE id = 'market-xxx';
    ```
    
    - Supabase：收入 = NT$300，成交 = 2 ✅

═══════════════════════════════════════════════════════════════

T60: 電腦 Pull 事件 uuid-B 從 Supabase
    
    本地事件處理器執行：
    - 電腦本地：收入 = 100 + 200 = NT$300 ✅
    - 電腦本地：成交 = 1 + 1 = 2 ✅

═══════════════════════════════════════════════════════════════

T61: 手機 Pull 事件 uuid-A 從 Supabase
    
    本地事件處理器執行：
    - 手機本地：收入 = 200 + 100 = NT$300 ✅
    - 手機本地：成交 = 1 + 1 = 2 ✅

═══════════════════════════════════════════════════════════════

最終結果（所有設備一致）：
- 電腦本地：收入 NT$300，成交 2 次 ✅
- 手機本地：收入 NT$300，成交 2 次 ✅
- Supabase：收入 NT$300，成交 2 次 ✅
```

---

### 為什麼不會衝突？

#### ❌ 傳統方式（會衝突）

```sql
-- 電腦執行（基於舊狀態）
UPDATE markets SET total_revenue = 100 WHERE id = 'xxx';

-- 手機執行（覆蓋電腦的更新）
UPDATE markets SET total_revenue = 200 WHERE id = 'xxx';

-- 結果：電腦的 NT$100 被覆蓋，遺失了！❌
-- 最終：total_revenue = 200（錯誤，應該是 300）
```

#### ✅ 事件溯源方式（不會衝突）

```sql
-- 電腦執行（新增事件）
INSERT INTO events (id, type, payload) 
VALUES ('uuid-A', 'deal_closed', '{"totalAmount": 100}');

-- 手機執行（新增事件，不會覆蓋）
INSERT INTO events (id, type, payload) 
VALUES ('uuid-B', 'deal_closed', '{"totalAmount": 200}');

-- Trigger 自動累加（順序執行）
UPDATE markets SET total_revenue = total_revenue + 100;  -- uuid-A
UPDATE markets SET total_revenue = total_revenue + 200;  -- uuid-B

-- 結果：兩個事件都保留，正確累加 ✅
-- 最終：total_revenue = 300（正確）
```

---

## 🛡️ 防護機制

### 1. 防止重複重放事件

```typescript
// useSync.ts (第 332 行)
const existing = await db.events.get(event.id);

if (!existing) {
  // 只有不存在才插入
  await db.events.add({...});
  
  // 重放事件
  await handler(event, db);
}
```

**保證：** 每個事件只會被處理一次 ✅

---

### 2. 事件順序保證

```typescript
// useSync.ts (第 210 行)
const sortedEvents = pendingEvents.sort((a, b) => a.timestamp - b.timestamp);
```

**保證：** 事件按時間順序執行 ✅

---

### 3. 原子性操作

```typescript
// events.ts (第 68 行)
await db.transaction(
  'rw',
  [db.events, db.markets, db.products, db.dailyStats],
  async () => {
    await db.events.add(event);
    await handler(event, db);
  }
);
```

**保證：** 事件記錄和處理是原子性的 ✅

---

## ⚠️ 潛在問題

### 問題 1：同步延遲導致的「暫時不一致」

**場景：**

```
T0: 電腦記錄成交 NT$100
    - 電腦顯示：收入 NT$100 ✅
    - 手機顯示：收入 NT$0   ← ⚠️ 尚未同步

T1-T59: 等待同步...
    - 用戶在手機上看到的數據是「過時的」

T60: 手機同步完成
    - 手機顯示：收入 NT$100 ✅
```

**影響：**
- ⚠️ 用戶體驗不佳（數據延遲 60 秒）
- ⚠️ 可能導致誤判（以為沒有成交）

**狀態：** 這是「最終一致性」的正常現象，但可以優化

---

### 問題 2：庫存扣減的並發問題

**場景：**

```
初始狀態：商品 A 庫存 = 1

T0: 電腦和手機都讀取到庫存 = 1

T1: 電腦成交商品 A × 1
    - 電腦本地：庫存 = 1 - 1 = 0 ✅
    - 手機本地：庫存 = 1（尚未同步）

T2: 手機成交商品 A × 1
    - 手機本地：庫存 = 1 - 1 = 0 ✅
    - ⚠️ 問題：實際上已經超賣了！

T30: 電腦 Push 事件到 Supabase
    - Supabase：庫存 = 1 - 1 = 0 ✅

T31: 手機 Push 事件到 Supabase
    - Supabase：庫存 = 0 - 1 = -1 ❌ 負庫存！

T60: 電腦 Pull 事件
    - 電腦本地：庫存 = 0 - 1 = -1 ❌

T61: 手機 Pull 事件
    - 手機本地：庫存 = 0 - 1 = -1 ❌
```

**影響：**
- ❌ 庫存超賣
- ❌ 負庫存

**目前的防護：**

```typescript
// hooks.ts (第 268 行)
if (!product.unlimitedStock) {
  const currentStock = product.stock || 0;
  
  if (currentStock < item.quantity) {
    throw new Error(
      `${product.name} 庫存不足！\n目前庫存：${currentStock}，需要：${item.quantity}`
    );
  }
}
```

**問題：** 只檢查本地庫存，無法防止並發超賣 ⚠️

---

## 🚀 優化方案

### 方案 1：即時同步（推薦）⭐⭐⭐

**目標：** 操作後立即同步，不等待 30 秒

**實現：**

```typescript
// 在 recordEvent 後立即觸發同步
export async function recordEvent<T = any>(
  type: EventType,
  payload: T,
  eventId?: string
): Promise<string> {
  // ... 記錄事件 ...
  
  // ✅ 立即觸發同步（如果在瀏覽器環境）
  if (typeof window !== 'undefined') {
    // 使用 setTimeout 避免阻塞
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('trigger-sync'));
    }, 100);
  }
  
  return id;
}
```

```typescript
// useSync.ts 監聽自訂事件
useEffect(() => {
  const handleTriggerSync = () => {
    throttledSync();
  };
  
  window.addEventListener('trigger-sync', handleTriggerSync);
  
  return () => {
    window.removeEventListener('trigger-sync', handleTriggerSync);
  };
}, [throttledSync]);
```

**優點：**
- ✅ 同步延遲從 60 秒降低到 5-10 秒
- ✅ 用戶體驗大幅提升
- ✅ 實現簡單，不需要改動太多代碼

**缺點：**
- ⚠️ 頻繁操作會增加網路請求
- ⚠️ 仍有 5 秒節流延遲

---

### 方案 2：Supabase Realtime（最佳）⭐⭐⭐⭐⭐

**目標：** 使用 WebSocket 實現即時同步

**實現：**

```typescript
// 訂閱 events 表的變更
const channel = supabase
  .channel('events-changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'events',
      filter: `market_id=in.(${marketIds.join(',')})`,
    },
    (payload) => {
      console.log('📥 收到新事件:', payload.new);
      
      // 立即重放事件到本地
      handleNewEvent(payload.new);
    }
  )
  .subscribe();
```

**優點：**
- ✅ 即時同步（延遲 < 1 秒）
- ✅ 不需要輪詢，節省資源
- ✅ 用戶體驗最佳

**缺點：**
- ⚠️ 需要 Supabase Realtime 功能（可能需要付費）
- ⚠️ 實現較複雜

---

### 方案 3：樂觀鎖（防止庫存超賣）⭐⭐⭐⭐

**目標：** 使用版本號防止並發衝突

**實現：**

```sql
-- 在 products 表添加 version 欄位
ALTER TABLE products ADD COLUMN version INTEGER DEFAULT 0;

-- 更新時檢查版本號
UPDATE products
SET 
  stock = stock - 1,
  version = version + 1
WHERE id = 'xxx' AND version = 5;  -- 只有版本號匹配才更新

-- 如果 affected_rows = 0，代表版本號不匹配（有其他設備更新了）
```

```typescript
// 成交時檢查版本號
const product = await db.products.get(item.productId);
const currentVersion = product.version;

// Push 到 Supabase 時帶上版本號
await supabase
  .from('products')
  .update({ 
    stock: product.stock - item.quantity,
    version: currentVersion + 1,
  })
  .eq('id', item.productId)
  .eq('version', currentVersion);  // 樂觀鎖

// 如果更新失敗，代表有衝突
if (error) {
  throw new Error('庫存已被其他設備更新，請重新整理');
}
```

**優點：**
- ✅ 完全防止庫存超賣
- ✅ 標準的並發控制方案

**缺點：**
- ⚠️ 需要修改 schema
- ⚠️ 需要處理衝突（重試或提示用戶）

---

### 方案 4：服務端驗證（最安全）⭐⭐⭐⭐⭐

**目標：** 在 Supabase 端驗證庫存

**實現：**

```sql
-- 創建 RPC 函數
CREATE OR REPLACE FUNCTION record_deal(
  p_market_id UUID,
  p_items JSONB,
  p_total_amount NUMERIC
) RETURNS VOID AS $$
DECLARE
  v_item JSONB;
  v_product RECORD;
BEGIN
  -- 1. 檢查庫存（加鎖）
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'productId')::UUID
    FOR UPDATE;  -- 加鎖，防止並發
    
    IF NOT v_product.unlimited_stock AND 
       v_product.stock < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION '庫存不足：%', v_product.name;
    END IF;
  END LOOP;
  
  -- 2. 記錄事件
  INSERT INTO events (type, payload, market_id)
  VALUES ('deal_closed', p_items, p_market_id);
  
  -- 3. Trigger 會自動更新庫存
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// 前端調用 RPC
const { error } = await supabase.rpc('record_deal', {
  p_market_id: marketId,
  p_items: items,
  p_total_amount: totalAmount,
});

if (error) {
  throw new Error(error.message);
}
```

**優點：**
- ✅ 完全防止庫存超賣
- ✅ 服務端驗證，最安全
- ✅ 使用資料庫鎖，保證原子性

**缺點：**
- ⚠️ 需要創建 RPC 函數
- ⚠️ 離線時無法成交（需要網路）

---

## 📊 方案對比

| 方案 | 同步延遲 | 防止超賣 | 實現難度 | 離線支援 | 推薦度 |
|------|---------|---------|---------|---------|--------|
| 當前方案 | 60 秒 | ❌ | 簡單 | ✅ | ⭐⭐ |
| 即時同步 | 5-10 秒 | ❌ | 簡單 | ✅ | ⭐⭐⭐ |
| Realtime | < 1 秒 | ❌ | 中等 | ✅ | ⭐⭐⭐⭐⭐ |
| 樂觀鎖 | 60 秒 | ✅ | 中等 | ⚠️ | ⭐⭐⭐⭐ |
| 服務端驗證 | 即時 | ✅ | 複雜 | ❌ | ⭐⭐⭐⭐⭐ |

---

## 🎯 推薦實施順序

### 階段 1：快速改進（1-2 小時）

**實施方案 1：即時同步**

- ✅ 同步延遲從 60 秒降低到 5-10 秒
- ✅ 實現簡單，立即見效
- ✅ 不影響離線功能

---

### 階段 2：體驗優化（1 天）

**實施方案 2：Supabase Realtime**

- ✅ 同步延遲降低到 < 1 秒
- ✅ 用戶體驗最佳
- ✅ 節省資源（不需要輪詢）

---

### 階段 3：安全加固（2-3 天）

**實施方案 4：服務端驗證**

- ✅ 完全防止庫存超賣
- ✅ 服務端驗證，最安全
- ⚠️ 需要處理離線場景

---

## 📝 總結

### ✅ 好消息

1. **不會有數據衝突**：事件溯源架構保證了數據一致性
2. **最終一致性**：所有設備最終會達到相同狀態
3. **已有防護機制**：防止重複重放、保證事件順序

### ⚠️ 需要改進

1. **同步延遲**：60 秒太長，影響用戶體驗
2. **庫存超賣**：並發成交可能導致負庫存
3. **用戶感知**：需要更好的同步狀態提示

### 🚀 下一步行動

**建議立即實施「方案 1：即時同步」：**

1. 修改 `recordEvent` 函數，觸發自訂事件
2. 修改 `useSync` hook，監聽自訂事件
3. 測試驗證

**預估時間：** 1-2 小時
**效果：** 同步延遲從 60 秒降低到 5-10 秒

---

## 🔧 實施指南

請查看下一個文檔：`INSTANT-SYNC-IMPLEMENTATION.md`

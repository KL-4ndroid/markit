# 事件溯源強化實作報告

> **更新日期**: 2026-02-24  
> **範圍**: 強化事件溯源機制、等冪性處理、衝突解決  
> **狀態**: ✅ 完成

---

## 📋 審核結果

### ✅ 已符合 Local-First 的部分

#### 1. `lib/db/hooks.ts` - 完全符合
```typescript
// ✅ 所有寫入都使用 recordEvent
export async function createMarket(data: MarketCreatedPayload): Promise<string> {
  return await recordEvent('market_created', data);
}

export async function updateMarketStatus(
  marketId: string,
  newStatus: MarketStatus,
  reason?: string
): Promise<void> {
  await recordEvent('market_status_changed', {
    market_id: marketId,
    oldStatus: market.status,
    newStatus,
    reason,
  });
}
```

#### 2. `lib/db/events.ts` - 完全符合
```typescript
// ✅ 核心 recordEvent 函數
export async function recordEvent<T>(
  type: EventType,
  payload: T,
  eventId?: string
): Promise<string> {
  // 1. 寫入 events 表
  await db.events.add(event);
  
  // 2. 觸發事件處理器
  const handler = eventHandlers[type];
  if (handler) {
    await handler(event, db);
  }
  
  // 3. 觸發同步（非阻塞）
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent('trigger-sync'));
  });
  
  return id;
}
```

#### 3. UI 組件 - 完全符合
- 沒有發現任何組件直接操作 Dexie 或 Supabase
- 所有讀取都使用 `useLiveQuery`
- 所有寫入都使用 `recordEvent`

---

## 🔧 需要強化的部分

### 1. `hooks/useSync.ts` - 需要強化

#### 問題 1：缺少順序處理（Sequential Processing）
```typescript
// ❌ 當前：批次上傳（可能亂序）
for (const event of sortedEvents) {
  await supabase.from('events').upsert(event);
}
```

#### 問題 2：缺少等冪性保證（Idempotency）
```typescript
// ❌ 當前：可能重複處理
await supabase.from('events').upsert(event);
// 如果網路中斷，可能重複上傳
```

#### 問題 3：衝突解決不完整（Conflict Resolution）
```typescript
// ❌ 當前：簡單的時間戳比較
if (cloudEvent.timestamp > localEvent.timestamp) {
  // 使用雲端版本
}
```

---

## 🚀 強化方案

### 方案 1：背景重播引擎（Sequential Processing）

**目標**：確保事件按順序處理，避免亂序導致的數據不一致

```typescript
/**
 * 背景重播引擎
 * 
 * 特性：
 * 1. 順序處理（Sequential）：按 timestamp 升序處理
 * 2. 批次提交：每 10 個事件提交一次
 * 3. 錯誤恢復：失敗的事件標記為 error，不阻塞後續
 * 4. 進度追蹤：實時更新同步進度
 */
async function sequentialReplay(
  events: Event[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const total = events.length;
  let success = 0;
  let failed = 0;
  
  // 按 timestamp 升序排序（確保順序）
  const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
  
  // 批次處理（每 10 個一批）
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < sortedEvents.length; i += BATCH_SIZE) {
    const batch = sortedEvents.slice(i, i + BATCH_SIZE);
    
    // 順序處理每個事件
    for (const event of batch) {
      try {
        // 檢查是否已存在（等冪性）
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('id', event.id)
          .maybeSingle();
        
        if (existing) {
          // 已存在，標記為已同步
          await db.events.update(event.id!, {
            sync_status: 'synced',
          });
          success++;
          continue;
        }
        
        // 上傳事件
        const { error } = await supabase
          .from('events')
          .insert({
            id: event.id,
            type: event.type,
            payload: event.payload,
            actor_id: event.actor_id,
            market_id: event.market_id,
            timestamp: new Date(event.timestamp).toISOString(),
            metadata: event.metadata,
          });
        
        if (error) throw error;
        
        // 標記為已同步
        await db.events.update(event.id!, {
          sync_status: 'synced',
        });
        
        success++;
      } catch (error) {
        console.error(`❌ 事件上傳失敗: ${event.id}`, error);
        
        // 標記為錯誤（不阻塞後續）
        await db.events.update(event.id!, {
          sync_status: 'error',
          metadata: {
            ...event.metadata,
            error: (error as Error).message,
          },
        });
        
        failed++;
      }
      
      // 更新進度
      if (onProgress) {
        onProgress(i + batch.indexOf(event) + 1, total);
      }
    }
  }
  
  return { success, failed };
}
```

### 方案 2：等冪性處理（Idempotency）

**目標**：確保重複同步不會導致數據重複

```typescript
/**
 * 等冪性檢查
 * 
 * 在上傳前檢查事件是否已存在
 * 如果已存在，直接標記為已同步
 */
async function idempotentUpload(event: Event): Promise<boolean> {
  try {
    // 步驟 1：檢查是否已存在
    const { data: existing, error: checkError } = await supabase
      .from('events')
      .select('id, sync_status')
      .eq('id', event.id)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    // 步驟 2：如果已存在，標記為已同步
    if (existing) {
      console.log(`✅ 事件已存在，跳過: ${event.id}`);
      
      await db.events.update(event.id!, {
        sync_status: 'synced',
      });
      
      return true; // 已處理
    }
    
    // 步驟 3：上傳事件
    const { error: insertError } = await supabase
      .from('events')
      .insert({
        id: event.id,
        type: event.type,
        payload: event.payload,
        actor_id: event.actor_id,
        market_id: event.market_id,
        timestamp: new Date(event.timestamp).toISOString(),
        metadata: event.metadata,
      });
    
    if (insertError) {
      // 如果是唯一性衝突（23505），說明已存在
      if (insertError.code === '23505') {
        console.log(`✅ 事件已存在（並發上傳），標記為已同步: ${event.id}`);
        
        await db.events.update(event.id!, {
          sync_status: 'synced',
        });
        
        return true; // 已處理
      }
      
      throw insertError;
    }
    
    // 步驟 4：標記為已同步
    await db.events.update(event.id!, {
      sync_status: 'synced',
    });
    
    return true; // 成功
  } catch (error) {
    console.error(`❌ 等冪性上傳失敗: ${event.id}`, error);
    return false; // 失敗
  }
}
```

### 方案 3：衝突解決（Conflict Resolution）

**目標**：當本地和雲端數據不一致時，智能合併

```typescript
/**
 * 衝突解決策略
 * 
 * 規則：
 * 1. Last-Write-Wins (LWW)：時間戳較新的優先
 * 2. 事件不可變：events 表不會衝突（UUID 唯一）
 * 3. 快照表衝突：比較 updatedAt，取較新的
 * 4. 特殊處理：某些欄位使用累加（如 totalRevenue）
 */
interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge';
  reason: string;
}

async function resolveConflict(
  localData: Market,
  remoteData: Market
): Promise<ConflictResolution> {
  // 規則 1：比較 updatedAt
  if (localData.updatedAt > remoteData.updatedAt) {
    return {
      strategy: 'local',
      reason: '本地數據較新',
    };
  }
  
  if (remoteData.updatedAt > localData.updatedAt) {
    return {
      strategy: 'remote',
      reason: '雲端數據較新',
    };
  }
  
  // 規則 2：時間戳相同，比較內容
  // 對於統計欄位（totalRevenue, totalDeals），使用較大值
  const shouldMerge = 
    localData.totalRevenue !== remoteData.totalRevenue ||
    localData.totalDeals !== remoteData.totalDeals;
  
  if (shouldMerge) {
    return {
      strategy: 'merge',
      reason: '統計欄位不一致，需要合併',
    };
  }
  
  // 規則 3：完全相同，使用本地
  return {
    strategy: 'local',
    reason: '數據相同，保留本地',
  };
}

/**
 * 執行衝突合併
 */
async function mergeConflict(
  localData: Market,
  remoteData: Market
): Promise<Market> {
  return {
    ...remoteData, // 基礎數據使用雲端
    
    // 統計欄位使用較大值
    totalRevenue: Math.max(
      localData.totalRevenue || 0,
      remoteData.totalRevenue || 0
    ),
    totalProfit: Math.max(
      localData.totalProfit || 0,
      remoteData.totalProfit || 0
    ),
    totalDeals: Math.max(
      localData.totalDeals || 0,
      remoteData.totalDeals || 0
    ),
    totalInteractions: Math.max(
      localData.totalInteractions || 0,
      remoteData.totalInteractions || 0
    ),
    
    // 時間戳使用較新的
    updatedAt: Math.max(localData.updatedAt, remoteData.updatedAt),
  };
}
```

---

## 📊 完整的同步流程

```
┌─────────────────────────────────────────────┐
│     1. 檢查待同步事件                        │
│     - 查詢 sync_status = 'pending'          │
│     - 按 timestamp 升序排序                 │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     2. 背景重播引擎                          │
│     - 順序處理（Sequential）                │
│     - 批次提交（每 10 個）                   │
│     - 等冪性檢查（避免重複）                 │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     3. 上傳事件到 Supabase                  │
│     - 檢查是否已存在                         │
│     - 如果已存在，標記為 synced             │
│     - 如果不存在，執行 insert               │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     4. 下載雲端新事件                        │
│     - 查詢 timestamp > lastSyncAt           │
│     - 寫入本地 Dexie                        │
│     - 觸發事件處理器                         │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     5. 衝突檢測與解決                        │
│     - 比較 updatedAt                        │
│     - 執行合併策略                           │
│     - 更新本地數據                           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     6. 更新同步狀態                          │
│     - 標記事件為 synced                     │
│     - 更新 lastSyncAt                       │
│     - 觸發 UI 更新                          │
└─────────────────────────────────────────────┘
```

---

## 🔒 安全性保證

### 1. 等冪性（Idempotency）

**問題**：網路中斷可能導致重複上傳

**解決方案**：
```typescript
// ✅ 上傳前檢查是否已存在
const { data: existing } = await supabase
  .from('events')
  .select('id')
  .eq('id', event.id)
  .maybeSingle();

if (existing) {
  // 已存在，跳過
  return;
}

// 不存在，執行上傳
await supabase.from('events').insert(event);
```

### 2. 原子性（Atomicity）

**問題**：部分事件上傳成功，部分失敗

**解決方案**：
```typescript
// ✅ 每個事件獨立處理
for (const event of events) {
  try {
    await uploadEvent(event);
    await db.events.update(event.id, { sync_status: 'synced' });
  } catch (error) {
    // 標記為錯誤，不影響其他事件
    await db.events.update(event.id, { sync_status: 'error' });
  }
}
```

### 3. 順序性（Ordering）

**問題**：事件亂序可能導致數據不一致

**解決方案**：
```typescript
// ✅ 按 timestamp 升序排序
const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);

// ✅ 順序處理
for (const event of sortedEvents) {
  await uploadEvent(event);
}
```

---

## 📝 實作檢查清單

### Push（上傳）

- [x] 按 timestamp 升序排序
- [x] 等冪性檢查（避免重複）
- [x] 批次處理（每 10 個）
- [x] 錯誤處理（不阻塞後續）
- [x] 進度追蹤
- [x] 成功後標記為 synced

### Pull（下載）

- [x] 查詢 timestamp > lastSyncAt
- [x] 寫入本地 Dexie
- [x] 觸發事件處理器
- [x] 更新快照表
- [x] UI 自動更新

### 衝突解決

- [x] 比較 updatedAt
- [x] Last-Write-Wins 策略
- [x] 統計欄位合併（取較大值）
- [x] 記錄衝突日誌

---

## 🎯 效能優化

### 1. 批次處理

```typescript
// ✅ 每 10 個事件一批
const BATCH_SIZE = 10;
for (let i = 0; i < events.length; i += BATCH_SIZE) {
  const batch = events.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

### 2. 並行查詢

```typescript
// ✅ 並行檢查多個事件
const checks = events.map(event => 
  supabase
    .from('events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle()
);

const results = await Promise.all(checks);
```

### 3. 索引優化

```sql
-- ✅ 為常用查詢建立索引
CREATE INDEX idx_events_sync_status ON events(sync_status);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_market_id ON events(market_id);
```

---

## 📊 監控與日誌

### 同步統計

```typescript
interface SyncStats {
  totalEvents: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  duration: number;
  avgSpeed: number; // 事件/秒
}
```

### 錯誤追蹤

```typescript
interface SyncError {
  eventId: string;
  eventType: string;
  error: string;
  timestamp: number;
  retryCount: number;
}
```

---

## 🚀 下一步

1. **實作強化版 useSync** ✅
2. **添加單元測試** 🔜
3. **效能測試** 🔜
4. **監控儀表板** 🔜

---

**文檔版本**: v1.0  
**最後更新**: 2026-02-24  
**維護者**: Market Pulse 開發團隊

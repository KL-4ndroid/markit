# 雲端同步邏輯完整說明

## 📋 目錄

1. [同步架構概述](#同步架構概述)
2. [同步時機](#同步時機)
3. [同步流程](#同步流程)
4. [數據流向](#數據流向)
5. [同步狀態](#同步狀態)
6. [錯誤處理](#錯誤處理)
7. [時間軸示例](#時間軸示例)

---

## 🏗️ 同步架構概述

### 核心概念

本專案採用 **事件溯源 (Event Sourcing)** + **離線優先 (Offline-First)** 架構：

```
用戶操作 → 本地事件記錄 → 本地快照更新 → 背景同步 → 雲端 Supabase
                ↓                                        ↓
            立即生效                              其他設備拉取
```

### 關鍵組件

1. **本地 IndexedDB** (`lib/db/index.ts`)
   - 儲存所有事件和快照
   - 離線可用
   - 即時響應

2. **事件記錄器** (`lib/db/events.ts`)
   - 記錄所有數據變更為事件
   - 更新本地快照
   - 觸發同步

3. **同步引擎** (`hooks/useSync.ts`)
   - 雙向同步（Push + Pull）
   - 自動重試
   - 衝突處理

4. **雲端 Supabase**
   - PostgreSQL 數據庫
   - 事件持久化
   - 多設備共享

---

## ⏰ 同步時機

### 1. **即時同步（100ms 延遲）**

**觸發條件**：任何數據變更操作

**觸發方式**：
```javascript
// 在 recordEvent 函數中
window.dispatchEvent(new CustomEvent('trigger-sync', {
  detail: { eventType: type, eventId: id }
}));
```

**觸發的操作**：
- ✅ 新增市集
- ✅ 編輯市集
- ✅ 更新市集狀態
- ✅ 開始/結束營業
- ✅ 刪除市集
- ✅ 新增商品
- ✅ 編輯商品
- ✅ 記錄互動（摸摸、詢問）
- ✅ 記錄成交
- ✅ 補登收入

**延遲原因**：
- 讓本地事件處理完成
- 避免阻塞 UI
- 節流防止頻繁同步

---

### 2. **定期同步（30 秒）**

**觸發條件**：自動定時器

**配置**：
```typescript
const { sync } = useSync({
  enabled: true,
  interval: 30000,  // 30 秒
  throttle: 5000,   // 5 秒節流
});
```

**用途**：
- 拉取其他設備的更新
- 重試失敗的上傳
- 保持數據同步

---

### 3. **網路恢復同步**

**觸發條件**：從離線恢復到在線

**監聽事件**：
```javascript
window.addEventListener('online', () => {
  console.log('🌐 網路已連線，觸發同步');
  throttledSync();
});
```

**用途**：
- 上傳離線期間的變更
- 拉取錯過的更新

---

### 4. **手動同步**

**觸發條件**：用戶主動觸發（如果有提供按鈕）

**調用方式**：
```typescript
const { sync } = useSync();
sync(); // 立即同步
```

---

### 5. **初始同步**

**觸發條件**：應用啟動 + 用戶已登入

**時機**：
```typescript
useEffect(() => {
  if (enabled && isConfigured && user) {
    throttledSync(); // 初始同步
  }
}, [enabled, isConfigured, user]);
```

**用途**：
- 拉取最新數據
- 上傳未同步的變更

---

## 🔄 同步流程

### Push（上傳本地事件到雲端）

```
1. 查詢待同步事件
   ↓
   SELECT * FROM events 
   WHERE sync_status IN ('pending', 'local_only')
   ORDER BY timestamp ASC

2. 按時間排序
   ↓
   確保 market_created 先於其他市集事件

3. 逐個上傳到 Supabase
   ↓
   INSERT INTO events (id, type, payload, ...)
   ON CONFLICT (id) DO UPDATE

4. 更新本地同步狀態
   ↓
   UPDATE events SET sync_status = 'synced'

5. 錯誤處理
   ↓
   - 23505: 事件已存在 → 標記為 synced
   - 23503: 外鍵衝突 → 等待下次重試
   - PGRST301: 權限不足 → 標記為 local_only
```

---

### Pull（從雲端下載新事件）

```
1. 獲取最後同步時間
   ↓
   SELECT lastSyncAt FROM settings

2. 查詢雲端新事件
   ↓
   SELECT * FROM events
   WHERE timestamp > lastSyncAt
   AND (market_id IN (user_markets) OR actor_id = user_id)
   ORDER BY timestamp ASC

3. 檢查本地是否已存在
   ↓
   SELECT * FROM events WHERE id = ?

4. 插入新事件到本地
   ↓
   INSERT INTO events (id, type, payload, ...)
   SET sync_status = 'synced'

5. 重放事件更新快照
   ↓
   執行對應的 eventHandler

6. 更新最後同步時間
   ↓
   UPDATE settings SET lastSyncAt = NOW()
```

---

## 📊 數據流向

### 用戶操作 → 雲端

```
用戶點擊「新增市集」
    ↓
調用 createMarket(payload)
    ↓
recordEvent('market_created', payload)
    ↓
1. 生成 UUID
2. 寫入 events 表 (sync_status: 'local_only')
3. 執行 eventHandler 更新 markets 表
4. 觸發 'trigger-sync' 事件
    ↓
useSync 監聽到事件
    ↓
延遲 100ms 後執行 throttledSync()
    ↓
pushEvents(userId)
    ↓
上傳到 Supabase events 表
    ↓
更新本地 sync_status = 'synced'
```

---

### 雲端 → 用戶

```
其他設備新增市集
    ↓
事件寫入 Supabase events 表
    ↓
本地定期同步（30秒）或網路恢復
    ↓
pullEvents(userId)
    ↓
查詢 Supabase 新事件
    ↓
下載到本地 events 表 (sync_status: 'synced')
    ↓
執行 eventHandler 更新 markets 表
    ↓
UI 自動更新（Dexie React Hooks）
```

---

## 🎯 同步狀態

### sync_status 欄位

| 狀態 | 說明 | 何時設置 | 下一步 |
|------|------|----------|--------|
| `local_only` | 僅本地 | 事件剛創建時 | 等待上傳 |
| `pending` | 待同步 | 上傳失敗但可重試 | 下次同步重試 |
| `synced` | 已同步 | 上傳成功或從雲端下載 | 無需操作 |

### SyncStatus 枚舉

| 狀態 | 說明 | UI 顯示 |
|------|------|---------|
| `IDLE` | 閒置 | - |
| `SYNCING` | 同步中 | 載入動畫 |
| `SUCCESS` | 同步成功 | ✅ |
| `ERROR` | 同步失敗 | ❌ 錯誤訊息 |
| `OFFLINE` | 離線 | 📴 離線模式 |

---

## 🔧 錯誤處理

### 1. 網路錯誤

**錯誤碼**：`Failed to fetch`, `ERR_CONNECTION`, `ECONNREFUSED`

**處理方式**：
```typescript
if (error.message?.includes('Failed to fetch')) {
  setState({ status: SyncStatus.OFFLINE });
  // 不標記為失敗，等待網路恢復自動重試
  return;
}
```

**用戶體驗**：
- 顯示離線圖標
- 數據仍可本地使用
- 網路恢復後自動同步

---

### 2. 事件已存在

**錯誤碼**：`23505` (PostgreSQL unique violation)

**處理方式**：
```typescript
if (error.code === '23505') {
  await db.events.update(event.id, { sync_status: 'synced' });
  continue; // 繼續下一個事件
}
```

**原因**：
- 重複上傳
- 多設備同時操作

---

### 3. 外鍵衝突

**錯誤碼**：`23503` (market_id 不存在)

**處理方式**：
```typescript
if (error.code === '23503') {
  // 檢查是否有 market_created 事件待同步
  const marketCreatedEvent = sortedEvents.find(...);
  
  if (marketCreatedEvent) {
    // 保持 pending，等待下次重試
    continue;
  } else {
    // 標記為 local_only
    await db.events.update(event.id, { sync_status: 'local_only' });
  }
}
```

**原因**：
- 事件順序錯誤
- market_created 尚未上傳

---

### 4. 權限錯誤

**錯誤碼**：`PGRST301`, `403`

**處理方式**：
```typescript
if (error.code === 'PGRST301') {
  await db.events.update(event.id, { sync_status: 'local_only' });
  await handlePermissionRevoked(); // 清除協作數據
}
```

**原因**：
- RLS 政策阻止
- 用戶被移除出市集

---

## 📅 時間軸示例

### 場景 1：新增市集

```
T+0ms    用戶點擊「新增市集」
T+10ms   recordEvent('market_created') 完成
         - events 表新增記錄 (sync_status: 'local_only')
         - markets 表新增記錄
         - UI 立即顯示新市集
T+110ms  觸發 throttledSync()
T+115ms  開始 pushEvents()
T+200ms  上傳到 Supabase 成功
         - 更新 sync_status = 'synced'
T+30s    定期同步（無新事件）
```

---

### 場景 2：多設備同步

```
設備 A                          設備 B
T+0s    新增市集 A
T+0.1s  上傳到雲端
                                T+5s    定期同步
                                T+5.2s  下載市集 A
                                T+5.3s  UI 顯示市集 A
                                T+10s   新增市集 B
                                T+10.1s 上傳到雲端
T+30s   定期同步
T+30.2s 下載市集 B
T+30.3s UI 顯示市集 B
```

---

### 場景 3：離線操作

```
T+0s    網路斷線
T+1s    用戶新增市集 A
        - 本地記錄 (sync_status: 'local_only')
        - UI 立即顯示
T+1.1s  嘗試同步 → 檢測到離線
        - 狀態: OFFLINE
T+2s    用戶新增市集 B
        - 本地記錄 (sync_status: 'local_only')
T+60s   網路恢復
T+60.1s 觸發 online 事件
T+60.2s 開始同步
        - 上傳市集 A
        - 上傳市集 B
T+60.5s 同步完成
        - 狀態: SUCCESS
```

---

## 🎯 關鍵時間點總結

### 何時會上傳數據？

1. ✅ **任何數據變更後 100ms**（即時同步）
2. ✅ **每 30 秒**（定期同步）
3. ✅ **網路恢復時**（online 事件）
4. ✅ **應用啟動時**（初始同步）

### 何時會拉取數據？

1. ✅ **每 30 秒**（定期同步）
2. ✅ **網路恢復時**（online 事件）
3. ✅ **應用啟動時**（初始同步）

### 何時會更新 UI？

1. ✅ **本地操作後立即更新**（不等待同步）
2. ✅ **拉取到新事件後自動更新**（Dexie React Hooks）

---

## 💡 最佳實踐

### 1. 離線優先

- 所有操作先寫入本地
- UI 立即響應
- 背景同步到雲端

### 2. 事件順序

- 按時間戳排序
- market_created 必須先於其他市集事件
- 避免外鍵衝突

### 3. 錯誤容忍

- 網路錯誤不標記為失敗
- 自動重試機制
- 用戶無感知

### 4. 衝突處理

- 事件 ID 使用 UUID 避免衝突
- 時間戳作為排序依據
- Last-Write-Wins 策略

---

## 🔍 調試技巧

### 查看同步狀態

```javascript
// 在瀏覽器控制台
const { sync, status, lastSyncAt, pendingCount } = useSync();
console.log('同步狀態:', status);
console.log('最後同步:', new Date(lastSyncAt));
console.log('待同步事件:', pendingCount);
```

### 查看待同步事件

```javascript
// 在瀏覽器控制台
const pendingEvents = await db.events
  .where('sync_status')
  .anyOf(['pending', 'local_only'])
  .toArray();
console.table(pendingEvents);
```

### 手動觸發同步

```javascript
// 在瀏覽器控制台
window.dispatchEvent(new CustomEvent('trigger-sync'));
```

---

## 📝 總結

### 同步特點

- ✅ **即時響應**：本地操作立即生效
- ✅ **自動同步**：100ms + 30s 雙重保障
- ✅ **離線可用**：無網路也能正常使用
- ✅ **多設備同步**：自動拉取其他設備的更新
- ✅ **錯誤容忍**：自動重試，用戶無感知

### 數據流向

```
用戶操作 → 本地 IndexedDB → 背景同步 → Supabase → 其他設備
   ↓                                                    ↓
立即生效                                          自動拉取更新
```

### 時間保證

- **本地操作**：< 50ms
- **同步延遲**：100ms - 30s
- **UI 更新**：即時（本地）+ 自動（遠端）

---

## 🎉 完成！

現在您已經完全了解整個專案的雲端同步邏輯！

如有任何疑問，請參考：
- `lib/db/events.ts` - 事件記錄邏輯
- `hooks/useSync.ts` - 同步引擎
- `lib/db/index.ts` - 數據庫定義

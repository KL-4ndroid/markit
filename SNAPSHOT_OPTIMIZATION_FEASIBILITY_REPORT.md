# 📊 Market Pulse - 快照優化方案可行性分析報告

**報告日期**: 2025-02-17  
**專案版本**: v0.1.0  
**分析範圍**: 事件溯源系統性能優化 - 快照機制實施方案

---

## 📋 執行摘要

### 問題陳述
當前系統採用純事件溯源架構，隨著用戶使用時間增長，將面臨以下挑戰：
- 新設備首次同步需下載並重放所有歷史事件（5年用戶可能達10萬+事件）
- 同步時間從秒級增長到分鐘級，嚴重影響用戶體驗
- 本地存儲壓力持續增加

### 建議方案
實施**快照機制 + 事件歸檔 + 分頁下載**的組合優化方案，預期可將同步時間減少 95%+。

### 風險評級
🟢 **低風險** - 方案技術成熟，向後兼容，可分階段實施

---

## 🎯 方案目標

### 主要目標
1. **性能提升**: 新設備同步時間從分鐘級降至秒級
2. **存儲優化**: 本地只保留近期事件，歷史事件歸檔到雲端
3. **用戶體驗**: 提供清晰的同步進度和數據量顯示
4. **可擴展性**: 支持未來百萬級事件規模

### 成功指標
- 新設備首次同步時間 < 10 秒（100,000 事件場景）
- 本地存儲空間減少 70%+
- 同步失敗率 < 1%
- 向後兼容性 100%

---

## 🔍 現狀分析

### 當前架構

#### 技術棧
```typescript
- 前端: Next.js 14 + TypeScript
- 本地數據庫: Dexie.js (IndexedDB)
- 雲端數據庫: Supabase (PostgreSQL)
- 同步引擎: hooks/useSync.ts
- 事件處理: lib/db/events.ts
```

#### 數據流
```
用戶操作 → recordEvent() → IndexedDB (events表)
                          ↓
                    事件處理器 (eventHandlers)
                          ↓
                    更新快照表 (markets/products/dailyStats)
                          ↓
                    標記為 pending → 後台同步到 Supabase
```

#### 當前同步邏輯
```typescript
// pullEvents() - 下載所有事件並重放
1. 查詢雲端所有事件 (WHERE timestamp > lastSyncAt)
2. 逐個下載並插入本地 IndexedDB
3. 逐個重放事件更新快照表
4. 更新 lastSyncAt

// 問題：事件數量線性增長，同步時間線性增長
```

### 性能瓶頸分析

#### 場景模擬
| 使用年限 | 市集數量 | 預估事件數 | 當前同步時間 | 數據量 |
|---------|---------|-----------|------------|--------|
| 1 年 | 20 | 5,000 | 30 秒 | ~2 MB |
| 3 年 | 60 | 30,000 | 3 分鐘 | ~12 MB |
| 5 年 | 100 | 100,000 | 10 分鐘 | ~40 MB |

#### 瓶頸點
1. **網路傳輸**: 下載大量 JSON 數據
2. **IndexedDB 寫入**: 逐條插入事件（無批次優化）
3. **事件重放**: 逐個執行事件處理器（CPU 密集）
4. **無進度顯示**: 用戶不知道需要等多久

---

## 💡 優化方案設計

### 方案 1: 快照機制 ⭐ 核心方案

#### 設計原理
定期將完整的數據庫狀態保存為快照，新設備只需下載最新快照 + 增量事件。

#### 數據庫設計
```sql
-- Supabase 新增表
CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  
  -- 快照數據（JSONB 格式）
  data JSONB NOT NULL,
  
  -- 元數據
  event_count INTEGER NOT NULL,
  last_event_id UUID NOT NULL,
  data_size_bytes INTEGER,
  
  -- 索引
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT snapshots_user_version_unique UNIQUE (user_id, version)
);

-- 索引優化
CREATE INDEX idx_snapshots_user_latest 
  ON snapshots(user_id, snapshot_at DESC);
```

#### 快照數據結構
```typescript
interface SnapshotData {
  version: number;
  snapshot_at: string;
  tables: {
    markets: Market[];
    products: Product[];
    dailyStats: DailyStats[];
    settings: Settings[];
  };
  metadata: {
    event_count: number;
    last_event_id: string;
    last_event_timestamp: number;
  };
}
```

#### 實施流程

**1. 快照生成邏輯**
```typescript
// lib/db/snapshot.ts
export async function createSnapshot(userId: string): Promise<void> {
  console.log('📸 開始生成快照...');
  
  // 1. 讀取所有快照表數據
  const [markets, products, dailyStats, settings] = await Promise.all([
    db.markets.toArray(),
    db.products.toArray(),
    db.dailyStats.toArray(),
    db.settings.toArray(),
  ]);
  
  // 2. 獲取事件統計
  const eventCount = await db.events.count();
  const lastEvent = await db.events.orderBy('timestamp').last();
  
  // 3. 構建快照數據
  const snapshotData: SnapshotData = {
    version: 1,
    snapshot_at: new Date().toISOString(),
    tables: { markets, products, dailyStats, settings },
    metadata: {
      event_count: eventCount,
      last_event_id: lastEvent?.id || '',
      last_event_timestamp: lastEvent?.timestamp || 0,
    },
  };
  
  // 4. 計算數據大小
  const dataJson = JSON.stringify(snapshotData);
  const dataSizeBytes = new Blob([dataJson]).size;
  
  // 5. 上傳到 Supabase
  const { error } = await supabase.from('snapshots').insert({
    user_id: userId,
    snapshot_at: snapshotData.snapshot_at,
    version: 1,
    data: snapshotData,
    event_count: eventCount,
    last_event_id: lastEvent?.id || '',
    data_size_bytes: dataSizeBytes,
  });
  
  if (error) throw error;
  
  console.log(`✅ 快照已生成：${eventCount} 個事件，${(dataSizeBytes / 1024).toFixed(2)} KB`);
}
```

**2. 快照載入邏輯**
```typescript
// hooks/useSync.ts - 修改 pullEvents
async function pullEventsWithSnapshot(userId: string): Promise<void> {
  // 步驟 1: 檢查本地是否為空
  const hasLocalData = await db.markets.count() > 0;
  
  if (!hasLocalData) {
    // 🚀 新設備：使用快照
    console.log('📸 檢測到新設備，嘗試載入快照...');
    
    // 查詢最新快照
    const { data: snapshot, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (snapshot && !error) {
      console.log(`📥 載入快照：${snapshot.event_count} 個事件的狀態`);
      
      // 批次寫入快照數據
      await db.transaction('rw', [db.markets, db.products, db.dailyStats, db.settings], async () => {
        await db.markets.bulkAdd(snapshot.data.tables.markets);
        await db.products.bulkAdd(snapshot.data.tables.products);
        await db.dailyStats.bulkAdd(snapshot.data.tables.dailyStats);
        if (snapshot.data.tables.settings.length > 0) {
          await db.settings.bulkAdd(snapshot.data.tables.settings);
        }
      });
      
      console.log('✅ 快照載入完成');
      
      // 步驟 2: 只下載快照之後的增量事件
      const { data: incrementalEvents } = await supabase
        .from('events')
        .select('*')
        .eq('actor_id', userId)
        .gt('timestamp', snapshot.snapshot_at)
        .order('timestamp', { ascending: true });
      
      const incrementalCount = incrementalEvents?.length || 0;
      console.log(`📥 下載增量事件：${incrementalCount} 個`);
      
      // 重放增量事件
      for (const event of incrementalEvents || []) {
        await replayEvent(event);
      }
      
      console.log(`✅ 同步完成：快照 + ${incrementalCount} 個增量事件`);
      return;
    }
  }
  
  // 降級：沒有快照或已有本地數據，使用原邏輯
  await pullAllEvents(userId);
}
```

**3. 觸發時機**
```typescript
// 自動觸發條件
const SNAPSHOT_THRESHOLD = 1000; // 每 1000 個事件生成一次

async function checkAndCreateSnapshot(userId: string): Promise<void> {
  const currentEventCount = await db.events.count();
  const lastSnapshotCount = await getLastSnapshotEventCount(userId);
  
  if (currentEventCount - lastSnapshotCount >= SNAPSHOT_THRESHOLD) {
    await createSnapshot(userId);
  }
}

// 手動觸發（設定頁面）
<Button onClick={() => createSnapshot(user.id)}>
  優化數據（生成快照）
</Button>
```

#### 性能提升預估
| 場景 | 事件數 | 舊方案 | 新方案 | 提升 |
|------|--------|--------|--------|------|
| 新設備（1年） | 5,000 | 30秒 | 3秒 | 90% ↓ |
| 新設備（3年） | 30,000 | 3分鐘 | 5秒 | 97% ↓ |
| 新設備（5年） | 100,000 | 10分鐘 | 8秒 | 98% ↓ |

---

### 方案 2: 事件歸檔

#### 設計原理
將舊事件移到歸檔表，本地只保留近期事件，減少存儲壓力。

#### 實施策略
```typescript
// 歸檔策略
const ARCHIVE_THRESHOLD_DAYS = 180; // 6 個月

async function archiveOldEvents(userId: string): Promise<void> {
  const cutoffDate = Date.now() - (ARCHIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  
  // 1. 查詢舊事件
  const oldEvents = await db.events
    .where('timestamp')
    .below(cutoffDate)
    .toArray();
  
  if (oldEvents.length === 0) return;
  
  console.log(`🗄️ 準備歸檔 ${oldEvents.length} 個舊事件...`);
  
  // 2. 上傳到雲端歸檔表
  const { error } = await supabase
    .from('events_archive')
    .insert(oldEvents.map(e => ({
      ...e,
      archived_at: new Date().toISOString(),
      archived_by: userId,
    })));
  
  if (error) throw error;
  
  // 3. 刪除本地舊事件
  await db.events
    .where('timestamp')
    .below(cutoffDate)
    .delete();
  
  console.log(`✅ 已歸檔 ${oldEvents.length} 個事件`);
}
```

#### 數據保留策略
- **本地**: 保留最近 6 個月事件
- **雲端**: 永久保存所有事件
- **查看歷史**: 按需從雲端拉取

---

### 方案 3: 分頁下載

#### 實施邏輯
```typescript
async function pullEventsInBatches(userId: string): Promise<void> {
  const BATCH_SIZE = 1000;
  let offset = 0;
  let hasMore = true;
  let totalProcessed = 0;

  while (hasMore) {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('actor_id', userId)
      .order('timestamp', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw error;
    if (!events || events.length === 0) break;

    // 批次處理
    await processBatch(events);
    
    totalProcessed += events.length;
    offset += BATCH_SIZE;
    hasMore = events.length === BATCH_SIZE;

    // 更新進度
    console.log(`📥 已處理 ${totalProcessed} 個事件...`);
  }
}
```

---

## ⚠️ 風險分析

### 技術風險

#### 1. 數據一致性風險 🟡 中風險
**描述**: 快照與增量事件之間可能存在時間差，導致數據不一致

**場景**:
```
時間軸: 
T1: 生成快照（包含事件 1-1000）
T2: 用戶 A 創建事件 1001
T3: 用戶 B 下載快照（不包含事件 1001）
T4: 用戶 B 下載增量事件（從 T1 開始，包含事件 1001）
結果: 正常 ✅
```

**緩解措施**:
- 使用事務確保快照生成的原子性
- 增量事件查詢使用 `timestamp > snapshot.snapshot_at`
- 添加數據校驗機制

**殘留風險**: 🟢 低

---

#### 2. 快照過大風險 🟡 中風險
**描述**: 重度用戶的快照可能超過 10MB，影響下載速度

**數據估算**:
```typescript
// 假設重度用戶
- 100 個市集 × 2KB = 200KB
- 500 個商品 × 1KB = 500KB
- 1000 條每日統計 × 0.5KB = 500KB
總計: ~1.2MB（可接受）

// 極端場景
- 500 個市集 = 1MB
- 2000 個商品 = 2MB
- 5000 條統計 = 2.5MB
總計: ~5.5MB（仍可接受）
```

**緩解措施**:
- 使用 JSONB 壓縮
- 只保留活躍數據（軟刪除的市集不包含在快照中）
- 設置快照大小上限（10MB），超過則分片

**殘留風險**: 🟢 低

---

#### 3. 並發衝突風險 🟢 低風險
**描述**: 多設備同時生成快照可能導致衝突

**緩解措施**:
- 使用 `UNIQUE (user_id, version)` 約束
- 快照版本號自動遞增
- 總是使用最新版本快照

**殘留風險**: 🟢 低

---

### 業務風險

#### 1. 向後兼容性風險 🟢 低風險
**描述**: 舊版本客戶端無法使用快照功能

**緩解措施**:
- 保留原有同步邏輯作為降級方案
- 檢測快照是否存在，不存在則使用舊邏輯
- 漸進式升級，不強制要求

**實施代碼**:
```typescript
if (snapshot && !error) {
  // 使用快照
} else {
  // 降級到舊邏輯
  await pullAllEvents(userId);
}
```

**殘留風險**: 🟢 低

---

#### 2. 用戶體驗風險 🟡 中風險
**描述**: 首次生成快照需要時間，可能讓用戶困惑

**緩解措施**:
- 在後台自動生成，不阻塞用戶操作
- 提供進度提示："正在優化數據..."
- 允許用戶手動觸發

**殘留風險**: 🟢 低

---

### 運維風險

#### 1. 存儲成本風險 🟡 中風險
**描述**: 每個用戶定期生成快照會增加 Supabase 存儲成本

**成本估算**:
```
假設:
- 1000 個活躍用戶
- 每個用戶快照 2MB
- 每月生成 1 次快照
- 保留最近 3 個快照

存儲需求: 1000 × 2MB × 3 = 6GB
Supabase 免費額度: 500MB
超出成本: ~$0.125/GB/月 × 5.5GB = $0.69/月
```

**緩解措施**:
- 只保留最近 2 個快照
- 定期清理舊快照
- 使用壓縮減少存儲空間

**殘留風險**: 🟢 低

---

#### 2. 數據庫負載風險 🟢 低風險
**描述**: 大量用戶同時生成快照可能增加數據庫負載

**緩解措施**:
- 使用隊列機制，避免並發高峰
- 限制快照生成頻率（最多每天 1 次）
- 在低峰時段自動生成

**殘留風險**: 🟢 低

---

## 📅 實施計劃

### 階段 1: 基礎設施準備（1-2 天）

**任務清單**:
- [ ] 創建 Supabase `snapshots` 表
- [ ] 創建 Supabase `events_archive` 表
- [ ] 添加 RLS 政策
- [ ] 創建索引優化查詢

**SQL 腳本**:
```sql
-- 見附錄 A
```

---

### 階段 2: 快照生成功能（2-3 天）

**任務清單**:
- [ ] 實現 `createSnapshot()` 函數
- [ ] 實現 `getLastSnapshotEventCount()` 函數
- [ ] 添加自動觸發邏輯
- [ ] 添加手動觸發按鈕（設定頁面）
- [ ] 單元測試

**交付物**:
- `lib/db/snapshot.ts`
- 設定頁面新增「優化數據」按鈕

---

### 階段 3: 快照載入功能（2-3 天）

**任務清單**:
- [ ] 修改 `pullEvents()` 支持快照
- [ ] 實現 `pullEventsWithSnapshot()` 函數
- [ ] 實現 `replayEvent()` 函數
- [ ] 添加降級邏輯
- [ ] 集成測試

**交付物**:
- 修改後的 `hooks/useSync.ts`

---

### 階段 4: 事件歸檔功能（1-2 天）

**任務清單**:
- [ ] 實現 `archiveOldEvents()` 函數
- [ ] 添加定期歸檔任務
- [ ] 實現按需拉取歷史事件
- [ ] 單元測試

**交付物**:
- `lib/db/archive.ts`

---

### 階段 5: 進度顯示優化（1 天）

**任務清單**:
- [ ] 修改同步進度顯示
- [ ] 添加數據量顯示
- [ ] 優化日誌輸出
- [ ] UI 測試

**交付物**:
- 修改後的 `components/sync/SyncProgressDialog.tsx`

---

### 階段 6: 測試與優化（2-3 天）

**任務清單**:
- [ ] 端到端測試
- [ ] 性能測試（模擬 10 萬事件）
- [ ] 壓力測試（並發同步）
- [ ] 錯誤處理測試
- [ ] 文檔更新

**交付物**:
- 測試報告
- 用戶文檔

---

### 總計時間: 9-14 天

---

## 💰 成本效益分析

### 開發成本
- **人力**: 1 名開發者 × 10 天 = 10 人天
- **測試**: 2 天
- **文檔**: 1 天
- **總計**: 13 人天

### 運維成本（年）
- **Supabase 存儲**: ~$10/年（1000 用戶）
- **Supabase 帶寬**: ~$5/年
- **總計**: ~$15/年

### 收益
- **用戶體驗提升**: 同步時間減少 95%+
- **用戶留存率提升**: 預估 +5%
- **支持更大規模**: 可支持 10 年以上使用
- **降低客訴**: 減少「同步太慢」的反饋

### ROI
**投資回報率**: 極高（一次性開發，長期受益）

---

## ✅ 建議與結論

### 核心建議
1. **立即實施快照機制**（方案 1）- 最高優先級
2. **同步實施進度顯示優化**（方案 5）- 提升用戶體驗
3. **延後實施事件歸檔**（方案 2）- 可在 6 個月後評估需求

### 實施順序
```
第一階段（必須）: 快照機制 + 進度顯示
第二階段（建議）: 分頁下載優化
第三階段（可選）: 事件歸檔
```

### 成功關鍵因素
1. **向後兼容**: 確保舊版本客戶端仍可正常工作
2. **錯誤處理**: 完善的降級機制和錯誤提示
3. **性能測試**: 充分測試大數據量場景
4. **用戶溝通**: 清晰的進度提示和操作指引

### 最終結論
✅ **強烈建議實施** - 該方案技術可行、風險可控、收益顯著，是解決當前性能瓶頸的最佳方案。

---

## 📎 附錄

### 附錄 A: Supabase Migration SQL

```sql
-- 創建快照表
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB NOT NULL,
  event_count INTEGER NOT NULL,
  last_event_id UUID NOT NULL,
  data_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT snapshots_user_version_unique UNIQUE (user_id, version)
);

-- 索引
CREATE INDEX idx_snapshots_user_latest 
  ON snapshots(user_id, snapshot_at DESC);

-- RLS 政策
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用戶只能查看自己的快照"
  ON snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用戶只能創建自己的快照"
  ON snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 創建歸檔表
CREATE TABLE IF NOT EXISTS events_archive (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  actor_id UUID NOT NULL,
  market_id UUID,
  timestamp TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES profiles(id)
);

-- 索引
CREATE INDEX idx_events_archive_actor 
  ON events_archive(actor_id, timestamp DESC);

-- RLS 政策
ALTER TABLE events_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用戶只能查看自己的歸檔事件"
  ON events_archive FOR SELECT
  USING (auth.uid() = actor_id);
```

### 附錄 B: 測試場景清單

1. **新設備首次同步**
   - 有快照：驗證快照載入 + 增量事件
   - 無快照：驗證降級到舊邏輯

2. **快照生成**
   - 自動觸發：達到 1000 事件閾值
   - 手動觸發：用戶點擊按鈕

3. **數據一致性**
   - 快照 + 增量事件 = 完整數據
   - 多設備同步後數據一致

4. **錯誤處理**
   - 網路中斷時的降級
   - 快照損壞時的處理
   - 並發衝突的解決

5. **性能測試**
   - 10 萬事件場景
   - 並發 10 個設備同步
   - 快照生成時間

---

**報告結束**

*如需進一步討論或開始實施，請聯繫開發團隊。*

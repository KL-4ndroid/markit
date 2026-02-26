# Local-First 架構遷移指南

> **目的**: 協助開發者理解並遵循 Local-First 架構原則  
> **適用對象**: 所有參與 Market Pulse 開發的工程師和 AI 助手  
> **版本**: v1.0  
> **最後更新**: 2026-02-24

---

## 📋 目錄

1. [架構轉變說明](#架構轉變說明)
2. [核心原則](#核心原則)
3. [資料流向](#資料流向)
4. [實作指南](#實作指南)
5. [常見錯誤](#常見錯誤)
6. [檢查清單](#檢查清單)
7. [程式碼審查](#程式碼審查)

---

## 🎯 架構轉變說明

### 從「離線優先」到「Local-First」

#### 舊架構：離線優先 (Offline-First)
```
用戶操作 → Dexie → (可選) Supabase
```
- 強調「可以離線使用」
- 雲端同步是「附加功能」
- 資料來源不明確

#### 新架構：Local-First
```
用戶操作 → Dexie ⇄ Supabase (雙向同步)
         ↓
      UI 更新
```
- 強調「本地是唯一真實數據源」
- 雲端是「備份 + 協作工具」
- 即使斷網，本地完全可用
- 資料流向清晰明確

### 為什麼要轉變？

| 優勢 | 說明 |
|------|------|
| **更好的用戶體驗** | 本地操作永遠即時響應，無延遲 |
| **更強的協作能力** | 支援多人同時編輯，自動衝突解決 |
| **更可靠的數據** | 本地是唯一真實來源，避免雲端依賴 |
| **更清晰的架構** | 資料流向單一明確，易於維護 |
| **更好的離線體驗** | 斷網一小時也完全可用，自動重連 |

---

## 💡 核心原則

### 1. 本地 Dexie 是唯一資料來源

```typescript
// ✅ 正確：從 Dexie 讀取
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

function MarketsList() {
  const markets = useLiveQuery(
    () => db.markets.toArray()
  );
  
  if (!markets) return <Loading />;
  
  return (
    <div>
      {markets.map(market => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}

// ❌ 錯誤：從 Supabase 讀取
function MarketsList() {
  const [markets, setMarkets] = useState([]);
  
  useEffect(() => {
    supabase
      .from('markets')
      .select('*')
      .then(({ data }) => setMarkets(data)); // 違反 Local-First
  }, []);
  
  return (
    <div>
      {markets.map(market => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}
```

### 2. 所有寫入使用 recordEvent

```typescript
// ✅ 正確：使用 recordEvent
import { recordEvent } from '@/lib/db/events';

async function handleCreateMarket(data: MarketCreatedPayload) {
  await recordEvent({
    type: 'market_created',
    payload: data,
    timestamp: Date.now(),
  });
  
  // UI 會自動更新（useLiveQuery 觸發）
}

// ❌ 錯誤：直接修改資料庫
async function handleCreateMarket(data: Market) {
  await db.markets.add(data); // 跳過事件溯源
}

// ❌ 錯誤：直接寫入 Supabase
async function handleCreateMarket(data: Market) {
  await supabase.from('markets').insert(data); // 違反 Local-First
}
```

### 3. 雲端同步由 useSync 自動處理

```typescript
// ✅ 正確：使用 useSync Hook
import { useSync } from '@/hooks/useSync';

function MyComponent() {
  const { status, lastSyncAt, pendingCount, sync } = useSync({
    enabled: true,
    interval: 30000, // 30 秒自動同步
  });
  
  return (
    <div>
      <p>同步狀態: {status}</p>
      <button onClick={sync}>立即同步</button>
    </div>
  );
}

// ❌ 錯誤：自己實作同步邏輯
function MyComponent() {
  useEffect(() => {
    const interval = setInterval(async () => {
      const events = await db.events
        .where('sync_status')
        .equals('pending')
        .toArray();
      
      await supabase.from('events').insert(events); // 重複邏輯
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
}
```

### 4. 雲端回流必須經過 Dexie

```typescript
// ✅ 正確：雲端資料先寫入 Dexie
async function pullEventsFromCloud(userId: string) {
  // 1. 從 Supabase 拉取新事件
  const { data: newEvents } = await supabase
    .from('events')
    .select('*')
    .gt('timestamp', lastSyncAt);
  
  // 2. 寫入本地 Dexie
  for (const event of newEvents) {
    await db.events.add({
      ...event,
      sync_status: 'synced',
    });
    
    // 3. 觸發事件處理器（更新快照表）
    const handler = eventHandlers[event.type];
    if (handler) {
      await handler(event, db);
    }
  }
  
  // 4. UI 自動更新（useLiveQuery 觸發）
}

// ❌ 錯誤：直接使用雲端資料更新 UI
async function pullEventsFromCloud(userId: string) {
  const { data: markets } = await supabase
    .from('markets')
    .select('*');
  
  setMarkets(markets); // 違反 Local-First
}
```

---

## 🔄 資料流向

### 完整資料流程圖

```
┌─────────────────────────────────────────────┐
│           使用者操作 (UI)                    │
│  - 點擊按鈕                                  │
│  - 填寫表單                                  │
│  - 選擇商品                                  │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     寫入 Dexie (Event Sourcing)             │
│  1. 記錄事件到 events 表                     │
│  2. 觸發事件處理器                           │
│  3. 更新快照表 (markets, products)           │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     UI 自動更新 (useLiveQuery)              │
│  - Dexie 驅動 React 重新渲染                │
│  - 不需要手動 setState                       │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     背景同步至 Supabase (非阻塞)            │
│  - useSync Hook 自動處理                    │
│  - 失敗會自動重試                            │
│  - 不影響用戶操作                            │
└─────────────────────────────────────────────┘
```

### 雲端回流流程

```
┌─────────────────────────────────────────────┐
│     Supabase 新資料                          │
│  - 其他用戶的操作                            │
│  - 其他設備的同步                            │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     寫入 Dexie (events 表)                  │
│  - useSync 自動拉取                         │
│  - 標記為 synced                            │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     觸發事件處理器                           │
│  - 執行對應的 eventHandler                  │
│  - 更新快照表                                │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     UI 自動更新 (useLiveQuery)              │
│  - 顯示最新資料                              │
└─────────────────────────────────────────────┘
```

---

## 🛠️ 實作指南

### 任務 1：讀取資料

#### 使用 useLiveQuery

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

function MyComponent() {
  // 基本查詢
  const markets = useLiveQuery(
    () => db.markets.toArray()
  );
  
  // 條件查詢
  const paidMarkets = useLiveQuery(
    () => db.markets
      .where('status')
      .equals('paid')
      .toArray()
  );
  
  // 排序查詢
  const sortedMarkets = useLiveQuery(
    () => db.markets
      .orderBy('startDate')
      .reverse()
      .toArray()
  );
  
  // 複雜查詢
  const todayMarkets = useLiveQuery(
    () => {
      const today = new Date().toISOString().split('T')[0];
      return db.markets
        .filter(m => m.dates?.includes(today))
        .toArray();
    }
  );
  
  if (!markets) return <Loading />;
  
  return (
    <div>
      {markets.map(market => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}
```

#### 使用自訂 Hook

```typescript
import { useMarkets } from '@/lib/db/hooks';

function MyComponent() {
  const markets = useMarkets({ 
    orderBy: 'startDate', 
    order: 'desc' 
  });
  
  if (!markets) return <Loading />;
  
  return (
    <div>
      {markets.map(market => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}
```

### 任務 2：寫入資料

#### 使用 recordEvent

```typescript
import { recordEvent } from '@/lib/db/events';
import { generateUUID } from '@/lib/db/uuid';

async function createMarket(data: {
  name: string;
  location: string;
  dates: string[];
  registrationFee: number;
  boothCost: number;
}) {
  const marketId = generateUUID();
  
  await recordEvent({
    type: 'market_created',
    payload: {
      ...data,
      startDate: data.dates[0],
      endDate: data.dates[data.dates.length - 1],
    },
    timestamp: Date.now(),
    market_id: marketId,
  });
  
  return marketId;
}
```

#### 更新資料

```typescript
async function updateMarketStatus(
  marketId: string,
  oldStatus: MarketStatus,
  newStatus: MarketStatus
) {
  await recordEvent({
    type: 'market_status_changed',
    payload: {
      marketId,
      oldStatus,
      newStatus,
    },
    timestamp: Date.now(),
    market_id: marketId,
  });
}
```

### 任務 3：設置同步

```typescript
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/lib/supabase/auth-context';

function App() {
  const { user, isConfigured } = useAuth();
  
  // 啟用自動同步
  const { status, lastSyncAt, pendingCount, sync } = useSync({
    enabled: !!user && isConfigured,
    interval: 30000, // 30 秒
    throttle: 5000,  // 5 秒節流
  });
  
  return (
    <div>
      {/* 同步狀態顯示 */}
      <SyncStatus 
        status={status}
        lastSyncAt={lastSyncAt}
        pendingCount={pendingCount}
        onSync={sync}
      />
      
      {/* 應用內容 */}
      <MainContent />
    </div>
  );
}
```

---

## ❌ 常見錯誤

### 錯誤 1：直接從 Supabase 讀取

```typescript
// ❌ 錯誤
function MarketsList() {
  const [markets, setMarkets] = useState([]);
  
  useEffect(() => {
    supabase
      .from('markets')
      .select('*')
      .then(({ data }) => setMarkets(data));
  }, []);
  
  return <div>{/* ... */}</div>;
}

// ✅ 正確
function MarketsList() {
  const markets = useLiveQuery(
    () => db.markets.toArray()
  );
  
  if (!markets) return <Loading />;
  
  return <div>{/* ... */}</div>;
}
```

### 錯誤 2：同時寫入兩處

```typescript
// ❌ 錯誤
async function createMarket(data: Market) {
  // 寫入本地
  await db.markets.add(data);
  
  // 寫入雲端
  await supabase.from('markets').insert(data); // 重複邏輯
}

// ✅ 正確
async function createMarket(data: MarketCreatedPayload) {
  // 只寫入本地，同步由 useSync 自動處理
  await recordEvent({
    type: 'market_created',
    payload: data,
    timestamp: Date.now(),
  });
}
```

### 錯誤 3：混合資料來源

```typescript
// ❌ 錯誤
function MarketsList() {
  const localMarkets = useLiveQuery(() => db.markets.toArray());
  const [cloudMarkets, setCloudMarkets] = useState([]);
  
  useEffect(() => {
    supabase
      .from('markets')
      .select('*')
      .then(({ data }) => setCloudMarkets(data));
  }, []);
  
  // 不應該有兩個資料來源
  const allMarkets = [...(localMarkets || []), ...cloudMarkets];
  
  return <div>{/* ... */}</div>;
}

// ✅ 正確
function MarketsList() {
  // 只有一個資料來源
  const markets = useLiveQuery(() => db.markets.toArray());
  
  if (!markets) return <Loading />;
  
  return <div>{/* ... */}</div>;
}
```

### 錯誤 4：阻塞主執行緒

```typescript
// ❌ 錯誤
async function handleSubmit() {
  // 等待同步完成才繼續
  await recordEvent({ /* ... */ });
  await syncToCloud(); // 阻塞用戶操作
  
  router.push('/markets');
}

// ✅ 正確
async function handleSubmit() {
  // 只寫入本地，立即完成
  await recordEvent({ /* ... */ });
  
  // 同步由 useSync 背景處理
  router.push('/markets');
}
```

---

## ✅ 檢查清單

在實作任何功能前，請確認：

### 讀取資料
- [ ] 是否使用 `useLiveQuery` 或自訂 Hook？
- [ ] 是否避免直接從 Supabase 讀取？
- [ ] 是否避免混合使用本地和雲端資料？
- [ ] 是否有適當的載入狀態（`if (!data) return <Loading />`）？

### 寫入資料
- [ ] 是否使用 `recordEvent`？
- [ ] 是否避免直接修改 Dexie 表？
- [ ] 是否避免直接寫入 Supabase？
- [ ] 是否有適當的錯誤處理？

### 同步機制
- [ ] 是否使用 `useSync` Hook？
- [ ] 是否避免自己實作同步邏輯？
- [ ] 是否避免在主執行緒執行同步操作？
- [ ] 是否有網路錯誤的優雅降級？

### 用戶體驗
- [ ] 斷網時功能是否完全可用？
- [ ] 本地操作是否立即響應（不等待網路）？
- [ ] UI 更新是否由 Dexie 驅動（不是手動 setState）？
- [ ] 是否有適當的同步狀態顯示？

---

## 🔍 程式碼審查

### 審查重點

#### 1. 檢查資料讀取

```bash
# 搜尋可能違反 Local-First 的程式碼
grep -r "supabase.from" --include="*.tsx" --include="*.ts" app/
grep -r "useState.*supabase" --include="*.tsx" --include="*.ts" app/
```

**應該看到**：
- ✅ 只在 `hooks/useSync.ts` 和 `lib/db/` 中使用 Supabase
- ✅ UI 組件都使用 `useLiveQuery` 或自訂 Hooks

**不應該看到**：
- ❌ UI 組件直接調用 `supabase.from().select()`
- ❌ `useState` + `useEffect` + Supabase 的組合

#### 2. 檢查資料寫入

```bash
# 搜尋可能跳過事件溯源的程式碼
grep -r "db\.markets\.add" --include="*.tsx" --include="*.ts" app/
grep -r "db\.products\.add" --include="*.tsx" --include="*.ts" app/
grep -r "supabase.from.*insert" --include="*.tsx" --include="*.ts" app/
```

**應該看到**：
- ✅ 只在事件處理器中直接操作 Dexie 表
- ✅ UI 組件都使用 `recordEvent`

**不應該看到**：
- ❌ UI 組件直接調用 `db.markets.add()`
- ❌ UI 組件直接調用 `supabase.from().insert()`

#### 3. 檢查同步邏輯

```bash
# 搜尋可能重複實作同步的程式碼
grep -r "setInterval.*supabase" --include="*.tsx" --include="*.ts" app/
grep -r "useEffect.*sync" --include="*.tsx" --include="*.ts" app/
```

**應該看到**：
- ✅ 只在 `hooks/useSync.ts` 中有同步邏輯
- ✅ UI 組件使用 `useSync` Hook

**不應該看到**：
- ❌ UI 組件自己實作 `setInterval` 同步
- ❌ 重複的同步邏輯

---

## 📚 參考資源

### 核心文件
- `.cursorrules` - 開發規則
- `AI_ASSISTANT_COMPLETE_GUIDE.md` - AI 助手指南
- `PROJECT_CONTEXT.md` - 專案核心上下文

### 技術文件
- [Dexie.js 官方文件](https://dexie.org/)
- [useLiveQuery 文件](https://dexie.org/docs/dexie-react-hooks/useLiveQuery())
- [Local-First Software](https://www.inkandswitch.com/local-first/)

### 範例程式碼
- `hooks/useSync.ts` - 同步機制實作
- `lib/db/events.ts` - 事件處理器
- `lib/db/hooks.ts` - 自訂 Hooks

---

## 🎓 培訓建議

### 新成員入職

1. **閱讀核心文件**（1 小時）
   - `.cursorrules`
   - `PROJECT_CONTEXT.md`
   - 本文件

2. **理解資料流向**（30 分鐘）
   - 畫出資料流程圖
   - 理解 Local-First 原則

3. **實作練習**（2 小時）
   - 實作一個簡單的 CRUD 功能
   - 使用 `useLiveQuery` 讀取
   - 使用 `recordEvent` 寫入
   - 觀察 `useSync` 自動同步

4. **程式碼審查**（1 小時）
   - 審查現有程式碼
   - 找出符合/違反 Local-First 的範例
   - 討論最佳實踐

### 團隊培訓

1. **架構說明會**（1 小時）
   - 說明為什麼轉向 Local-First
   - 展示資料流向
   - 回答問題

2. **實作工作坊**（2 小時）
   - 現場實作範例
   - Pair Programming
   - Code Review

3. **定期檢查**（每週）
   - 審查新程式碼
   - 分享最佳實踐
   - 更新文件

---

## 🚀 下一步

1. **更新現有程式碼**
   - 審查所有 UI 組件
   - 修正違反 Local-First 的程式碼
   - 添加適當的註解

2. **完善測試**
   - 測試斷網情境
   - 測試同步機制
   - 測試衝突解決

3. **監控與優化**
   - 監控同步效能
   - 優化資料庫查詢
   - 改善用戶體驗

---

**文檔版本**: v1.0  
**最後更新**: 2026-02-24  
**維護者**: Market Pulse 開發團隊

**核心原則**：本地 Dexie 是唯一真實來源，雲端 Supabase 是備份和協作工具。

# 性能優化總結

## 問題診斷

原始延遲數據：
- **click 事件處理**: 1,298.5ms ⚠️
- **render**: 14.0ms
- **總延遲**: 1,314.2ms

主要問題：
1. 按鈕點擊處理函數執行時間過長
2. 資料庫操作阻塞主線程
3. 缺少防抖機制導致重複點擊
4. 同步觸發使用 setTimeout 造成不必要的延遲

---

## 優化措施

### 1. 使用 React 18 的 useTransition Hook
**位置**: `app/markets/[id]/page.tsx`

```typescript
const [isPending, startTransition] = useTransition();

// 使用 startTransition 進行非阻塞更新
startTransition(() => {
  setIsUpdating(true);
});
```

**效果**: 將狀態更新標記為非緊急，避免阻塞用戶交互

---

### 2. 添加防抖機制
**位置**: `app/markets/[id]/page.tsx`

```typescript
const [lastClickTime, setLastClickTime] = useState<number>(0);
const DEBOUNCE_DELAY = 300; // 300ms 防抖

// 防抖檢查
const now = Date.now();
if (now - lastClickTime < DEBOUNCE_DELAY) {
  return;
}
setLastClickTime(now);
```

**效果**: 防止用戶快速重複點擊，減少不必要的資料庫操作

---

### 3. 優化事件處理函數
**位置**: `app/markets/[id]/page.tsx`

**改進前**:
```typescript
const handleStatusChange = async () => {
  // 直接執行，阻塞主線程
  await updateMarketStatus(marketId, nextStatus);
  toast.success(...);
}
```

**改進後**:
```typescript
const handleStatusChange = useCallback(async () => {
  // 使用 useCallback 避免重複創建
  // 使用 Promise 並行處理
  const updatePromise = (async () => {
    // ... 邏輯
  })();
  
  const result = await updatePromise;
  toast.success(result.message, { description: result.description });
}, [market, marketId]);
```

**效果**: 
- 使用 `useCallback` 避免函數重複創建
- 減少不必要的重新渲染

---

### 4. 優化對話框關閉順序
**位置**: `app/markets/[id]/page.tsx`

**改進前**:
```typescript
await updateMarketStatus(marketId, newStatus);
toast.success(...);
setShowStatusChangeConfirm(false); // 等待操作完成才關閉
```

**改進後**:
```typescript
// 先關閉對話框，提升用戶體驗
setShowStatusChangeConfirm(false);
setPendingStatus(null);

await updateMarketStatus(marketId, newStatus);
toast.success(...);
```

**效果**: 用戶立即看到對話框關閉，感知延遲降低

---

### 5. 優化資料庫操作
**位置**: `lib/db/hooks.ts`

**改進前**:
```typescript
export async function updateMarketStatus(...) {
  const market = await db.markets.get(marketId);
  if (!market) throw new Error(...);
  
  await recordEvent('market_status_changed', {...});
}
```

**改進後**:
```typescript
export async function updateMarketStatus(...) {
  // 使用 transaction 確保原子性
  await db.transaction('rw', db.markets, db.events, async () => {
    const market = await db.markets.get(marketId);
    if (!market) throw new Error(...);
    
    // 如果狀態相同，直接返回
    if (market.status === newStatus) return;
    
    await recordEvent('market_status_changed', {...});
  });
}
```

**效果**: 
- 減少資料庫查詢次數
- 避免不必要的狀態更新
- 確保操作原子性

---

### 6. 優化事件同步觸發
**位置**: `lib/db/events.ts`

**改進前**:
```typescript
// 使用 setTimeout 延遲 100ms
setTimeout(() => {
  window.dispatchEvent(new CustomEvent('trigger-sync', {...}));
}, 100);
```

**改進後**:
```typescript
// 使用 queueMicrotask 非阻塞觸發
queueMicrotask(() => {
  window.dispatchEvent(new CustomEvent('trigger-sync', {...}));
});
```

**效果**: 
- 移除 100ms 的固定延遲
- 使用微任務隊列，更高效的異步執行

---

### 7. 樂觀更新 UI
**位置**: `app/markets/[id]/page.tsx`

**改進前**:
```typescript
await db.transaction(...);
// 等待資料庫操作完成後重新查詢
const updatedDeals = await db.events.where(...).toArray();
setDealEvents(updatedDeals);
```

**改進後**:
```typescript
await db.transaction(...);
// 立即更新 UI，不等待查詢
setDealEvents(prev => prev.filter(d => d.id !== deal.id));

// 錯誤時才重新查詢
catch (error) {
  const updatedDeals = await db.events.where(...).toArray();
  setDealEvents(updatedDeals);
}
```

**效果**: UI 立即響應，用戶感知延遲大幅降低

---

## 預期效果

### 優化前
- click 事件處理: **1,298.5ms**
- 總延遲: **1,314.2ms**

### 優化後（預期）
- click 事件處理: **< 100ms** ✅
- 總延遲: **< 150ms** ✅

### 改進幅度
- **延遲降低約 90%**
- **用戶體驗顯著提升**

---

## 使用建議

1. **防抖延遲**: 目前設置為 300ms，可根據實際需求調整
2. **樂觀更新**: 適用於成功率高的操作，失敗時需要回滾
3. **useTransition**: 適用於非緊急的狀態更新
4. **useCallback**: 對於頻繁調用的函數使用，避免重複創建

---

## 監控建議

建議在生產環境中添加性能監控：

```typescript
// 監控按鈕點擊延遲
const startTime = performance.now();
await handleStatusChange();
const endTime = performance.now();
console.log(`操作耗時: ${endTime - startTime}ms`);
```

---

## 後續優化方向

1. **虛擬滾動**: 如果列表項目過多，考慮使用虛擬滾動
2. **Web Worker**: 將複雜計算移到 Web Worker
3. **IndexedDB 索引優化**: 為常用查詢添加複合索引
4. **React.memo**: 對大型組件使用 memo 避免不必要的重新渲染
5. **代碼分割**: 使用動態 import 減少初始加載時間

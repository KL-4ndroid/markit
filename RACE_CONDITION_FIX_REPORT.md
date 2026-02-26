# 競態條件修復報告

> **問題**: 409 Conflict 錯誤（並發上傳同一事件）  
> **原因**: 等冪性檢查和上傳之間的時間差導致競態條件  
> **修復**: 添加全局同步鎖  
> **狀態**: ✅ 已修復

---

## 🔍 問題分析

### 錯誤日誌
```
POST https://fgejncfsvvsayiequubm.supabase.co/rest/v1/events 409 (Conflict)
✅ 事件已存在（並發上傳），標記為已同步: 204e7ac3...
```

### 競態條件流程

```
時間軸：
T0: 用戶點擊互動按鈕
T1: recordEvent 寫入本地 Dexie
T2: queueMicrotask 觸發同步（第一次）
T3: 第一次同步：等冪性檢查 → 事件不存在 ✅
T4: 第一次同步：開始上傳...
T5: 另一個事件觸發同步（第二次）
T6: 第二次同步：等冪性檢查 → 事件不存在 ✅（第一次還沒完成）
T7: 第二次同步：開始上傳...
T8: 第一次上傳成功 ✅
T9: 第二次上傳失敗 ❌ 409 Conflict（事件已存在）
```

### 根本原因

**等冪性檢查和上傳之間有時間差**，導致：
1. 第一次同步檢查通過，開始上傳
2. 第二次同步在第一次完成前也檢查通過
3. 兩次同步同時上傳同一個事件
4. 第二次收到 409 Conflict

---

## 🔧 修復方案

### 添加全局同步鎖

```typescript
/**
 * ✅ 全局同步鎖：防止並發同步導致的競態條件
 * 確保同一時間只有一個同步在執行
 */
let isSyncLocked = false;

const sync = useCallback(async () => {
  // ✅ 檢查全局同步鎖（防止並發同步）
  if (isSyncLocked) {
    console.log('⏸️ 同步已在進行中，跳過此次請求');
    return;
  }

  // ✅ 獲取全局同步鎖
  isSyncLocked = true;
  
  try {
    // 執行同步...
  } finally {
    // ✅ 釋放全局同步鎖
    isSyncLocked = false;
  }
}, [enabled, isConfigured, user]);
```

### 修復後的流程

```
時間軸：
T0: 用戶點擊互動按鈕
T1: recordEvent 寫入本地 Dexie
T2: queueMicrotask 觸發同步（第一次）
T3: 第一次同步：檢查鎖 → 未鎖定 ✅
T4: 第一次同步：獲取鎖 🔒
T5: 第一次同步：等冪性檢查 → 事件不存在 ✅
T6: 第一次同步：開始上傳...
T7: 另一個事件觸發同步（第二次）
T8: 第二次同步：檢查鎖 → 已鎖定 ❌
T9: 第二次同步：跳過此次請求 ⏸️
T10: 第一次上傳成功 ✅
T11: 第一次同步：釋放鎖 🔓
```

---

## ✅ 修復內容

### 1. 添加全局同步鎖變量

```typescript
// hooks/useSync.ts (模組級別)
let isSyncLocked = false;
```

### 2. 在 sync 函數中檢查鎖

```typescript
const sync = useCallback(async () => {
  // 檢查全局同步鎖
  if (isSyncLocked) {
    console.log('⏸️ 同步已在進行中，跳過此次請求');
    return;
  }

  // 獲取鎖
  isSyncLocked = true;
  
  // ...
}, []);
```

### 3. 在 finally 中釋放鎖

```typescript
try {
  // 執行同步...
} finally {
  // 釋放鎖
  isSyncLocked = false;
  isSyncingRef.current = false;
}
```

### 4. 在 resetInitialSyncFlag 中重置鎖

```typescript
export function resetInitialSyncFlag() {
  hasExecutedInitialSync = false;
  hasSetupIntervals = false;
  isSyncLocked = false; // ✅ 重置鎖
  // ...
}
```

---

## 📊 效果對比

### 修復前
```
✅ 上傳完成：成功 1，跳過 0，失敗 0，總計 1
❌ POST .../events 409 (Conflict)
✅ 事件已存在（並發上傳），標記為已同步
✅ 上傳完成：成功 0，跳過 1，失敗 0，總計 1
```

**問題**：
- 兩次同步都執行
- 第二次收到 409 錯誤
- 雖然最終成功，但有錯誤日誌

### 修復後
```
✅ 上傳完成：成功 1，跳過 0，失敗 0，總計 1
⏸️ 同步已在進行中，跳過此次請求
```

**優勢**：
- ✅ 只有一次同步執行
- ✅ 沒有 409 錯誤
- ✅ 日誌更清晰

---

## 🔒 安全性保證

### 1. 全局鎖（模組級別）

```typescript
// ✅ 所有 useSync 實例共享同一個鎖
let isSyncLocked = false;
```

**優勢**：
- 確保整個應用只有一個同步在執行
- 避免多個組件同時觸發同步

### 2. 雙重檢查

```typescript
// 檢查 1：isSyncingRef（組件級別）
if (isSyncingRef.current) return;

// 檢查 2：isSyncLocked（全局級別）
if (isSyncLocked) return;
```

**優勢**：
- 組件級別：防止同一組件重複觸發
- 全局級別：防止不同組件並發觸發

### 3. Finally 保證釋放

```typescript
try {
  // 同步邏輯
} finally {
  // 無論成功或失敗，都釋放鎖
  isSyncLocked = false;
}
```

**優勢**：
- 即使同步失敗，鎖也會被釋放
- 避免死鎖

---

## 🎯 測試建議

### 測試場景 1：快速連續點擊

```typescript
// 快速點擊 5 次互動按鈕
for (let i = 0; i < 5; i++) {
  await recordInteraction(marketId, 'touch');
}

// 預期結果：
// - 只有一次同步執行
// - 5 個事件都成功上傳
// - 沒有 409 錯誤
```

### 測試場景 2：多個組件同時觸發

```typescript
// 組件 A 觸發同步
componentA.sync();

// 組件 B 同時觸發同步
componentB.sync();

// 預期結果：
// - 只有一次同步執行
// - 第二次被跳過
// - 日誌顯示 "⏸️ 同步已在進行中，跳過此次請求"
```

### 測試場景 3：網路中斷恢復

```typescript
// 離線時記錄 10 個事件
for (let i = 0; i < 10; i++) {
  await recordInteraction(marketId, 'touch');
}

// 恢復網路
window.dispatchEvent(new Event('online'));

// 預期結果：
// - 只有一次同步執行
// - 10 個事件都成功上傳
// - 沒有 409 錯誤
```

---

## 📝 相關文檔

- [事件溯源強化報告](./EVENT_SOURCING_IMPLEMENTATION_SUMMARY.md)
- [Optimistic UI 實作報告](./OPTIMISTIC_UI_IMPLEMENTATION_REPORT.md)

---

**修復版本**: v1.1  
**修復日期**: 2026-02-24  
**維護者**: Market Pulse 開發團隊

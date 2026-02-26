# 同步彈窗顯示邏輯修復報告

> **問題**: 點擊 1 次互動按鈕（2 個事件）就顯示大彈窗  
> **原因**: `SyncProgressManager` 沒有 `< 5` 的閾值判斷  
> **修復**: 添加閾值判斷，只有 `>= 5` 事件才顯示大彈窗  
> **狀態**: ✅ 已修復

---

## 🔍 問題分析

### 原始設計

你的專案中有**兩個**同步狀態組件：

1. **`SyncStatusIndicator`** (新建)
   - 位置：`components/common/SyncStatusIndicator.tsx`
   - 用途：Header 右上角的小圓點指示器
   - 邏輯：`< 5` 無聲模式，`>= 5` 顯示大彈窗

2. **`SyncProgressManager`** (舊有)
   - 位置：`components/sync/SyncProgressManager.tsx`
   - 用途：全局同步進度管理
   - 邏輯：**任何同步都顯示大彈窗**（沒有閾值判斷）

### 問題根源

```typescript
// ❌ 舊邏輯：只要有 uploadProgress 就顯示彈窗
useEffect(() => {
  if (uploadProgress && uploadProgress.total > 0) {
    setShowUploadProgress(true); // 即使只有 1 個事件也顯示
  }
}, [uploadProgress]);
```

**結果**：
- 點擊 1 次互動按鈕 → 2 個事件 → 顯示大彈窗 ❌
- 與設計不符（應該無聲模式）

---

## 🔧 修復方案

### 修改 `SyncProgressManager.tsx`

添加 `pendingCount >= 5` 的閾值判斷：

```typescript
// ✅ 新邏輯：只有 pendingCount >= 5 才顯示彈窗
useEffect(() => {
  if (uploadProgress && uploadProgress.total > 0 && pendingCount >= 5) {
    console.log('📱 [SyncProgressManager] 顯示上傳彈窗:', { pendingCount });
    setShowUploadProgress(true);
  } else if (uploadProgress && uploadProgress.total > 0 && pendingCount < 5) {
    console.log('🟢 [SyncProgressManager] 無聲模式，不顯示上傳彈窗:', { pendingCount });
    setShowUploadProgress(false);
  }
}, [uploadProgress, pendingCount]);
```

---

## 📊 修復前後對比

### Before（任何同步都顯示彈窗）

```
用戶點擊 1 次互動按鈕
  ↓
2 個事件待同步
  ↓
SyncProgressManager 檢測到 uploadProgress
  ↓
❌ 顯示大彈窗（不符合設計）
```

### After（< 5 無聲模式）

```
用戶點擊 1 次互動按鈕
  ↓
2 個事件待同步
  ↓
SyncProgressManager 檢測到 uploadProgress
  ↓
檢查 pendingCount = 2 < 5
  ↓
✅ 無聲模式，不顯示大彈窗
  ↓
只顯示小圓點 + 呼吸燈
```

---

## 🎯 現在的行為

### 場景 1：點擊 1 次互動按鈕（2 個事件）

**Console Log**：
```
🔍 [SyncProgressManager] 狀態: { pendingCount: 2, uploadProgress: {...} }
🟢 [SyncProgressManager] 無聲模式，不顯示上傳彈窗: { pendingCount: 2 }
📤 開始上傳 2 個事件...
✅ 上傳完成：成功 2
```

**UI 表現**：
- ✅ 只顯示小圓點（12px）+ 呼吸燈
- ✅ 徽章顯示 "2"
- ✅ 不顯示大彈窗

---

### 場景 2：快速點擊 5 次互動按鈕（10 個事件）

**Console Log**：
```
🔍 [SyncProgressManager] 狀態: { pendingCount: 10, uploadProgress: {...} }
📱 [SyncProgressManager] 顯示上傳彈窗: { pendingCount: 10, total: 10 }
📤 開始上傳 10 個事件...
✅ 上傳完成：成功 10
✅ [SyncProgressManager] 關閉上傳彈窗
```

**UI 表現**：
- ✅ 顯示大彈窗
- ✅ 顯示進度條（1/10, 2/10, ...）
- ✅ 同步完成後 1 秒自動關閉

---

## 📝 Debug Log 說明

### 1. 狀態檢查 Log
```javascript
🔍 [SyncProgressManager] 狀態: {
  pendingCount: 2,
  uploadProgress: { current: 1, total: 2 },
  downloadProgress: null,
  showUploadProgress: false,
  showDownloadProgress: false
}
```

### 2. 無聲模式 Log（< 5 事件）
```javascript
🟢 [SyncProgressManager] 無聲模式，不顯示上傳彈窗: { pendingCount: 2 }
```

### 3. 彈窗模式 Log（>= 5 事件）
```javascript
📱 [SyncProgressManager] 顯示上傳彈窗: { pendingCount: 10, total: 10 }
```

### 4. 彈窗關閉 Log
```javascript
✅ [SyncProgressManager] 關閉上傳彈窗
```

---

## 🔄 兩個組件的分工

### `SyncStatusIndicator`（Header 小圓點）
- **位置**：Header 右上角
- **顯示**：始終顯示（12px 圓點）
- **功能**：
  - 顯示同步狀態（顏色變化）
  - 顯示待同步數量（徽章）
  - Hover 顯示詳細資訊
  - 點擊手動觸發同步

### `SyncProgressManager`（全局彈窗）
- **位置**：全屏居中
- **顯示**：僅當 `pendingCount >= 5` 時顯示
- **功能**：
  - 顯示上傳/下載進度條
  - 顯示當前處理項目
  - 顯示百分比
  - 完成後自動關閉

---

## ✅ 修復內容總結

### 1. 添加 `pendingCount` 依賴
```typescript
const { 
  status, 
  uploadProgress, 
  downloadProgress,
  pendingCount, // ✅ 新增
} = useSyncContext();
```

### 2. 添加閾值判斷
```typescript
// ✅ 只有 pendingCount >= 5 才顯示
if (uploadProgress && uploadProgress.total > 0 && pendingCount >= 5) {
  setShowUploadProgress(true);
}
```

### 3. 添加 Debug Log
```typescript
console.log('🔍 [SyncProgressManager] 狀態:', { pendingCount, ... });
console.log('🟢 [SyncProgressManager] 無聲模式:', { pendingCount });
console.log('📱 [SyncProgressManager] 顯示上傳彈窗:', { pendingCount });
```

---

## 🎯 測試建議

### 測試 1：無聲模式（< 5 事件）
1. 點擊 1 次互動按鈕
2. 觀察 Console：應該看到 `🟢 [SyncProgressManager] 無聲模式`
3. 觀察 UI：只有小圓點 + 呼吸燈，沒有大彈窗

### 測試 2：彈窗模式（>= 5 事件）
1. 快速點擊 5 次互動按鈕
2. 觀察 Console：應該看到 `📱 [SyncProgressManager] 顯示上傳彈窗`
3. 觀察 UI：顯示大彈窗 + 進度條

### 測試 3：邊界情況（剛好 5 事件）
1. 快速點擊 3 次互動按鈕（6 個事件）
2. 應該顯示大彈窗（因為 6 >= 5）

---

## 📚 相關文檔

- [Optimistic UI 實作報告](./OPTIMISTIC_UI_IMPLEMENTATION_REPORT.md)
- [競態條件修復報告](./RACE_CONDITION_FIX_REPORT.md)
- [事件溯源強化報告](./EVENT_SOURCING_IMPLEMENTATION_SUMMARY.md)

---

**修復版本**: v1.2  
**修復日期**: 2026-02-24  
**維護者**: Market Pulse 開發團隊

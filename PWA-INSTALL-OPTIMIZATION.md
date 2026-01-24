# PWA 安裝提示優化說明

## 📋 優化內容

### 原本的行為
- 每次開啟網站都會在 3 秒後顯示安裝提示
- 關閉後 7 天內不再顯示
- 7 天後又會自動彈出

### 優化後的行為
✅ **第一次訪問**
- 延遲 3 秒後自動顯示安裝提示
- 用戶可以選擇「立即安裝」或「稍後」

✅ **第二次及之後訪問**
- 不再自動彈出安裝提示
- 安裝選項移至「設置」頁面
- 用戶可以自行決定何時安裝

✅ **已安裝後**
- 設置頁面的安裝按鈕自動消失
- 不再顯示任何安裝提示

---

## 🔧 技術實作

### 1. PWAInstallPrompt 組件優化

**檔案：** `components/PWAInstallPrompt.tsx`

**變更：**
```typescript
// 新增 manualTrigger 參數
export function PWAInstallPrompt({ manualTrigger = false }: { manualTrigger?: boolean })

// 只在第一次訪問時自動顯示
if (!manualTrigger) {
  const hasShownBefore = localStorage.getItem('pwa-install-first-shown');
  
  if (!hasShownBefore) {
    setTimeout(() => {
      setShowPrompt(true);
      localStorage.setItem('pwa-install-first-shown', 'true');
    }, 3000);
  }
}
```

**LocalStorage 鍵值：**
- `pwa-install-first-shown`: 記錄是否已顯示過第一次提示

---

### 2. 新增 PWAInstallButton 組件

**檔案：** `components/PWAInstallButton.tsx`

**功能：**
- 檢測是否已安裝 PWA
- 已安裝則不顯示按鈕
- 未安裝則顯示安裝按鈕
- 支援 iOS 和 Android 平台

**檢測邏輯：**
```typescript
// 檢查是否已安裝
const installed = window.matchMedia('(display-mode: standalone)').matches ||
                 (window.navigator as any).standalone ||
                 document.referrer.includes('android-app://');

// 已安裝則不顯示按鈕
if (isInstalled) {
  return null;
}
```

---

### 3. 設置頁面整合

**檔案：** `app/settings/page.tsx`

**新增：**
```typescript
import { PWAInstallButton } from '@/components/PWAInstallButton';

// 在設置頁面頂部顯示
<PWAInstallButton />
```

---

## 🎨 UI 設計

### 設置頁面的安裝按鈕

```
┌─────────────────────────────────────────┐
│  📱  安裝市集誌到主畫面              ⬇️  │
│      享受更快速的啟動和離線使用          │
└─────────────────────────────────────────┘
```

**特色：**
- 漸層背景（#7B9FA6 → #6A8E95）
- 白色文字
- 圖示：手機 + 下載箭頭
- Hover 效果：陰影加深

---

## 📱 平台支援

### iOS (Safari)
- 顯示 3 步驟安裝引導
- 引導用戶使用分享按鈕
- Modal 彈窗顯示

### Android (Chrome)
- 一鍵安裝
- 使用瀏覽器原生安裝提示
- 自動檢測 `beforeinstallprompt` 事件

### Desktop
- 支援 Chrome/Edge 安裝
- 使用瀏覽器原生安裝提示

---

## 🔄 使用流程

### 第一次訪問
```
1. 用戶開啟網站
2. 等待 3 秒
3. 自動顯示安裝提示
4. 用戶選擇：
   - 立即安裝 → 完成安裝
   - 稍後 → 關閉提示
5. 記錄已顯示過（localStorage）
```

### 第二次及之後訪問
```
1. 用戶開啟網站
2. 不再自動彈出提示
3. 用戶前往「設置」頁面
4. 看到「安裝市集誌到主畫面」按鈕
5. 點擊按鈕 → 顯示安裝引導/直接安裝
```

### 已安裝後
```
1. 用戶從主畫面啟動 App
2. 設置頁面不顯示安裝按鈕
3. 不再有任何安裝提示
```

---

## 🧪 測試方法

### 測試第一次訪問
```javascript
// 在 Console 執行
localStorage.removeItem('pwa-install-first-shown');
// 重新整理頁面，等待 3 秒
```

### 測試第二次訪問
```javascript
// 第一次訪問後，直接重新整理頁面
// 應該不會再彈出安裝提示
```

### 測試設置頁面按鈕
```
1. 前往設置頁面
2. 應該看到「安裝市集誌到主畫面」按鈕
3. 點擊按鈕測試安裝流程
```

### 測試已安裝狀態
```
1. 完成 PWA 安裝
2. 從主畫面啟動 App
3. 前往設置頁面
4. 安裝按鈕應該消失
```

---

## 💾 LocalStorage 管理

### 使用的鍵值

| 鍵值 | 用途 | 值 |
|------|------|-----|
| `pwa-install-first-shown` | 記錄是否已顯示過第一次提示 | `'true'` |

### 清除方法

```javascript
// 清除第一次顯示記錄
localStorage.removeItem('pwa-install-first-shown');

// 重新測試第一次訪問體驗
location.reload();
```

---

## 🎯 優化效果

### 使用者體驗改善

✅ **減少打擾**
- 不再重複彈出安裝提示
- 用戶可以自主決定安裝時機

✅ **清晰的入口**
- 設置頁面提供明確的安裝選項
- 已安裝後自動隱藏

✅ **友善的引導**
- 第一次訪問時適時提醒
- 不強制用戶立即決定

### 技術優勢

✅ **智慧檢測**
- 自動檢測是否已安裝
- 根據平台顯示不同的安裝方式

✅ **狀態管理**
- 使用 localStorage 記錄狀態
- 避免重複提示

✅ **平台適配**
- iOS：顯示詳細引導
- Android：一鍵安裝
- Desktop：瀏覽器原生提示

---

## 📝 未來可能的增強

### 1. 安裝統計
```typescript
// 記錄安裝轉換率
localStorage.setItem('pwa-install-date', Date.now().toString());
```

### 2. 個性化提示
```typescript
// 根據使用頻率決定是否提示
const visitCount = parseInt(localStorage.getItem('visit-count') || '0');
if (visitCount > 5 && !isInstalled) {
  // 顯示安裝建議
}
```

### 3. 安裝獎勵
```typescript
// 安裝後給予提示或獎勵
if (justInstalled) {
  toast.success('🎉 感謝安裝市集誌！');
}
```

---

## 🔗 相關檔案

- `components/PWAInstallPrompt.tsx` - 第一次訪問的安裝提示
- `components/PWAInstallButton.tsx` - 設置頁面的安裝按鈕
- `app/settings/page.tsx` - 設置頁面
- `app/layout.tsx` - 全域 Layout（包含 PWAInstallPrompt）

---

## ✅ 完成檢查清單

- [x] 修改 PWAInstallPrompt 組件
- [x] 新增 PWAInstallButton 組件
- [x] 整合到設置頁面
- [x] 測試第一次訪問流程
- [x] 測試設置頁面按鈕
- [x] 測試已安裝狀態
- [x] 建立說明文件

---

**優化完成日期：** 2026-01-24  
**版本：** 1.1.0  
**狀態：** ✅ 已完成

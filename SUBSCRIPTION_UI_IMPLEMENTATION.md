# 訂閱付費功能 UI 實作報告

## 📋 專案概述

本次實作為市集攤販管理系統（Market Pulse）新增訂閱付費功能的完整 UI 介面，包含方案展示、訂閱管理、升級提示等核心視覺組件。所有功能邏輯暫不實作，僅完成 UI 層面的展示。

---

## ✅ 完成項目

### 1. 訂閱方案卡片組件 (`PricingCard.tsx`)

**檔案位置**: `components/subscription/PricingCard.tsx`

**功能說明**:
- 展示三種訂閱方案（免費版、專業版、企業版）
- 每個方案包含：
  - 方案圖示（Sparkles / Crown / Building2）
  - 價格顯示（NT$ 0 / 199 / 499）
  - 功能列表（打勾項目）
  - 選擇按鈕
- 支援「目前方案」標記
- 專業版顯示「最受歡迎」徽章
- 企業版顯示「完整功能」徽章

**設計特色**:
- 使用漸層色彩區分方案層級
- 懸停效果：陰影加深 + 輕微上移
- 當前方案顯示綠色邊框高亮

**方案內容**:

| 方案 | 價格 | 核心功能 |
|------|------|----------|
| 免費版 | NT$ 0 | 單一市集、20 個商品、本地存儲 |
| 專業版 | NT$ 199/月 | 無限市集、雲端同步、3 人協作 |
| 企業版 | NT$ 499/月 | 無限協作、API 存取、專屬支援 |

---

### 2. 訂閱管理頁面 (`/subscription`)

**檔案位置**: `app/subscription/page.tsx`

**頁面結構**:

#### 2.1 頁面頭部
- 漸層背景（青綠到金棕色）
- 返回按鈕
- 標題：「訂閱方案」
- 副標題：「選擇最適合您的方案，隨時可以升級或降級」

#### 2.2 當前訂閱狀態卡片（付費用戶專屬）
- 顯示目前使用的方案（專業版/企業版）
- 下次扣款日期（模擬：2026/03/24）
- 付款方式（模擬：信用卡 •••• 1234）
- 取消訂閱按鈕（紅色文字）

#### 2.3 方案選擇區域
- 三欄式佈局（桌面版）
- 響應式設計（手機版單欄）
- 使用 `PricingCard` 組件展示

#### 2.4 常見問題區塊
包含 4 個常見問題：
1. 可以隨時取消訂閱嗎？
2. 降級後數據會消失嗎？
3. 支援哪些付款方式？
4. 需要開立發票嗎？

#### 2.5 取消訂閱確認對話框
- 模態對話框設計
- 警告圖示（AlertCircle）
- 說明取消後的影響
- 兩個按鈕：「保留訂閱」（主要）、「確定取消」（次要）

**互動流程**:
```
用戶點擊「選擇此方案」
  ↓
顯示 Toast 提示「功能開發中」
  ↓
（未來）導向付款頁面
```

---

### 3. TopNavigation 訂閱狀態整合

**檔案位置**: `components/TopNavigation.tsx`

**新增功能**:
- 在用戶選單中顯示「目前方案」區塊
- 僅對老闆身份顯示（員工不顯示）
- 免費版顯示「升級」按鈕
- 付費版顯示「管理」按鈕
- 點擊後導向 `/subscription` 頁面

**視覺設計**:
```
┌─────────────────────────┐
│ 目前方案          👑    │
│ 免費版            升級  │
└─────────────────────────┘
```

---

### 4. 升級提示橫幅 (`UpgradePrompt.tsx`)

**檔案位置**: `components/subscription/UpgradePrompt.tsx`

**功能說明**:
- 頁面頂部固定橫幅
- 漸層背景（青綠到金棕色）
- 顯示升級訊息（可自訂）
- 「立即升級」按鈕（導向訂閱頁面）
- 關閉按鈕（可選）

**使用範例**:
```tsx
<UpgradePrompt 
  message="升級至專業版，解鎖無限市集和雲端同步功能"
  showClose={true}
/>
```

**建議使用時機**:
- 首頁頂部（免費用戶）
- 市集列表頁（達到 1 個市集限制時）
- 商品管理頁（達到 20 個商品限制時）

---

### 5. 功能限制對話框 (`FeatureLimitDialog.tsx`)

**檔案位置**: `components/subscription/FeatureLimitDialog.tsx`

**功能說明**:
- 當用戶達到免費版限制時彈出
- 顯示限制原因和說明
- 列出專業版的核心功能
- 兩個按鈕：「稍後再說」、「立即升級」

**Props 參數**:
```typescript
interface FeatureLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;              // 例：「已達市集數量上限」
  description: string;        // 例：「免費版僅支援 1 個市集」
  limitInfo?: string;         // 例：「目前：1/1 個市集」
}
```

**使用範例**:
```tsx
<FeatureLimitDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  title="已達市集數量上限"
  description="免費版僅支援 1 個市集，升級至專業版即可建立無限市集。"
  limitInfo="目前：1/1 個市集"
/>
```

---

### 6. 載入骨架屏 (`loading.tsx`)

**檔案位置**: `app/subscription/loading.tsx`

**功能說明**:
- 訂閱頁面的載入狀態
- 模擬頁面結構的骨架動畫
- 使用 `animate-pulse` 實現呼吸效果

---

## 🎨 設計系統

### 色彩方案

**主色調（老闆模式）**:
- 主色：`#7B9FA6`（青綠色）
- 輔色：`#D4A574`（金棕色）
- 漸層：`from-[#7B9FA6] to-[#D4A574]`

**員工模式**:
- 主色：`#8B7BA6`（紫灰色）
- 輔色：`#A6B4D4`（淺藍紫）

**功能色**:
- 成功：`#7B9FA6`（青綠）
- 警告：`#D4A574`（金棕）
- 錯誤：`#d4183d`（紅色）

### 圓角規範
- 卡片：`rounded-[1.5rem]`（24px）
- 對話框：`rounded-[2rem]`（32px）
- 按鈕：`rounded-xl`（12px）
- 徽章：`rounded-full`

### 陰影層級
- 卡片：`shadow-lg`
- 對話框：`shadow-2xl`
- 懸停：`shadow-xl`

---

## 📱 響應式設計

### 桌面版（≥768px）
- 方案卡片：3 欄式佈局
- 最大寬度：`max-w-4xl`

### 手機版（<768px）
- 方案卡片：單欄堆疊
- 完整寬度顯示

---

## 🔄 互動流程圖

```
┌─────────────────┐
│   首頁 (免費)   │
└────────┬────────┘
         │
         ├─ 點擊「升級」按鈕
         │
         ↓
┌─────────────────┐
│  訂閱管理頁面   │
│  - 免費版       │
│  - 專業版 ⭐    │
│  - 企業版       │
└────────┬────────┘
         │
         ├─ 選擇方案
         │
         ↓
┌─────────────────┐
│ Toast: 功能開發中│
└─────────────────┘

（未來）
         ↓
┌─────────────────┐
│   付款頁面      │
│  (綠界/藍新)    │
└────────┬────────┘
         │
         ├─ 付款成功
         │
         ↓
┌─────────────────┐
│  訂閱管理頁面   │
│  (顯示當前訂閱) │
└─────────────────┘
```

---

## 📂 檔案結構

```
market2/
├── app/
│   └── subscription/
│       ├── page.tsx           # 訂閱管理主頁面
│       └── loading.tsx        # 載入骨架屏
│
├── components/
│   ├── TopNavigation.tsx      # 頂部導航（已更新）
│   └── subscription/
│       ├── PricingCard.tsx           # 方案卡片
│       ├── FeatureLimitDialog.tsx    # 限制對話框
│       └── UpgradePrompt.tsx         # 升級橫幅
│
└── SUBSCRIPTION_UI_IMPLEMENTATION.md  # 本文檔
```

---

## 🚀 使用指南

### 1. 訪問訂閱頁面

在瀏覽器中訪問：
```
http://localhost:3000/subscription
```

### 2. 在其他頁面整合升級提示

**範例 1：首頁頂部橫幅**
```tsx
// app/page.tsx
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';

export default function HomePage() {
  const currentPlan = 'free'; // TODO: 從實際狀態獲取
  
  return (
    <>
      {currentPlan === 'free' && <UpgradePrompt />}
      {/* 其他內容 */}
    </>
  );
}
```

**範例 2：達到限制時顯示對話框**
```tsx
// app/markets/page.tsx
import { FeatureLimitDialog } from '@/components/subscription/FeatureLimitDialog';

export default function MarketsPage() {
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  
  const handleAddMarket = () => {
    const marketCount = 1; // TODO: 從實際數據獲取
    
    if (marketCount >= 1) {
      setShowLimitDialog(true);
      return;
    }
    
    // 繼續新增市集
  };
  
  return (
    <>
      {/* 頁面內容 */}
      
      <FeatureLimitDialog
        isOpen={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        title="已達市集數量上限"
        description="免費版僅支援 1 個市集，升級至專業版即可建立無限市集。"
        limitInfo="目前：1/1 個市集"
      />
    </>
  );
}
```

---

## 🎯 待實作功能（Phase 2）

以下功能僅完成 UI，邏輯待後續實作：

### 1. 訂閱狀態管理
- [ ] 建立 `useSubscription` Hook
- [ ] 從 Supabase 讀取訂閱狀態
- [ ] 本地快取訂閱資訊

### 2. 付款整合
- [ ] 整合綠界科技 API
- [ ] 建立付款頁面
- [ ] 處理付款回調（Webhook）

### 3. 功能限制檢查
- [ ] 市集數量限制（免費版：1 個）
- [ ] 商品數量限制（免費版：20 個）
- [ ] 員工協作限制（免費版：無，專業版：3 人）

### 4. 訂閱管理功能
- [ ] 升級訂閱
- [ ] 降級訂閱
- [ ] 取消訂閱
- [ ] 更新付款方式

### 5. 資料庫結構
- [ ] 建立 `subscriptions` 表
- [ ] 建立 `usage_limits` 表
- [ ] 建立 RLS 政策

---

## 📊 測試檢查清單

### 視覺測試
- [x] 訂閱頁面正常顯示
- [x] 三個方案卡片排列正確
- [x] 響應式佈局（手機/桌面）
- [x] 懸停效果正常
- [x] 對話框動畫流暢

### 互動測試
- [x] 點擊「選擇此方案」顯示 Toast
- [x] 點擊「取消訂閱」顯示確認對話框
- [x] 點擊「立即升級」導向訂閱頁面
- [x] TopNavigation 顯示訂閱狀態
- [x] 關閉升級橫幅正常

### 無障礙測試
- [x] 按鈕有 `aria-label`
- [x] 對話框可用鍵盤關閉（ESC）
- [x] 顏色對比度符合 WCAG AA

---

## 🎨 設計亮點

### 1. 漸層色彩系統
- 使用品牌色（青綠 + 金棕）建立視覺層次
- 不同方案使用不同漸層，易於區分

### 2. 微互動設計
- 卡片懸停：陰影加深 + 輕微上移（`hover:-translate-y-1`）
- 按鈕懸停：背景色變化 + 陰影增強
- 對話框：淡入 + 縮放動畫（`animate-in zoom-in-95`）

### 3. 資訊層級清晰
- 使用徽章標記「最受歡迎」和「目前方案」
- 價格使用大字體 + 等寬數字（`tabular-nums`）
- 功能列表使用打勾圖示，視覺掃描友善

### 4. 一致性設計
- 遵循現有的日系 UI 設計系統
- 圓角、陰影、間距與其他頁面保持一致
- 色彩方案與品牌識別統一

---

## 📝 開發筆記

### 技術選擇
- **框架**: Next.js 14 (App Router)
- **樣式**: Tailwind CSS
- **圖示**: Lucide React
- **通知**: Sonner (Toast)

### 效能優化
- 使用 `'use client'` 標記客戶端組件
- 對話框使用條件渲染（`isOpen && ...`）
- 骨架屏提升載入體驗

### 可維護性
- 組件拆分清晰，職責單一
- Props 介面定義完整
- 註解說明詳細

---

## 🔗 相關文件

- [專案結構](./PROJECT_STRUCTURE.md)
- [設計系統](./DESIGN_SYSTEM_QUICK_START.md)
- [日系 UI 指南](./如何使用日系UI設計系統.md)

---

## 👥 貢獻者

- **UI 設計與實作**: AI Assistant (Grok)
- **需求規劃**: 專案負責人

---

## 📅 更新日誌

### 2026-02-24
- ✅ 完成訂閱方案卡片組件
- ✅ 完成訂閱管理頁面
- ✅ 完成升級提示組件
- ✅ 完成功能限制對話框
- ✅ 整合 TopNavigation 訂閱狀態
- ✅ 撰寫實作報告文檔

---

## 📞 聯絡資訊

如有問題或建議，請聯繫專案負責人。

---

**文檔版本**: v1.0.0  
**最後更新**: 2026-02-24  
**狀態**: ✅ UI 實作完成，功能邏輯待開發

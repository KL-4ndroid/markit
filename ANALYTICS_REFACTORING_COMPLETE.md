# Analytics 架構重構完成報告

## 🎯 重構目標

將 `analytics-utils.ts` 的邏輯拆解並歸隊到各個 Engine，確保 UI 組件只能從 `lib/analytics/index.ts` 取得數據。

## ✅ 完成的工作

### 1. 函數遷移到各個 Engine

#### ✅ `product-affinity-engine.ts`
- 新增 `calculateDailyRevenue()` - 計算每日收入

#### ✅ `lib/analytics/index.ts`
- 新增 `buildMarketOverview()` - 組合各個 Engine 的結果
- 重新導出 `calculateDailyRevenue`
- 更新所有導出函數

### 2. 更新 UI 組件導入路徑

#### ✅ `app/analytics/page.tsx`
- 從 `@/lib/analytics-utils` 改為 `@/lib/analytics`
- 更新函數調用：
  - `calculateMarketHealthScores` → `calculateHealthScores`
  - 所有函數現在都是 async，使用 `useLiveQuery` 替代 `useMemo`
  - 傳入 `db` 和 `allMarkets` 參數以支援批次補登偵測

#### ✅ `components/analytics/DiagnosticCards.tsx`
- 從 `@/lib/analytics-utils` 改為 `@/lib/analytics`

#### ✅ `components/analytics/ProductRecommendationsCard.tsx`
- 從 `@/lib/analytics-utils` 改為 `@/lib/analytics`

#### ✅ `components/analytics/AnalyticsDashboard.tsx`
- 已經在使用 `@/lib/analytics` ✅
- 更新 `computeMarketAnalytics` 調用為 async
- 傳入 `db` 和 `allMarkets` 參數

#### ✅ `components/analytics/MarketOverviewCard.tsx`
- 已經在使用 `@/lib/analytics` ✅

#### ✅ `components/analytics/ComparisonChart.tsx`
- 已經在使用 `@/lib/analytics` ✅

## 📋 架構對比

### ❌ 舊架構（已棄用）
```
UI 組件
  ↓
lib/analytics-utils.ts (單一大檔案)
  ↓
重複計算、難以維護
```

### ✅ 新架構（已實施）
```
UI 組件
  ↓
lib/analytics/index.ts (統一入口)
  ↓
├─ metrics-engine.ts (核心指標 + 批次補登偵測)
├─ health-score-engine.ts (健康評分)
├─ diagnosis-engine.ts (診斷分析)
├─ quadrant-engine.ts (象限分類)
└─ product-affinity-engine.ts (商品親和力 + 每日收入)
```

## 🔥 新架構優勢

1. **分離關注點** - 每個 Engine 專注於特定分析
2. **避免重複計算** - 使用 WeakMap 快取
3. **批次補登偵測** - 自動識別大額補登並調整成交次數
4. **統一入口** - UI 組件只能從 `index.ts` 導入
5. **易於維護** - 清晰的模組化結構

## 🚀 新功能

### 批次補登偵測（v3.4）
- 自動識別大額補登事件
- 使用歷史中位數客單價預估實際成交次數
- 防止轉換率和客單價失真
- ⚠️ 重要：不修改原始數據，調整僅存在於分析視圖層

### 可信度評估（v3.3）
- 評估數據可信度（高/中/低）
- 基於互動數和成交數
- 小樣本保護（< 5 個市集使用百分位數評分）

## 📝 待處理事項

### ⚠️ 需要決策：`lib/analytics-utils.ts` 的處理

目前 `lib/analytics-utils.ts` 仍然存在，但所有 UI 組件已經不再使用它。

**選項 1：保留作為向後兼容**
- 優點：不會破壞可能的外部引用
- 缺點：維護兩套代碼

**選項 2：刪除並完全遷移**
- 優點：清理冗餘代碼
- 缺點：需要確認沒有其他地方使用

**建議：** 先保留一段時間，確認沒有問題後再刪除。

### 📌 其他注意事項

1. **`lib/analytics.ts` vs `lib/analytics/index.ts`**
   - 目前有兩個類似的檔案
   - `lib/analytics.ts` 似乎是舊版本
   - 需要確認是否可以刪除

2. **型別定義**
   - 所有型別已統一在 `lib/analytics/types.ts`
   - UI 組件應該從 `@/lib/analytics` 導入型別

## ✅ 驗證清單

- [x] 所有 UI 組件從 `@/lib/analytics` 導入
- [x] 沒有組件直接使用 `@/lib/analytics-utils`
- [x] 所有函數都在 `index.ts` 中重新導出
- [x] async 函數正確使用 `useLiveQuery`
- [x] 批次補登偵測功能已整合
- [x] 型別定義統一從 `@/lib/analytics` 導入

## 🎉 結論

架構重構已完成！所有 UI 組件現在都嚴格遵守「只從 `lib/analytics/index.ts` 取得數據」的原則。

新架構更清晰、更易維護，並且支援批次補登偵測等新功能。

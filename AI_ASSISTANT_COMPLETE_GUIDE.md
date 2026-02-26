# Market Pulse - AI 助手完整指南

> **面向對象**: 其他 AI LLM（如 Claude、GPT-4、Gemini 等）  
> **目的**: 快速理解專案架構、技術棧、設計規範，以便高效協助開發  
> **版本**: v2.0  
> **最後更新**: 2026-02-24

---

## 📋 目錄

1. [專案概述](#專案概述)
2. [核心理念](#核心理念)
3. [技術架構](#技術架構)
4. [資料庫設計](#資料庫設計)
5. [設計系統](#設計系統)
6. [功能模組](#功能模組)
7. [開發規範](#開發規範)
8. [常見任務](#常見任務)
9. [故障排除](#故障排除)
10. [訂閱付費系統](#訂閱付費系統)

---

## 🎯 專案概述

### 基本資訊

- **專案名稱**: Market Pulse（市集脈動）
- **中文名稱**: 市集攤販數位助手
- **定位**: Local-First（本地優先）的市集攤販管理系統
- **目標用戶**: 在市集、文創攤位現場忙碌的創作者/商販
- **開發狀態**: 生產環境運行中（約 80% 完成度）

### 核心價值主張

```
🎯 3 秒操作原則
所有核心動作（記錄交易、互動）必須在 3 秒內單手完成

📱 Local-First 架構
本地 Dexie 是唯一資料來源，即使斷網一小時也完全可用

🔒 數據掌控
用戶對營業數據有絕對控制權，雲端僅作備份和協作

🎨 日系美學
溫暖、柔和、手作感的使用者介面
```

### 技術棧速覽

| 層級 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **框架** | Next.js | 14.2.35 | App Router + TypeScript |
| **資料庫** | Dexie.js | 4.2.1 | IndexedDB 封裝（本地唯一數據源） |
| **狀態管理** | Zustand | - | 輕量級狀態管理 |
| **樣式** | Tailwind CSS | 3.4.1 | 實用優先的 CSS 框架 |
| **圖示** | Lucide React | 0.263.1 | 取代所有圖片/Emoji |
| **圖表** | Recharts | 3.7.0 | 本地數據可視化 |
| **雲端** | Supabase | 2.91.1 | PostgreSQL + 即時訂閱（可選） |
| **通知** | Sonner | 1.2.0 | Toast 通知 |
| **PWA** | next-pwa | 5.6.0 | 漸進式 Web 應用 |

---

## 💡 核心理念

### 1. Local-First (本地優先) 🎯

**核心原則**：本地 Dexie 是 UI 的唯一資料來源

```typescript
// ✅ 正確：Local-First 寫入流程
import { recordEvent } from '@/lib/db/events';

async function handleUserAction(data: any) {
  // 步驟 1: 寫入本地 Dexie（立即完成）
  await recordEvent({
    type: 'market_created',
    payload: data,
    timestamp: Date.now(),
  });
  
  // 步驟 2: UI 自動更新（useLiveQuery 觸發）
  // 不需要手動更新狀態
  
  // 步驟 3: 背景同步（由 useSync Hook 自動處理）
  // 失敗會自動重試，不影響用戶體驗
}

// ❌ 錯誤：直接依賴網路
async function handleUserAction(data: any) {
  await supabase.from('markets').insert(data); // 斷網會失敗
}
```

**資料流向**:
```
使用者操作 (UI)
    ↓
寫入 Dexie (Event Sourcing)
    ↓
UI 自動更新 (useLiveQuery)
    ↓
背景同步至 Supabase (非阻塞)
```

**雲端回流規則**:
```
Supabase 新資料
    ↓
寫入 Dexie (events 表)
    ↓
觸發事件處理器
    ↓
更新快照表
    ↓
UI 自動更新 (useLiveQuery)
```

**核心原則**:
- **本地 Dexie 是唯一真實數據源**
- 所有讀取必須使用 `useLiveQuery` 或自訂 Hooks
- 所有寫入必須使用 `recordEvent`
- 雲端 Supabase 僅作為備份和協作工具
- 即使斷網一小時，本地操作也必須完全正常
- 同步邏輯具備自動重試機制

**嚴格禁止**:
- ❌ 直接從 Supabase 讀取資料渲染 UI
- ❌ 同時寫入 Dexie 和 Supabase（重複邏輯）
- ❌ 在主執行緒執行同步操作（阻塞 UI）
- ❌ 混合使用本地和雲端資料源

### 2. 事件溯源 (Event Sourcing)

```typescript
// ✅ 正確：記錄事件，不直接修改狀態
await recordEvent({
  type: 'market_status_changed',
  payload: { marketId, oldStatus, newStatus },
  timestamp: Date.now(),
});

// ❌ 錯誤：直接修改狀態
await db.markets.update(marketId, { status: newStatus });
```

**原則**:
- 所有行為記錄為不可變的 `events`
- 系統維護「快照表」（markets, products）供即時讀取
- 可重放事件重建任意時間點的狀態
- 支援審計追蹤和數據恢復

### 3. 單手操作優化

```css
/* ✅ 正確：大按鈕，易於拇指點擊 */
.action-button {
  min-height: 48px;  /* 至少 48px */
  padding: 12px 24px;
}

/* ❌ 錯誤：小按鈕，難以點擊 */
.small-button {
  height: 32px;
  padding: 4px 8px;
}
```

**原則**:
- 所有可點擊元素至少 44x44px（iOS 標準）
- 底部導航固定，拇指易觸達
- 關鍵操作在螢幕下半部
- 避免需要雙手操作的手勢

### 4. 嚴格約束

```typescript
// ❌ 絕對禁止：圖片功能
interface Product {
  image?: string;  // ❌ 不允許
  imageUrl?: string;  // ❌ 不允許
  base64Image?: string;  // ❌ 不允許
}

// ✅ 正確：使用圖示和顏色
interface Product {
  iconName?: string;  // Lucide Icon 名稱
  colorCode?: string;  // 顏色代碼
}
```

**原則**:
- **禁止任何圖片功能**（效能和儲存空間考量）
- 所有視覺表達使用 Lucide Icons 或 CSS 顏色
- 未來才加入後端依賴（目前單機版本優先）

---

## 🏗️ 技術架構

### 系統架構圖

```
┌─────────────────────────────────────────────────────────┐
│                     使用者介面層                          │
│  Next.js 14 App Router + React 18 + TypeScript          │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │  首頁    │  市集    │  商品    │  分析    │          │
│  │  /       │ /markets │/products │/analytics│          │
│  └──────────┴──────────┴──────────┴──────────┘          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     業務邏輯層                            │
│  ┌──────────────┬──────────────┬──────────────┐         │
│  │ 事件處理器    │  React Hooks │  工具函數    │         │
│  │ eventHandlers│  useMarkets  │  formatCurrency│        │
│  │              │  useProducts │  cn()        │         │
│  └──────────────┴──────────────┴──────────────┘         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                     資料持久層                            │
│  Dexie.js (IndexedDB Wrapper)                           │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ events   │ markets  │ products │dailyStats│          │
│  │ (事件表) │ (市集表) │ (商品表) │ (統計表) │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                    IndexedDB                             │
└─────────────────────────────────────────────────────────┘
                          ↓ (可選)
┌─────────────────────────────────────────────────────────┐
│                     雲端同步層                            │
│  Supabase (PostgreSQL + Realtime)                       │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ events   │ markets  │ products │ profiles │          │
│  │          │market_   │          │          │          │
│  │          │members   │          │          │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
└─────────────────────────────────────────────────────────┘
```

### Local-First 資料流向

```
┌─────────────────────────────────────────────┐
│           使用者操作 (UI)                    │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     寫入 Dexie (Event Sourcing)             │
│     - 記錄事件到 events 表                   │
│     - 更新快照表 (markets, products)         │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     UI 自動更新 (useLiveQuery)              │
│     - Dexie 驅動 React 重新渲染             │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     背景同步至 Supabase (非阻塞)            │
│     - 自動重試機制                           │
│     - 衝突解決                               │
└─────────────────────────────────────────────┘
```

**關鍵特性**:
- ✅ 本地操作立即完成（不等待網路）
- ✅ UI 由 Dexie 驅動（useLiveQuery 自動更新）
- ✅ 雲端同步非阻塞（失敗不影響用戶）
- ✅ 斷網時完全可用（自動重連後同步）

---

## 🗄️ 資料庫設計

### IndexedDB 表結構

#### 1. events 表（事件表）

**用途**: 記錄所有歷史行為（不可變）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | string (UUID) | 主鍵 |
| `type` | EventType | 事件類型 |
| `payload` | any | 事件資料 |
| `timestamp` | number | 時間戳（毫秒） |
| `actor_id` | string | 操作者 UUID |
| `market_id` | string | 關聯市集 UUID |
| `sync_status` | string | 同步狀態 |

**索引**: `id, type, timestamp, actor_id, market_id, sync_status`

**事件類型**:
```typescript
type EventType =
  | 'market_created'           // 市集建立
  | 'market_updated'           // 市集更新
  | 'market_status_changed'    // 市集狀態變更
  | 'market_started'           // 市集開始營業
  | 'market_ended'             // 市集結束營業
  | 'market_deleted'           // 市集刪除
  | 'product_created'          // 商品建立
  | 'product_updated'          // 商品更新
  | 'product_deleted'          // 商品刪除
  | 'interaction_recorded'     // 記錄互動
  | 'deal_closed'              // 成交
  | 'settings_updated';        // 設定更新
```

#### 2. markets 表（市集快照）

**用途**: 市集當前狀態（快照）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | string (UUID) | 主鍵 |
| `name` | string | 市集名稱 |
| `location` | string | 地點 |
| `dates` | string[] | 日期陣列（支持多選） |
| `startDate` | string | 最早日期 |
| `endDate` | string | 最晚日期 |
| `status` | MarketStatus | 當前狀態 |
| `owner_id` | string | 擁有者 UUID |
| `is_collaborative` | boolean | 是否協作市集 |
| `isDeleted` | boolean | 軟刪除標記 |
| `totalRevenue` | number | 總收入 |
| `totalProfit` | number | 總利潤 |
| `createdAt` | number | 建立時間 |
| `updatedAt` | number | 更新時間 |

**市集狀態流轉**:
```
registered → accepted → paid → ongoing → completed
              ↓           ↓
          postponed   cancelled
```

#### 3. products 表（商品快照）

**用途**: 商品當前狀態（快照）

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | string (UUID) | 主鍵 |
| `name` | string | 商品名稱 |
| `category` | ProductCategory | 商品分類 |
| `price` | number | 售價 |
| `cost` | number | 成本 |
| `iconName` | string | Lucide Icon 名稱 |
| `colorCode` | string | 顏色代碼 |
| `stock` | number | 庫存數量 |
| `unlimitedStock` | boolean | 不限庫存 |
| `isActive` | boolean | 是否啟用 |
| `owner_id` | string | 擁有者 UUID |
| `market_id` | string | 首次創建的市集 |
| `totalSold` | number | 總銷售數量 |

**商品分類**:
```typescript
type ProductCategory =
  | 'handmade'      // 🧵 手作
  | 'food'          // 🍰 食品
  | 'accessory'     // 💎 飾品
  | 'clothing'      // 👕 服飾
  | 'art'           // 🎨 藝術品
  | 'stationery'    // 📚 文具
  | 'other';        // 📦 其他
```

#### 4. dailyStats 表（每日統計）

**用途**: 快速查詢每日數據

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | number | 自動遞增主鍵 |
| `date` | string | 日期（YYYY-MM-DD） |
| `marketId` | string | 關聯市集 UUID |
| `revenue` | number | 收入 |
| `cost` | number | 成本 |
| `profit` | number | 利潤 |
| `dealCount` | number | 成交次數 |

**複合索引**: `[date+marketId]`

---

## 🎨 設計系統

### 色彩系統

#### 主色調

```css
/* 品牌色 */
--mist-blue: #7B9FA6;        /* 霧藍 - 主要動作 */
--warm-wood: #D4A574;        /* 暖木 - 次要動作 */

/* 背景色 */
--background: #FAFAF8;       /* 米白 - 主背景 */
--card-bg: #FFFFFF;          /* 純白 - 卡片背景 */

/* 文字色 */
--foreground: #3A3A3A;       /* 深灰 - 主文字 */
--muted: #6B6B6B;            /* 中灰 - 次要文字 */
```

#### 商品分類配色

```css
--handmade: #F5E6E8;         /* 🧵 手作 - 柔粉 */
--food: #FFF8E7;             /* 🍰 食品 - 柔黃 */
--accessory: #E8F3E8;        /* 💎 飾品 - 柔綠 */
--clothing: #E8F0F8;         /* 👕 服飾 - 柔藍 */
--art: #F8E8F0;              /* 🎨 藝術品 - 柔紫 */
--stationery: #FFF0E8;       /* 📚 文具 - 柔橘 */
--other: #F0F0F0;            /* 📦 其他 - 柔灰 */
```

#### 員工模式配色

```css
--staff-primary: #8B7BA6;    /* 紫灰 - 員工主色 */
--staff-secondary: #A6B4D4;  /* 淺藍紫 - 員工輔色 */
--staff-light: #F0E8F3;      /* 淺紫 - 員工淺色背景 */
```

### 圓角系統

```css
--radius-xl: 1.5rem;         /* 24px - 主卡片 */
--radius-lg: 1.25rem;        /* 20px - 次卡片 */
--radius: 1.25rem;           /* 20px - 基礎 */
--radius-md: 1.125rem;       /* 18px - 中等 */
--radius-sm: 0.75rem;        /* 12px - 小元件 */
```

### 陰影系統

```css
/* 卡片陰影 */
.shadow-card {
  box-shadow: 0 2px 8px rgba(123, 159, 166, 0.1);
}

/* 懸停陰影 */
.shadow-hover {
  box-shadow: 0 4px 16px rgba(123, 159, 166, 0.15);
}

/* 對話框陰影 */
.shadow-dialog {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
```

### 動畫系統

```css
/* 頁面轉場 */
.page-transition {
  animation: fadeIn 0.3s ease-in-out;
}

/* +1 動畫（互動按鈕） */
.plus-one {
  animation: bounceUp 0.6s ease-out;
}

@keyframes bounceUp {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
  100% { transform: translateY(-40px) scale(0.8); opacity: 0; }
}
```

### 響應式斷點

```css
/* 手機優先 */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

**設計原則**:
- 預設為手機版（單欄佈局）
- 768px 以上使用多欄佈局
- 最大寬度 `max-w-lg` (512px) 保持可讀性

---

## 📦 功能模組

### 已完成功能（80%）

#### 1. 市集管理 ✅

**路徑**: `/markets`

**功能**:
- 市集列表與篩選（全部、待公佈、待繳費、待舉辦、已結束、已取消）
- 新增市集（全屏表單）
- 市集詳情與狀態流程
- 狀態變更（registered → accepted → paid → ongoing → completed）
- 開始/結束營業
- 軟刪除市集
- 支援多日市集（日期陣列）
- 時間軸管理（提前進場、報到、營業時間）

**關鍵檔案**:
```
app/markets/page.tsx           # 市集列表
app/markets/[id]/page.tsx      # 市集詳情
components/markets/MarketCard.tsx
components/markets/AddMarketForm.tsx
```

#### 2. 商品管理 ✅

**路徑**: `/products`

**功能**:
- 商品列表與網格佈局
- 關鍵字搜尋（名稱、描述）
- 分類篩選（7 種分類 + 全部）
- 新增商品（全屏表單）
- 編輯商品
- 軟刪除商品
- 商品詳情（價格、庫存、利潤率）
- 啟用/停用商品
- 分類配色系統（7 種柔和色彩 + Emoji）

**關鍵檔案**:
```
app/products/page.tsx          # 商品列表
app/products/[id]/page.tsx     # 商品詳情
components/products/ProductCard.tsx
components/products/AddProductForm.tsx
```

#### 3. 交易與互動記錄 ✅

**路徑**: `/markets/[id]` (市集詳情頁)

**功能**:
- 快速互動按鈕（詢問、試吃、拍照、拿名片）
- +1 動畫效果（彈跳上升並淡出）
- 購物車系統（商品選擇、數量調整）
- 支付方式選擇（現金、行動支付、信用卡）
- 快速結帳功能
- 即時營業指標（成交金額、客單價、互動次數、轉換率）
- 事件溯源整合（interaction_recorded、deal_closed）
- 單手操作優化

**關鍵檔案**:
```
components/sales/CartDrawer.tsx
components/sales/QuickInteractionButtons.tsx
components/sales/LiveMetrics.tsx
```

#### 4. 雲端同步 ✅

**功能**:
- 離線優先架構
- 背景自動同步（30 秒間隔）
- 事件上傳（Push）
- 事件下載（Pull）
- 快照優化（新設備快速載入）
- 衝突解決機制
- 網路狀態檢測
- 同步狀態顯示

**關鍵檔案**:
```
hooks/useSync.ts               # 同步 Hook
lib/db/snapshot.ts             # 快照管理
```

#### 5. 員工協作模式 ✅

**功能**:
- 老闆/員工身份區分
- 權限管理（查看/編輯）
- 敏感數據遮罩（收入、利潤）
- 員工專屬 UI（紫色主題）
- 市集成員管理
- RLS 政策保護

**關鍵檔案**:
```
hooks/useUserRole.ts           # 角色檢測
components/staff/StaffBadge.tsx
components/staff/SensitiveDataMask.tsx
```

#### 6. 訂閱付費 UI ✅

**路徑**: `/subscription`

**功能**:
- 三種方案展示（免費版、專業版 NT$199/月、企業版 NT$499/月）
- 訂閱管理頁面
- 升級提示橫幅
- 功能限制對話框
- TopNavigation 訂閱狀態顯示
- 取消訂閱確認對話框

**關鍵檔案**:
```
app/subscription/page.tsx
components/subscription/PricingCard.tsx
components/subscription/UpgradePrompt.tsx
components/subscription/FeatureLimitDialog.tsx
```

**注意**: 僅完成 UI，付款邏輯待實作

### 待完成功能（20%）

#### 7. 數據分析 🚧

**路徑**: `/analytics`

**規劃功能**:
- 銷售趨勢圖表（折線圖）
- 商品熱度分析（長條圖）
- 利潤統計（圓餅圖）
- 市集績效比較
- 轉換漏斗（互動 → 成交）
- 時段分析（營業高峰）

**技術選型**: Recharts

---

繼續下一部分...

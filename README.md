# Market Pulse - 市集攤販數位助手

專為市集攤販設計的離線優先數位助手，讓您在 3 秒內完成核心操作。

## 🎯 核心特色

- **100% 離線優先**：不需登入、不需連網，資料全在裝置本地
- **3 秒操作原則**：所有核心動作必須在 3 秒內單手完成
- **數據掌控**：本地資料存於 IndexedDB，確保絕對控制權
- **日系美學**：溫暖、柔和、手作感的使用者介面

## 🛠️ 技術棧

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Database**: Dexie.js (IndexedDB Wrapper)
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Analysis**: Recharts

## 🚀 開始使用

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

在瀏覽器中開啟 [http://localhost:3000](http://localhost:3000)

### 建置生產版本

```bash
npm run build
npm start
```

## 📁 專案結構

```
market2/
├── app/                    # Next.js App Router 頁面
│   ├── layout.tsx         # 根佈局（含底部導航）
│   ├── page.tsx           # 首頁
│   ├── globals.css        # 全域樣式（含動畫）
│   ├── markets/           # 市集管理頁面 ✅
│   │   ├── page.tsx       # 市集列表
│   │   └── [id]/page.tsx  # 市集詳情（含現場操作區）
│   ├── products/          # 商品管理頁面 ✅
│   │   ├── page.tsx       # 商品列表
│   │   └── [id]/page.tsx  # 商品詳情
│   ├── analytics/         # 數據分析頁面 🚧
│   └── settings/          # 設定頁面 🚧
├── components/            # React 組件
│   ├── BottomNav.tsx      # 底部導航 ✅
│   ├── markets/           # 市集相關組件 ✅
│   │   ├── MarketCard.tsx
│   │   └── AddMarketForm.tsx
│   ├── products/          # 商品相關組件 ✅
│   │   ├── ProductCard.tsx
│   │   ├── AddProductForm.tsx
│   │   └── EditProductForm.tsx
│   └── sales/             # 銷售相關組件 ✅
│       ├── CartDrawer.tsx          # 購物車抽屜
│       ├── QuickInteractionButtons.tsx  # 快速互動按鈕
│       └── LiveMetrics.tsx         # 即時營業指標
├── lib/                   # 工具函數與資料庫
│   ├── db/                # 資料庫相關 ✅
│   │   ├── index.ts       # Dexie 資料庫定義
│   │   ├── events.ts      # 事件溯源處理器
│   │   └── hooks.ts       # React Hooks
│   └── utils.ts           # 工具函數 ✅
├── types/                 # TypeScript 類型定義
│   └── db.ts              # 資料庫類型 ✅
├── public/                # 靜態資源
└── docs/                  # 專案文件
    ├── STEP4_*.md         # Step 4 文件
    ├── STEP5_*.md         # Step 5 文件
    └── ...
```

## 🎨 設計系統

本專案採用日系文創風格設計系統，詳細規範請參考：
- `JAPANESE_UI_DESIGN_SYSTEM.md` - 完整設計系統文件
- `PROJECT_CONTEXT.md` - 專案核心上下文
- `STEP4_DESIGN_SHOWCASE.md` - 商品管理視覺設計展示

### 主要色彩

- **霧藍** (#7B9FA6)：主要品牌色
- **暖木** (#D4A574)：次要品牌色
- **背景** (#FAFAF8)：溫暖米白

### 商品分類配色（Step 4 新增）

- 🧵 **手作** (#F5E6E8)：柔粉色
- 🍰 **食品** (#FFF8E7)：柔黃色
- 💎 **飾品** (#E8F3E8)：柔綠色
- 👕 **服飾** (#E8F0F8)：柔藍色
- 🎨 **藝術品** (#F8E8F0)：柔紫色
- 📚 **文具** (#FFF0E8)：柔橘色
- 📦 **其他** (#F0F0F0)：柔灰色

## 📱 功能模組

### ✅ 已完成

1. **市集管理** (Step 3) - 100%
   - ✅ 市集列表與篩選（已報名、已接受、已繳費）
   - ✅ 新增市集（全屏表單）
   - ✅ 市集詳情與狀態流程
   - ✅ 狀態變更（registered → accepted → paid → ongoing → completed）
   - ✅ 開始/結束營業
   - ✅ 刪除市集
   - ✅ 支援多日市集

2. **商品管理** (Step 4) - 100%
   - ✅ 商品列表與網格佈局
   - ✅ 關鍵字搜尋（名稱、描述）
   - ✅ 分類篩選（7 種分類 + 全部）
   - ✅ 新增商品（全屏表單）
   - ✅ 編輯商品
   - ✅ 刪除商品（軟刪除）
   - ✅ 商品詳情（價格、庫存、利潤率）
   - ✅ 啟用/停用商品
   - ✅ 分類配色系統（7 種柔和色彩 + Emoji）

3. **交易與互動記錄** (Step 5) - 100%
   - ✅ 快速互動按鈕（詢問、試吃、拍照、拿名片）
   - ✅ +1 動畫效果（彈跳上升並淡出）
   - ✅ 購物車系統（商品選擇、數量調整）
   - ✅ 支付方式選擇（現金、行動支付、信用卡）
   - ✅ 快速結帳功能
   - ✅ 即時營業指標（成交金額、客單價、互動次數、轉換率）
   - ✅ 事件溯源整合（interaction_recorded、deal_closed）
   - ✅ 單手操作優化

### 🚧 進行中

4. **數據分析** (Step 6) - 0%
   - 銷售趨勢圖表
   - 商品熱度分析
   - 利潤統計
   - 市集績效比較

## 📊 開發進度

| 步驟 | 功能 | 狀態 | 完成度 |
|------|------|------|--------|
| Step 1 | 專案初始化 | ✅ | 100% |
| Step 2 | 資料引擎（事件溯源） | ✅ | 100% |
| Step 3a | 市集列表與新增 | ✅ | 100% |
| Step 3b | 市集詳情與狀態流程 | ✅ | 100% |
| Step 4 | 商品管理 | ✅ | 100% |
| Step 5 | 交易與互動記錄 | ✅ | 100% |
| Step 6 | 數據分析 | 🚧 | 0% |

**總體完成度：** 約 80%

## 📄 授權

本專案為私人專案，保留所有權利。

## 🙏 致謝

設計靈感來自日本文創市集的溫暖氛圍。

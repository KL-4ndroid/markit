# BoothBook - 出攤本

專為市集攤販設計的離線優先 PWA 應用，幫助您在 3 秒內完成核心操作。

## 核心特色

- **離線優先**：本地資料存於 IndexedDB，無網路也能使用
- **3 秒原則**：核心動作可在 3 秒內單手完成
- **雲端同步**：可選的 Supabase 雲端同步，支援多人協作
- **日系美學**：溫暖柔和的視覺設計

## 快速開始

```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 建置生產版本
npm run build
npm start
```

## 技術架構

| 層面 | 技術 |
|------|------|
| Framework | Next.js 16 (App Router) |
| 語言 | TypeScript |
| 本地資料庫 | Dexie.js (IndexedDB) |
| 雲端 | Supabase (可選) |
| 樣式 | Tailwind CSS |
| 圖示 | Lucide React |

## 主要功能

| 功能 | 說明 |
|------|------|
| 市集管理 | 新增/編輯市集、狀態流程、多日支援 |
| 商品管理 | 商品 CRUD、分類篩選、庫存追蹤 |
| 銷售記錄 | 快速互動按鈕、購物車、成交記錄 |
| 數據分析 | 健康評分、象限分析、轉換率追蹤 |
| 員工模式 | 多人協作、權限控制 |
| PWA | 離線支援、安裝到主畫面 |

## 專案結構

```
markit-master/
├── app/                    # Next.js App Router 頁面
│   ├── page.tsx           # 首頁
│   ├── markets/           # 市集管理
│   ├── products/          # 商品管理
│   ├── analytics/         # 數據分析
│   ├── settings/          # 設定
│   └── recovery/          # 資料修復
├── components/            # React 組件
│   ├── markets/          # 市集相關
│   ├── products/         # 商品相關
│   ├── sales/            # 銷售相關
│   ├── analytics/        # 分析相關
│   ├── auth/             # 認證相關
│   └── sync/             # 同步相關
├── lib/                   # 業務邏輯
│   ├── db/              # IndexedDB + 事件溯源
│   ├── supabase/         # 雲端同步
│   └── analytics/        # 分析引擎
├── types/                 # TypeScript 類型定義
├── hooks/                 # React Hooks
└── docs/                  # 開發文檔
```

## 環境變數

複製 `.env.example` 為 `.env.local` 並填入 Supabase 設定（可選）：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

若不設定，應用會以純離線模式運行。

## 驗證命令

```bash
npm run build   # 建置檢查
npm run lint    # 程式碼風格
npm test        # 單元測試
npx tsc --noEmit  # TypeScript 檢查
```

## 資料修復

若遇到資料問題，訪問 `/recovery` 頁面進行：
- 完整性檢查
- 資料重建
- 救援備份

## 授權

本專案為私人專案，保留所有權利。

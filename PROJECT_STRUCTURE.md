# Market Pulse - 專案結構總覽

## 📁 完整目錄結構

```
market2/
│
├── 📱 app/                          # Next.js App Router
│   ├── layout.tsx                   # ✅ 根佈局（含底部導航）
│   ├── page.tsx                     # ✅ 首頁
│   ├── globals.css                  # ✅ 全域樣式
│   │
│   ├── 📅 markets/                  # 市集管理模組
│   │   └── page.tsx                 # ✅ 市集列表頁面（待實作）
│   │
│   ├── 📦 products/                 # 商品管理模組
│   │   └── page.tsx                 # ✅ 商品管理頁面（待實作）
│   │
│   ├── 📊 analytics/                # 數據分析模組
│   │   └── page.tsx                 # ✅ 數據分析頁面（待實作）
│   │
│   └── ⚙️ settings/                 # 設定模組
│       └── page.tsx                 # ✅ 設定頁面（待實作）
│
├── 🧩 components/                   # React 組件
│   └── BottomNavigation.tsx         # ✅ 底部導航組件
│
├── 🛠️ lib/                          # 工具函數與資料庫
│   └── utils.ts                     # ✅ 工具函數（格式化、類名合併）
│
├── 🌐 public/                       # 靜態資源
│   └── manifest.json                # ✅ PWA Manifest
│
├── 📚 node_modules/                 # 依賴套件（已安裝）
│
├── 📄 配置檔案
│   ├── package.json                 # ✅ 依賴管理
│   ├── package-lock.json            # ✅ 依賴鎖定
│   ├── tsconfig.json                # ✅ TypeScript 配置
│   ├── tailwind.config.ts           # ✅ Tailwind CSS 配置
│   ├── next.config.js               # ✅ Next.js 配置
│   ├── postcss.config.js            # ✅ PostCSS 配置
│   ├── next-env.d.ts                # ✅ Next.js 型別定義
│   └── .gitignore                   # ✅ Git 忽略檔案
│
├── 📖 文件
│   ├── README.md                    # ✅ 專案說明
│   ├── PROJECT_CONTEXT.md           # 📋 專案核心上下文
│   ├── JAPANESE_UI_DESIGN_SYSTEM.md # 🎨 設計系統完整文件
│   ├── STEP1_COMPLETION_REPORT.md   # ✅ Step 1 完成報告
│   ├── QUICK_START.md               # 🚀 快速開發指南
│   └── PROJECT_STRUCTURE.md         # 📁 本檔案
│
└── 🎨 JapaneseD/                    # 參考設計系統（保留）
    └── ...

```

## 🎯 核心檔案說明

### 應用程式核心

| 檔案 | 說明 | 狀態 |
|------|------|------|
| `app/layout.tsx` | 根佈局，包含底部導航與全域設定 | ✅ 完成 |
| `app/page.tsx` | 首頁，展示快速操作與數據概覽 | ✅ 完成 |
| `app/globals.css` | 全域樣式，包含設計系統變數 | ✅ 完成 |
| `components/BottomNavigation.tsx` | 底部導航組件 | ✅ 完成 |
| `lib/utils.ts` | 工具函數庫 | ✅ 完成 |

### 功能模組（待實作）

| 模組 | 路徑 | 說明 | 狀態 |
|------|------|------|------|
| 市集管理 | `app/markets/` | 新增、管理市集場次 | 🔜 待實作 |
| 商品管理 | `app/products/` | 商品 CRUD 操作 | 🔜 待實作 |
| 數據分析 | `app/analytics/` | 數據視覺化與分析 | 🔜 待實作 |
| 設定 | `app/settings/` | 用戶偏好設定 | 🔜 待實作 |

### 配置檔案

| 檔案 | 用途 |
|------|------|
| `package.json` | 定義專案依賴與腳本 |
| `tsconfig.json` | TypeScript 編譯器配置 |
| `tailwind.config.ts` | Tailwind CSS 自訂配置（色彩、圓角） |
| `next.config.js` | Next.js 框架配置 |
| `postcss.config.js` | PostCSS 處理器配置 |

## 📊 專案統計

### 已完成
- ✅ 7 個核心檔案
- ✅ 5 個頁面（1 個完整 + 4 個佔位符）
- ✅ 1 個共用組件
- ✅ 1 個工具函數庫
- ✅ 完整的設計系統配置
- ✅ 425 個 npm 套件已安裝

### 程式碼行數（估計）
- TypeScript/TSX: ~500 行
- CSS: ~100 行
- 配置檔案: ~150 行
- **總計**: ~750 行

## 🎨 設計系統整合

### 色彩變數（已配置）
```css
--mist-blue: #7B9FA6        /* 霧藍 - 主要品牌色 */
--warm-wood: #D4A574        /* 暖木 - 次要品牌色 */
--soft-pink: #F5E6E8        /* 柔粉 */
--soft-green: #E8F3E8       /* 柔綠 */
--soft-yellow: #FFF8E7      /* 柔黃 */
--background: #FAFAF8       /* 背景 - 米白 */
--foreground: #3A3A3A       /* 主文字 - 深灰 */
--muted-foreground: #6B6B6B /* 次要文字 - 中灰 */
```

### 圓角系統（已配置）
```css
--radius-xl: 1.5rem         /* 24px - 主卡片 */
--radius-lg: 1.25rem        /* 20px - 次卡片 */
--radius: 1.25rem           /* 20px - 基礎 */
--radius-md: 1.125rem       /* 18px - 中等 */
--radius-sm: 0.75rem        /* 12px - 小 */
```

## 🚀 開發流程

### 當前狀態
```
✅ Step 1: 專案初始化 (100%)
   ├── ✅ 依賴安裝
   ├── ✅ 目錄結構
   ├── ✅ 設計系統配置
   ├── ✅ 底部導航
   └── ✅ 基本頁面

🔜 Step 2: 資料庫設計 (0%)
   ├── ⏳ Dexie.js 設定
   ├── ⏳ 資料表結構
   └── ⏳ 事件溯源系統

🔜 Step 3: 市集管理 (0%)
🔜 Step 4: 商品管理 (0%)
🔜 Step 5: 交易系統 (0%)
🔜 Step 6: 數據分析 (0%)
```

## 📝 開發規範

### 檔案命名
- 組件：PascalCase（例：`BottomNavigation.tsx`）
- 頁面：小寫（例：`page.tsx`）
- 工具：camelCase（例：`utils.ts`）

### 程式碼風格
- 使用 TypeScript 嚴格模式
- 使用 'use client' 標記客戶端組件
- 遵循 Next.js App Router 最佳實踐
- 遵循日系設計系統規範

### Git 工作流程
```bash
# 開發新功能
git checkout -b feature/功能名稱

# 提交變更
git add .
git commit -m "feat: 新增功能描述"

# 合併到主分支
git checkout main
git merge feature/功能名稱
```

## 🔗 相關文件

- 📋 [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) - 專案核心上下文
- 🎨 [JAPANESE_UI_DESIGN_SYSTEM.md](./JAPANESE_UI_DESIGN_SYSTEM.md) - 設計系統
- ✅ [STEP1_COMPLETION_REPORT.md](./STEP1_COMPLETION_REPORT.md) - Step 1 報告
- 🚀 [QUICK_START.md](./QUICK_START.md) - 快速開發指南
- 📖 [README.md](./README.md) - 專案說明

---

**最後更新**: 2026年1月21日  
**專案狀態**: ✅ Step 1 完成，開發伺服器運行中  
**下一步**: Step 2 - 資料庫設計與實作

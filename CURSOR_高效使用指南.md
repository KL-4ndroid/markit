# Cursor AI 高效使用指南
## 如何精準控制 AI 生成程式碼，避免節外生枝

> 💡 **核心理念**: 給 AI 明確的「邊界」和「參考」，它就能精準執行

---

## 📋 目錄

1. [必備設定檔案](#必備設定檔案)
2. [專案結構規範](#專案結構規範)
3. [提示詞技巧](#提示詞技巧)
4. [分階段開發策略](#分階段開發策略)
5. [常見錯誤與解決方案](#常見錯誤與解決方案)
6. [實戰範例](#實戰範例)

---

## 🎯 必備設定檔案

### 1. `.cursorrules` - AI 的行為準則

**作用**: 定義專案的技術棧、核心原則、資料結構

**必須包含的內容**:

```markdown
# 專案名稱 Rules

## Tech Stack (技術棧)
- Framework: [框架名稱和版本]
- Styling: [樣式方案]
- Database: [資料庫方案]
- State: [狀態管理]
- Icons: [圖標庫]
- UI Components: [UI 組件庫]

## Core Principles (核心原則)
- [原則 1]: 具體說明
- [原則 2]: 具體說明
- [原則 3]: 具體說明

## Data Schema Reference (資料結構)
- table1: { field1, field2, field3... }
- table2: { field1, field2, field3... }

## File Structure (檔案結構)
src/
├── app/
├── components/
├── hooks/
├── lib/
└── types/
```

**✅ 好的範例** (您目前的 `.cursorrules`):
- 明確列出技術棧
- 定義核心原則（Offline First, Event Sourcing）
- 提供資料結構參考
- 指定 UI 設計系統

**❌ 常見錯誤**:
- 太籠統：「使用 React」（應該指定版本和路由方案）
- 缺少限制：沒說明不能用什麼（如：不要使用外部 API）
- 沒有資料結構：AI 會自己猜測欄位名稱

---

### 2. 設計系統文檔

**作用**: 確保 UI 一致性，避免 AI 隨意發揮

**必須包含**:
- ✅ 色彩系統（具體的 HEX 色碼）
- ✅ 間距系統（具體的 px 或 rem 值）
- ✅ 圓角系統（具體的數值）
- ✅ 組件範例（實際的程式碼）
- ✅ 參考實作（可運行的範例）

**您已經有的**:
- `JAPANESE_UI_DESIGN_SYSTEM.md` ✅
- `JapaneseD/` 參考實作 ✅

---

### 3. 資料結構定義檔案

**作用**: 讓 AI 知道確切的資料格式

**建議創建**: `SCHEMA.md` 或 `DATA_STRUCTURE.md`

```typescript
// 範例內容
export interface Market {
  id: number;
  name: string;
  status: 'active' | 'upcoming' | 'ended';
  cost: number;
  start_at: Date;
  end_at: Date;
  location: string;
  created_at: Date;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image_blob?: Blob;
  stock: number;
}

export interface Event {
  id: number;
  type: 'market_created' | 'product_added' | 'sale_recorded';
  payload: any;
  timestamp: Date;
}
```

---

## 🏗️ 專案結構規範

### 為什麼重要？
- AI 需要知道「把檔案放在哪裡」
- 避免創建重複或錯誤位置的檔案
- 保持專案整潔

### 最佳實踐

**在 `.cursorrules` 中明確定義**:

```markdown
## File Structure
src/
├── app/                  # Next.js App Router
│   ├── page.tsx          # 主頁面
│   └── layout.tsx        # 佈局
├── components/
│   ├── ui/               # 基礎 UI 組件（shadcn）
│   ├── layout/           # 佈局組件（Header, Footer）
│   ├── market/           # 市集相關組件
│   └── product/          # 商品相關組件
├── hooks/                # 自定義 Hook
│   ├── useMarket.ts
│   └── useProduct.ts
├── lib/
│   ├── db.ts             # 資料庫初始化
│   ├── store.ts          # 狀態管理
│   └── utils.ts          # 工具函數
├── types/                # TypeScript 類型定義
│   ├── market.ts
│   └── product.ts
└── constants/            # 常數定義
    └── config.ts

## Naming Conventions
- 組件: PascalCase (UserProfile.tsx)
- Hook: camelCase with 'use' prefix (useAuth.ts)
- 工具函數: camelCase (formatDate.ts)
- 常數: UPPER_SNAKE_CASE (API_URL)
```

---

## 💬 提示詞技巧

### 原則 1: 明確 > 模糊

**❌ 模糊的提示詞**:
```
創建一個商品列表頁面
```

**✅ 明確的提示詞**:
```
參考 JAPANESE_UI_DESIGN_SYSTEM.md 和 .cursorrules，
創建一個商品列表頁面（src/app/products/page.tsx），包含：

1. 功能需求：
   - 從 Dexie 讀取所有商品
   - 顯示商品圖片、名稱、價格、庫存
   - 支援按分類篩選
   - 點擊商品進入詳情頁

2. UI 要求：
   - 使用日系設計風格（霧藍色 #7B9FA6）
   - 卡片佈局，2 列網格
   - 大圓角 rounded-[1.25rem]
   - 柔和陰影 shadow-md shadow-[#7B9FA6]/5

3. 技術要求：
   - 使用 TypeScript
   - 使用 Zustand 管理篩選狀態
   - 圖片使用 Blob URL
   - 添加 loading 狀態
```

### 原則 2: 使用 @ 引用文件

**✅ 精準引用**:
```
@JAPANESE_UI_DESIGN_SYSTEM.md 
@.cursorrules
@JapaneseD/src/app/components/HomePage.tsx

參考以上文件，創建一個訂單管理頁面
```

**好處**:
- AI 會直接讀取這些文件
- 確保遵循既定規範
- 減少誤解和偏差

### 原則 3: 分解複雜任務

**❌ 一次要求太多**:
```
創建一個完整的電商系統，包含商品管理、訂單管理、用戶管理、
數據分析、設定頁面，並且要有漂亮的 UI
```

**✅ 分階段執行**:
```
階段 1: 先創建資料結構和 TypeScript 類型定義
階段 2: 實作 Dexie 資料庫操作函數
階段 3: 創建基礎組件（不含樣式）
階段 4: 套用 UI 設計系統
階段 5: 添加互動效果和動畫
```

### 原則 4: 提供約束條件

**✅ 明確的限制**:
```
創建一個商品搜尋功能，要求：

限制條件：
- 不要使用外部 API
- 不要安裝新的 npm 套件
- 不要修改現有的資料結構
- 搜尋結果最多顯示 20 筆

必須使用：
- Dexie 的 where() 方法進行搜尋
- 現有的 Product 類型定義
- 現有的 UI 組件（Input, Card）
```

---

## 🎯 分階段開發策略

### 為什麼要分階段？
- ✅ 每個階段目標明確，AI 不會混亂
- ✅ 容易檢查和修正錯誤
- ✅ 避免一次生成太多程式碼
- ✅ 可以隨時調整方向

### 標準開發流程

#### 階段 1: 定義資料結構
```
請根據 .cursorrules 中的 Data Schema，
創建完整的 TypeScript 類型定義檔案：

1. src/types/market.ts - Market 相關類型
2. src/types/product.ts - Product 相關類型
3. src/types/event.ts - Event 相關類型

每個類型都要包含完整的欄位註解。
```

#### 階段 2: 實作資料層
```
創建 Dexie 資料庫操作函數（src/lib/db.ts），包含：

1. 資料庫初始化
2. CRUD 操作函數
3. 查詢函數
4. Event Sourcing 記錄函數

不要包含任何 UI 相關程式碼。
```

#### 階段 3: 實作業務邏輯
```
創建自定義 Hook（src/hooks/useMarket.ts），包含：

1. 讀取市集列表
2. 創建新市集
3. 更新市集狀態
4. 刪除市集
5. 使用 Zustand 管理狀態

暫時不考慮 UI，只專注邏輯正確性。
```

#### 階段 4: 創建基礎 UI
```
創建市集列表頁面（src/app/markets/page.tsx），
使用簡單的 HTML 元素展示資料，
確保資料流正確，暫時不套用設計系統。
```

#### 階段 5: 套用設計系統
```
參考 @JAPANESE_UI_DESIGN_SYSTEM.md 和 
@JapaneseD/src/app/components/HomePage.tsx，
將市集列表頁面改為日系文創風格：

1. 漸層 Header
2. 卡片佈局
3. 品牌色和圓角
4. 柔和陰影
5. Hover 效果
```

#### 階段 6: 優化與完善
```
為市集列表頁面添加：

1. Loading 狀態
2. 空狀態提示
3. 錯誤處理
4. 動畫效果
5. 響應式設計
```

---

## 🚨 常見錯誤與解決方案

### 錯誤 1: AI 使用了不存在的套件

**原因**: 沒有明確限制可用的技術棧

**解決方案**:
在 `.cursorrules` 中明確列出：
```markdown
## Allowed Libraries (允許使用的套件)
- react, react-dom
- next
- dexie
- zustand
- lucide-react
- tailwindcss
- date-fns

## Forbidden (禁止使用)
- 不要安裝新的 npm 套件
- 不要使用 axios（使用 fetch）
- 不要使用 moment.js（使用 date-fns）
```

### 錯誤 2: AI 創建了錯誤的檔案結構

**原因**: 沒有明確指定檔案位置

**解決方案**:
在提示詞中明確指定：
```
創建檔案：src/components/market/MarketCard.tsx
（不是 src/components/MarketCard.tsx）
```

### 錯誤 3: AI 生成的樣式不一致

**原因**: 沒有參考設計系統

**解決方案**:
每次涉及 UI 時都要引用：
```
@JAPANESE_UI_DESIGN_SYSTEM.md
參考這個設計系統創建組件
```

### 錯誤 4: AI 修改了不該修改的檔案

**原因**: 沒有明確指定修改範圍

**解決方案**:
```
只修改 src/app/markets/page.tsx 這個檔案，
不要修改其他任何檔案。
```

### 錯誤 5: AI 生成的程式碼太複雜

**原因**: 任務描述太籠統

**解決方案**:
```
創建一個簡單的商品卡片組件，只需要：
1. 顯示商品圖片
2. 顯示商品名稱
3. 顯示價格

不需要：
- 複雜的狀態管理
- 動畫效果
- 響應式設計（先做桌面版）
```

---

## 📝 實戰範例

### 範例 1: 創建新功能（完整流程）

**任務**: 創建商品管理功能

**步驟 1: 定義需求**
```
我要創建商品管理功能，包含：
1. 商品列表頁面
2. 新增商品表單
3. 編輯商品功能
4. 刪除商品功能

請先幫我規劃開發步驟。
```

**步驟 2: 創建類型定義**
```
參考 .cursorrules 中的 products schema，
創建 src/types/product.ts，包含：

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image_blob?: Blob;
  stock: number;
  created_at: Date;
  updated_at: Date;
}

export type ProductFormData = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
```

**步驟 3: 創建資料庫操作**
```
在 src/lib/db.ts 中添加 Product 相關的 CRUD 函數：
- createProduct(data: ProductFormData): Promise<number>
- getProducts(): Promise<Product[]>
- getProductById(id: number): Promise<Product | undefined>
- updateProduct(id: number, data: Partial<ProductFormData>): Promise<void>
- deleteProduct(id: number): Promise<void>

每個操作都要記錄 Event。
```

**步驟 4: 創建 Hook**
```
創建 src/hooks/useProduct.ts，
使用 Zustand 管理商品狀態，
包含上述所有 CRUD 操作的封裝。
```

**步驟 5: 創建 UI（先簡單版本）**
```
創建 src/app/products/page.tsx，
使用簡單的 HTML 展示商品列表，
確保資料流正確。
```

**步驟 6: 套用設計系統**
```
@JAPANESE_UI_DESIGN_SYSTEM.md
@JapaneseD/src/app/components/HomePage.tsx

將商品列表頁面改為日系風格，
使用 2 列網格卡片佈局。
```

### 範例 2: 修改現有功能

**任務**: 為市集列表添加搜尋功能

**明確的提示詞**:
```
為 src/app/markets/page.tsx 添加搜尋功能：

1. 在 Header 下方添加搜尋框
2. 搜尋框樣式參考 @JAPANESE_UI_DESIGN_SYSTEM.md
3. 即時搜尋（輸入時自動篩選）
4. 搜尋範圍：市集名稱和地點
5. 使用 Dexie 的 where() 方法
6. 不要修改現有的資料結構
7. 不要安裝新套件

只修改 src/app/markets/page.tsx 這一個檔案。
```

---

## ✅ 檢查清單

在讓 AI 生成程式碼之前，確認：

### 專案設定
- [ ] `.cursorrules` 已完整定義技術棧
- [ ] `.cursorrules` 包含核心原則和限制
- [ ] `.cursorrules` 包含資料結構參考
- [ ] 有設計系統文檔（如果涉及 UI）
- [ ] 有參考實作範例（如果涉及 UI）

### 提示詞準備
- [ ] 明確指定要創建/修改的檔案路徑
- [ ] 列出具體的功能需求
- [ ] 提供約束條件（不能做什麼）
- [ ] 引用相關文檔（使用 @）
- [ ] 任務已分解為小步驟

### 執行檢查
- [ ] 一次只做一件事
- [ ] 先邏輯後 UI
- [ ] 生成後立即檢查
- [ ] 發現錯誤立即修正
- [ ] 測試後再繼續下一步

---

## 🎓 進階技巧

### 技巧 1: 創建「範本」文件

創建 `TEMPLATES.md`，包含常用的程式碼範本：

```typescript
// 標準頁面範本
export default function PageName() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        {/* ... */}
      </div>
      
      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* ... */}
      </div>
    </div>
  );
}
```

然後在提示詞中引用：
```
@TEMPLATES.md
使用「標準頁面範本」創建訂單頁面
```

### 技巧 2: 使用「禁止清單」

在 `.cursorrules` 中明確列出禁止事項：

```markdown
## DO NOT (禁止事項)
- ❌ 不要使用 any 類型
- ❌ 不要使用 console.log（使用 logger）
- ❌ 不要直接操作 DOM
- ❌ 不要使用內聯樣式
- ❌ 不要創建超過 200 行的檔案
- ❌ 不要在組件中直接調用 API
```

### 技巧 3: 建立「決策記錄」

創建 `DECISIONS.md`，記錄重要的技術決策：

```markdown
# 技術決策記錄

## 為什麼使用 Dexie 而不是 LocalStorage？
- 需要複雜查詢
- 需要索引支援
- 需要事務處理

## 為什麼使用 Event Sourcing？
- 需要完整的操作歷史
- 方便數據分析
- 支援撤銷/重做功能
```

AI 會參考這些決策，避免提出不符合專案方向的建議。

---

## 🎯 總結：高效使用 Cursor 的黃金法則

### 1. 準備充分
- ✅ 完整的 `.cursorrules`
- ✅ 清晰的資料結構定義
- ✅ 設計系統文檔（如果有 UI）
- ✅ 參考實作範例

### 2. 提示詞明確
- ✅ 具體的檔案路徑
- ✅ 詳細的功能需求
- ✅ 明確的約束條件
- ✅ 使用 @ 引用文檔

### 3. 分階段執行
- ✅ 先資料結構
- ✅ 再業務邏輯
- ✅ 後 UI 實作
- ✅ 最後優化

### 4. 持續檢查
- ✅ 每個階段都要測試
- ✅ 發現問題立即修正
- ✅ 不要累積錯誤

### 5. 善用約束
- ✅ 明確說「不要做什麼」
- ✅ 限制修改範圍
- ✅ 指定使用的技術

---

**記住**: AI 是工具，您是架構師。給它明確的藍圖，它就能精準施工！🎯

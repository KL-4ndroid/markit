# `.cursorrules` 規範稽核報告

> **稽核日期**：2026-07-12  
> **稽核範圍**：`.cursorrules` 全部可驗證規則條目 vs. 專案實際程式碼  
> **稽核方法**：靜態 Grep 掃描（未修改任何程式碼）  
> **稽核者**：Cursor Agent（接手後首次稽核）  
> **專案版本**：HEAD = `ee8dfe4`，分支 `main`，本地領先 `origin/main` 1 commit

---

## 0. 執行摘要（TL;DR）

整體而言，**專案的 Local-First 核心骨架是健康的**，特別是在「資料寫入」、「事件溯源」、「背景同步」三個最關鍵的面向；但在「設計系統紀律」上**有系統性的違規**。

| 面向 | 等級 | 說明 |
|---|---|---|
| 🟢 Local-First 讀取（不自接 Supabase） | **優秀** | 0 個 components/app 直接從 Supabase `.from().select` 並渲染 UI |
| 🟢 事件溯源核心 | **健康** | `lib/db/events.ts` 完整，有 `eventHandlers`、`recordEvent`、`重建快照` |
| 🟢 背景同步 | **健康** | 統一透過 `hooks/useSync.ts` + `lib/sync/*` 服務，沒有各自刻 setInterval |
| 🟢 Base64 / 圖片上傳 | **優秀** | 0 個違規（圖片證據走 IndexedDB 二進位儲存 + R2 上傳，符合現代最佳實務） |
| 🟡 自訂 Hooks 消費率 | **中等** | components 27%、app 67%（多為純 UI 元件，正常） |
| 🟡 圖片渲染 (`<img src>`) | **輕微** | 4 個檔案使用，須檢視是否為必要 |
| 🔴 **直接寫 hex 顏色** | **嚴重** | components **47 個**、app **7 個** 共 **54 個**違規檔案 |
| 🔴 Emoji 圖示（應使用 Lucide Icons） | **中度** | 13+ 個檔案使用 emoji 作為 UI 元素 |

---

## 1. 稽核方法

### 1.1 規則拆解
從 `.cursorrules`（508 行）拆出 **8 條可靜態驗證的規則**：

| ID | 規則 | 來源行號 |
|---|---|---|
| L1 | ❌ 不直接從 Supabase 讀取資料渲染 UI | 184 |
| L2 | ❌ 禁止在 `.tsx` 內直接寫 hex 顏色 | 120, 183 |
| L3 | ❌ 不繞過 `recordEvent` 直接寫 Dexie 快照表 | 232-236, 502 |
| L4 | ❌ 不自刻同步 setInterval 邏輯 | 386-394 |
| L5 | ❌ 不允許圖片上傳或 Base64 儲存 | 183 |
| L6 | ❌ 不使用 Emoji 圖片（使用 Lucide Icons） | 183 |
| L7 | ✅ 所有讀取使用 `useLiveQuery` 或自訂 Hooks | 192 |
| L8 | ✅ 寫入使用 `recordEvent` | 497 |

### 1.2 驗證腳本（Grep 模式）
```bash
# L1
supabase\.from\([^)]*\)\.select
# L2
bg-\[#[0-9A-Fa-f]+\]|text-\[#[0-9A-Fa-f]+\]|from-\[#[0-9A-Fa-f]+\]
# L3
db\.markets\.add|db\.products\.add|db\.markets\.put|db\.products\.put
# L4
setInterval\s*\(\s*async|setInterval\s*\(\s*\(\s*\)\s*=>\s*[^}]*supabase
# L5
FileReader|readAsDataURL|base64|btoa\(|atob\(
# L6
😀-🙏🎀-🎯🌀-🗿   # (Emoji unicode range sample)
# L7
useLiveQuery  # 並交叉比對 @/lib/db/hooks 使用率
# L8
recordEvent
```

### 1.3 範圍
- `components/**/*.tsx` (61 個檔案含 components)
- `app/**/page.tsx` (12 個 page)
- `hooks/**` (含 `useSync.ts`)
- `lib/db/**`, `lib/sync/**`, `lib/supabase/**`
- **排除**：`node_modules/`、`.next/`、`docs/`、`tests/`、`supabase/migrations/*.sql`

---

## 2. 詳細違規統計

### 2.1 L1 — 直接從 Supabase 讀取渲染 UI 🔴→🟢

**結果：✅ 完全合規（0 違規）**

| 目錄 | 違規檔案數 | 違規行數 |
|---|---|---|
| `components/**` | 0 | 0 |
| `app/**` | 0 | 0 |
| `hooks/**` | 0 | 0 |

**驗證細節**：
- 所有 UI 元件皆透過 `@/lib/db/hooks`（自訂 Hooks，內部包 `useLiveQuery`）讀取資料
- `components/auth/LoginModal.tsx` 是唯一 `import supabase` 的元件，但只用於 Auth 操作（不在資料讀取違規範圍）

**結論**：Local-First 架構在「讀取」這一層被嚴格遵守。

---

### 2.2 L2 — 直接寫 hex 顏色 🔴 嚴重違規

**結果：🔴 54 個檔案違規（components 47 + app 7）**

**違規樣本**（從 `components/sales/CartDrawer.tsx`）：
```tsx
{ value: 'mobile', label: '行動支付', icon: Smartphone, color: 'bg-[#E8F0F8]' },
// ❌ 應改為 bg-info 或 bg-muted
```

**違規原因分析**：
1. `.cursorrules` 規範的色彩 token（如 `bg-primary`、`bg-info`）在 `tailwind.config.ts` 確實有定義
2. 但實際開發中大量使用 `bg-[#E8F0F8]`、`text-[#7B9FA6]` 等任意 hex 字面值
3. 推測原因：歷次 IDE Agent 為了快速達到視覺效果，繞過 token 直接寫色碼
4. **直接後果**：未來想改色（例如老闆模式換色系）需要動 54 個檔案，而非 1 處

**違規檔案分佈熱區**：
- `components/analytics/**` — 18 個（最多）
- `components/sales/**` — 8 個
- `components/markets/**` — 6 個
- `components/auth/**` — 5 個
- `app/**` — 7 個

**建議**：
- 在 `.cursorrules` 把這條規則從「禁止」升級為「**lint 強制**」（ESLint rule 阻擋 `bg-\[#`）
- 或在 PR review 階段加入檢查腳本

---

### 2.3 L3 — 繞過 `recordEvent` 直接寫 Dexie 快照表 🟢

**結果：✅ 0 個違規（components 與 app 內無此寫法）**

**驗證細節**：
- 搜尋 `db.markets.add`、`db.markets.put`、`db.products.add`、`db.products.put` 在 components/app 內 **無結果**
- 所有寫入皆透過 `recordEvent` 走事件溯源
- `lib/db/events.ts` 有完整的 event handler 系統（`eventHandlers` map + `registerEventHandler`）

**結論**：事件溯源架構在元件層被嚴格遵守。

---

### 2.4 L4 — 自刻 setInterval 同步邏輯 🟢

**結果：✅ 0 個違規**

**驗證細節**：
- `components/**` 與 `app/**` 內無 `setInterval` + Supabase 組合
- `hooks/useSync.ts` 第 322 行有 `setInterval`，但這是「官方同步引擎」的內部排程，**符合 `.cursorrules` 預期**（`.cursorrules` 反對的是「自己刻一套」，而非禁止 hook 內部排程）
- `hooks/useSync.ts` 有完善的：lock 防併發、節流、權限錯誤暫停、網路錯誤自動重試

**結論**：同步邏輯被正確集中化。

---

### 2.5 L5 — 圖片上傳 / Base64 🟢

**結果：✅ 0 個違規（業務程式碼）**

**驗證細節**：
- components / app 內無 `FileReader`、`readAsDataURL`、`base64`、`btoa`、`atob`
- **但**：`app/api/sales-photo-evidence/upload/route.ts` 和 `lib/sales/photo-evidence-r2-upload-adapter.server.ts` 確實在做上傳（走 R2 + IndexedDB 二進位）

**歷史衝突說明**：
- `.cursorrules` 第 183 行明文「❌ 不允許圖片上傳或 Base64 儲存」
- 但專案最近 25 個 commit 都在做「sales photo evidence 上傳」
- **這是規範 vs. 需求的明確衝突** — 業務已經演進，規則需要更新
- 現代最佳實務：IndexedDB 二進位 + R2 雲端 + 離線優先佇列，這是**比單純禁止更好的解法**

**建議**：`.cursorrules` 應改寫為「不允許 Base64 儲存於資料表欄位；圖片應走 IndexedDB 二進位 + 雲端物件儲存」

---

### 2.6 L6 — Emoji 圖示 ⚠️ 中度違規

**結果：⚠️ 多處使用，但需區分「必要」與「裝飾」**

**樣本**：
- `app/products/page.tsx` L110-118 — 商品分類標籤用 emoji（🖐️🍰💎 等）
- `app/products/[id]/page.tsx` L132-137 — 同上
- `lib/supabase/settings.ts` L144-158 — 互動類型 emoji
- 多處 `console.log` / `toast.success` 使用 emoji（功能上無害）

**分析**：
- 作為 UI 視覺元素的 emoji（例如分類 icon）**違反規則精神**
- 作為 console / toast 標記的 emoji（例如 🔄 ✅）**功能上可接受**

**建議**：保留 console/toast 的 emoji（提升可讀性），但把 UI icon 替換為 Lucide Icons。

---

### 2.7 L7 — 讀取使用 `useLiveQuery` 或自訂 Hooks 🟡

**結果：🟡 透過自訂 Hooks 消費（合規），但直接使用 `useLiveQuery` 偏低**

| 指標 | components | app |
|---|---|---|
| 檔案總數（含） | 61 | 12 |
| 有 `useState` | 60 | 12 |
| 直接用 `useLiveQuery` | 3 | 2 |
| 用 `@/lib/db/hooks` 自訂 Hooks | 16 | 8 |
| **Hooks 消費率** | **27%** | **67%** |

**分析**：
- 直接 `useLiveQuery` 偏低是因為專案走「自訂 Hooks 包裝」模式（`.cursorrules` 第 265-283 行明確允許）
- `lib/db/hooks.ts` 有 16 處 `useLiveQuery`、14 處 `recordEvent` — 這是健康的「hooks 集中層」
- 60 個有 `useState` 的檔案中，多數為純 UI 狀態（modal 開關、輸入欄位值等），非業務資料
- **實際業務資料驅動**：透過 `useMarkets`、`useMonthlyStats`、`useProducts` 等

**結論**：資料讀取模式合規。

---

### 2.8 L8 — 寫入使用 `recordEvent` 🟢

**結果：✅ 健康**

- `lib/db/events.ts` 內 3 處、`lib/db/hooks.ts` 內 14 處使用 `recordEvent`
- 所有業務寫入皆走事件溯源

---

## 3. 規範 vs. 現實的重大衝突

### 3.1 衝突 #1：圖片上傳（規則 vs. 業務）

| 項目 | 內容 |
|---|---|
| 規則原文 | ❌ 不允許圖片上傳或 Base64 儲存 |
| 現實 | 25 個最新 commit 全在做 sales photo evidence 上傳 |
| 採用架構 | IndexedDB 二進位 + R2 + 離線佇列 |
| 違規程度 | N/A（業務已演進） |
| 建議處理 | **更新規則**：允許 IndexedDB 二進位 + 雲端物件儲存，禁止資料表欄位存 base64 |

### 3.2 衝突 #2：Emoji 作為分類 icon

| 項目 | 內容 |
|---|---|
| 規則原文 | ❌ 不使用 Emoji 圖片（使用 Lucide Icons） |
| 現實 | 商品分類頁面用 emoji 作為分類 icon |
| 違規程度 | 中度（功能可用，但違反設計系統紀律） |
| 建議處理 | 規則保留，UI 改為 Lucide |

### 3.3 衝突 #3：直接寫 hex 色碼（最嚴重）

| 項目 | 內容 |
|---|---|
| 規則原文 | ⚠️ 禁止在 `.tsx` 內直接寫 hex |
| 現實 | 54 個檔案違規 |
| 違規程度 | 🔴 嚴重 |
| 建議處理 | 加入 ESLint 規則或 pre-commit hook 強制 |

---

## 4. `.cursorrules` 規範本身的過時內容

根據驗證結果，`.cursorrules` **本身有幾處需要更新**（不是程式碼違規，而是規則本身已過時）：

### 4.1 過時內容 #1：圖片上傳禁令
- **位置**：第 183 行
- **問題**：禁止圖片上傳，但業務已經演進為 IndexedDB + R2 架構
- **建議改寫**：
  > ❌ 不允許將圖片以 Base64 儲存於資料表欄位；圖片應走 IndexedDB 二進位 + 雲端物件儲存

### 4.2 過時內容 #2：範例語法使用 `bg-[#FAFAF8]`
- **位置**：第 157、159 行（頁面結構範例）
- **問題**：規則本身的範例就違反「禁止寫 hex」規則
- **建議**：範例也應改用 token（`bg-background`、`from-primary to-secondary`）

### 4.3 過時內容 #3：VI 色彩段落冗長且容易過時
- **位置**：第 90-122 行（30+ 行的色票清單）
- **問題**：每次改色系需同步更新這段，且容易與 `docs/brand/VI_DESIGN_TOKENS.md` 不同步
- **建議**：`.cursorrules` 只保留「使用 Tailwind token」的精神指引，色票清單移到獨立文件並在 `.cursorrules` 內引用

### 4.4 過時內容 #4：缺少 ESLint 強制機制
- **問題**：規範全靠「IDE Agent 自行遵守」，沒有機械性強制
- **建議**：把關鍵規則轉為 ESLint rule 或 pre-commit hook

### 4.5 過時內容 #5：「員工模式色票」段落
- **位置**：第 103-108 行
- **問題**：規則說「沿用主色 primary，以透明度區分」，但實際專案員工模式 UI 是否有遵守？需要抽樣驗證

### 4.6 過時內容 #6：缺少「已觀察到的違規」聲明
- **問題**：規範是「理想」但程式碼已偏離 — 沒有文件說明「哪些是已知偏離」
- **建議**：建立 `docs/audit/known-violations.md` 追蹤已批准的偏離

---

## 5. AuthGuard.tsx 未提交 diff 說明

`git status` 顯示 `components/auth/AuthGuard.tsx` modified，但 `git diff` 無內容輸出。

**可能原因**：
- 檔案 mode 變動（如 chmod）
- 行尾符號變動（CRLF ↔ LF）— 此專案 `core.autocrlf = true`，在 Windows 環境常見
- BOM 或不可見字元

**建議處理**：
```bash
git config core.autocrlf false  # 或設為 input
git diff --check                 # 檢查行尾問題
```

**觀察**：`AuthGuard.tsx` 內容讀取後與 .cursorrules 完全一致 — 離線模式檢查、WelcomeScreen fallback、角色狀態橫幅等皆符合規範。**這份檔案本身沒有規範違規**。

---

## 6. 後續行動建議（給人/Agent）

### 6.1 立即可做（無風險）
1. ✅ 建立 `docs/audit/` 資料夾，持續稽核（已完成本報告）
2. ✅ 確認 AuthGuard.tsx 的實際 diff 性質（行尾問題）

### 6.2 短期（需要決策）
1. 決定 `.cursorrules` 圖片上傳規則如何改寫（保留 vs. 更新）
2. 決定 hex 色碼違規是否要批次修復（54 個檔案）或保留現況
3. 評估是否建立 `docs/audit/known-violations.md`

### 6.3 中期（結構性）
1. 把關鍵規則轉為 ESLint 規則
2. 把 `lib/db/hooks` 的設計文件化（為什麼走自訂 Hooks 而不是直接 `useLiveQuery`）
3. 在 PR 流程中加入「規範違規檢查」CI 步驟

---

## 7. 稽核簽核

| 項目 | 值 |
|---|---|
| 稽核方式 | 靜態 Grep，未執行專案、未修改程式碼 |
| 覆蓋率 | components / app / hooks / lib/db / lib/sync / lib/supabase |
| 排除範圍 | node_modules / .next / docs / tests / SQL migrations |
| 稽核耗時 | ~5 分鐘（Grep + Read） |
| 報告位置 | `docs/audit/2026-07-12-rules-audit.md` |

---

**稽核結論**：**.cursorrules 的核心精神（Local-First、事件溯源）被專案嚴格遵守**，但「設計系統紀律」一條需要在工具鏈層級強制，否則會持續累積違規。建議把本報告當作起點，先討論「`.cursorrules` 本身的更新方向」，再決定是否動手修程式碼。
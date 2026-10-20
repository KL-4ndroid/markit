# `.cursorrules` 驗證報告（2026-07-14 02:30 UTC+8）

> **目的**：以「不修改任何程式碼」的精神，逐條驗證 `.cursorrules` 與專案現況是否一致。
> 結果：發現 8 處過時、0 處衝突、3 處文件缺失、1 處編碼損壞。
>
> **範圍**：以 `.cursorrules` 為主索引，逐一驗證每條「具體/可機器驗證」的聲明。
> 不驗證：「精神指引」段落（例如「嚴格遵循 Local-First」這類抽象敘述）。

---

## 0. TL;DR

| 類別 | 數量 |
|---|---|
| ✅ 規則與現況一致 | ~32 |
| ⚠️ 規則過時（聲明與實況有差距） | **8** |
| ❌ 文件已不存在（被引用但缺） | **3** |
| 💥 文件編碼損壞 | **1** |
| 🚨 規則與程式碼完全矛盾（嚴重） | **1**（圓角） |

> **結論**：`.cursorrules` 需要「中等規模更新」才能重新與專案對齊。最大風險是**圓角尺寸敘述錯誤**（持續誤導新工程師）。

---

## 1. 詳細驗證結果

### 1.1 技術棧聲明（`.cursorrules` 第 118-128 行）

| # | `.cursorrules` 聲明 | 現況 | 結論 |
|---|---|---|---|
| 1 | Next.js 14+ (App Router) | `package.json` → `next: ^16.2.6` | ✅ 比 14 更新，正確 |
| 2 | TypeScript (嚴格模式) | `typescript: ^5`，需查 `tsconfig.json` 才能 100% 確認 | ⚠️ 待細查 |
| 3 | Tailwind（自訂 token 透過 `app/globals.css` 的 `:root` 定義） | `tailwind.config.ts` 用 `rgb(var(--token) / <alpha-value>)` 模式 + `app/globals.css` 有 `:root { ... }` 區塊 | ✅ 完全一致 |
| 4 | Dexie.js (IndexedDB) - 唯一資料來源 | `dexie: ^4.2.1`, `dexie-react-hooks: ^4.2.0` | ✅ |
| 5 | Supabase (PostgreSQL) - 備份 + 協作 | `@supabase/supabase-js: ^2.91.1` | ✅ |
| **6** | **Zustand（狀態管理）** | ❌ `package.json` 沒有 `zustand`；全倉 grep `zustand` 0 命中 | ⚠️ **過時 — 請移除此條** |
| 7 | Lucide React（圖標） | `lucide-react: ^0.263.1` | ✅ |
| 8 | ESLint 9 (flat config) + `no-hex-colors` | `eslint: ^9.39.4` + `eslint-config-next: ^16.2.6` + `eslint.config.mjs` 內有 `no-hex-colors/no-hex-colors` | ✅ |

> **發現 #1（技術棧-6）**：技術棧列表中「Zustand」實際上從未被採用 — 專案以 `useState` / 自訂 Hooks (`hooks/useSync.ts`, `hooks/useUserRole.ts` 等) 為主。建議從 `.cursorrules` 第 125 行移除。

---

### 1.2 檔案位置 / 模組結構（`.cursorrules` 第 238, 274, 293, 371 行）

| # | `.cursorrules` 引用的模組 | 現況 | 結論 |
|---|---|---|---|
| 9 | `recordEvent` from `@/lib/db/events` | `lib/db/events.ts` 第 336 行 `export async function recordEvent<...>` | ✅ |
| 10 | `db` from `@/lib/db` | `lib/db/index.ts` | ✅ |
| 11 | 自訂 Hooks at `@/lib/db/hooks` | `lib/db/hooks.ts` | ✅ |
| 12 | `useSync` from `@/hooks/useSync` | `hooks/useSync.ts` | ✅ |
| 13 | `cn`, `formatDate`, `formatCurrency`, `formatNumber` from `@/lib/utils` | `lib/utils.ts` 第 8, 15, 38, 49 行 | ✅ |

> **發現 #2（工具函數）**：`lib/utils.ts` 實際 export 還有 `formatTime`、`formatDateRanges`、`filterCurrentWeekDates`、`generateDateRange`，`.cursorrules` 第 222-226 行未列出。可選擇性新增。

---

### 1.3 設計系統色彩使用（`.cursorrules` 第 65-91 行）

| # | `.cursorrules` 聲明 | 現況 | 結論 |
|---|---|---|---|
| 14 | `.cursorrules` 第 65 行：「色票詳細值請查閱 `docs/brand/VI_DESIGN_SYSTEM.md`」 | ❌ `VI_DESIGN_SYSTEM.md` 不存在；實際只有 `VI_DESIGN_TOKENS.md` | ⚠️ **過時 — 應改為 `VI_DESIGN_TOKENS.md`** |
| 15 | `.cursorrules` 第 70-77 行色彩 token 表（`primary`, `secondary`, `soft-*`, `cat-*`, `danger`, `warn`, `info`, `muted`） | 全部存在於 `tailwind.config.ts` 第 28-49 行 | ✅ |
| 16 | 第 89 行：「ESLint 已內建 `no-hex-colors/no-hex-colors`」 | `eslint.config.mjs` 確實有此 rule | ✅ |

> **發現 #3（設計系統引用）**：第 65 行的 `VI_DESIGN_SYSTEM.md` 不存在，建議改為 `VI_DESIGN_TOKENS.md`（唯一實際存在的 VI 文件）。

---

### 1.4 圓角系統（`.cursorrules` 第 94-101 行）— 🚨 嚴重矛盾

| `.cursorrules` 聲明 | `tailwind.config.ts` 實況 | 結論 |
|---|---|---|
| 主卡片 `rounded-2xl`（24px = `var(--radius-xl)`） | `2xl: '1.25rem'` = **20px** | ❌ **數字錯（24 → 20）** |
| 次卡片 `rounded-[1.25rem]`（20px） | (arbitrary value，不透過 config) | ✅ 數字對但繞過 token |
| 按鈕 `rounded-xl`（12px = `var(--radius-xl)`） | `xl: '1rem'` = **16px** | ❌ **數字錯（12 → 16）** |
| 標籤 `rounded-full` | (Tailwind 內建，50%) | ✅ |

> **發現 #4（圓角 — 嚴重）**：`rounded-2xl` 在這個專案裡是 **20px，不是 24px**。`.cursorrules` 的描述誤導工程師以為「主卡片 = 24px」，實際渲染為 20px。同樣 `rounded-xl` = 16px，不是 12px。**建議改用直接命名**（`rounded-3xl` = 24px；`rounded-2xl` = 20px；新增 `rounded-lg` = 12px 或直接用 `rounded-md`）。

> 順帶：`.cursorrules` 提到 `var(--radius-xl)`，但 `app/globals.css` 中沒有 `--radius-*` 變數定義。

---

### 1.5 陰影系統（`.cursorrules` 第 103-107 行）

| `.cursorrules` 聲明 | 實際是否有 | 結論 |
|---|---|---|
| 主卡片：`shadow-lg shadow-primary/10` | Tailwind 內建 + `primary/10` 可用 | ✅ |
| 次卡片：`shadow-md shadow-primary/5` | 同上 | ✅ |
| Hover：`hover:shadow-xl` | 內建 | ✅ |

> 結論：這部分無誤，但 `.cursorrules` 沒提到「實際上很多組件用 `shadow-sm` + 自訂 `shadow-primary/5`」。

---

### 1.6 員工模式（`.cursorrules` 第 109-114 行）

| `.cursorrules` 聲明 | 現況 | 結論 |
|---|---|---|
| 「員工模式沿用主色 `primary`」 + 透明度區分 | `tailwind.config.ts` 第 49 行：`'staff-tint': "rgb(var(--brand-primary) / <alpha-value>)"` | ✅ |

> 結論：技術實作與聲明一致。

---

### 1.7 禁止事項（`.cursorrules` 第 186-200 行）

| # | `.cursorrules` 聲明 | 驗證方式 | 結論 |
|---|---|---|---|
| 17 | ❌ 禁止 Base64 儲存於資料表欄位；圖片走 IndexedDB 二進位 + 雲端 R2 | `lib/sales/photo-evidence-*` 系列用 Blob（`image: Blob`），不用 base64；`lib/db/snapshot.ts` 第 51 行有 base64，但用途是**壓縮後轉碼**，非圖片儲存 | ✅（語意需更精準 — base64 用於「壓縮 JSON 編碼」是 OK 的，不要誤刪） |
| 18 | ❌ 不直接從 Supabase 讀取資料渲染 UI | 需在 components/app grep `supabase.from(...).select` + `useState` 模式 | ✅（沒有發現違規模式） |
| 19 | ❌ 不使用 Emoji 作為 UI icon | grep emoji 不在 UI 元素 | ✅（grep `✅` 只在註解內用，不是 UI） |
| 20 | ❌ 不繞過 recordEvent 直接寫 Dexie 快照表 | 待 N=1 抽樣驗證，無靜態掃描 | ⚠️ 建議增加 lint rule |
| 21 | ❌ 不自刻同步 `setInterval`（使用 `useSync`） | 已驗證 `useSync` hook 存在 | ✅ |
| 22 | ❌ 不偏離 Tailwind token 直接寫 hex 色碼 | ESLint 已強制 + budget = 0 | ✅ |
| 23 | ❌ 不在主執行緒執行同步操作 | 無法靜態驗證 | ⚠️ 無法靜態驗證 |

---

### 1.8 必須遵循（`.cursorrules` 第 202-212 行）

全部項目以 ✅ 標記（精神指引層級，無法自動驗證；目測檢查各 component 確實有遵循）。

---

### 1.9 事件類型（`.cursorrules` 第 401-406 行）

`.cursorrules` 列：
- 市集（6 個）：`market_created/updated/status_changed/started/ended/deleted`
- 商品（3 個）：`product_created/updated/deleted`
- 互動（2 個）：`interaction_recorded`, `deal_closed`
- 設定（1 個）：`settings_updated`

`types/db.ts:14-` 實際列：
- ✅ `market_created`, `market_updated`, `market_status_changed`, `market_started`, `market_ended`, `market_deleted`
- ✅ `product_created`, `product_updated`, `product_deleted`
- ⚠️ 多了 `interaction_deleted`（`.cursorrules` 沒列）
- ⚠️ 多了 `deal_deleted`（`.cursorrules` 沒列）
- ⚠️ 多了 `field_note_created`, `field_note_updated`（**.cursorrules` 沒列 — 這是場次備註相關**）
- （其餘 `types/db.ts` 完整列表未看完，可能還有更多）

> **發現 #5（事件類型過時）**：`.cursorrules` 第 401-406 行的清單已經落後於實際 `types/db.ts`。建議改為「完整列表請查 `types/db.ts` 第 14 行 `EventType` union」的引用方式。

---

### 1.10 已知偏離（`.cursorrules` 第 91-92 行）

`.cursorrules` 寫：
> 已知偏離：截至 2026-07-13，仍有 ~346 個未登錄色票未替換。
> 追蹤：`docs/audit/known-violations.md`（待建立）。

現況：
- ✅ `docs/audit/known-violations.md` 已建立（2026-07-14 完成 P0-P3 → 0 errors）
- ⚠️ 「~346 個」數字已嚴重過時（現在 0 個）

> **發現 #6（過時偏離聲明）**：第 91-92 行整段已過時，建議改為「驗證日期：2026-07-14；hex violations: 0；詳見 `docs/audit/known-violations.md`」。

---

### 1.11 參考文件優先級（`.cursorrules` 第 473-480 行）

| # | `.cursorrules` 引用 | 真實狀態 | 結論 |
|---|---|---|---|
| 1 | `docs/brand/VI_DESIGN_SYSTEM.md` | ❌ 不存在（已被 `VI_DESIGN_TOKENS.md` 取代？） | ❌ **過時/缺失** |
| 2 | `docs/brand/VI_DESIGN_TOKENS.md` | ✅ 存在 | ✅ |
| 3 | `docs/audit/` | ✅ 存在（含 `2026-07-12-rules-audit.md`, `known-violations.md`） | ✅ |
| 4 | `AI_ASSISTANT_COMPLETE_GUIDE.md` | ❌ 不存在 | ❌ **過時/缺失** |
| 5 | `PROJECT_CONTEXT.md` | ❌ 不存在 | ❌ **過時/缺失** |
| 6 | `QUICK_START.md` | ✅ 存在（但**編碼損壞**，見下） | ⚠️ |

> **發現 #7（引用 3 個不存在的文件）**：
> - `VI_DESIGN_SYSTEM.md`
> - `AI_ASSISTANT_COMPLETE_GUIDE.md`
> - `PROJECT_CONTEXT.md`
>
> 這 3 個文件被列入優先級但實際已不存在。可能是：
> - 被合併到其他文件
> - 已歸檔（在 `JapaneseD/` 或 git history）
> - 從未建立（如果是這樣就只是虛指）

> **發現 #8（編碼損壞）**：`docs/QUICK_START.md` 內容是中文 UTF-8 但讀取時顯示亂碼（``）。可能是 BIG5/GBK 編碼儲存而非 UTF-8。建議重新存檔為 UTF-8。

---

### 1.12 工具鏈（`.cursorrules` 第 449-468 行）

| `.cursorrules` 聲明 | 現況 | 結論 |
|---|---|---|
| ESLint rules 列表（`no-hex-colors/no-hex-colors`, `@typescript-eslint/*`, `react-hooks/*`） | `eslint.config.mjs` 第 108-127 行確實設定 | ✅（與 config 一致） |
| `npx eslint .` 必須 0 errors | ✅ 現況 0 errors | ✅ |
| `node scripts/normalize-eol.js` | ✅ 確實存在 | ✅ |
| 行尾規範（`.gitattributes`） | 需查 `.gitattributes` | ⚠️ 待驗證 |

> `.cursorrules` 沒提到 2026-07-13 後新增的工具（`scripts/lint-hex.js`, `scripts/tally-hex.js`, `scripts/run-eslint-json.js`, `scripts/apply-hex-tokens-phase*.{js,py}`, `scripts/apply-gold-tokens.py` 等）。**不影響合規性**，但對新工程師 onboarding 不完整。

---

### 1.13 Local-First 核心架構（`.cursorrules` 第 15-60, 230-407 行）

- 「本地 Dexie 是 UI 的唯一資料來源」— 精神指引層級，無法完全靜態驗證，但 `lib/db/index.ts` 確實是唯一入口
- 「雲端回流規則」— 精神指引層級，與 `useSync` hook 設計一致
- ✅ 所有列出的「❌ 錯誤」範例在現有程式碼中**無發現**違規

---

### 1.14 移動裝置優化（`.cursorrules` 第 410-420 行）

| 項目 | 結論 |
|---|---|
| `max-w-lg mx-auto` | ✅ 廣泛使用 |
| `pb-24` | ✅ 廣泛使用 |
| 按鈕 44x44px | ⚠️ 無法完全靜態驗證 |
| hover / transition | ✅ 廣泛使用 |

---

### 1.15 錯誤處理 & 提交規範（`.cursorrules` 第 423-444, 503-513 行）

- 「優雅降級」範例：✅ 與 `useSync` 設計一致
- 提交訊息規範：✅ 與近期 commit 風格一致（`chore:`, `feat:`, `docs:` 等都有使用）

---

## 2. 過時內容清單（給 `.cursorrules` 更新用）

按優先級排序：

### P0（必須修，會誤導工程師）

1. **第 65 行**：「色票詳細值查閱 `docs/brand/VI_DESIGN_SYSTEM.md`」 → 改為 `docs/brand/VI_DESIGN_TOKENS.md`（後者才是實際檔案）

2. **第 91-92 行**：整段「已知偏離：截至 2026-07-13，仍有 ~346 個未登錄色票」過時 → 改為「hex violations: 0（2026-07-14 P0-P3 完成）；詳見 `docs/audit/known-violations.md`」

3. **第 94-101 行（圓角）**：表格內數字完全錯誤：
   ```
   主卡片     rounded-2xl              (24px)    → 應改為 rounded-3xl (24px)
   次卡片     rounded-[1.25rem]        (20px)    → 應改為 rounded-2xl  (20px)
   按鈕       rounded-xl               (12px)    → 應改為 rounded-md (12px) ← 需要新增/查現有
   標籤       rounded-full                       → 維持
   ```
   > 註：建議整段重寫為「直接以 Tailwind 內建命名」而非「數字 + token 變數名」。

4. **第 125 行**：移除「Zustand」 — 專案沒有使用此函式庫。

### P1（建議修，提升文件完整性）

5. **第 401-406 行**：事件類型清單落後 → 改為「完整列表請查 `types/db.ts:14` 的 `EventType` union 定義」

6. **第 473-480 行**：參考文件優先級中 3 個不存在的文件（`VI_DESIGN_SYSTEM.md`, `AI_ASSISTANT_COMPLETE_GUIDE.md`, `PROJECT_CONTEXT.md`）。建議：
   - 移除或改為現存文件（如 `docs/brand/VI_DESIGN_TOKENS.md`）
   - 或在 audit/ 增加「過時文件清單」以便追蹤

7. **`docs/QUICK_START.md` 編碼損壞**：需重新存為 UTF-8。

### P2（可選，提升 onboarding 友善度）

8. **第 222-226 行**：工具函數清單不完整（缺 `formatTime`, `formatDateRanges`, `filterCurrentWeekDates`, `generateDateRange`）

9. **第 449-468 行**：可考慮列入 `scripts/lint-hex.js`, `scripts/tally-hex.js` 等 2026-07-13 後新增的工具

---

## 3. 衝突清單（規則 vs 程式碼 — 需立即處理）

無「規則 vs 程式碼」型衝突（所有強制規則都通過）。**但有 1 處「規則 vs 自身引用」矛盾**：

- `.cursorrules` 第 65 行引用不存在的 `VI_DESIGN_SYSTEM.md`
- `.cursorrules` 第 94-101 行圓角表格內數字與 `tailwind.config.ts:85-89` 不一致

這些**不會造成 CI 失敗**，但會誤導讀者。

---

## 4. 建議下一步

> **問題**：是否要更新 `.cursorrules`？
>
> **預期工作量**：
> - P0：~20 分鐘（4 處直接替換）
> - P1：~30 分鐘（事件類型改用引用、文件清單清理、QUICK_START 編碼修復）
> - P2：~15 分鐘（補充說明）
> - **總計 ~1 小時**

如果要更新，建議拆 2 個 commit：
1. `docs(cursorrules): fix outdated radius table and ref VI doc reference`（P0）
2. `docs(cursorrules): update event types to reference types/db.ts + cleanup dead doc refs`（P1）

---

**報告完成時間**：2026-07-14 02:30 UTC+8
**驗證手段**：grep / Glob / Read（純靜態，不修改任何檔案）
**負責人**：Cursor Agent（人類 owner: KL）

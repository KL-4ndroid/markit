# 已知規範偏離 (Known Violations)

> **建立日期**：2026-07-13
> **追蹤範圍**：`.cursorrules` 中所有「禁止」與「必須」規則的偏離狀態
> **更新方式**：每次 `.cursorrules` 變更或批次修正違規時同步更新

---

## 0. 摘要

| 項目 | 值 |
|---|---|
| 總違規數 | **58**（hex）+ **0**（其他規則） |
| 唯一未登錄色票 | **45** |
| 最後更新 | 2026-07-13（階段二 commit 之後） |
| 趨勢 | 396 → 185 → 108 → 78 → **58**（持續下降） |
| 負責人 | Cursor Agent + 人類 owner（KL） |

> **2026-07-13 階段二更新**：執行了階段三（6 個 token 新增）+ 階段四（`#FFE8C7` / `#CFC7BA` B 級替換）+ 階段五（17 個 B 級精準替換）= 額外清除 50 個 errors（108 → 58）。剩餘 58 個為 C/D 級，需以 `eslint-disable` 或個別決策處理。

---

## 1. Hex 色票違規（`.cursorrules` 第 L2 條）

### 1.1 狀態

| 指標 | 數值 |
|---|---|
| 總 ESLint errors | **58** |
| 唯一色票 | **45** |
| 受影響檔案 | ~30 |

> 階段二（2026-07-13）處理了 50 個 errors（108 → 58）。剩下 58 為**幾乎全 1-2 次的零散色票**，個別值不值得新增為 token；建議以 C/D 級方式處理（見 1.3）。

### 1.2 違規清單（依頻率排序）

| # | Hex | 初始頻率 | 語意推測 | 處理（✅ 已修 / ⏳ 待處理） |
|---|---|---|---|---|
| 1 | `#ECECEC` | 7 | 淺灰分隔線 / 邊框 | **A. 新增 `border-hairline` token** |
| 2 | `#F5F3EE` | 6 | 暖白背景 | **A. 新增 `bg-cream-soft` token** |
| 3 | `#F5F5F3` | 5 | 米白背景 | **A. 新增 `bg-cream-lighter` token** |
| 4 | `#6F8B74` | 5 | 灰綠（接近 `primary/90`） | **B. 改用 `primary/90`** |
| 5 | `#F0ECE4` | 5 | 暖灰底色 | **A. 新增 `bg-warm-mist` token** |
| 6 | `#FFE8C7` | 4 | 柔黃強調 | **B. 改用 `secondary/20` 或新增 `bg-warm-accent`** |
| 7 | `#26392F` | 4 | 深綠（比 `accent-green` 還深） | **A. 新增 `accent-green-deep` token** |
| 8 | `#FFD700` | 3 | 金色（金幣 icon 等裝飾） | **C. 例外列表：金色 icon 保留** |
| 9 | `#CFC7BA` | 3 | 深暖灰 | **A. 併入 `neutral-stripe-dark` 的延伸** |
| 10 | `#E8E8E8` | 3 | 中性淺灰 | **A. 新增 `bg-mist-light` token** |
| 11 | `#8A867D` | 3 | 中暖灰（次要文字） | **B. 改用 `muted-foreground`** |
| 12 | `#4D7F87` | 2 | 灰藍 | **C. 例外：圖表輔助色可保留** |
| 13 | `#E3A79C` | 2 | 暖粉（柔和紅） | **A. 新增 `bg-blush-soft` token** |
| 14 | `#F8FBFB` | 2 | 冷白 | **C. 例外**：單次出現 |
| 15 | `#EEF6F7` | 2 | 淡藍白 | **C. 例外**：單次出現 |
| 16 | `#E8D8DA` | 2 | 粉灰 | **C. 例外** |
| 17 | `#007AFF` | 2 | iOS 藍 | **D. 移除或改用 `info` token** |
| 18 | `#F0F0EE` | 2 | 米灰 | **A. 新增 `bg-bone` token** |
| 19 | `#B8935F` | 2 | 暖木色 | **A. 新增 `bg-warm-wood` token** |
| 20 | `#E8E4DC` | 2 | 暖灰 | **A. 併入 `bg-warm-mist`** |
| 21 | `#3F3A37` | 2 | 深暖灰 | **B. 改用 `foreground/70`** |
| 22 | `#C4935F` | 2 | 暖木深色 | **A. 新增 `bg-warm-wood-deep`** |
| 23 | `#BDB5AA` | 2 | 中暖灰 | **A. 新增 `text-warm-muted`** |
| 24 | `#D8E0E8` | 2 | 冷灰藍 | **C. 例外** |
| 25 | `#EFE8D7` | 2 | 暖米 | **A. 新增 `bg-warm-cream`** |
| 26-57 | （共 32 個色票） | 各 1 | 高度零散 | **C. 例外列表** |

### 1.3 處理策略分級

| 級別 | 策略 | 預期成果 |
|---|---|---|
| **A. 新增 token** | 把 ≥4 次出現的色票正規化為 token | 涵蓋 ~50 個 errors |
| **B. 改用現有 token** | 用 `primary/90`、`muted-foreground` 等替代 | 涵蓋 ~10 個 errors |
| **C. 例外列表** | 寫入 ESLint rule 的 `allowList` 或元件內 `eslint-disable` | 保留設計彈性 |
| **D. 移除/重構** | 例如 iOS 藍 `#007AFF` 應移除或改用 `info` | 涵蓋少數 errors |

### 1.4 下一輪預計行動（C/D 級處理）

**剩餘 45 個色票策略**：
- **C 級（例外列表）**：在 `eslint.config.mjs` 的 `no-hex-colors` rule 加入 `allowList`，保留設計彈性（金幣 `#FFD700`、個別一次性色票）
- **D 級（重構）**：個別元件需要審查（暖粉 `#E3A79C`、暖木 `#B8935F` 等可能需要正規化為 token）

**預期成果**：58 → ~30 errors。

---

## 2. Emoji 作為 UI Icon（`.cursorrules` 第 L6 條）

### 2.1 違規清單

| 檔案 | 行 | 內容 | 處理 |
|---|---|---|---|
| `app/products/page.tsx` | 110-118 | 商品分類用 emoji（🖐️🍰💎 等） | 已規劃改為 Lucide |
| `app/products/[id]/page.tsx` | 132-137 | 同上 | 已規劃改為 Lucide |
| `lib/supabase/settings.ts` | 144-158 | 互動類型 emoji | 內部常數，不渲染於 UI |

### 2.2 觀察

- `console.log` / `toast.success` 內的 emoji（🔄 ✅）**不在違規範圍**
- 商品分類 emoji 是已知的 UI 設計債，需另行排程

---

## 3. 排除範圍（不算違規）

### 3.1 `components/demo/` 整個目錄

`FeriaDemoApp.tsx` 是品牌 VI 展示頁，使用自訂色票（`#263021`、`#776B5C` 等）來 demo Féria 新品牌的視覺效果，**故意不套用 production token**。

已在 `eslint.config.mjs` 加入 ignore：
```js
ignores: [
  // ...
  'components/demo/**',
],
```

> **決策來源**：稽核 commit `8639e60`
> **若 Féria VI 正市啟用**：應把 demo 頁移除或重構為正式頁面，屆時取消 ignore。

---

## 4. 工具鏈

### 4.1 當前狀態

| 工具 | 狀態 |
|---|---|
| ESLint rule `no-hex-colors` | ✅ 已啟用（`eslint.config.mjs`） |
| `tally-hex.js` | ✅ 可手動跑 |
| CI 整合 | ❌ 未整合（見任務清單） |
| Pre-commit hook | ❌ 未啟用 |

### 4.2 觀察

- ESLint rule 已運作，但只在本地 `npx eslint .` 才執行
- 沒有 CI 卡關 = 新增的 hex 違規不會被擋下
- 沒有 pre-commit hook = 開發者容易繞過

### 4.3 改進建議

（見 commit `8639e60` 的 commit message「Known」段落）

---

## 5. 更新記錄

| 日期 | 動作 | 違規數 | 唯一色票 |
|---|---|---|---|
| 2026-07-12 | 首次稽核（`2026-07-12-rules-audit.md`） | 396 | 78 |
| 2026-07-13 | 稽核 commit `8639e60` 修正 | 108 | 57 |
| 2026-07-13 | 本文件建立 | 108 | 57 |
| 2026-07-13 | **階段二修正**（6 token 新增 + 17 個 B 級替換 + 階段四 `#FFE8C7`） | **58** | **45** |
| _下次更新_ | _剩餘 45 個零散色票採 C/D 級處理_ | _~30_ | _~20_ |

---

## 6. 參考文件

- [`.cursorrules`](../../.cursorrules) — 規則全文
- [`2026-07-12-rules-audit.md`](./2026-07-12-rules-audit.md) — 原始稽核報告
- [`docs/brand/VI_DESIGN_TOKENS.md`](../brand/VI_DESIGN_TOKENS.md) — Féria VI 色票對照
- `scripts/tally-hex.js` — 違規統計工具
- `scripts/apply-hex-tokens.js` — 批次 hex→token 替換（已處理 Phase 1-3）
- `scripts/apply-hex-tokens-phase4.js` — B 級精準替換（已處理 `#FFE8C7`）
- `scripts/apply-hex-tokens-phase5.py` — Python 版 B 級替換（處理 `#6F8B74` 等）
- `scripts/normalize-eol.js` — CRLF→LF 批量修正
- `scripts/run-eslint-json.js` — 乾淨的 ESLint JSON 擷取腳本

---

**維護原則**：
- 每次 `.cursorrules` 變更 → 本文件更新
- 每次批次修正違規 → 更新第 5 節「更新記錄」
- 新增已知偏離 → 加入對應章節並標記決策來源
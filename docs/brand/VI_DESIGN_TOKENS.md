# 出攤本 BoothBook — 視覺識別（VI）設計 token 對照

> 文件版本：2026-06-17
> 對應設計框架：`docs/brand/VI_DESIGN_SYSTEM.md`（2026-06-16）
> 變更內容：把 BoothBook 內部色票（霧藍 / 暖木 / 米白）對齊到「出攤本 BoothBook」對外品牌色（霧松綠 / 暖杏橘 / 奶油米白）

---

## 為什麼要對齊

原本 `.cursorrules` 與 `tailwind.config.ts` 用的是 BoothBook 內部色票（`#7B9FA6` 霧藍 / `#D4A574` 暖木 / `#FAFAF8` 米白）。
2026-06-16 建立對外品牌「出攤本 BoothBook」VI 框架（`docs/brand/VI_DESIGN_SYSTEM.md`），定義對外品牌色為霧松綠 `#6F8F86` / 暖杏橘 `#D9A66A` / 奶油米白 `#F7F3EA`。
兩套色票並行會導致：
- Logo、App Icon、IG 模板用 VI 色票，但 App 內 UI 用舊色票
- 視覺斷裂，使用者從行銷素材進入 App 會感到「換了一個產品」

2026-06-17 決策：全面對齊 VI 框架（App 內 UI 也用 VI 色票）。

---

## 對照表

### 主色票

| Token 名稱 | 舊色票 | 新色票（VI） | 用途 |
|---|---|---|---|
| `--brand-primary` | `#7B9FA6` 霧藍 | `#6F8F86` **霧松綠** | 主按鈕、Logo、App 識別、標題 |
| `--brand-secondary` | `#D4A574` 暖木 | `#D9A66A` **暖杏橘** | 成交提示、重點數字、小標籤、點綴 |
| `--brand-background` | `#FAFAF8` 米白 | `#F7F3EA` **奶油米白** | 背景、卡片、IG 模板 |
| `--brand-foreground` | `#3A3A3A` 中性灰 | `#2F3432` **墨灰黑** | 文字主色 |

### 新增（VI 文件定義但原本沒有）

| Token 名稱 | 色票 | 用途 |
|---|---|---|
| `--brand-muted` | `#E8E2D8` 淺霧灰 | 表格線、分隔線、卡片背景、未啟用狀態 |
| `--brand-deep` | `#40504B` 深灰綠 | 次要標題、輔助 icon、hover 狀態 |
| `--brand-info` | `#7E9AA0` 霧藍灰 | 資訊 / 說明 |

### 功能色（VI 文件 4.6）

| Token 名稱 | 舊色票 | 新色票（VI） | 用途 |
|---|---|---|---|
| `--brand-danger` | `#d4183d` 紅 | `#C7776E` **乾燥玫瑰** | 危險 / 刪除 |
| `--brand-warn` | `#FFF8E7` 柔黃（極淺） | `#E5C46B` **柔霧黃** | 提醒 / 庫存不足 |

> ⚠️ 舊的 `--brand-soft-yellow` 仍保留作為背景柔色，與 `--brand-warn` 是不同層級。
> soft-yellow = 背景色塊，warn = 警示文字 / 圖示。

### 保留的柔色

| Token 名稱 | 色票 | 用途 |
|---|---|---|
| `--brand-soft-pink` | `#F5E6E8` | 粉紅背景色塊 |
| `--brand-soft-green` | `#E8F3E8` | 綠背景色塊 |
| `--brand-soft-yellow` | `#FFF8E7` | 黃背景色塊（**僅背景用**，非警示） |

---

## 員工模式決策

VI 框架（`docs/brand/VI_DESIGN_SYSTEM.md`）未指定員工變體色票。原本員工模式用紫灰 `#8B7BA6` / 淺藍紫 `#A6B4D4` / 淺紫 `#F0E8F3`。

**決策**（2026-06-17）：員工模式沿用主色，僅在背景以透明度區分（`primary/10`、`primary/15`）。

理由：
- VI 框架只定義一套品牌色
- 兩套品牌色並行會讓使用者困惑（為什麼員工看到的顏色不一樣）
- 員工與老闆的視覺區分可透過：
  1. 透明度深淺（`primary/10` vs `primary/20`）
  2. UI 元件缺省（敏感欄位隱藏）
  3. `StaffModeNotice` 元件提示

**新對照**：

| 場景 | 舊色 | 新色 |
|---|---|---|
| 員工主色 | `#8B7BA6` 紫灰 | `primary` 霧松綠（**與老闆同色**） |
| 員工次色 | `#A6B4D4` 淺藍紫 | `primary/80` 霧松綠 80% 透明 |
| 員工淺色背景 | `#F0E8F3` 淺紫 | `primary/10` 霧松綠 10% 透明 |
| 員工漸層 | `from-[#8B7BA6] to-[#A6B4D4]` | `from-primary/80 to-primary/60` |
| 員工陰影 | `shadow-[#8B7BA6]/10` | `shadow-primary/10` |

---

## 技術落地

### CSS 變數（`app/globals.css`）

所有品牌色以 `rgb(R G B)` 形式定義在 `:root`，搭配 tailwind 的 `rgb(var(--token) / <alpha-value>)` 模式，
確保透明度語法（`primary/10`、`primary/20`）能正常運作。

```css
:root {
  --brand-primary: 111 143 134;       /* #6F8F86 */
  --brand-secondary: 217 166 106;     /* #D9A66A */
  --brand-foreground: 47 52 50;       /* #2F3432 */
  --brand-background: 247 243 234;    /* #F7F3EA */
  /* ... 略，見 globals.css */
}
```

### Tailwind token（`tailwind.config.ts`）

```ts
colors: {
  primary: "rgb(var(--brand-primary) / <alpha-value>)",
  secondary: "rgb(var(--brand-secondary) / <alpha-value>)",
  foreground: "rgb(var(--brand-foreground) / <alpha-value>)",
  background: "rgb(var(--brand-background) / <alpha-value>)",
  // ...
}
```

### 使用方式（`.tsx` 內）

```tsx
// ✅ 推薦：使用 token
<div className="bg-primary text-primary-foreground" />
<div className="border-primary/20 shadow-primary/10" />

// ⚠️ 仍可寫 hex（escape hatch），但需手動同步新色票
<div className="bg-[#6F8F86]" />

// ❌ 已刪除：舊 token 名稱
<div className="bg-mist-blue" />     // 會失敗
<div className="bg-warm-wood" />     // 會失敗
```

---

## 改動清單（2026-06-17）

| 檔案 | 變更 |
|---|---|
| `app/globals.css` | 重新定義 `:root` 變數（rgb 格式）+ 更新 `.gradient-header`、滾動條、頁面背景 |
| `tailwind.config.ts` | 改用 `rgb(var(--xxx) / <alpha-value>)`，新增 `muted / deep / danger / warn / info / staff-tint` |
| `lib/theme-config.ts` | `ownerTheme` 改用新色票 + token class；`staffTheme` 沿用主色 + 透明度 |
| `*.tsx` 90 個檔案 | 批次替換 `bg-[#7B9FA6]` → `bg-primary`、`text-[#D4A574]` → `text-secondary` 等 |

---

## 維護指南

### 新增顏色

1. 先在 `docs/brand/VI_DESIGN_SYSTEM.md` 4.6「功能色建議」表確認是否已有對應色
2. 在 `app/globals.css` `:root` 新增 `--brand-xxx: R G B;`（rgb 三位數）
3. 在 `tailwind.config.ts` `theme.extend.colors` 新增對應 token
4. 在 `lib/theme-config.ts` 視需要更新 `ownerTheme` / `staffTheme`

### 修改現有顏色

1. 在 `app/globals.css` `:root` 修改 rgb 數值
2. 不需動 `tailwind.config.ts` 或 `.tsx` 檔案（token 會自動反映新色）

### 確認新色票

修改後用 `npm run build` 確認無誤，然後在 App 內檢查以下場景：
- 主畫面 header（`gradient-header`）
- 主按鈕（`bg-primary`）
- 卡片陰影（`shadow-primary/10`）
- 員工模式 header（`from-primary/80`）

# Féria 全專案 UI/UX 整合稽核與執行計畫

建立日期：2026-07-15

狀態：執行前規劃完成，尚未修改正式功能

範圍：正式 App、老闆與員工工作流、共用元件、響應式介面、可用性與前端效能

保護範圍：既有成交、成交照片、權限、同步與資料事件語意不可因 UI 重整而改變

## 0. 決策摘要

Féria 現在不是缺少功能，而是功能成熟後尚未形成一套全產品共同的操作架構。市集詳情近期完成的自適應工作台已證明正確方向：依角色與市集階段決定第一層任務，完整功能保留在次層，操作會比把所有資訊一次展開更快、更安定。

全專案適合開始重整，但不適合一次全面換版。建議採用以下順序：

1. 先建立量測基準、回歸護欄與共用 UI 規格。
2. 先修全域導覽、同步呈現、無障礙與明確的卡頓來源。
3. 再重排首頁、市集列表、商品與表單等高頻流程。
4. 接著拆分「更多／設定／團隊」的資訊架構。
5. 最後重構分析與報告的漸進揭露和重運算方式。
6. 每一階段都獨立驗收與提交，不等待全部完成才測試。

最終目標不是讓每一頁看起來一樣，而是讓使用者在任何頁面都能立即理解：

- 我現在在哪裡。
- 我目前最應該做什麼。
- 完成後會發生什麼。
- 資料是否已安全保存或待同步。
- 其他完整功能要去哪裡找。

## 1. 稽核方式與邊界

本次稽核包含：

- 19 個 `page.tsx` 路由，其中 13 個為完整 Client Component 頁面。
- 全域 App shell、底部導覽、Auth／Role／Sync providers、PWA 與載入狀態。
- 首頁、市集列表、市集詳情、商品、分析、設定、團隊、修復、訂閱與結算報告。
- 主要交易、補登、成交照片、互動與商品銷售入口。
- production build 靜態 chunk、模組匯入方式、主要查詢與重算流程。
- `/demo` 在桌面與 `390 x 844` 手機 viewport 的實際畫面核對。

本次只建立計畫，不修改正式功能。實作時遵守以下邊界：

- Phase 0 至 Phase 3 不改資料表、事件 payload、RLS、權限能力名稱或同步協議。
- 成交與照片流程只更換外層編排或共用 UI primitive，不重寫已通過測試的交易核心。
- 分析頁 UI 去重不得暗中更改 KPI 定義；任何指標公式變更要另立決策紀錄。
- 大型元件拆分先保持輸入、輸出與副作用相同，再談功能增強。

## 2. 產品角色與核心任務

### 2.1 老闆

| 情境 | 第一任務 | 第二任務 | 不應先看到的內容 |
|---|---|---|---|
| 平日 | 查看下一場市集與待辦 | 維護商品、團隊、設定 | 大量歷史圖表與危險資料工具 |
| 市集前 | 確認日期、成本、設備、商品與人員 | 補齊備註與照片政策 | 全部歷史 KPI |
| 營業中 | 快速成交、互動、拍照與補拍 | 查看當日紀錄與異常 | 複雜分析與低頻管理 |
| 收班後 | 確認待補照片與成交完整性 | 查看當日摘要 | 長期比較報告 |
| 市集後 | 回顧單場成果與照片 | 比較市集、匯出報告 | 現場操作控制 |

### 2.2 員工

| 情境 | 第一任務 | 第二任務 | 不應出現的內容 |
|---|---|---|---|
| 上班前 | 找到今天被指派的市集 | 確認可執行任務與權限 | 老闆分析、成本與資料管理 |
| 營業中 | 成交、互動、拍照 | 查看自己的現場紀錄與待補項目 | 無法使用但仍佔位置的功能 |
| 收班後 | 完成待補照片與交班資訊 | 確認資料已保存 | 離開團隊等高風險設定 |
| 非營業日 | 查看受指派市集與商品 | 查看角色／權限說明 | 空白分析頁或禁用導覽項目 |

### 2.3 共通設計結論

1. 入口應依角色不同，不以「相同介面加上禁用按鈕」代表權限設計。
2. 首頁應是「今日與下一步」，不是帳號選單、市集卡片與月報表的混合頁。
3. 市集階段只決定首次預設內容，使用者手動切換後不可被系統強制跳回。
4. 高風險、低頻與修復工具必須離開日常工作第一層。

## 3. 現況資訊架構問題

### 3.1 目前第一層

目前老闆與員工共用五個底部項目：`首頁／市集／商品／分析／設置`。

主要問題：

- 員工仍看見不可使用的「分析」，點擊後才收到「僅供老闆」訊息。
- `/markets/[id]` 與 `/products/[id]` 使用精確 pathname 比對，詳情頁無法保持父層導覽啟用狀態。
- 導覽使用「設置」，頁面標題使用「設定」，名詞不一致。
- 首頁同時承擔帳號、訂閱、同步、月統計、今日市集與近期市集。
- 團隊與權限被收在設定 accordion，卻是老闆的重要管理工作。
- 修復、清除本地、永久刪除雲端資料與一般個人化設定同頁並列。
- `/staff` 只負責重新導向設定頁，形成無實質內容的入口。

### 3.2 建議第一層

老闆：

| 導覽 | 目的 | 對應路由策略 |
|---|---|---|
| 今日 | 今日市集、下一步、待補照片與關鍵異常 | 沿用 `/` |
| 市集 | 場次準備、現場工作與歷史場次 | 沿用 `/markets` |
| 商品 | 商品搜尋、狀態與維護 | 沿用 `/products` |
| 分析 | 回顧、比較、建議與報告 | 沿用 `/analytics` |
| 更多 | 團隊、營運設定、帳號、同步與資料工具 | 可先沿用 `/settings`，避免路由一次大改 |

員工：

| 導覽 | 目的 |
|---|---|
| 今日 | 今天的指派市集與下一個行動 |
| 市集 | 可存取的場次 |
| 商品 | 現場需要查閱的商品 |
| 更多 | 自己的角色、權限、同步狀態、帳號與離開團隊 |

員工導覽直接移除「分析」，不保留禁用佔位。四項導覽應平均配置，不以空位模擬老闆版。

### 3.3 「更多」建議分類

1. **團隊與權限**：成員、邀請、角色設定。老闆版置頂；員工版顯示所屬老闆與自身權限。
2. **營運設定**：互動按鈕、成交照片政策、品牌顯示。
3. **報告與訂閱**：結算報告、方案與用量。
4. **同步與資料**：同步狀態、資料修復、救援備份。
5. **帳號**：帳號切換、登出、安裝 App。
6. **危險操作**：清除本地、刪除線上資料、離開團隊。使用獨立頁與明確確認，不與一般設定並排。

## 4. 問題清單與優先級

### 4.1 P0：執行初期必須處理

| ID | 問題 | 程式證據 | 使用者影響 | 建議處理 |
|---|---|---|---|---|
| UX-01 | 角色導覽未真正分流 | `components/BottomNavigation.tsx:14-19,62-82` | 員工看見不可用分析，增加試錯與挫折 | 由角色產生 nav config，員工不渲染分析 |
| UX-02 | 詳情頁導覽狀態錯誤 | `components/BottomNavigation.tsx:59,81` | 進入市集或商品詳情後失去位置感 | 改用 route segment／prefix matcher |
| UX-03 | 危險操作混在設定 | `app/settings/page.tsx:474-624` | 日常設定頁資訊沉重，也提高誤觸焦慮 | 分成「同步與資料」及獨立危險區 |
| A11Y-01 | 禁止縮放 | `app/layout.tsx:29-34` | 低視力使用者無法放大；照片與數字也難檢查 | 移除 `maximumScale` 與 `userScalable:false` |
| PERF-01 | 同步有兩套大型進度彈窗責任 | `components/common/SyncStatusIndicator.tsx:64-75,206-283`、`components/sync/SyncProgressManager.tsx:36-85` | 可能重複遮擋操作，狀態與動畫重複 | 只保留一個全域同步 surface；頁面只呈現狀態入口 |
| PERF-02 | Sync context value 每次建立新物件 | `lib/sync-context.tsx:58-65` | 所有 consumer 隨 provider 更新重繪 | memoize value，必要時拆 status／progress／actions contexts |
| PERF-03 | 分析同一批市集重算多次 | `app/analytics/page.tsx:311-383` | 大資料量時 Dexie 查詢與指標運算重複 | 建立單一 metrics pipeline，一次計算供象限、健康分與總覽使用 |
| STAB-01 | 原生 `alert/confirm/prompt` 分散 | 商品、設定、團隊、市集與成交詳情共多處 | 外觀、鍵盤、焦點、文字與錯誤處理不一致 | 建立 AppDialog／ConfirmDialog，逐流程替換 |

### 4.2 P1：高價值體驗問題

| ID | 問題 | 程式證據 | 使用者影響 | 建議處理 |
|---|---|---|---|---|
| IA-01 | 首頁是多用途長頁 | `app/page.tsx:105-112,169-254,541-658` | 重要的今日任務被帳號與月統計稀釋 | 改為依角色與日程自適應的「今日」頁 |
| IA-02 | 設定是 catch-all | `app/settings/page.tsx:277-624` | PWA、品牌、照片、團隊、互動與資料工具缺乏層級 | 改為分類索引與次頁，不在同頁全部展開 |
| IA-03 | 分析快速模式仍一次掛載多組結果 | `app/analytics/page.tsx:621-623` 後仍接續 KPI／排行；進階區自 `1047` 起 | 即使選快速，資訊仍多且首次運算重 | 先回答三個經營問題，再按 tab 掛載詳細分析 |
| FORM-01 | 新增市集表單過長 | `components/markets/AddMarketForm.tsx` 858 行 | 必填與低頻成本、設備、時間軸、備註同時出現 | 必填先行；成本／設備／時間軸／備註漸進展開 |
| FORM-02 | 新增與編輯市集／商品重複實作 | `AddMarketForm.tsx`、`EditMarketForm.tsx`；`AddProductForm.tsx`、`EditProductForm.tsx` | 規則與版型容易漂移，修正需做兩次 | 共用 schema、fields 與 form shell，保留不同 submit adapter |
| PERF-04 | 大型對話框與報表採靜態 import | 市集、商品頁直接 import 長表單；PDF 按鈕在 `SettlementReportPdfPreviewButton.tsx:5-8` import renderer 與 document | 未開啟功能也增加 route bundle 解析成本 | 對關閉狀態 dialog、圖表、PDF 採 dynamic import |
| PERF-05 | 底部導覽重複預取 | `BottomNavigation.tsx:43-57` 手動預取，`85-89` Link 再預取 | 閒置時提早載入分析與設定，消耗網路和主執行緒 | 只保留一種策略，依角色與使用意圖預取 |
| PERF-06 | 路由切換強制 remount 與全頁 transform | `app/template.tsx:18-30`、`app/globals.css:164-203` | 200ms 動畫、paint containment 與頁面重掛載可能被感知為延遲或閃動 | 先量測；移除全頁 contain／transform，僅在必要容器做短過渡 |
| UX-04 | 底部導覽顯示狀態由全域 mutable store 控制 | `lib/navigation-store.ts:8-31` | 表單異常或非預期卸載時可能讓 nav 維持隱藏 | 由 dialog route／open stack 衍生，卸載自動復原 |
| UX-05 | Loading skeleton 與真實結構可能漂移 | 各 route 各自維護 `loading.tsx`；`app/sales/loading.tsx` 無對應 page | 載入完成時內容大幅重排；留下孤兒資產 | 共用 page skeleton primitives，刪除孤兒 loading |

### 4.3 P2：一致性與長期維護

| ID | 問題 | 程式證據 | 使用者影響 | 建議處理 |
|---|---|---|---|---|
| VIS-01 | 圓角與陰影規格過多 | 掃描得到 `rounded-xl` 295、`rounded-2xl` 219、`rounded-full` 226、`rounded-[1.5rem]` 107 | 卡片、按鈕、dialog 的層級不易辨認 | 卡片 8px、控制 8px、dialog 12px、狀態 pill 才使用 full |
| VIS-02 | UI emoji 與 icon 規範不一致 | 48 個正式範圍檔案含 emoji；`docs/brand/ICONOGRAPHY.md` 明定 UI 不主動使用 emoji | 跨平台外觀漂移、質感不一致 | 商品類別、支付、提示、空狀態逐步改 Lucide |
| VIS-03 | Dialog、sheet、overlay 與 z-index 各自實作 | z-index 從 `50`、`999`、`1000`、`1099`、`1200` 到 `10001` | 疊層、焦點、鍵盤與 scroll lock 不可預測 | 一套 overlay stack 與三種 dialog pattern |
| VIS-04 | 共用 UI primitives 幾乎不存在 | `components/ui` 目前只有日期、時間與 skeleton 類元件 | 每頁重複 class，視覺規格持續漂移 | 建立 Button、IconButton、Dialog、FormField、Section、StateView 等 |
| GOV-01 | 設計治理文件失真 | `globals.css` 與兩份 brand 文件引用不存在的 `VI_DESIGN_SYSTEM.md`；known violations 摘要寫 0 但仍列 emoji 債 | 後續開發無可靠規則來源 | 建立真正的 UI system 文件並讓稽核腳本對應實際規則 |
| DEV-01 | 大型頁面承擔過多責任 | 市集詳情 2275 行、分析 1178 行、設定 666 行 | 小改動也容易造成非預期重繪與回歸 | 拆 controller hooks、view model 與按需掛載的 section |
| DEV-02 | 遺留未使用介面 | `TopNavigation.tsx`、`PageTransition.tsx`、`QuickDealModal.tsx`、`CartDrawer.tsx` 沒有正式使用點 | 開發者不確定哪套才是標準 | 驗證後移除或明確標記 legacy，不讓兩套流程持續漂移 |
| DEMO-01 | Demo 手機首屏任務出現太晚 | 實測 `390 x 844`：品牌、Workspace 與橫向六分類先佔首屏；後三項需橫向捲動 | Demo 無法快速傳達產品的核心工作 | 核心 App 完成後再以同一 shell 與優先層級同步 Demo |

### 4.4 效能量化現況

目前 production build 的 raw static chunks 包含：

| Raw size | 辨識出的主要內容 | 判讀 |
|---:|---|---|
| 約 1,477.5 KB | react-pdf、PDF document、Yoga | PDF 是必要功能，但應延後到使用者要求預覽後才載入與解析 |
| 約 576.5 KB | Recharts、Supabase | 分析圖表與資料 client 混在大型 chunk，需以 route／active tab 實測載入邊界 |
| 約 222.6 KB | Supabase | 驗證與同步是全域能力，應檢查哪些 public／demo route 真正需要 |
| 約 118.7 KB | Dexie | Local-first 核心依賴，重點是減少重複 query 與 consumer render，不是移除 |

這些是未壓縮的 build artifact 大小，不代表每個 chunk 都會在首頁同時下載；Phase 0 必須再以 route network trace 建立真正的 transferred、parsed 與 executed baseline。它們仍清楚指出 PDF、圖表、同步與資料 client 應有更明確的載入邊界。

其他靜態證據：

- `app`、`components`、`lib` 目前找不到 `next/dynamic` 或 React lazy 使用點。
- 19 個 route pages 中有 13 個完整 client pages。
- `app`、`components`、`lib` 靜態掃描有 588 個 `console.*` 命中，包含 debug／example，也包含 auth、sync、分析與資料 hot paths；應分類處理，不能直接批次刪除 error evidence。
- `components/ui` 只有日期、時間與 detail skeleton 類元件，尚未形成跨頁共用 component system。
- 最大 UI 檔案包含市集詳情 2275 行、分析 1178 行、新增市集 858 行、員工管理 750 行、設定與首頁各 666 行。

## 5. 目標體驗架構

### 5.1 老闆「今日」低保真

```text
┌──────────────────────────────┐
│ Féria        同步狀態   帳號 │
│ 7 月 15 日・今天             │
├──────────────────────────────┤
│ [營業中] 森之市              │
│ 今日營收 / 成交 / 待補照片   │
│ [繼續現場工作]               │
├──────────────────────────────┤
│ 下一步                       │
│ 2 筆待補照片                 │
│ 1 場市集尚未完成成本設定     │
├──────────────────────────────┤
│ 下一場：島嶼生活市集         │
└──────────────────────────────┘
 今日   市集   商品   分析   更多
```

無營業中市集時，第一區改為下一場準備；市集結束當天則改為收班檢查。月統計只保留一個摘要入口，不在首屏展開完整分析。

### 5.2 員工「今日」低保真

```text
┌──────────────────────────────┐
│ 今日工作            已同步   │
├──────────────────────────────┤
│ [營業中] 森之市              │
│ 台中草悟道・至 18:00         │
│ [開始／繼續交易]             │
├──────────────────────────────┤
│ 待完成                       │
│ 補照片 2 筆   交班備註 1 筆 │
├──────────────────────────────┤
│ 其他被指派市集               │
└──────────────────────────────┘
 今日      市集      商品      更多
```

員工版不顯示月營收、老闆分析、成本或不可執行的入口。

### 5.3 「更多」低保真

```text
┌──────────────────────────────┐
│ 更多                         │
├──────────────────────────────┤
│ 團隊與權限                 > │
│ 營運設定                   > │
│ 報告與訂閱                 > │
│ 同步與資料                 > │
│ 帳號                       > │
├──────────────────────────────┤
│ 危險操作                   > │
└──────────────────────────────┘
```

每列只說明該分類目前的關鍵狀態，例如「3 位成員」、「成交需拍照」、「2 筆待同步」，不在索引頁直接嵌入完整管理工具。

### 5.4 分析低保真

```text
┌──────────────────────────────┐
│ 分析       [最近 3 場 v]     │
├──────────────────────────────┤
│ 這段期間最重要的三件事       │
│ 1. 哪一場值得再去            │
│ 2. 哪些商品表現最好          │
│ 3. 下一步建議                │
├──────────────────────────────┤
│ [總覽] [市集] [商品] [顧客] │
├──────────────────────────────┤
│ 只掛載目前分頁的 KPI 與圖表  │
└──────────────────────────────┘
```

可信度、公式說明與解鎖條件放在資料狀態／說明入口，不要每一張卡都重複說明。

### 5.5 長表單低保真

```text
┌──────────────────────────────┐
│ 新增市集               [X]   │
├──────────────────────────────┤
│ 基本資料                     │
│ 名稱 / 地點 / 日期           │
│                              │
│ 可選設定                     │
│ 成本與抽成                 > │
│ 設備                       > │
│ 時間軸                     > │
│ 備註                       > │
├──────────────────────────────┤
│ [取消]              [建立]   │
└──────────────────────────────┘
```

手機採 full-screen task flow，桌面採置中 dialog；兩者共用欄位、驗證與 sticky action footer。

## 6. 共用 UI 系統

### 6.1 必須建立的 primitives

| Primitive | 責任 |
|---|---|
| `AppPageHeader` | 頁名、返回、主要動作、同步／帳號位置，不讓每頁自建漸層 header |
| `Button`／`IconButton` | primary、secondary、danger、ghost、loading、disabled 與 44px touch target |
| `SegmentedControl`／`Tabs` | 模式或同層檢視，完整鍵盤與 active state |
| `AppDialog` | 置中、焦點管理、scroll lock、ESC、標題與 action footer |
| `TaskSheet` | 手機購物車與短任務；桌面可轉 centered dialog |
| `FullScreenForm` | 新增／編輯市集等長流程 |
| `ConfirmDialog` | 一般、危險、文字確認三種，不再使用 browser confirm |
| `FormField` | label、required、hint、inline error、description ID |
| `Section`／`ListRow` | 全寬區段與設定索引，避免 card 裡再塞 card |
| `StatusBadge` | 狀態專用 pill，統一顏色與文字 |
| `EmptyState`／`ErrorState`／`Skeleton` | 統一資料狀態與可恢復動作 |
| `StickyActionBar` | 手機底部主要動作與 safe-area 處理 |

### 6.2 視覺規格

- 卡片圓角：8px。
- 輸入與按鈕圓角：8px。
- 對話框圓角：12px；手機 full-screen form 不做浮動大圓角卡。
- `rounded-full` 只用於 avatar、狀態 badge、圓形 icon button。
- 頁面 section 不使用浮動卡片效果；只有重複項目、modal 與真正的工具框使用 card。
- 一個畫面只保留一個主要陰影層級，資訊層級優先用間距、邊線與背景區分。
- 品牌綠、暖橘、中性色與功能色共同使用，避免全頁只由同一色系深淺構成。
- 商品分類、付款方式與提示改用 Lucide icons；資料本身的使用者自訂 emoji 可保留。

### 6.3 Dialog 分類

1. **Centered command dialog**：拍照、照片預覽、刪除、權限、簡短設定。
2. **Task sheet**：手機購物車與短時間付款工作；桌面置中。
3. **Full-screen form flow**：新增／編輯市集、複雜精靈。

所有 dialog 共用一套 portal、overlay、focus trap、scroll lock 與 z-index tokens。禁止功能元件自行指定 `z-[999]`、`z-[1200]` 或 `z-[10001]`。

### 6.4 文字與名詞

- 全專案統一使用「設定」，底部導覽改為「更多」。
- 「成交」代表一筆交易；「收入」只在財務統計或補登收入情境使用。
- 「成交照片」代表已關聯交易的證據照片；「待補照片」代表尚未完成的工作。
- 按鈕使用動作文字，例如「建立市集」、「上傳照片」、「移除員工」。
- 移除「點擊某按鈕即可...」等長篇操作說明，讓控制本身與即時狀態說明行為。
- 失敗訊息包含問題、資料是否已保存、下一步；不只顯示「請稍後再試」。

## 7. 各功能的 UX 強化方向

### 7.1 今日／首頁

- 依「營業中、今日待開場、剛收班、無今日市集」決定第一區。
- 老闆顯示今日關鍵結果與待處理；員工顯示指派工作與權限內任務。
- 將帳號、方案與完整月統計移至「更多」或分析。
- 待補照片、同步失敗與未完成草稿以可直接處理的 action row 呈現。
- 返回首頁時保留先前捲動位置，但今日狀態改變時更新摘要。

### 7.2 市集列表

- 第一層改為「進行中／待準備／已結束」，取消場次放進篩選或次層。
- 每張卡只保留日期、地點、階段、最重要狀態與一個主要動作。
- 營業中卡片主要動作是「繼續現場」；待準備是「完成設定」；已結束是「查看回顧」。
- 市集很多時增加搜尋與年份／月份篩選；超過量測門檻後再導入虛擬列表。
- 只計算可見清單所需摘要，不為隱藏 tab 的所有卡片先計算完整 stats。

### 7.3 市集詳情

- 保留目前成功的老闆 `現場／總覽／管理` 與員工 `現場／紀錄／任務` 架構。
- 只接入新的 App shell、dialog primitives、狀態元件與效能拆分。
- 不重寫成交、照片、互動與資料事件流程。
- 關閉狀態的管理表單、照片 album、分析圖表與補登 dialog 改為按需載入。
- 將 2275 行頁面逐步拆成 route controller、owner view、資料 hooks 與 lazy sections，但每次拆分先做 characterization tests。

### 7.4 商品

- 搜尋與分類固定在列表頂部；支援快速清除搜尋與保留篩選狀態。
- 商品卡第一層只顯示名稱、售價、庫存／啟用狀態；成本與毛利依權限進詳情查看。
- 分類 emoji 改為一致圖示與文字。
- 新增與編輯共用欄位；必填先行，庫存、成本、描述放進進階設定。
- 驗證錯誤顯示在欄位旁並自動聚焦第一個錯誤，不再使用 `alert()`。
- 大清單搜尋可使用 `useDeferredValue`；只有實測達門檻才導入 virtualization。

### 7.5 團隊與權限

- 老闆「更多」第一項顯示成員數、待接受邀請與異常狀態。
- 員工角色設定使用單一 dialog，先顯示目前權限，再呈現可選角色與影響。
- 邀請建立、複製、撤銷與移除員工有一致的成功／失敗狀態。
- 權限資料未 ready 時顯示可恢復狀態，不以模糊的「資料異常」終止操作。
- 移除、離隊與撤銷邀請全部使用 App confirmation；高風險結果說明資料會保留或清除哪些部分。

### 7.6 更多／設定

- 首頁只顯示分類 row 與狀態，不嵌入完整 `StaffManagement` 或資料清除面板。
- PWA 安裝只在可安裝且尚未安裝時出現，並放在帳號分類，不全域反覆提示。
- 成交照片政策與互動按鈕歸入營運設定。
- 修復頁只由同步異常、資料完整性錯誤或「同步與資料」入口進入。
- 永久刪除線上資料使用獨立危險頁、重新驗證與輸入確認；文案單一語言且清楚。

### 7.7 分析

- 預設只呈現三件事：值得再去的市集、表現最好的商品、下一步建議。
- 詳細內容改為 `總覽／市集／商品／顧客` tabs，只有目前 tab 掛載。
- 相同 KPI 在同一視圖只出現一次；卡片點擊才開啟公式、可信度或明細。
- 將 `calculateMarketMetrics` 結果建立單一快取 view model，供象限、健康分、總覽與排行共用。
- 移除重新計算按鈕的人為 500ms 等待；必要時顯示真實工作進度。
- 圖表與進階分析按需 import；資料量大且量測仍有 long task 時才評估 Web Worker。

### 7.8 報告與結算

- 報告入口歸入分析與「更多／報告」，不只藏在分析 header 小按鈕。
- 預覽畫面先顯示可閱讀摘要，再由使用者主動產生 PDF。
- `@react-pdf/renderer` 與 598 行 PDF document 在按下預覽後才 import。
- production build 目前有約 1.48 MB raw 的 react-pdf/Yoga chunk；目標不是刪除功能，而是不讓未使用 PDF 的路由提早解析它。

### 7.9 同步、離線與資料修復

- 平常只顯示安靜的狀態：已保存、待同步、離線、同步失敗。
- 一般背景同步不開 modal；只有初次重建、會阻擋離開的重大工作才使用進度 dialog。
- 待同步數量可點擊查看，但不在多個頁面各自維護大型彈窗。
- 成交後立即說明「已保存於本機」或「已同步」，不要讓使用者把同步動畫誤認為成交仍未完成。
- 失敗狀態提供重試與修復入口，並說明本機資料是否仍安全。

### 7.10 Demo 與公開頁

- 核心 App 穩定後再同步 Demo 的導覽、卡片密度與名詞，避免 Demo 成為另一套設計系統。
- 手機首屏先顯示可操作的核心體驗，品牌與 Workspace 資訊縮成 header／switcher。
- 六個分類若保留橫向捲動，要有可見的下一項提示；更推薦依主要任務縮成 4 至 5 個第一層入口。

## 8. 卡頓與效能處理計畫

### 8.1 先建立基準

建立三種固定資料 fixture：

- S：5 場市集、20 個商品、100 筆事件。
- M：30 場市集、100 個商品、3,000 筆事件。
- L：100 場市集、300 個商品、20,000 筆事件。

量測情境：

1. 冷啟動後進入今日。
2. 今日進入營業中市集。
3. 開啟快速收款與商品銷售。
4. 完成成交並進入照片預覽。
5. 開啟待補照片。
6. 切換市集詳情主視圖。
7. 開啟商品搜尋與編輯。
8. 進入分析並切換範圍／tab。
9. 開啟團隊與權限。
10. 產生 PDF 預覽。

每項記錄：可見回饋時間、資料完成時間、React commit 次數、main-thread long tasks、bundle 載入與 Dexie query 次數。

### 8.2 立即可做的低風險修正

1. `SyncContext` value memoization，並減少 consumer 訂閱不需要的進度欄位。
2. 合併 `SyncStatusIndicator` 與 `SyncProgressManager` 的大型 dialog ownership。
3. 移除底部 nav 手動全路由 prefetch 或 Link 強制 prefetch 的其中一套。
4. 移除分析重新計算的人為 500ms delay。
5. production 模式移除 hot path debug logs；保留結構化 error reporting。
6. 關閉狀態的 Add/Edit forms、照片 album、進階分析與 PDF dynamic import。
7. 全域 `scroll-behavior:smooth`、`touch-callout:none`、`overscroll-behavior:none` 與 route-wide containment 改為局部套用。
8. skeleton animation 完整遵守 `prefers-reduced-motion`。

### 8.3 分析頁重運算

目前象限、健康評分與 top overview 各自迴圈呼叫 `calculateMarketMetrics`。建議建立：

```text
Dexie scoped reads
      ↓
MarketMetricsViewModel（每場只計算一次）
      ↓
overview / ROI / AOV / health / quadrant / recommendations
      ↓
active analytics tab
```

執行原則：

- 查詢只讀當前 owner、日期範圍與 market IDs。
- 一次取得商品名稱 map，避免排行逐筆 `db.products.get()`。
- 只有 active tab 所需的進階資料才啟動 live query。
- 快取 key 包含 owner、範圍、資料版本與分析版本。
- 清快取後由真實 promise 狀態驅動 UI，不用固定 sleep 模擬工作。

### 8.4 App shell 與路由

- `AppChrome` 目前在一般路由全域掛載 PWA splash、安裝／更新提示、邀請、初始同步、同步進度、Auth manager 與多個 dialog；改為一個 `GlobalOverlayHost` 管理互斥與優先順序。
- PWA install、staff invitation 等低頻功能在條件成立後才載入模組。
- 路由切換先立即更新 active nav 與 loading state，不等待完整頁面載入才給回饋。
- 不以全頁 200ms animation 掩蓋載入；動畫只用於狀態連續性且不阻擋輸入。
- 動態詳情頁使用 parent-prefix active matching，避免 route state 與 animation direction 不一致。

### 8.5 大型頁面拆分

- `app/markets/[id]/page.tsx`：拆成 route controller、owner data hooks、owner workspace view、overlay host。
- `app/analytics/page.tsx`：拆成 analytics query/view model、summary、各 active tab。
- `app/settings/page.tsx`：拆為 More index 與分類頁。
- `AddMarketForm`／`EditMarketForm`：共用 fields、validation、draft 與 form shell。

拆分本身不是效能成果。每次拆分都要比較前後 bundle、query 次數與 render profile，沒有改善就不宣稱完成。

## 9. 分階段執行計畫

### Phase 0：基準、護欄與決策凍結

目標：確保後續 UI 重整不會破壞成熟資料流程。

工作：

1. 建立 S／M／L fixture 與角色、階段測試矩陣。
2. 記錄目前常用流程的 performance baseline 與 responsive screenshots。
3. 補齊成交、拍照、補拍、員工權限、離線與同步的 characterization tests。
4. 建立 route、功能 owner 與不可變資料契約清單。
5. 決定底部導覽是否採 `今日／市集／商品／分析／更多`。

驗收：

- baseline 可重複執行。
- 交易、照片與資料 smoke tests 全部通過。
- 沒有正式 UI 行為改動。

### Phase 1：App shell、共用元件與 P0 卡頓

目標：先修所有頁面共同承受的摩擦。

工作：

1. 實作 role-aware bottom nav 與 dynamic route active matching。
2. 統一「設定／更多」名詞，移除員工禁用分析項目。
3. 啟用 browser zoom，建立 44px touch target 與 focus-visible 規則。
4. 建立 Button、IconButton、Tabs、Dialog、ConfirmDialog、FormField、StateView。
5. 統一 overlay stack 與 GlobalOverlayHost。
6. 合併同步進度 surface、memoize Sync context。
7. 清理重複 prefetch、全頁 containment 與非必要 route animation。
8. 先替換高風險流程的原生 confirm／prompt。

不做：不重排分析內容，不改成交、照片、資料語意。

驗收：

- 老闆與員工第一層導覽正確，詳情頁父層保持 active。
- 全站可縮放，鍵盤焦點可見，主要觸控目標至少 44px。
- 同一時間最多一個阻擋式全域 dialog。
- 一般背景同步不遮擋交易。
- 原有交易與照片測試全數通過。

### Phase 2：今日、市集、商品與表單

目標：改善最高頻的日常任務。

工作：

1. 首頁改為角色與日程自適應的「今日」。
2. 市集列表改為工作階段與主要動作導向。
3. 商品列表調整搜尋、分類、卡片資訊密度與狀態。
4. 新增／編輯商品共用 form fields 與 inline validation。
5. 新增／編輯市集採必填先行與可選 section。
6. 關閉狀態長表單採 dynamic import。
7. 保留搜尋、tab 與 scroll return state。

不做：不改市集詳情內部交易與照片工作流。

驗收：

- 老闆從 App 啟動到營業中市集最多 2 次操作。
- 員工從今日到交易工作區最多 1 次主要操作。
- 新增市集首屏只呈現完成建立所需欄位。
- 表單錯誤不使用 browser alert，會定位到欄位。
- `360 x 640` 至桌面無水平溢出或遮擋。

### Phase 3：更多、團隊、設定與資料工具

目標：把低頻管理工作整理成可掃描、可理解的分類。

工作：

1. `/settings` 先改為「更多」分類索引，保留舊 URL 相容。
2. 團隊與權限成為老闆第一個管理入口。
3. 照片政策、互動設定與品牌移入營運設定。
4. 報告、訂閱、同步、資料修復與帳號各自成組。
5. 清除與永久刪除移入獨立危險操作頁。
6. 逐步移除設定與團隊的 native confirm／prompt。
7. 移除或重新導向 legacy `/staff`，並更新所有內部連結。

驗收：

- 更多首頁不直接掛載完整 StaffManagement 或修復面板。
- 老闆兩次操作內到達成員權限設定。
- 員工只看見自身可執行的更多分類。
- 危險操作與一般設定不在同一視圖。
- 權限未 ready、錯誤與空狀態都有明確恢復動作。

### Phase 4：分析、報告與重運算

目標：減少資訊過量，同時處理最重的資料與 bundle。

工作：

1. 分析第一層改為三個經營問題與四個詳細 tabs。
2. 消除同視圖重複 KPI 與重複可信度說明。
3. 建立共享 MarketMetricsViewModel 與 scoped Dexie queries。
4. 只掛載 active analytics tab。
5. 圖表與 advanced sections dynamic import。
6. PDF renderer 與 document 在使用者要求預覽後載入。
7. 移除假等待，建立真實的 loading、empty、stale 與 error state。

驗收：

- Quick 分析首屏不掛載進階圖表。
- 同一場市集的 metrics 在同一次分析刷新只計算一次。
- 未按 PDF 預覽前不下載／解析 react-pdf chunk。
- 分析數值與重構前 fixture golden results 一致。
- M、L fixtures 的 long task 與可互動時間較 baseline 明顯下降。

### Phase 5：手機、視覺、無障礙與遺留清理

目標：將已穩定的新架構收斂成一致且有質感的產品。

工作：

1. 套用 spacing、radius、shadow、typography 與 icon rules。
2. 移除 UI emoji、nested cards 與過度 backdrop blur。
3. 統一 skeleton，補足 reduced-motion、keyboard、screen reader 與高倍率縮放。
4. 清理未使用的 TopNavigation、PageTransition、QuickDealModal、CartDrawer 與孤兒 loading。
5. 對齊 Demo 與公開頁，但不讓其阻擋核心 App 發布。
6. 重新掃描 CSS 色彩、圓角、z-index、native dialog 與 horizontal overflow。

驗收：

- `360 x 640`、`390 x 844`、`768 x 1024`、`1440 x 900` 全部通過視覺回歸。
- 200% 文字縮放與 browser zoom 可用，沒有內容遮擋。
- 沒有未核准的 native dialog、任意 z-index 或 UI emoji。
- 核心流程可以只用鍵盤完成；動畫遵守 reduced motion。

## 10. 效能與體驗驗收指標

### 10.1 產品操作

- 老闆進入當日營業市集：最多 2 次操作。
- 員工開始交易：從今日頁最多 1 次主要操作。
- 完成交易後：立即顯示已保存狀態；需要照片時直接進入拍攝／選取與預覽。
- 待補照片：營業中首頁與市集現場均有清楚入口，但來源是同一資料狀態。
- 返回列表：保留原篩選、tab 與合理的 scroll position。
- 員工第一層沒有無法執行的分析或老闆資料入口。

### 10.2 Web 效能

以真實手機與 production build 的 p75 為目標：

- INP < 200ms。
- LCP < 2.5s。
- CLS < 0.1。
- 使用者點擊導覽後 100ms 內出現 active／loading 回饋。
- 常用操作不因同步、圖表或 PDF 產生未說明的阻擋式 modal。
- M fixture 的分析首個可用摘要目標 < 1.5s；L fixture至少比 baseline 改善 30%，再依實測調整絕對目標。
- production hot path 不留下無條件 debug log。

### 10.3 Bundle 與掛載

- 未開啟的 Add/Edit form 不進入初始頁面互動路徑。
- 未進入 active advanced tab 不掛載其圖表與 live query。
- 未點擊 PDF 預覽不載入 react-pdf/Yoga chunk。
- 底部導覽不重複預取同一路由。
- 每個全域 concern 只有一個 owner：同步、邀請、更新、session expired 各自互斥且有優先順序。

### 10.4 可用性與無障礙

- 所有主要 touch target 至少 `44 x 44px`。
- browser zoom 與 pinch zoom 不被禁止。
- dialog 有可讀標題、初始 focus、ESC 策略與 focus return。
- icon-only button 有 accessible name；不熟悉的 icon 有 tooltip。
- 不以顏色作為唯一狀態訊號。
- reduced motion 關閉 route、skeleton、pulse 與 ping 等非必要動畫。

## 11. 驗證矩陣

### 11.1 角色

- 未登入。
- 老闆。
- 員工一般角色。
- 員工管理角色。
- 角色載入中、查詢錯誤與邀請待處理。

### 11.2 市集階段

- 未報名／已報名。
- 已錄取／待開始。
- 營業中。
- 暫停。
- 當日收班但場次未完全結束。
- 已結束。
- 延期／取消。

### 11.3 資料與網路

- 空資料。
- S／M／L fixtures。
- 線上、離線、斷線後恢復。
- 待同步 0、1 至 4、5 以上。
- 本機資料庫初始化失敗與可修復狀態。
- 照片已上傳、本機待傳、待補、上傳失敗。

### 11.4 裝置

- 360 x 640 小型手機。
- 390 x 844 主流手機。
- 768 x 1024 平板。
- 1440 x 900 桌面。
- iOS PWA safe-area、Android PWA、一般 browser tab。
- 鍵盤、觸控、200% zoom 與 reduced motion。

## 12. 穩定性護欄

1. 每一 phase 只處理指定範圍，不夾帶資料 schema 或分析公式重寫。
2. UI component replacement 採 adapter，讓原本 callback、payload 與 error semantics 保持不變。
3. Dynamic import 前先測試 loading、error、offline 與首次開啟，避免把卡頓變成空白。
4. 角色未知時維持 fail-closed，不因 role-aware navigation 短暫顯示老闆入口。
5. 同步 surface 合併時不改 sync worker，只改 context subscription 與呈現 owner。
6. Analytics view model 先對 fixture golden values，再替換畫面資料來源。
7. 市集詳情拆分每次只移動一個責任，交易與照片 smoke tests 必須逐提交執行。
8. 不以全站 `overflow-x:hidden` 掩蓋版面錯誤；改由 viewport test 找出真正溢出元件。
9. 每一階段 production build、TypeScript、ESLint、單元測試與角色測試通過後才進下一階段。

## 13. 重大決策點

以下項目在執行時需要使用者確認，其他技術性拆分可持續自動推進：

1. 底部導覽正式改名為 `今日／市集／商品／分析／更多`，員工為四項。
2. 設定是否保留 `/settings` URL 但顯示「更多」，或新增 `/more` 並做 redirect。
3. 新的卡片密度與 8px 圓角視覺樣板確認。
4. 分析第一層三個問題的文案與商業優先順序。
5. 永久刪除資料是否增加重新驗證或輸入帳號文字的安全步驟。

## 14. 建議提交切片

1. `test(uiux): add role phase performance fixtures and baselines`
2. `feat(shell): add role-aware navigation and route matching`
3. `feat(ui): add shared buttons dialogs fields and state views`
4. `perf(sync): consolidate global progress surface and subscriptions`
5. `fix(a11y): restore zoom touch targets focus and reduced motion`
6. `feat(home): introduce adaptive today workspace`
7. `feat(markets): simplify market list around operating phase`
8. `refactor(products): share product forms and inline validation`
9. `refactor(markets): progressive market form and lazy overlays`
10. `feat(settings): replace settings catch-all with more index`
11. `feat(team): promote team and permissions management`
12. `refactor(data-ui): isolate recovery and destructive actions`
13. `refactor(analytics): add shared metrics view model and tabs`
14. `perf(reporting): lazy-load charts and PDF renderer`
15. `style(uiux): align visual tokens icons and mobile details`
16. `chore(uiux): remove verified legacy UI paths and stale docs`

每個切片都應可單獨 rollback，不累積成一次大 commit。

## 15. 完成定義

全專案 UI/UX 整合只有在下列條件同時成立時才算完成：

1. 老闆與員工的第一層導覽、首頁與工作流真正不同且符合任務。
2. 成交、照片、補拍、同步、權限與資料結果和重整前一致。
3. 設定不再是所有功能的堆放頁，危險操作與日常操作明確分離。
4. 分析先給決策，再提供細節，且隱藏內容不會提早重算與掛載。
5. Dialog、表單、按鈕、狀態、loading 與錯誤使用同一套 primitives。
6. 核心裝置與角色矩陣沒有水平溢出、遮擋、錯誤 active state 或不可恢復流程。
7. 效能指標達標，或有基於量測的明確剩餘風險紀錄。
8. 設計與稽核文件對得上實際程式，不再以 allowlist 或全域 CSS 隱藏問題。
9. 每個 phase 都有測試結果、視覺驗證與獨立 commit。

## 16. 建議開始點

第一個執行批次應是 Phase 0 加 Phase 1 的前半段：

1. 建立角色／階段 fixtures 與現況 baseline。
2. 將底部導覽改為角色導向並修正詳情頁 active state。
3. 啟用縮放與建立共用 Button／Dialog／ConfirmDialog。
4. 合併同步進度呈現並 memoize Sync context。
5. 移除重複 prefetch 與人為 500ms 等待。

這一批能先改善全站的方向感、阻擋感與可用性，又不需要碰已穩定的成交、成交照片或資料事件邏輯，是風險最低、回報最高的起點。

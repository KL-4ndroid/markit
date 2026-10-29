# 工作介面配色收斂與驗收

日期：2026-10-30，Asia/Taipei。依使用者同意的方向實作：中性卡片、一個品牌主色、必要狀態色。本文記錄實作與驗收；提交狀態以 Git 紀錄為準，線上部署另行確認。

## 配色分工

| 角色 | 使用方式 |
| --- | --- |
| 中性色 | 普通卡片、一般資訊、標頭、日期、設備、營收／正淨利／成交數，以文字層級、留白與分隔線辨識 |
| 品牌主色 | 主要操作、連結、目前選中；上層工作台使用實心主色，內層使用主色 10% 淡底、主色外框及深色粗體標籤 |
| 黃色 | 待繳費、待補照片、需要核對的時間、同步異常等需處理事項，保留文字／圖示，不把普通備註染成黃色 |
| 紅色 | 刪除、錯誤、逾期、負淨利等既有危險／異常語意 |
| 綠色 | 已繳費、營業狀態與成功保存的必要提示；普通正淨利不再另鋪綠底 |

不設定整站最多幾個 hex 值，也不強迫每頁展示全部狀態色。原品牌漸層、個人選擇的主題、圖表多組資料與商品分類的必要區別保留；沒有重設使用者主題或替換全站色票。

## 已實作

- 今日：一般營運摘要與同日多場改中性卡片；近期市集移除獨立彩色區塊底與日期標籤色；待繳費黃色方塊保留。照片／同步提醒改為中性或需處理的黃色，不再以粉／藍裝飾性分類。
- 市集列表：一般等待／排定狀態、備註入口與設備標籤改中性。收入、正淨利、成交數採同一中性底色；負淨利仍紅色，待繳費與已繳費的小標籤保留狀態辨識。
- 場次工作台：一般摘要卡不再依尚未開始／營業中／已結束整片鋪杏／綠／藍；文字狀態與小圓點保留。兩層分頁使用同一主色家族，內層增加清楚外框、深色粗體及既有 aria-selected／鍵盤操作。
- 每日表現：標頭、總計與互動資訊回中性；一般收入深色，負銷售利潤仍保留危險色。補登收入採主色外框的次要按鈕，指定日期以淡主色定位，已確認零收入文字與計算均保留。
- 現場／準備：收款標頭、普通互動卡、時間資訊與主辦備註去除多種彩底；交易成功提示維持成功綠色、待補照片保留需處理色。老闆與員工共用區塊同步調整。
- 共用元件：Tabs 選取樣式、次要 Button hover、表單折疊分區圖示與標頭統一；不修改觸控目標、標籤、事件、資料流、訂閱分界或角色 gate。
- 主題實驗室：主色／輔色標籤改為品牌語意，避免把使用者選的紫灰稱為霧藍。三個已退出正式首頁的獨立區塊調色控制不再展示；保留舊 JSON 欄位、預設色票、匯入／匯出與 Demo 的既有相容結構。未修改 Demo 元件或素材。

## 程式位置

- 首頁：[app/page.tsx](../app/page.tsx)、[TodayMarketCard](../components/home/TodayMarketCard.tsx)、[同日安排](../components/home/SameDayMarketArrangements.tsx)。
- 列表：[MarketListCard](../components/markets/MarketListCard.tsx)、[列表篩選](../app/markets/page.tsx)。
- 詳情：[工作台導航](../components/markets/MarketWorkspaceNavigation.tsx)、[內層分頁](../components/markets/MarketWorkspaceDetailTabs.tsx)、[摘要](../components/markets/MarketWorkspaceSummary.tsx)、[每日表現](../components/markets/DailyRevenueStats.tsx)、[收款](../components/sales/TransactionWorkspace.tsx)。
- 現場周邊：[時間軸](../components/markets/MarketTodayTimeline.tsx)、[備註](../components/markets/MarketReferenceNotePanel.tsx)、[準備事項](../components/markets/MarketFieldOpsSection.tsx)、[營業控制](../components/markets/MarketOperatingSessionControl.tsx)、[老闆詳情](../components/markets/MarketDetailScreen.tsx)、[員工詳情](../components/markets/StaffMarketDetailView.tsx)。
- 共用：[Tabs](../components/ui/Tabs.tsx)、[Button](../components/ui/Button.tsx)、[表單折疊區](../components/ui/FormSectionDisclosure.tsx)、[主題模型](../lib/theme-lab.ts)、[主題設定畫面](../components/dev/ThemeLab.tsx)、[主題回歸](../tests/theme-lab.test.ts)。

## 驗收與證據

- 手機實際查看今日、市集待準備／已結束、已結束場次回顧、待繳費場次管理、分析與新增營業／新增市集表單；表單取消，沒有新建或更改場次／收入。待繳費 1 場、待錄取 5 場、O 場次收入 261／淨利 21／成交 4 等原數值保持。未切換方案或員工角色。
- 內層分頁 ArrowRight 可由每日表現切至現金紀錄、ArrowLeft 可返回；選取語意、焦點與明確外框保留。開啟／取消新增市集、進入／返回場次正常。
- 分析頁在 390×844、1024×768、1440×900 下可視寬度與內容寬度分別同為 382／1016／1440，未見橫向溢出；另查看手機場次卡片／摘要。臨時 viewport 驗收結束後恢復。
- 目前使用者主題抽查：上層選中仍為 `rgb(105,96,118)` 主色、白字；內層為同主色 10% 淡底、`rgb(53,47,57)` 深色字、600 字重、主色外框。不是以更淡的文字來達成精簡。
- `theme-lab.test.ts` 除保留原主題匯入／匯出、舊欄位與核心對比檢查，亦檢查 9 組內建主題的淡主色選取面：標籤文字對比至少 4.5:1，選取外框對比至少 3:1。舊要求「首頁必須使用三種獨立區塊底色」的斷言依新需求調整。
- 已通過相關既有測試：market-list-ui、market-workspace、market-navigation-return、subscription-mobile-ui、daily-revenue-totals、theme-lab。沒有為低風險樣式變更新增逐行鏡像測試。
- 兩項既有舊斷言另列：today-home-ui 仍找 `initialView: searchParams.get('task')`；mobile-uiux-optimization 仍要求移位後的 `MarketReferenceNotePanel` 原文字出現在現場區塊之後。對提交前 HEAD 執行同樣查找均為 false（reference 索引 -1）。本輪只改該詳情檔的互動卡 class，未修這兩項無關舊測試，也未把它們算成通過。
- 最終修改檔 ESLint、mobile TypeScript、Web production build、mobile static build 與 35 項 segment aliases 通過；Web 與 mobile 建置包含最終外框／深色標籤修正。沒有宣稱整套 repo 測試全通過或進行新一輪 iPhone／Android 實機驗收。
- 圖片：`.codex-artifacts/color-refinement-home-mobile.png`、`color-refinement-review-mobile.png`；相關測試、lint、TypeScript 與建置日誌使用 `color-refinement-*` 前綴。最終 ESLint 日誌為 `color-refinement-final-lint.log`。

## 維護界線

新功能優先選用中性資訊面與主色操作，只有能說明用途的狀態才增加其他色彩；先看使用者是否需要辨別，再決定是否著色。不可全域把所有柔色 token 強制改白，避免連同圖表、分類、既有警示與個人主題一起破壞。

本輪沒有新增平台能力、網路／儲存存取、同步／寫入／權限契約。共享規則與資料模型不變，沒有原生套件或資料庫遷移；同一套呈現可供後續 iOS／Android 使用。照片上傳、訂閱、到期與財務口徑驗收不由這輪配色調整取代。

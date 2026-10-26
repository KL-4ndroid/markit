# 提示精簡與情境說明：第一批實作紀錄

實作／驗收日期：2026-10-25～26（Asia/Taipei）。依使用者「開始實作」授權，落實[全功能規劃](APP_CONTEXTUAL_HELP_PLAN_2026_10_25.md)中的必要性審查，以及表單、現金、心得、期限、角色與分析說明的第一批呈現調整。

本文件記錄本機增量，不表示整份全功能規劃已全部完成或正式部署。沿用目前工作目錄中既有的手機進入／返回修正，保留原作者其他未提交檔案。Demo 沒有檢視或修改；建置工具正常建置既有路由，不代表驗收 Demo。

## 實際改變

| 區塊 | 本批結果 | 來源 |
| --- | --- | --- |
| 共用說明入口 | 具名 ⓘ 按鈕、44px 最小點擊範圍、明確 dialog 語意。只放補充內容；既有名稱、錯誤與資料狀態留在原位置 | [ContextHelp](../components/ui/ContextHelp.tsx) |
| 說明窗口 | 沿用 Headless UI／AppDialog：手機底部面板、較寬畫面置中；內容可獨立捲動、頂部關閉與底部「關閉說明」保留；關閉由現有焦點管理返回入口 | [AppDialog](../components/ui/AppDialog.tsx) |
| 市集新增／編輯 | 省略核心資料介紹、泛用副標題、重複的「需要時展開」與優先填寫徽章；移除普通名稱範例；地點保留「地標或地址皆可」；日期直接標明可複選；抽成標明 % | [共用欄位](../components/markets/MarketFormFields.tsx)、[新增](../components/markets/AddMarketForm.tsx)、[編輯](../components/markets/EditMarketForm.tsx) |
| 商品新增／編輯 | 省略介紹性句子、名稱／描述的一般範例、不限庫存的情境舉例。售價與成本標明元，描述標為選填；成本的老闆可見／修改提示與原角色分支保留 | [共用欄位](../components/products/ProductFormFields.tsx)、[新增](../components/products/AddProductForm.tsx)、[編輯](../components/products/EditProductForm.tsx) |
| 繳費期限 | 台灣時間與未填時間的截止規則直接可見，移除上下重複說明；停止提醒／App 內通道等細節進「期限提醒方式」。未啟用、格式錯誤、移除期限等原控制保留 | [期限欄位](../components/markets/MarketPaymentDeadlineFields.tsx) |
| 固定安排 | 省略泛用表單介紹與名稱範例；地點改為選填並明示可填地標／地址；跨午夜、留空結束日、預覽與確認等必要資訊保留 | [固定表單](../components/recurring-operations/FixedScheduleForm.tsx)、[新增類型](../components/recurring-operations/AddOperationDialog.tsx) |
| 縣市整理 | 選填與下拉選項已表達的內容不再重複；批次限制、先預覽及需連線直接保留；更正路徑與批次作用範圍進「補填範圍」 | [縣市欄位](../components/markets/MarketRegionField.tsx)、[縣市整理頁](../app/markets/regions/page.tsx) |
| 開收攤現金 | 省略預設不記錄的重複長句，保留「選填」與實際選項；特殊範圍、方式切換和草稿契約進「盤點說明」。輸入收攤金額時才提示提領前盤點；不記錄並保存會清除原值的提醒直接保留 | [現金面板](../components/markets/MarketCashPanel.tsx) |
| 現金增減與差額 | 盤點增減仍明示不同於營收／淨利／對帳完成。公式、進出淨額範例、其他裝置與跨場範圍進「差額怎麼算」；無其他進出的假設、暫估、缺資料、未同步成交及未納入原因直接保留 | [現金比較](../components/markets/CashSalesComparison.tsx) |
| 心得閱讀／編輯 | 單場標頭用短的私人可見標示；人潮／停車等範例進「填寫靈感」，輸入區不再常駐長例句。日期篩選規則可按需查看；已選條件、日期錯誤、草稿、保存與衝突直接可見 | [心得工作區](../components/markets/MarketJournalWorkspace.tsx) |
| 主辦備註與交接 | 移除重述用途的介紹，保留「整場共用」「團隊交接」的語意，原內容與編輯操作保留 | [主辦備註](../components/markets/MarketReferenceNotePanel.tsx)、[交接](../components/markets/FieldNotesPanel.tsx) |
| 準備範本 | 將介紹縮為品牌共用、需連線、修改不影響已套用待辦；未保存編輯警告、套用項目／數量與去重結果保留 | [準備範本](../components/markets/PreparationTemplatePanel.tsx) |
| 角色工作範圍 | 老闆與員工仍直接看到目前存取狀態與工作摘要，詳細規則改用具名 ⓘ 查看；沒有修改角色、方案或關係的判斷 | [成員管理](../components/settings/StaffManagement.tsx)、[角色卡](../components/staff/StaffPermissionCard.tsx) |
| 分析指標說明 | 既有 InfoTooltip／MetricGuide 改用共用面板，保留呼叫端的指標含義、公式、範例與運用內容；移除動畫燈泡與泛用鼓勵段落，改善手機關閉／捲動與觸控範圍 | [InfoTooltip](../components/analytics/InfoTooltip.tsx)、[MetricGuide](../components/analytics/MetricGuide.tsx) |
| 單場標頭與營業規則 | 省略一般工作台介紹；多日市集「今日已收攤但還有下次」的必要狀態保留。管理區直接顯示格式化時段與延長記錄摘要，詳細今日／整場規則可查看 | [單場頁](../components/markets/MarketDetailScreen.tsx) |

分析指標的既有文字與公式輸入保持原樣，這次未重新裁決財務口徑、Q01 或改寫算法。也沒有將每個按鈕／欄位都加上 ⓘ；已清楚、沒有額外資訊的介紹直接省略。

## 保存、金額與權限邊界

- 沒有變更 Repository、事件 payload、RPC、RLS、資料表、migration、營收／庫存／差額算法、原生 adapter 或訂閱 gate。
- 成交待同步、心得／現金草稿、照片送達與比較來源完整性維持原有不同契約；沒有新建一個籠統「已同步」結果。
- `ContextHelp` 僅管理是否打開說明的元件狀態，沒有讀寫裝置儲存、觸發網路請求、建立偏好、提交父層表單或卸載編輯器。
- 新入口是 `type="button"`，有可讀名稱、`aria-haspopup="dialog"` 與展開狀態；讀屏與鍵盤沿用既有 Headless UI 焦點管理。
- 目前以共用 React 呈現和既有對話框實作，沒有新增平台依賴、套件、瀏覽器能力或 native 專案；未來手機可重用同一份文字與資料模型。

## 手機實際驗證

使用正式 App 本機 `http://localhost:3000`，沿用測試老闆帳號；不是 Demo，也不是用靜態假頁代替真實頁面。

1. 390×844：開啟新增市集，確認精簡後名稱、縣市、自由地點、可複選日期、時間規則與必要狀態仍可辨識。
2. 390×844：在既有測試場次的編輯表單，暫時修改名稱，開啟「期限提醒方式」。分別用底部關閉、右上關閉、Escape 返回；三者都只關說明，仍有一張編輯表單，焦點回到說明入口，測試輸入保留。
3. 上述臨時名稱在取消前已恢復原值，沒有提交修改或新增市集。此次沒有實際切換繳費／營業狀態或進行破壞性操作。
4. 390×844、360×640：盤點說明和差額說明可由真實現金回顧區打開；未記錄與零元、比較限制仍有明確用語。右上關閉為 44px、底部關閉為 48px。
5. 360×480 短高度：差額說明內容區高度約 253px、內容約 384px，可捲至約 131px；底部關閉仍在視窗內，沒有被長內容擠走。
6. 1024×768：同一份說明置中，面板寬 512px，未滿版拉長。
7. 心得編輯的私人可見標示直接保留，「填寫靈感」可開啟與返回；沒有提交心得或現金的營運修改。

短高度是桌面瀏覽器 viewport 驗證，不代表已測真實 iOS／Android 軟鍵盤、安全區、讀屏或系統返回手勢。真實裝置驗收仍屬後續工作。

證據：

- [期限說明與背景編輯器，390px](ux-evidence/2026-10-25/context-help-deadline-390.png)
- [盤點說明，390px](ux-evidence/2026-10-25/context-help-cash-390.png)
- [盤點說明，360px](ux-evidence/2026-10-25/context-help-cash-360.png)
- [差額說明，短高度且已捲動](ux-evidence/2026-10-25/context-help-comparison-short-height.png)
- [平板置中說明](ux-evidence/2026-10-25/context-help-cash-tablet.png)
- [心得填寫靈感，390px](ux-evidence/2026-10-25/context-help-journal-390.png)

## 程式驗證

- 新增 [共用說明與必要資訊回歸](../tests/contextual-help-ui.test.tsx)：表單內說明不提交、關閉時不渲染補充長文、欄位／金額單位／錯誤可辨、成本隱私與角色資格摘要仍直接可見。
- 既有表單／期限測試依新標籤、單位與說明入口更新，原驗證、manager 不能編輯名稱／分類／成本等邊界維持。
- 完整回歸清單發現既有[分析資訊架構測試](../tests/analytics-information-architecture.test.ts)尚未列入已提交的 `regions` 分頁；本次只補齊預期列舉及縣市標籤檢查，未變更分析或訂閱執行邏輯。營業工作台測試也同步既有老闆「先收款、再記互動」的順序，保留員工原有順序與權限檢查。
- [主內容地標檢查](../tests/main-landmark-ownership.test.ts)找到心得與縣市頁嵌套 `main`。AppChrome 已持有主內容，兩頁內層改為 `div`，保留內容與樣式，避免輔助閱讀工具遇到重複主內容區。
- 432 個測試檔已分段執行並通過；初次 `npm test` 在舊文字／版型斷言停止後，依原 runner 的環境條件續跑其餘清單，修正失敗項並逐項重跑。這是整份清單的分段驗證，不是宣稱單次 `npm test` 直接以 exit 0 結束。
- `npm.cmd run build`、`npm.cmd run build:mobile`、`npm.cmd run verify:mobile` 已通過；手機靜態產物為 379 檔、19.78 MiB，資產邊界檢查通過。修改元件與頁面的指定 ESLint 通過。
- `node scripts/generate-ui-copy-inventory.mjs --check` 通過；目前掃描 655 個來源、7,162 筆紀錄、5,188 種正規化文字。包含候選、內部代碼與不同執行情境，不代表畫面同時展示數量，也不將索引筆數下降當成 UX 改善的證明。

## 仍待後續切片

2026-10-26 後續：登入／權限與紀錄同步的狀態提示已進入[第二批實作](LOGIN_SYNC_UX_IMPLEMENTATION_2026_10_26.md)，下列為本批結束時的待辦；新版瀏覽器驗收的限制與目前進度以第二批紀錄為準。

- 登入／首次資料讀取、照片流程與帳號同步等區塊尚未全面逐句去重；目前沿用原有提示與安全分支，不假稱全部完成。
- 結算／報表、方案／購買／公開文件的必需揭露尚未重新編排。此批沒有變更價格、優惠、續訂說明或商店能力。
- 現有全站／各資料型別的狀態並未重建為新模型；後續若集中呈現，仍必須保留真實作用範圍，不能改保存契約。
- 可略過的首次教學偏好、完整說明中心、背景／原生通知沒有新增；背景／原生通知依既有決策留到正式 iOS 階段。
- 後續仍需使用新手／員工與不同資料情境驗證理解程度，不能用文字減少或單一老闆帳號測試推定所有人都更快。

本批未 commit／push。提示來源清單已重新產生，未來以[總索引](APP_UI_COPY_INDEX.md)追查新位置與目前用語。

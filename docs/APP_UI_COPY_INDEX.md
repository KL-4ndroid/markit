# 應用程式提示與介面文字總索引

建立：2026-10-25。用途：查找目前 App 內的提示用語、所在程式、用途與觸發情境，供後續統一文案、調整操作說明或檢查翻譯使用。這裡的「提示詞」指使用者介面用語，不是 AI 提示詞。

依目前已儲存的工作目錄盤點，包含尚未提交的手機進入／返回修正與首批提示精簡；不是只讀取上一個 Git 提交。初次盤點沒有更改 App，後續使用者已授權[第一批提示實作](CONTEXTUAL_HELP_IMPLEMENTATION_2026_10_25.md)，來源清單已同步重建。Demo 依先前要求排除，沒有檢視其內容。

設計與進度：[全功能提示與說明規劃（手機優先）](APP_CONTEXTUAL_HELP_PLAN_2026_10_25.md)，逐功能安排常駐、條件提示、展開說明、面板、通知與確認，包含保存／金額／權限的保留邊界與驗收順序；目前分批實作，未完成項目見實作紀錄。

2026-10-26 增量：[登入、資料準備與保存狀態](LOGIN_SYNC_UX_IMPLEMENTATION_2026_10_26.md)。已更新登入／權限重試、初次同步步驟、紀錄同步詳情與暫存表單文字；來源清單同步重建。新版手機真實點擊驗收因瀏覽器工具拒絕存取而待補，不以靜態引用或測試代替實際操作證據。

2026-10-26 現場排序增量：已收攤說明合併到 `MarketWorkspaceSummary`，上下文由原共享 session 提供；`MarketLiveSummaryActions` 承載提前開始／收攤／補登收入／查看回顧。`MarketOperatingSessionControl` 保留標準呈現，另提供摘要內的簡短動作與二次確認；`MarketCashPanel` 的盤點說明改資訊圖示，補充內容仍可查看。[實作與驗收](MARKET_TAB_PLACEMENT_REVIEW_2026_10_26.md)記錄階段、用途與限制，清單已重建。

## 從哪裡查

2026-10-26 分頁位置調整：[檢視與修正紀錄](MARKET_TAB_PLACEMENT_REVIEW_2026_10_26.md)。今日時間軸與營業規則文案移至 `components/markets/MarketTodayTimeline.tsx`，管理的重複場地備註展示移除；時程標籤與設定時間入口同步收錄。自動清單已重建。

2026-10-26 選擇器修正：日期／時間欄位透過 `hooks/useDateTimePicker.ts` 共用生命週期，CSS 與 DOM 安裝移到 `lib/platform/web/date-time-picker.ts`；既有日曆文字仍由 `lib/date-time-picker/DateTimePicker.js` 產生。來源位置與雜湊已重新產生；[手機複驗](MOBILE_FULL_FLOW_ACCEPTANCE_2026_10_26.md)另記錄真正操作結果。

| 想做的事 | 文件 |
| --- | --- |
| 看目前數量、分類與所有功能分冊 | [自動統計與分類入口](ui-copy/SUMMARY.md) |
| 依文字搜尋、依功能／類型／來源篩選 | [完整 TSV 清單](ui-copy/inventory.tsv)，可用試算表的「從文字／TSV 匯入」開啟；UTF-8 編碼 |
| 讓程式或未來代理追查原文、綁定、位置與來源雜湊 | [完整 JSON 清單](ui-copy/inventory.json) |
| 確認某個檔案有沒有掃描、是否未命中文字 | [逐檔覆蓋表](ui-copy/coverage.md) |

分冊按來源檔案的主要職責分類；同一元件可能被多個頁面使用。需要跨功能找同一句話時，應查完整 JSON／TSV，而不是只看一個分冊。

| 功能範圍 | 逐項紀錄 |
| --- | --- |
| 今日首頁、問候、提醒方塊、導覽、共用對話框 | [首頁與共用介面](ui-copy/01-home-common.md) |
| 市集清單、場次、報名狀態、繳費期限、開收攤 | [市集與繳費](ui-copy/02-markets.md) |
| 商品、價格、分類、庫存 | [商品與庫存](ui-copy/03-products.md) |
| 私人心得、集中搜尋、草稿、出攤待辦與範本 | [心得與準備](ui-copy/04-journals-prep.md) |
| 零用金、面額、開收攤現金、現金銷售比較 | [現金與差額](ui-copy/05-cash.md) |
| 固定營業安排、地點、縣市分類／補填 | [固定安排與縣市](ui-copy/06-schedules-region.md) |
| 收款、成交、補登、刪除、成本、照片證明 | [收款與成交](ui-copy/07-sales.md) |
| 數據、指標定義、比較、結算與匯出文件用字 | [分析與報表](ui-copy/08-analytics-report.md) |
| 登入／註冊、帳號、登出、員工、團隊及角色 | [帳號與權限](ui-copy/09-account-team.md) |
| 方案名稱、付費資格、限制與購買準備說明 | [訂閱與方案](ui-copy/10-subscription.md) |
| 本機／雲端、送達狀態、離線、衝突與同步 | [同步與資料](ui-copy/11-sync.md) |
| 隱私、條款、支援、PWA 安裝與離線靜態頁 | [政策與平台](ui-copy/12-public-platform.md) |
| 救援、資料工具、開發／模擬頁、獨立修復 HTML | [測試工具附冊](ui-copy/13-test-tools.md) |
| 設定、外觀與主題 | [設定與外觀](ui-copy/14-settings.md) |

## 每筆記錄包含什麼

| 欄位 | 意義 |
| --- | --- |
| ID | 本次來源位置的識別碼；由檔案、字元位置、類型與文字產生。移動或修改來源後可能改變，不是執行中的翻譯 key |
| 用語／動態範本 | 整理空白後的可讀文字。`${...}` 保留程式插值；例如數量、日期、角色與錯誤原因，不捏造執行結果 |
| 來源 | 相對專案路徑、實際行號與欄位位置；Markdown 可點回原始檔 |
| 類型／用途 | 區分按鈕／說明、輸入提示、讀屏／圖片文字、Toast／確認、狀態設定、錯誤來源、共用文案、HTML 範本與動態入口 |
| 所在符號 | 所屬元件、函式、變數或屬性，協助找出使用位置 |
| 觸發條件 | 來源附近的 `if`、三元式、`&&`、錯誤處理等語法條件；沒有局部條件時標示需查畫面／呼叫端 |
| 接線／表面 | 正式頁面靜態引用鏈、測試工具、API、未追到正式引用、獨立 HTML 或平台處理碼等 |
| 同檔旗標 | 該檔直接出現的公開旗標名稱，供追查分支。不是旗標實際值，也不表示每一句話都受全部旗標控制 |

JSON 另保留 `rawText`（未整理空白的文字／範本）、`sourceText`（來源片段）、字元起迄位置、動態 `binding`、引用關係及逐檔 SHA-256。需要精確比對換行、跳脫字元或檔案版本時，應以這些欄位和原始碼為準。Markdown／TSV 是閱讀及搜尋版本。

用途和條件是依語法與元件位置產生的索引描述，並非每個分支都已人工操作驗收。例如 `setStatus(...)` 也可能只更新內部狀態；清單會保留「需查使用端」的標記，不能直接斷言使用者一定會看到。

## 哪些能算是使用中的提示

這份清單刻意保留來源證據的差別，避免漏找，也避免把保留程式當成正式功能。

| 證據類別 | 如何解讀 |
| --- | --- |
| 直接呈現定義 | JSX／HTML 文字、可辨識的提示屬性、Toast、確認視窗或 manifest 文案。仍須搭配角色、頁面、旗標與實際分支判斷 |
| 執行時綁定入口 | 例如 `toast.error(error.message)`、`{statusMessage}` 或元件的 `description={...}`。這裡記錄入口，不代表文字只可能有一種 |
| 文案生產端，須查使用端 | 共用 label／說明、錯誤 helper、狀態設定與 HTML 字串範本。可能被顯示，也可能先被轉譯或攔截 |
| 候選，非已證實提示 | 可讀的中／英文來源值；其中包含比對字串、預設資料、舊程式或其他非顯示用途。需追到讀取端才列為實際提示 |
| 內部代碼，非人類提示 | 機器可讀的錯誤／狀態碼。收錄目的是追查它如何變成人類提示，不將它混算成使用者文案 |

正式頁面引用鏈只表示檔案可由目前 `app` 路由／版面經靜態 import、export 或固定字串 dynamic import 找到。它不分析任意執行期載入，也不證明某功能已經開放、後端 migration 已執行或原生商店已上線。

若只想先審查正式介面的用語，可先在 TSV 篩選「直接呈現定義」及「正式頁面靜態引用鏈」，再依頁面、角色與功能旗標確認。若要改某一句話，仍應回到完整清單搜尋相同文字，檢查共用 helper 與其他出處。

## 幾個實際查找例子

| 用語／情境 | 出處 | 用途與注意事項 |
| --- | --- | --- |
| 「登入成功。」 | [LoginModal](../components/auth/LoginModal.tsx#L125) | 登入成功後的短暫通知；其他登入失敗與加入團隊結果也在此元件分開記錄 |
| 「待繳費」與待辦數量 | [MarketPlanningOverview](../components/home/MarketPlanningOverview.tsx)、[市集清單](../app/markets/page.tsx) | 同一概念有首頁摘要與清單篩選兩個出處，不合併成一筆而遺失位置 |
| 「今天截止」「已過繳費期限」 | [繳費期限共用模型](../lib/markets/market-payment-deadline.ts) | 依場次狀態、期限與台灣時間組成提醒；畫面讀取這些值，修改時應找生產端與使用端 |
| 「可略過不記錄；不影響正常開攤與收攤。」 | [MarketCashPanel](../components/markets/MarketCashPanel.tsx) | 現金紀錄為選填；此補充內容在「盤點說明」查看，標頭與選項仍可辨識選填／不記錄 |
| 「草稿已保存在這台裝置，尚未送達雲端。」 | [MarketCashPanel](../components/markets/MarketCashPanel.tsx) | 本機草稿保存後設定的狀態；與實際雲端保存成功文案分開追蹤 |
| 「以下顯示已保存版本；本機草稿請從『續寫／處理草稿』開啟。」 | [MarketJournalWorkspace](../components/markets/MarketJournalWorkspace.tsx) | 區分已保存心得與未送出的編輯草稿；實際引號與原文以逐項清單為準 |
| 「需要有效的 Team 資格」相關說明 | [成員存取呈現 helper](../lib/permissions/staff-access-presentation.ts) | 區分方案資格、邀請狀態與角色能力；文案不能作為授權依據 |
| `Local changes discarded` | [AuthCacheBlockedDialog](../components/auth/AuthCacheBlockedDialog.tsx#L43) | 英文操作結果也收錄，方便日後做繁中一致性檢查；本次未改寫 |
| 「您有新的通知」 | [Web Service Worker](../public/sw.js#L101) | 推送 payload 不存在時的備用文字；只有處理碼，不能據此認定背景通知服務已完成 |

## 盤點範圍與限制

1. 掃描 `app`、`components`、`lib`、`hooks`、`types` 的 TS／TSX／JS／JSX，以及非 Demo 的 `public` HTML／JS 與 `public/manifest.json`。包含錯誤與驗證訊息、確認文字、按鈕／頁籤／欄位、placeholder、aria／alt、狀態、政策、報表文字及動態綁定。
2. JSX 相鄰文字與插值會整理成顯示範本；條件式中的不同文字分支也可各自查找。因此紀錄數不是「畫面數」，也不等於不同文案的數量。相同字在不同來源位置保留各筆。
3. 排除 Demo、套件依賴、測試 fixture、說明文件、開發腳本與純 console／logger 日誌。沒有讀取 `.env`、帳號內容、雲端市集或其他營運資料。
4. 使用者自行輸入的品牌／場次／商品名稱、備註、心得及後台未來可能設定的動態內容，不可能事先逐句枚舉；清單記錄可辨識的動態顯示入口。第三方／瀏覽器／作業系統原生提示、Supabase 原始錯誤、SQL 例外及原生 plugin reject code，若經錯誤入口流入，需由該入口追查；不把歷史 SQL 或原生平台內建詞彙當成目前 App 自訂介面文案。
5. `public/offline.html` 是獨立靜態頁。現有 `public/sw.js` 沒有攔截 fetch 導向它，故清單不宣稱一般離線流程必然會看到它。頁內關於「所有數據都安全地儲存在裝置」的舊說明照錄為來源，不能作為資料保證或取代目前雲端為主、裝置快取／草稿的設計。
6. `/recovery` 與 `/settings/data` 依既有 `TEST_TOOLS_ENABLED` 邊界管理，正式版不以救援工具作一般入口；規則見 [build-profile](../lib/app/build-profile.ts)、[建置策略](../scripts/lib/test-tools-build-policy.mjs)、[Next 設定](../next.config.mjs)。其他 debug／smoke／工具各有自己的條件。獨立 `public/*fix*.html`／`sw-test.html` 另列，不推定它們一定受同一個旗標保護。
7. 訂閱相關字樣是當前來源紀錄，不取代 [訂閱完整檔案導航](SUBSCRIPTION_FILE_INDEX.mk) 的 canonical 狀態；舊 Free／Pro／Team、模擬、草案與未啟用能力必須區分。沒有更改方案、價格、購買／恢復或付費資格。
8. 這是完整掃描已列範圍的來源索引，不是逐個帳號、每種角色與所有條件都操作過的執行期清冊。無法靜態判定的部分已保留候選／綁定／接線狀態，不當成已驗收的顯示行為。

## 未來怎麼維護

來源文字仍在原本程式中。這份索引不是第二份可覆寫 App 的文案設定，也沒有新增執行期相依套件。修改時應先搜尋文字或來源檔，再確認用途、資料保存口徑、權限與其他呼叫端；只改文件不會改變畫面。

```powershell
# 重新依目前已儲存來源建立所有分冊、JSON、TSV 與覆蓋表
node scripts/generate-ui-copy-inventory.mjs

# 核對清單與目前來源是否一致；過期會以非 0 狀態結束
node scripts/generate-ui-copy-inventory.mjs --check

# 驗證擷取規則：分支、動態文字、英文、位置、HTML、Demo 排除等
node --test tests/ui-copy-inventory.test.mjs

# 例：找同一句話的所有紀錄
rg -n '尚未送達雲端' docs/ui-copy -g '*.md'
```

請勿手動編輯 `docs/ui-copy` 的自動產物。若未來新增其他來源根目錄、文案 JSON、翻譯機制或新的顯示通道，需同步調整 [產生器](../scripts/generate-ui-copy-inventory.mjs)、[語法規則](../scripts/lib/ui-copy-inventory.mjs) 與[測試](../tests/ui-copy-inventory.test.mjs)。每次改完提示文案或移動來源位置後重新產生，將來源修改及清單一起提交，避免索引過期。

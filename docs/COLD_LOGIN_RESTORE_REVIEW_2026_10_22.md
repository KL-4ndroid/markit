# 全新瀏覽器登入與舊資料恢復實測

狀態：原始實測與方案保留如下；後續已依使用者授權實作主要修正，最新結果見文末「後續實作與驗收」。原始實測於 2026-10-22 台灣時間約 23:12 開始登入。

## 實測結論

使用者對首次載入效率的疑慮成立。帳密驗證與雲端事件下載相對快；固定延後首次同步及逐筆本機重播才是本次較大的成本。
更重要的是，新裝置恢復後出現成交筆數不一致與待補照片狀態誤判，應先修正正確性，再進行效能優化。

| 項目 | 實際結果 |
| --- | --- |
| 登入 | 成功，auth POST HTTP 200，約 0.973 秒 |
| 首次同步 | 角色確認後仍經一般同步節流，約等 5 秒才開始 |
| 歷史事件下載 | 259 筆，約 0.322 秒；Network 記錄傳輸 25,995 bytes，非未壓縮 JSON 大小 |
| 市集補齊 | 27 場；先讀雲端基本資料並歸零累加型摘要，再重播事件 |
| 逐筆重播 | 第一筆處理到尾端日誌約 6.17 秒；尾端距登入按下約 15.0 秒 |
| 已有快取重開首頁 | 約 1.135 秒看到今日場次；這是可見資料時間，不代表背景同步已完成 |
| 新裝置成交摘要 | 雲端／有效事件應為 3 筆，畫面卻顯示 4 筆；收入 350、銷售利潤 240、淨利 140 正確 |
| 新裝置待補照片 | 現場顯示「照片已齊」，未還原原裝置仍有的待補工作 |

耗時是這次本機 Next.js development、目前網路及少量測試資料的觀察值，不是正式環境 SLA，也不是 iOS 實機成績。

## 測試環境與邊界

- 指定入口 `http://127.0.0.1:3000/`，使用者提供的測試帳號 `123@123`。未把密碼存入報告、擷取資料或程式碼。
- 使用與既有 Chrome 分開的 in-app browser 儲存環境，從未登入歡迎頁與空白帳密表單開始。
  首輪 259 個雲端事件全數進入待處理清單，未走既有 event ID 跳過分支，觀察的是本機沒有該帳號事件快取的首次恢復路徑。
  原 Chrome 的登入、本機資料與其他網站未清除；沒有把「同一個 Chrome 新開分頁」當成乾淨環境。
- 一開始設定視窗 390×844，但嵌入瀏覽器原有 75% 縮放使實際 CSS viewport 為 520×1125。
  後續以 per-tab device metrics 校正為實際 390×844、DPR 1，再核對成交／照片畫面及已有快取的重開流程。
  首輪與快取重開的視窗條件不同，不以兩個數字計算嚴格加速倍率。
- 首輪流程包含登入、角色查核、雲端下載、IndexedDB 重播、首頁、市集回顧及現場提醒；另做一次已有快取的首頁 reload 對照。
- 沒有新增／修改成交、市集、商品，沒有套用 migration、手動同步重送、清除快取、執行救援、相機操作或上傳照片。
  沒有修改 Demo、原生包裝、商店付款或權限規則。僅新增本報告、更新既有驗收紀錄，並保存忽略版本控制的診斷產物。

## 流程與時間證據

登入按下時間：2026-10-22 23:12:36.692（`2026-10-22T15:12:36.692Z`）。

| 相對登入時間 | 實際觀察 |
| --- | --- |
| +0.30 秒 | 登入表單仍顯示處理中 |
| 約 +1.06 秒 | 密碼驗證回應完成；擷取畫面是骨架，DOM 只有 Dev Tools／alert，不能將這個 DOM 誤稱為白畫面 |
| +1.57 秒 | 收到 SIGNED_IN 日誌 |
| +2.58 秒 | 「載入數據中／正在準備數據」覆蓋在首頁上 |
| +7.12 秒 | push 前置 profile 查核開始；此前首次同步受到約 5 秒節流延後 |
| +7.13 秒 | 仍顯示「正在準備數據」「首次登入可能需要較長時間」，底層首頁則是尚未載入資料的空狀態 |
| 約 +7.82～8.14 秒 | 259 筆 events 下載 |
| 約 +8.19～8.76 秒 | 取得並逐筆寫入 27 場市集基本資料 |
| 約 +8.83～15.00 秒 | 逐筆處理歷史事件，最後為 `Owner event pull complete: processed 232/259 events` |
| +30.02 秒觀察點 | 已移除載入視窗，今日場次、待繳費 2 場、待錄取 6 場、近期市集出現 |

**+30.02 秒是下一次畫面採樣的觀察點，不是精準完成時間。** +7.13～30.02 秒間沒有連續畫面擷取，
所以不能宣稱實際載入整整花 30 秒，也不能宣稱整段都沒有進度條。網路事件與重播日誌有較精確時間；
後續驗收須連續採樣到可見資料與一致性確認都完成，再量測改善幅度。

快取重開的連續採樣為：+0.404 秒啟動畫面、+0.854 秒過渡骨架、+0.948 秒首頁暫稱沒有市集／報名、
+1.135 秒切換為真正的今日場次與報名提醒。約 0.19 秒的錯誤空狀態已由 DOM 擷取證實。

### 請求數的解讀

登入只有一個 `POST /auth/v1/token?grant_type=password`，另一個同網址請求是 OPTIONS 預檢，不是重複登入。
本輪實際觀察到 user_settings 三次相同 GET；staff_relationships 三次 GET，其中角色查核與邀請查核的 select 不同，邀請查核重複。
應將 OPTIONS 與真正 API 查詢分開統計，也不可為了減少請求而共用過期角色授權。
這是 development 觀察值，Strict Mode／重複掛載可能放大讀取次數，正式環境仍需再量測。

## 發現與優化優先順序

### CL-01／P0：新裝置重播後成交筆數錯誤

指定驗收場次 `f69d8d90-667c-4af0-ad00-4c52e60aafa8`：

| 來源 | 收入 | 銷售利潤 | 成交次數 |
| --- | --- | --- | --- |
| 本輪真正下載的雲端 markets 回應 | 350 | 240 | 3 |
| 有效事件：正常成交 1＋人工補登 2 | 350 | 240 | 3 |
| 全新瀏覽器回顧／每日表現 | 350 | 240 | **4** |

`owner-pull-service.ts` 依 timestamp 升冪取得事件，直接呼叫有增減副作用的 handler。
舊版當天補登的 timestamp 是當日 23:59:59.999；較早撤回的 tombstone 因此先到。

本案例的筆數路徑：正常成交 `0→1`；先處理撤回 2 筆時被 `Math.max(0,1−2)` 截成 0；
稍後再處理已撤回的補登 2 筆成為 2；最後原有補登再加 2，得到錯誤的 4。
收入未觸及負值截斷，因此仍是 350，不能只核對收入就當作恢復正確。

已使用目前正式 handler 在獨立 fake-indexeddb 記憶體資料庫重現：

- 現有 timestamp 順序：收入 350、利潤 240、成交 4、庫存 8。
- 先處理被引用原成交再處理 tombstone：收入 350、利潤 240、成交 3、庫存 8。
- 重現程式沒有連線雲端、沒有寫入瀏覽器資料，也沒有把示範排序裝入 runtime。

同步後的 reconciliation 只在差異像整數倍重複時自動修正；4／3 不符合，會以可能不完整資料而略過，不能靠現有機制補救。
上一輪修正只讓既有同日補登時序不阻擋 App 開啟，並防止新補登使用未來時間；**尚未解決舊事件的新裝置重播正確性**。

**建議切片 A：** 建立共用、可測試的事件依賴順序：同場次原事件必須先於它的 tombstone；
處理缺少原事件、相同 timestamp、重複刪除及跨場次目標，不能僅改 timestamp 或永久改寫舊事件。
不要直接排除所有已刪成交來推算庫存，否則可能改變未知 legacy 補登旗標的保守庫存語義。
單筆事件保存與投影套用的失敗結果也必須可辨識，避免先保存 event ID，handler 失敗後下次永遠略過。
先以全新本機資料庫回歸，再重新實測乾淨環境；不以無範圍的 auto-repair 或放寬完整性檢查作為替代。

### CL-02／P1：首次同步不需要等待一般 5 秒節流

`useSync` 預設 throttle=5000，首次角色就緒也是呼叫 throttledSync。這適合密集輸入的背景合併，對全新登入只是固定等待。

**建議切片 B：** 角色確認、帳號身分綁定與現有同步鎖都有效後，首次恢復立即啟動；一般編輯／重連的節流保留。
保留前景／背景、網路、權限 freshness 與 pending 本機資料的保護，不跳過這些檢查。
驗收可先要求「角色確認到第一個恢復請求不再固定延後 5 秒」，不能因此保證整個流程 1～2 秒完成。

### CL-03／P1：重播與補齊採大量逐筆 IndexedDB 往返

只有約 26 KB 的事件傳輸，下載約 0.32 秒，後續逐筆處理卻約 6.17 秒。
流程包含逐事件 semantic duplicate 查詢、事件 add、handler 內多次查改 market／product／dailyStats，
並逐事件發布全域進度；hydration 又逐市場查詢及 put。這些是從原始碼確認的成本來源，尚未以 profiler 分別量化占比。

27 場先 hydrate，再重播 27 個 market_created，會遇到已存在投影的 ConstraintError。
259 個事件與 232 成功計數的差正好是 27；路徑可解釋此數字，但目前沒有逐筆 outcome，不能把 27 全部當作資料遺失，也不能把所有 ConstraintError 都當作成功。

**建議切片 C：** 在切片 A 正確性通過後，批次查 existing IDs／市場、批次保存已驗證事件，
使用有界交易批次產生投影，減少重複讀取及 liveQuery 中間狀態通知；進度節流到合理畫面更新頻率。
分別記錄 received／already-present／applied／expected-skip／failed；只有真正可重建的邊界才能更新下載游標。
批次交易需保留中斷、帳號切換、程序終止及未送出本機事件；不能新增無限制自動重試或擴大寫入路由。

### CL-04／P1：載入狀態與空資料混在一起

首輪前 7 秒只告知準備資料；使用者不知道目前正在等待、下載還是重建。
快取重開時又短暫顯示「今天沒有排定市集」「目前沒有待處理報名」，再切成真正有資料的首頁。
`InitialSyncDialog` 也在 ERROR 後 2 秒或 SYNCING 30 秒後關閉並標成已完成；這是原始碼風險，本輪沒有注入錯誤／30 秒超時來實測。

**建議切片 D：** 共用初始化狀態至少區分驗證、確認角色、讀取清單、整理紀錄、可用、部分失敗。
資料尚未完成查詢時顯示骨架或「正在讀取市集」，只在查詢完成且結果空時顯示真的沒有市集。
使用「正在下載紀錄」「正在整理紀錄 120／259」「已可查看市集」等使用者能理解的進度，不直接顯示 event type／UUID。
ERROR／超時不能標成完成；有既有可靠快取時允許明確標示資料時間，沒有快取時提供可恢復的重試／協助入口。

### CL-05／P1：照片提醒恢復不完整，卻宣稱照片已齊

同一驗收場次原裝置仍有待補照片工作；本輪沒有上傳照片，全新裝置現場卻顯示「照片已齊」。
`useSalesPhotoEvidenceFlow` 的 pendingCount 來自本機 pending-creation 佇列；
read model 只查 `salesPhotoEvidencePendingCreations`，沒有舊紀錄就回傳空陣列，UI 把 0 解讀成完成。
這證明提醒狀態的恢復缺口，不代表已證明雲端照片檔案遺失。

**建議：** 先將「此裝置沒有待補佇列／狀態尚未確認」與「已確認照片齊全」分開。
再設計可恢復的照片要求／完成狀態契約，對有效成交與雲端已上傳證據進行有範圍的核對。
缺少原圖時不得假裝可恢復檔案；也不能用市集目前開關，直接替所有歷史成交補建要求。
不新增自動相機、照片上傳或未授權 retry worker。

### CL-06／P2：重複設定讀取與載入路徑的串接

user_settings 三個相同 GET 可先由相同 userId 的單次在途讀取共享；目前品牌名稱、照片設定與快捷操作分別讀取。
owner pull 前的 profile、market IDs、team IDs、events、缺少的 markets 又串接多層等待。

在前述 P0／P1 通過後，再評估同帳號／角色範圍的 bootstrap 讀取合併與可安全並行的查詢。
不要把角色／權限 freshness 當一般設定永久快取，也不要直接使用尚未校正的雲端舊統計作為財務捷徑。
若將來採快照＋增量，必須先有一致版本、完整歷史邊界與游標；目前 hook 明確停用 snapshot sync，不應只為速度直接重啟。

## 建議實作順序與驗收

1. 切片 A：修正新裝置重播正確性。相同帳號、相同事件集合，在正常即時操作／乾淨重建／已有快取增量都必須是 350／240／3／庫存 8。
2. 切片 B＋D：移除首次固定延後、建立真實初始化狀態，消除錯誤空狀態；故障／超時不冒充完成。
3. 切片 C：批次本機處理與進度更新；以相同環境與資料重新計時，先分別量測下載、寫入、投影、首次可靠畫面，不只比 spinner 關閉時間。
4. CL-05：先修正照片狀態誤導，再補齊可恢復的提醒契約。最後評估 CL-06 的設定讀取與 bootstrap 合併。

任何實作都保留共用 TypeScript domain／投影／同步契約；網路、前景生命週期及裝置能力仍經 lib/platform。
不把 browser storage 或 DOM 作為業務真相來源，iOS／Android 沿用相同排序、資料狀態與測試。

## 原始碼導航

- `components/auth/LoginModal.tsx`、`components/auth/AuthGuard.tsx`：驗證與登入／已登入畫面交接。
- `lib/supabase/auth-context.tsx`、`lib/role-context.tsx`、`hooks/useUserRole.ts`：身分、設定與角色確認。
- `hooks/useSync.ts`、`lib/sync-context.tsx`、`lib/sync/sync-runtime-state.ts`：首次同步節流、進度、全域同步鎖。
- `components/sync/InitialSyncDialog.tsx`：準備／完成／錯誤／超時畫面。
- `lib/sync/owner-pull-service.ts`、`lib/sync/owner-market-hydration-service.ts`、`lib/sync/sync-push-service.ts`：下載、補齊與 profile 前置查核。
- `lib/db/events.ts`、`lib/sync/projection-reset.ts`、`lib/sync/local-projection-repair.ts`、`lib/sync/projection-reconciliation.ts`：事件副作用、重播與現有修正邊界。
- `hooks/useSalesPhotoEvidenceFlow.ts`、`lib/sales/photo-evidence-pending-creation-read-model.ts`、`components/markets/MarketDetailScreen.tsx`：照片提醒來源與完成文字。

## 本機證據

忽略版本控制的 `.codex-artifacts/cold-login-20261022/`：

- `states.json`、`state-00`～`state-05` 的 DOM／截圖：首輪畫面採樣。
- `network-redacted.json`、`request-metadata-redacted.json`、`summary.json`：移除 headers／帳密 body／權杖的請求與時序摘要。
- `console-redacted.json`：重播與 hydration 日誌。
- `cloud-summary-and-counts.json`、`fresh-account-detail.txt`、`detail-390-final.png`：259 筆事件、雲端 3 筆與新裝置 4 筆對照。
- `final-detail-390.txt`／`final-detail-390.png`：快取重開後仍為 4 筆，並非畫面短暫尚未更新；保留實際 390×844 檢查分頁。
- `fresh-live-reminders.txt`、`fresh-live-reminders-390.png`：新裝置「照片已齊」畫面。
- `warm-states.json`、`warm-0`～`warm-3.png`：快取重開與空狀態閃現。
- `replay-case.json`、`reproduce.ts`、`reproduction-result.json`：真實測試案例、記憶體重現程式及 4→3 的依賴順序對照。

以上為原始稽核切片，當時未修改 runtime；後續實作結果如下，不回寫原始量測值。

## 後續實作與驗收（2026-10-23 完成此切片）

使用者已授權依建議實作。共用同步、投影與本機狀態仍以 TypeScript／Dexie 實作；生命週期與網路沿用平台 ports，初始同步的會話記號改用既有 SessionStatePort。

| 項目 | 本次交付 |
| --- | --- |
| CL-01 | `owner-event-replay.ts` 穩定依賴排序：同場次原成交／互動先於刪除；商品／市集建立先於使用它的事件。缺來源、跨場次來源、循環直接失敗；同目標重複刪除不重複扣回。 |
| CL-01 舊快取 | 每個 owner／重播版本首次完整讀取歷史。僅對存在「刪除時間早於或等於原始紀錄」的場次，在 owner 符合、本機與完整雲端事件 ID 集合相同、全部已同步時重算市集／每日摘要。保留事件、照片、庫存及其他場次；不放寬既有 incomplete-local 自動修復規則。 |
| CL-02 | 角色／同步條件就緒後立即執行首次同步；一般編輯與連線事件仍保留原節流。不同身分的舊流程不能更新新身分進度或釋放新同步鎖。 |
| CL-03 | 50 筆一批的本機交易同時寫事件與投影；非預期錯誤使整批回滾並停止，游標不前進。已提交的前批保留，再次同步按 ID 接續。market_created 已由 hydration 建立屬明確情況，不再吞掉任意 ConstraintError。 |
| CL-03 下載 | 每頁 500 筆，排序 created_at／id，持續下載至最後一頁；游標採含邊界讀取，避免毫秒精度漏掉同邊界事件。新增可存取但本機尚無的場次時也先讀完整歷史。市場存在查詢改 bulkGet，補齊寫入改 bulkPut。 |
| CL-04 | 顯示讀取歷史、補齊市集、整理紀錄與實際批次進度。只有 SUCCESS 寫完成記號；錯誤／離線可重試，30 秒僅提示仍在處理並可查看本機，不冒充完成。首頁 useMarketsQuery 區分讀取中、失敗、真正空資料。 |
| CL-05 | 現場摘要與收款入口不再用本機零待補宣稱「照片已齊」；讀取中／失敗有獨立文字，清單說明本機範圍及其他裝置未上傳照片的限制。 |
| CL-06 | 同 userId 的 user_settings 在途請求共用，完成後移除，儲存設定時失效；不長期快取角色／權限。沒有待上傳事件時省去 profile 網路查核。staff_relationships 的兩類查詢未合併，保留為正式環境量測項目。 |

owner 重播以雲端事件 ID 為去重依據，兩筆不同 ID、同日期同金額的合法成交都會保留；不再把這種相同金額當作重複成交跳過。既有 semantic fallback helper 保留給原有其他用途。

### 第二輪發現並修正 CL-07：雲端資料誤判為匿名資料

加速後，閒置排程的匿名資料檢測可能在恢復完成後執行；舊條件 `actor_id !== currentUserId`／`owner_id !== currentUserId` 將已同步的團隊／歷史紀錄當成未綁定資料。
在第二輪首次登入 +10.020 秒採樣時，誤顯示 8 場／94 個事件及「保留並同步／清除」選項。沒有按下這些選項，沒有因此遷移、清除或上傳。

`lib/supabase/migration.ts` 現在只將 owner／actor 空白或 local 且尚未 synced 的紀錄列為匿名資料；使用者明確選擇遷移時也只改這個集合，不能重新指派已同步或其他帳號紀錄。
fake-indexeddb 測試包含雲端 legacy local 身分、團隊成交、另一帳號離線紀錄與真正匿名紀錄，確認只遷移最後一類。

### 實際操作驗收與量測限制

- 在原隔離瀏覽器 `http://127.0.0.1:3000/`、實際 390×844 手機視窗重新開啟，原先 4 筆已變為 3；回顧與每日數字均為收入 350、銷售利潤 240、淨利 140。照片入口及清單文字已逐一實際點選核對。
- 為保留原 Chrome 與上述快取，另以 `http://localhost:3000/` 的獨立 origin 儲存空間從歡迎頁登入。同一本機程式、同帳號、259 筆歷史，+3.634 秒採樣已顯示「正在整理歷史紀錄 259 / 259」與正確首頁資料；這是進度觀察點，並非精準的最終可操作時間。
- 此補充入口實際 CSS 視窗為 1280×720，與原始冷啟動、390px 驗收視窗不同；不以兩輪數字計算嚴格倍率，也不稱為全新 390px 冷登入效能成績。
- CL-07 修正後重開首頁無錯誤遷移提示，並從該新恢復帳號開啟回顧核對為 350／240／3／淨利 140。修正後沒有再另建第三個 origin 重演首次登入；匿名判斷及實際遷移範圍以隔離資料庫回歸補強。
- 沒有清除原瀏覽器、改寫雲端原始紀錄、執行 replace-cache、上傳照片、修改 Demo、部署、commit／push 或操作原生商店。

補充證據：`implementation-login-samples.json`、`fixed-count-390.png`、`fixed-photo-scope.png`、`fixed-mobile-viewport.json`、`fixed-fresh-localhost-detail.txt/png`，均位於本文件前述忽略目錄。
最後檢查發現早期標記 390 的截圖是桌面排版的裁切，因此重新設定並以 DOM 核對實際 CSS 390×844、DPR 約 1、無水平溢出，重新操作回顧與照片清單，再用裝置截圖取代同名檔案。
手機尺寸驗收結論依這份最後校正後證據，不依最初裁切圖。

### 測試與尚未完成的範圍

新增 `tests/owner-event-replay.test.ts`、`tests/cold-login-pull.test.ts`、`tests/cold-login-migration.test.ts`，並加入一般測試清單。
包含 4→3 重現與恢復、相同時間穩定性、商品建立依賴、重複 ID／刪除、缺來源／跨場次拒絕、同金額合法多筆、失敗回滾／接續、501 筆分頁、游標不前進、完整歷史校驗、全刪後零值、pending／owner 限制、設定共享／儲存失效與同步鎖世代。
既有登入、同步流程、角色、overlay、投影修正、照片清單／操作／完成流程回歸也已核對。
最終受影響 ESLint、手機 TypeScript、Web 正式建置、手機正式建置、手機產物邊界與資產檢查皆通過；手機產物為 354 檔、19.38 MiB，靜態主機 smoke 通過 11 路由／資產。
建置證據位於 `.codex-artifacts/cold-login-web-build.txt`、`cold-login-mobile-build.txt`、`cold-login-mobile-verify.txt`、`cold-login-mobile-smoke.txt`；本機服務已重新啟動，正確手機尺寸分頁保留。

上述登入修正切片結束時，CL-05 的「完整跨裝置提醒恢復」尚未交付：當時本機佇列不是可恢復的雲端照片要求帳本。
既有 `sale_photo_evidence` owner album 只能提供已建立的雲端 metadata；紀錄缺席不能證明當時免拍或已完成，當前市集開關也不能推定歷史要求，未上傳原圖更無法從空白裝置還原。
後續須補上每筆成交當時的照片要求／履行狀態及跨裝置核對契約；本輪不猜測歷史要求、不補建虛構任務，也不新增自動上傳 worker。
正式環境一致條件效能量測、員工／跨帳號 UI 實測、原生背景／程序終止與實機相機仍需後續驗收。

### CL-05 第二階段：成交當時要求與 owner 提醒恢復（2026-10-23）

已實作共用的 `photoEvidenceRequirement` v1 快照，包含 required、owner／market、拍攝員工及成交完成時間。
在照片 runtime 已啟用且上下文有效的收款／補登入口，快照與 `deal_closed` 同一次事件交易寫入，並隨既有 JSON payload 同步；不需要新增 SQL migration。
即使成交後的待補佇列寫入失敗，成交及其照片要求仍保留。免拍也明確保存 false；舊成交、關閉 runtime 或缺少有效上下文時仍為 unknown，不用目前市集開關補猜歷史。

- `lib/sales/photo-evidence-requirement-snapshot.ts`：跨平台版本與身分／日期解析；`photo-evidence-post-sale.ts`、`lib/db/hooks.ts`、`types/db.ts`：同成交保存要求。
- `lib/sales/photo-evidence-reminder-recovery.ts`：owner 範圍純規劃與 Dexie 交易。只從有效成交快照或實際雲端 pending metadata 還原工作；需本機原成交存在，刪除成交不恢復。
- `lib/supabase/sales-photo-evidence-reminders.ts`：使用登入者 Supabase client 與既有 RLS，owner／market／未刪除條件、id keyset 每頁 500 筆完整讀取。沒有使用 album 前 100 筆推論缺席，也不取得私有物件 key 或簽名連結。
- uploaded／expired／waived／not_required 排除於這次顯示，不重寫本機佇列的完成／重試狀態，不刪除任何原圖。其他裝置的 captured_local 只代表仍需處理，不能重建其未上傳影像。
- 網路或讀取失敗時，保留本機清單並明示尚未核對，可按「重新整理待補照片」；若登入身分或市集範圍被拒絕則清空顯示，不能沿用舊帳號清單作離線 fallback。帳號／市集／請求世代改變時捨棄舊結果，交易途中失效則整批回滾；不新增登入阻塞、自動上傳或雲端 metadata 寫入。
- 既有本機清單也排除已刪成交、缺少來源或跨場次來源；員工項目限同 owner 且 capturedByStaffId 為本人，owner 可處理自己場次。沒有擴大員工 album／讀圖權限。

本機 UI 已用 Chrome 390×844 操作確認：原 `127.0.0.1` 環境保留 BW-10 兩筆本機工作；另一個 `localhost` origin 從歡迎頁登入並完成恢復後，該場仍為收入 350／利潤 240／成交 3／淨利 140，清單沒有猜出兩筆待補，而是明示「另有 2 筆舊成交未記錄當時的照片要求，無法確認是否待補」。
後者以詳情路由的 pending-photos 入口核對；初次導覽／分頁按鈕未即時切換，重開路由後可核對，尚未歸因，不將這次操作宣稱為完整導覽驗收或效能量測。
最後以 DOM 核對 innerWidth 390、innerHeight 844、無水平溢出，再保存瀏覽器完整截圖，捨棄過程中受 CDP 縮放／裁切影響的截圖。
證據：`.codex-artifacts/photo-reminder-recovery-20261023/{owner-pending-dom.txt,owner-pending-390.png,fresh-owner-dom.txt,fresh-owner-verification.json,fresh-owner-unknown-390.png}`。

新增 `tests/sales-photo-evidence-reminder-recovery.test.ts` 並加入一般清單：實際 recordDeal／事件交易／cloud mapper、佇列故障仍保留收入與要求、true／false／unknown、刪除與跨場次／跨身分、終態優先、舊 cloud pending、缺來源、同時恢復去重、原圖／重試狀態保留、離線／分頁失敗、501 筆 metadata、請求中新增／刪除與交易中身分切換回滾。

**尚未完成完整跨裝置驗收**：員工新裝置提醒仍維持本機範圍，需另設符合既有權限的狀態核對契約（不能用 owner album fallback）；新快照從裝置 A 實際同步到 B 並完成相機／上傳的端到端驗收、背景／程序終止、正式環境一致條件效能也仍待驗收。
本輪瀏覽器操作沒有新增成交、上傳照片或修改雲端歷史；新快照的寫入／重建故障案例以隔離資料庫驗證。

本階段最終檢查通過：受影響 ESLint、照片要求／恢復與既有收款／清單／手動上傳測試、owner 重播及冷登入回歸、Web 正式建置、使用 `tsconfig.mobile.json` 的手機建置、手機產物邊界（354 檔、19.39 MiB）與一般靜態主機 smoke（11 路由／資產）。
建置／檢查紀錄在 `.codex-artifacts/photo-reminder-{lint,web-build,mobile-build,mobile-types,mobile-verify,mobile-smoke}.txt`。
沒有部署、commit／push、套用 SQL、變更訂閱條件或修改 Demo。

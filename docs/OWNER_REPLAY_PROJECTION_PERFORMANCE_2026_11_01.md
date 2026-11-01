# 完整歷史重播：批次投影效能與資料一致性

日期：2026-11-01。狀態：程式 `9c7cba7` 已提交、推送及正式發布，核心線上複驗通過。先前 `71db0e3`／`189f29f` 為下載優化的歷史版本；本批包含新的投影批次優化。下列效能數字為隔離重播量測，不等同於所有正式帳號的端到端登入時間。

## 瓶頸及實作

正式最佳化建置搭配真實 Chromium IndexedDB 的 5,000／20,000 筆合成重播，顯示主要等待在 handler 多次資料庫往返；探索量測中沒有觀察到超過 50ms 的 long task，不能將整段等待一概稱為同步 CPU 計算卡死。

- 新增 `lib/sync/replay-projection-batch.ts`。只處理整批新增事件皆為手動收入或顧客互動的情況；商品交易、刪除、metadata 與其他混合事件保留原資料庫路徑。
- 在既有每 50 筆 transaction 裡預先取得需要的市集與每日統計，讓**既有 handler** 對 transaction 內快取執行相同計算，最後集中寫回；沒有另外發明一套營收或成本公式。
- 新每日統計仍在同一 transaction 內取得真實 auto-increment ID。重複日期資料沿用原 `.first()` 的第一筆，不擅自合併歷史重複資料。
- 事件仍逐筆寫入，事件 ID、投影與新日統計一起提交或回滾。批次間不留投影快取，背景／帳號 scope 檢查在讀取後及寫回前後執行。
- 沿用既有 synced／pending 與完整 payload 恢復規則；不因加速重新扣庫存或把 pending 當成已送達。
- `projectionBatching:false` 僅供參考路徑對照測試及量測；沒有使用者開關、方案調整、SQL 或新雲端 writer。

## 量測方法及限制

`node scripts/serve-replay-benchmark.mjs 41053` 將共享模組以 esbuild `NODE_ENV=production`、minify、ES2022 建置，提供僅綁定 loopback 的獨立量測畫面。它不是 Next 開發模式，也不是整個 Next UI 首次登入的端到端計時。

量測用真實瀏覽器 IndexedDB、80 個合成市集、80% 手動收入／20% 互動，無登入、無雲端資料；CSP 禁止 connect-src，沒有讀取憑證或往正式帳號灌資料。每輪重設的只有這個隔離 origin 的合成資料。UI heartbeat 與 long-task observer 只存在 Web 量測工具，不進入共享 domain 或產品頁面。

同一份 production-optimized bundle 可切換 Published reference／Batched projections。每組樣本執行三輪，結果以中位數比較，逐輪檢查事件數、收入、利潤、成交、互動與每日收入。DBCore 計數是 API 呼叫數，批次呼叫可含多筆資料；不能把呼叫減少解讀成實體磁碟寫入同比減少。handler 與資料庫時間有重疊，不能相加當成總時間。

早期量測器曾用 native async 包裝 DBCore cursor promise，造成真實瀏覽器 PrematureCommitError，而 fake IndexedDB 沒有重現。已修正量測器為保留原 promise 的 `.then` 包裝，並讓記憶體 table 方法使用 Dexie Promise。早期失敗與舊包裝器數字不作最終效能比較；不以隔離測試通過取代實際瀏覽器驗收。

## 最終量測結果

| 紀錄量 | 參考原路徑三輪（ms） | 中位數 | 最終批次版三輪（ms） | 中位數 |
| --- | --- | ---: | --- | ---: |
| 5,000 | 11,620／11,505／11,667 | 11,620 | 4,839／4,790／5,084 | 4,839 |
| 20,000 | 45,516／45,545／45,623 | 45,545 | 18,058／19,953／17,975 | 18,058 |

這組合成重播的中位數分別縮短約 **58%／60%**。5,000 筆皆為收入 40,000、利潤 28,000、成交 4,000、互動 1,000；20,000 筆皆為收入 160,000、利潤 112,000、成交 16,000、互動 4,000；事件數與每日收入也逐輪核對一致。

最初同建置對照的批次版三輪中位數為 4,778／18,226ms，參考組如上表；補上 legacy payload 預讀欄位對齊後，另做上表最終三輪確認。中斷前已讀回的四筆摘要有明確保留，恢復後補齊並保存完整新樣本，不把未讀回的中斷結果當作通過。

代表性的 20,000 筆最終樣本：市集 mutate API 呼叫由 20,000 降為 400，每日統計 mutate 由 20,000 降為 479；事件 mutate 仍為 20,000，未跳過逐筆事件保存。最終恢復後樣本的 heartbeat 最大間隔為 42ms（20,000）與 27ms（5,000），long-task observer 未收到超過 50ms 的長任務；不能據此保證其他裝置或完整產品 UI 沒有卡頓。

證據（忽略於 Git）：`.codex-artifacts/replay-browser-comparison.json` 保存同建置三輪對照；`replay-browser-final.json` 保存最終中斷前已確認摘要、恢復後兩個完整樣本與真實原子性結果。`replay-browser-final.jpg`／`replay-browser-atomic.jpg` 為瀏覽器證據。

## 真實交易驗收

真實 Chromium IndexedDB 的額外注入測試：`rollback:true`、`retry:true`、`context:true`。寫回失敗後事件、日統計與市集合計皆回滾；重試後只有一筆收入 10，重播同 ID 不增加第二次；handler 執行中使 context 失效，未提交的新增紀錄與投影一起回滾。沒有在正式帳號修改角色、方案或營收。

這些數字只量測共享重播本身，沒有包含 auth、下載、其他產品元件訂閱、投影 reconciliation 或報告讀取。商品銷售／刪除混合批次維持原路徑，未宣稱商品密集帳號也會加速六成；iPhone／Android、實際年度資料與完整首次登入的端到端速度仍需後續驗收。

## 正確性及邊界驗證

`tests/replay-projection-batch.test.ts` 與參考路徑逐欄比較：跨 50 筆批次、多日、多場次、自訂互動、非有限／負數計數、未知場次、重複日統計、商品成交與刪除還原庫存、pending 保留、重複拉取不重算；注入 handler／flush 失敗與 context 失效，確認事件及投影回滾並可重試。

- 14 個相關測試檔全部通過：batch parity、owner replay、large pull、cold pull、固定安排、sync flow audit、reconciliation、私人草稿、首次讀取恢復、activity、訂閱保留資料、游標、canonical factory 及登入 UI。
- `tsc --noEmit --project tsconfig.mobile.json` 與 `tsconfig.replay-benchmark.json` 通過；修改檔 lint、Web 工具的 `eslint --no-ignore`、server 的 Node syntax check 通過。
- 最終 `npm.cmd run build`、`npm.cmd run build:mobile`、`npm.cmd run verify:mobile` 全部通過；35 個 segment aliases、382 個靜態檔案的邊界／資產驗證通過。
- 量測伺服器已停止，原測試帳號的場次、成交、方案、角色及照片沒有更動。不需新 SQL；本批已正式發布，結果見下節。

共享邏輯沒有新增 browser API；量測 UI 與 PerformanceObserver 僅在 Web 專用 scripts。`tsconfig.replay-benchmark.json` 另外驗證量測工具；不會把工具當成產品路由或原生套件。這些檢查不等同於 iPhone／Android 實機或完整產品端到端計時。

## 正式發布與線上複驗

- 提交：`9c7cba7934d06788103eaff98ee6f7d8c14547f9`，已推送 `KL-4ndroid/markit` 的 main。只提交本批 10 個檔案，原有 Demo／素材變更留在本機。
- 目標：Vercel `markit-app`，專案 `prj_dWZtQILgK88xXK0CA2x4xtH80DJN`，team `team_unaNhyTnsu4mWsnTcbmShoVR`，Production。
- 部署：`dpl_GjhvEqEYo4Rxz2RY3V3q8TMbcBAQ` Ready，Git SHA 相同，主要 alias 已指向新部署。
- 主要網域 health：healthy、`commitSha:9c7cba7`、buildTime `2026-11-01T07:46:22.607Z`。

| 線上案例 | 結果 |
| --- | --- |
| 乾淨登入／完整同步 | 新部署 origin `markit-e4ffmxjnq-masons-projects-1db534c5.vercel.app` 先顯示歡迎頁，使用既定測試老闆登入。600ms 延遲、下載 50,000 bytes/s 下完成同步，收入 50、淨利 -50、成交 1。沒有清除原正式網域資料。 |
| 唯讀故障與自動恢復 | 僅讓第一次 `read_market_financial_reviews` 請求失敗，立即解除攔截；後續 HTTP 200，未點重讀或重新整理，即由讀取中恢復淨利 -50；沒有攔截保存 RPC。 |
| 成交進入／返回 | 明細為共 1 筆、總收入 50、現金總額紀錄，關閉返回正常。 |
| 重開／冪等結果 | 重新整理同一部署頁面，仍為收入 50、淨利 -50、摘要成交 1／入口 1 筆；沒有觀察到重複累加。 |
| 主要網域重連 | 主要網域載入新版後金額一致；離線時淨利待確認、成交保留 1，恢復連線後核對讀取自行恢復 -50。 |
| 手機畫面 | 實際 CSS 390×844、scrollWidth 382，沒有橫向溢出；證據 `.codex-artifacts/replay-production-mobile.jpg`。 |

本輪成功流程未觀察到 PrematureCommitError；沒有把指定故障注入當成全站零錯誤監控證明。測試僅登入與讀取既有合成場次，未改營收、費用、角色、方案或照片，沒有登出或強制捨棄待送內容。結束已解除請求攔截、限速、離線與裝置尺寸模擬，關閉本輪臨時分頁。

此輪驗收不把小型正式帳號的成功，視為 20,000 筆正式資料量或 iPhone／Android 效能證據；大型量測與真實回滾仍以前述隔離證據為準。

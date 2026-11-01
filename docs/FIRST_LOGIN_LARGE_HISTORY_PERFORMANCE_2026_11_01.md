# 大量歷史與慢速網路的首次載入優化

日期：2026-11-01。本批程式 `71db0e3` 已提交、推送及正式發布，關鍵線上複驗通過。後續完整投影重播優化為另一批，不包含在本次發布內。

## 調整範圍

| 問題 | 本批行為 |
| --- | --- |
| 歷史下載逐頁等待 | 第一頁仍只發一個請求；滿 500 筆後，最多兩頁並行，按原頁次組合再做完整依賴排序。小帳號不多發預讀請求，大帳號結尾至多多讀一個空頁。 |
| 市集 ID 查詢可能被 API 筆數上限截斷 | 所屬與本人市集 ID 各自按穩定欄位分頁取得，仍保留兩種來源與去重。 |
| 市集補齊的 URL 與回傳過大 | 每組最多 100 個 ID、最多兩個讀取請求並行；全部成功後才寫入本輪 metadata。失敗不把未取回的場次當成已刪除。 |
| 每次事件讀取帶全部市集 UUID | 繼續使用既有 `owner_accessible_events` security-barrier view 的本人／方案限制，將相同市集集合交集放在本機，不再把隨場次數成長的 UUID 清單放進事件查詢 URL。未取得權益的資料不因此開放。 |
| 每次重播載入整份本機事件 | 空歷史直接略過既有事件查詢；有歷史時只按本批 ID 與刪除來源 ID 查詢，只有本批有刪除才讀既有 tombstone。 |
| 重新核對時重寫完全相同的事件 | 已同步且 canonical 內容完全一致時不再寫入；混合批次也只更新變動內容。原有未送出資料保留，免費→付費需要恢復的完整 payload 仍會更新。 |
| 大量成交／互動逐筆輸出訊息 | 可信 replay context 關閉兩種常見事件的逐筆 console 訊息，保留錯誤及階段進度；現場新增紀錄的既有行為不變。 |
| 大歷史游標計算 | 用迴圈取最新有效 created_at，不使用 `Math.max(...全部紀錄)`，避免超過引擎參數數量限制。 |
| 下載時像停住 | 頁面顯示「正在讀取歷史紀錄（已讀取 N 筆）」。總數未知時不宣稱整體百分比或完成。 |

重播仍每 50 筆在同一 transaction 保存事件及投影；完整依賴排序、庫存／收入計算、既有修復條件與最後才推進游標的規則不變。所有併發僅用於讀取，沒有增加保存、outbox 或照片上傳的自動重試。

## 隔離效能量測

可重跑 `npx.cmd tsx scripts/benchmark-first-login-pull.ts`。腳本以 fake IndexedDB、80 個合成市集及 5,000 筆手動成交，替換所有 Supabase 讀取；每次模擬表格查詢延遲 80ms，scope RPC 直接回覆，沒有連線正式資料庫、沒有使用憑證。逐筆訊息在基準與修改後都被量測器攔截，不把關閉 console 的效益算進這張表。

| 階段 | 修改前 | 最終修改後 |
| --- | ---: | ---: |
| 讀取範圍／市集 ID／下載完成 | 1,140ms | 697ms |
| 完整冷載入，含補齊、重播與核對 | 9,774ms | 9,699ms |
| 模擬游標未完成後重新核對相同完整歷史 | 137,319ms | 1,276ms |

兩次完整讀取合計皆 27 個模擬請求；下載最多兩頁並行，沒有用無限制併發換速度。收入總額 50,000、成交總數 5,000 及事件筆數皆驗證一致。

這是單機合成量測，尤其 fake IndexedDB 的逐筆更新成本不能換算成正式瀏覽器、iPhone 或 Android 的保證。中間版本在同時跑測試／開發編譯時冷載入曾達 17,186ms，其他量測為 11,261ms、8,735ms；補上嚴格相等判斷（避免 NaN 與 null 被 JSON 序列化視為相同）後，最終為 9,699ms。**只能確認減少序列下載等待與不必要寫入，整段冷載入尚未證明有顯著改善，不能宣稱所有使用者完整登入固定快某個百分比。** 投影重播仍占大部分冷載入時間，後續應持續量測，而非略過歷史或放寬帳務規則。

證據（忽略於 Git）：`.codex-artifacts/large-login-baseline.log`、`large-login-after.log`、`large-login-after-serial.log`、`large-login-final.log`。

## 真實瀏覽器與慢速條件

使用同一台電腦、不同 loopback origin 的乾淨儲存空間，登入既定測試老闆。CDP 模擬 600ms latency、下載 50,000 bytes/s、上傳 20,000 bytes/s，沒有清除原 localhost／正式站快取或待送照片。

- 修改前與修改後都可完成同步並自動顯示收入 50、估計淨利 -50、成交 1。
- 修改後可進入成交明細（共 1 筆／總收入 50），關閉返回正常，沒有點財務重讀。
- 最終手機 CSS viewport 391×844，document scrollWidth 384，沒有橫向溢出。畫面證據：`.codex-artifacts/large-login-mobile.jpg`。
- auth 請求起點至首個成功財務回應的網路間隔，基準 10,278ms、最終 11,694ms；這是小型測試帳號的單次開發模式量測，不含嚴謹首繪／可操作時間，不是小帳號整段登入變快的證明。
- 中間一次量測因 HMR／事件緩衝未取得 auth 起點，沒有拿缺失資料當成更快或成功計時。最終另開乾淨 origin、讀取事件直到首個財務回應，再保存不含 headers、body、token 的路徑／狀態／時間摘要。
- 測試完成後已解除限速及 viewport，關閉臨時分頁；未登出其他 session，也沒有改正式場次、方案或角色。

這次瀏覽器驗收確認慢網路仍能完成且資料正確；大量資料的完整性及效能以隔離資料測試為證，沒有對正式帳號灌入數千筆測試成交。

## 自動驗證及平台邊界

- 新增 `tests/large-owner-pull-performance.test.ts`：2,501 筆跨頁順序與最多兩併發、小帳號只讀一頁、頁失敗／中止、1,201 場市集／1,501 筆可用事件、異品牌排除、200,001 筆游標計算、metadata 全成或全失敗、未改來源游標、未讀全事件表、不重寫相同 payload、保留 pending、更動 payload 仍更新，以及靜默重播金額一致。
- 13 個相關測試檔通過，包含既有 owner replay、cold pull、sync flow audit、固定安排、首載讀取恢復、activity、私人草稿、保留資料、游標、reconciliation、canonical factory 及登入 UI。
- 舊 source guard 更新為新的分頁／游標取最大方式，保留本人來源、sanitize、projection reset、失敗不寫與游標次序檢查；沒有刪除這些邊界來讓測試通過。
- 最終 mobile TypeScript、修改檔 lint 與量測腳本的 `eslint --no-ignore` 通過；嚴格相等判斷變更後另重跑 replay／large pull 測試及量測。
- 最終 `npm.cmd run build`、`npm.cmd run build:mobile`、`npm.cmd run verify:mobile` 全部通過；手機匯出 35 個 segment aliases，靜態邊界／382 個檔案資產驗證通過。這不等同於 iOS／Android 實機驗收。

下載排程、批次、排序與快取判斷均為共用 TypeScript，沒有新增 window／document／native API；網路狀態與前景處理仍沿用既有 `lib/platform`。沒有新增 SQL、商店付款、權益規則、原生套件或平台專案。

## 後續

本批提交、發布與關鍵線上複驗已完成。下一階段先在 production-optimized build 量測投影重播的耗時／主執行緒長任務；任何 reducer／投影合併或續傳 checkpoint 設計，都必須先證明不改庫存、刪除依賴與重複套用邊界。大型實機矩陣、頻寬共享模型、長達數年的資料以及所有表單的恢復，尚不在本批完成宣告內。

## 正式發布

- 程式：`71db0e3588b90a2cbe06e412e04ef305a8e1e52d`，已推送 main。只提交本批 14 個檔案，既有 Demo／素材維持原樣留在本機。
- Vercel：`markit-app` Production，部署 `dpl_Ennx12181gWMAfzchNGkX5sqTjHq` Ready，Git SHA 一致，主要 alias 已更新。
- 主要網域 health：healthy、`commitSha:71db0e3`，buildTime `2026-11-01T05:13:26.604Z`。
- 正式部署獨立 origin `markit-98guo20sh-masons-projects-1db534c5.vercel.app` 從歡迎頁開始，以既定測試老闆乾淨登入；600ms 延遲／50,000 bytes/s 下完成同步，收入 50、淨利 -50、成交 1，明細共 1 筆／總收入 50，進入與返回正常。
- 390×844 手機畫面無橫向溢出，證據 `.codex-artifacts/large-login-production-mobile.jpg`。測試結束解除限速／viewport 並關閉臨時分頁，沒有登出、清除照片或變更營運資料。
- 大量 1,201 場與 5,000 筆資料的證據仍為前述隔離測試；沒有把小型正式帳號驗收當成大型真實帳號效能證明。

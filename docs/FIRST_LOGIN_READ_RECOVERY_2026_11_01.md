# 首次登入資料載入與讀取恢復

日期：2026-11-01。狀態：本機實作及核心瀏覽器驗收完成，尚未提交／發布。本批聚焦財務核對、成交與互動的讀取時序；不代表所有首次登入、同步失敗或跨裝置情境皆已完成驗收。

## 實際問題

使用乾淨 origin 的本機儲存空間登入測試老闆，直接開啟既有合成場次 `[配色驗收1030] 收款與回顧`：

- 登入與雲端同步成功，摘要收入 50、成交 1，但核對讀取失敗、淨利停在待確認；每日明細入口仍顯示 0 筆。
- 網路記錄顯示，失敗前根本未送出 `read_market_financial_reviews`。頁面可先取得雲端場次，財務 repository 卻需要本機市集及本人歷史準備完成；過早呼叫得到 `FINANCE_SCOPE`，完成同步後沒有重新觸發讀取。
- 成交與互動原先依賴一次性讀取及本機 DOM 通知。稍後串流進來的雲端事件不一定觸發更新，空結果就可能留在畫面上。

## 本批調整

| 範圍 | 完成的行為 |
| --- | --- |
| 準備狀態 | 觀察本機市集及 settings；確認本人、非員工、未刪除，並等待本人付費歷史已驗證或目前本人同步完成。準備狀態只是讀取前提，不授予權益。 |
| 財務恢復 | 暫時性網路／逾時／指定 5xx 讀取錯誤，等候 800ms 後自動重試一次。每輪最多兩次嘗試；持續失敗回到既有明確重讀入口。 |
| 不重試的錯誤 | 401／403／權限、來源／身分校驗、429 及其他非暫時性錯誤，不靠重試繞過。 |
| 恢復時機 | 網路重連、回到前景、重新驗證 session 及相關來源變動時重新讀取。只加入讀取恢復，不加入保存、照片上傳或同步 outbox 的自動重送。 |
| 過期回應 | 切換 scope、卸載或新讀取取代舊讀取時，中止後續重試；舊回應在寫入讀取快取前再次核對是否仍有效。 |
| 成交／互動 | 使用 Dexie liveQuery 觀察真正的資料寫入與刪除 tombstone；雲端重播到達後自動更新，不依賴一次性 DOM 通知。未確認完整歷史前不顯示「已確認 0 筆」入口。 |
| 本機讀取異常 | 保留明確錯誤及重新讀取入口，不把儲存失敗當成沒有紀錄。 |
| 草稿保護 | 讀取恢復不重建同 scope 的編輯 repository，不自動保存草稿、不改原始收入／成本／庫存。 |

主要檔案：

- `lib/markets/owner-cache-readiness.ts`：本人本機快取準備條件。
- `lib/markets/financial-review-reading.ts`、`hooks/useFinancialReviews.ts`：可觀察準備狀態、有限重試及舊讀取隔離。
- `lib/markets/financial-review-repository.ts`：快取保存前檢查讀取仍有效；雲端保存流程不變。
- `lib/markets/market-activity-reading.ts`、`hooks/useMarketActivity.ts`：雲端事件到達後更新成交／互動讀取。
- `components/markets/MarketDetailScreen.tsx`：接上可觀察讀取、未完成歷史與錯誤狀態。

## 瀏覽器驗收

使用只綁定 loopback 的臨時本機代理取得獨立 origin；沒有清除原 localhost 或正式站資料，亦沒有登出其他 session。測試只登入及讀取既有合成場次，沒有建立成交、變更費用、方案或角色。

| 案例 | 結果 |
| --- | --- |
| 修正前乾淨登入 | 重現摘要 1 筆、入口 0 筆，財務讀取未送到 RPC 即失敗。 |
| 修正後乾淨登入 | 不重新整理、不點財務重讀，雲端事件到達後入口自動顯示 1 筆。 |
| 首次財務讀取故障 | 使用 CDP 限定攔截只讀 `read_market_financial_reviews`，讓首次請求失敗；確認自動發起後續請求，放行後 HTTP 200，淨利自動恢復 -50。未攔截 auth、sync 或任何保存 RPC。 |
| 明細進入／返回 | 點擊 1 筆入口，彈窗為共 1 筆、總收入 50，關閉正常。 |
| 離線／重連 | 離線保留成交 1，淨利待確認；恢復連線後不點重讀，自動恢復收入 50、淨利 -50。 |
| 手機尺寸 | 實測 CSS viewport 391×844；無橫向溢出。因本機瀏覽器縮放，請求的 viewport 與 CSS 尺寸不同，以實際 DOM 尺寸為準。 |
| 再開同 origin | 正常完成準備並讀回相同金額及筆數。此項是重開讀取，不作為第二次乾淨登入證明。 |

本機證據（忽略於 Git）：`.codex-artifacts/first-login-before-390.jpg` 是修正前畫面，當時實際 CSS 寬為 520，檔名不作為 390px 證明；`.codex-artifacts/first-login-after-mobile.jpg` 為修正後手機畫面。臨時攔截、離線模擬、viewport 及代理在驗收後解除。

## 自動驗證

- 新增 `tests/first-login-read-recovery.test.ts`：準備時序、本人歷史、有限重試、拒絕／限流不重試、中止舊回應、私人草稿及原始資料不變。
- 新增 `tests/market-activity-live-reading.test.ts`：分段重播、互動更新、legacy market id、日期／品牌排除、tombstone、本人歷史與員工隔離。
- 12 個既有回歸測試通過：財務核對、私人草稿／存取邊界、共用財務判讀、每日 UI、active event、tombstone、訂閱功能與保留資料、清除 guard 及手機 UI。
- 修改檔 ESLint 與 `tsc --noEmit --project tsconfig.mobile.json` 通過。
- `npm.cmd run build` 與 `npm.cmd run build:mobile` 通過，手機靜態匯出及 35 個 segment aliases 完成。這不等同於 iOS／Android 實機驗收。
- `npm.cmd run verify:mobile` 通過，驗證 382 個靜態檔案的邊界與資產。驗收後已恢復本機 `127.0.0.1:3000` 開發伺服器。

## 平台及後續範圍

準備判斷、資料讀取與重試政策為共用 TypeScript；網路、前景狀態沿用 `lib/platform` 既有 ports。未增加 browser-only domain 假設，未產生原生專案、安裝原生套件或新增 SQL。方案、價格、付款與到期規則不變。

下一步為選擇性提交本批檔案、發布及正式站關鍵複驗，再擴充大資料量／慢速網路及原生實機矩陣。全站初始同步的重播量、效能指標、可讀歷史監控與其他表單的恢復，均不在本批完成宣告內。

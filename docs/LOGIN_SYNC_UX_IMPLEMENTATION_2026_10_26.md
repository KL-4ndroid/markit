# 登入、資料準備與保存狀態：手機優先調整

日期：2026-10-26（Asia/Taipei）。依使用者「照你說的做」，實作下一個任務「登入到資料保存的狀態提示」。本機程式與指定回歸已完成；手機真實點擊驗收尚未完成，原因見下方。

## 發現與處理

以下發現來自目前程式與隔離測試，這一輪沒有成功取得真實 App 的瀏覽器操作證據。

| 問題 | 已實作的行為 | 來源 |
| --- | --- | --- |
| 登入確認骨架沒有說明正在做什麼 | 登入狀態確認與裝置資料確認各有一行可見狀態，放在骨架上方 | [AuthGuard](../components/auth/AuthGuard.tsx)、[GlobalLoadingSkeleton](../components/auth/GlobalLoadingSkeleton.tsx) |
| 首次權限讀取失敗仍展示載入骨架，沒有直接重試入口 | 顯示「已登入，尚無法確認使用權限」與「重新確認權限」。沿原 `refreshRole` 操作；受保護內容仍不掛載 | [RoleLoadingFallback](../components/auth/RoleLoadingFallback.tsx)、[RoleAccessNotice](../components/auth/RoleAccessNotice.tsx) |
| 登入欄位標籤沒有對應輸入 ID，小螢幕可用高度不足 | 建立 label／input 關聯、Email 鍵盤提示；關閉、顯示密碼與記住 Email 點擊範圍至少 44px；對話框限制可用高度並可捲動 | [LoginModal](../components/auth/LoginModal.tsx) |
| 同一登入錯誤同時出現表單與 Toast | 保留表單內持續的 `role="alert"`，省略重複錯誤 Toast；保留輸入。網路錯誤以可理解文字呈現，久候時說明仍在等待登入服務 | [LoginModal](../components/auth/LoginModal.tsx) |
| 初次同步有大圖示與多段重複完成文字，未區分登入／讀資料 | 使用共用可捲動 AppDialog，標題直接顯示「已登入，正在準備資料」等階段；只呈現當前步驟與必要下一步 | [InitialSyncDialog](../components/sync/InitialSyncDialog.tsx)、[InitialSyncContent](../components/sync/InitialSyncContent.tsx) |
| 原進度百分比可能被理解為全部歷史資料的完成率 | 有有效筆數時才展示「目前步驟 X / Y」，不是整體恢復百分比；未知總數、負數、超出總數與非有限值不展示進度條 | [初次同步呈現模型](../lib/sync/initial-sync-presentation.ts) |
| 首次完成計時先設成功 ref；計時被中斷後可能無法再完成關閉 | 成功 ref 與會話完成標記在計時真正完成時才設定；必須目前在線、SUCCESS 且 pending 為零。等待過久可先看本機資料，不當成同步成功 | [InitialSyncDialog](../components/sync/InitialSyncDialog.tsx) |
| 同步入口只有圓點，手機難以辨識狀態；點擊就直接發送同步請求 | 改成圖示＋短文字，點開「紀錄同步狀態」，可看狀態、上次完成時間與待送筆數，再明確操作「立即同步／重新同步／檢查雲端更新」。裝置離線或同步中停用手動同步，仍可查看狀態；裝置在線但上次網路請求失敗，保留手動重試 | [SyncStatusIndicator](../components/common/SyncStatusIndicator.tsx)、[RecordSyncStatus](../components/common/RecordSyncStatus.tsx) |
| 所有同步錯誤都提示恢復連線後會再次同步 | 移除該通用 Toast，使用目前 error 與待送數量說明；離線狀態優先於舊的同步中畫面，不把權限錯誤當作網路問題 | [同步呈現模型](../lib/sync/sync-presentation.ts) |
| 帳號頁「本機操作會先保存」易被理解為所有草稿均已備份 | 明確稱「紀錄同步」，待同步計數不含心得、現金草稿與照片；這些須回原功能確認。同步錯誤使用警示圖示，保留原因與操作 | [AccountSyncPanel](../components/settings/AccountSyncPanel.tsx) |
| 登入逾期時保證所有表單自動恢復、沒有說明保存位置 | 改為列出這台裝置的暫存表單數，明示尚未送到雲端，重新登入後回原表單確認並保存；移除沒有實證的定期驗證原因 | [SessionExpiredHandler](../components/auth/SessionExpiredHandler.tsx) |
| 首頁在未確認實際保存前承諾操作會安全保留 | 依實際 pending 數量說明待送紀錄；沒有待送數時只表示無法確認最新雲端資料 | [首頁](../app/page.tsx) |

## 共用與資料邊界

- 沿用既有 `useSyncContext`、角色狀態與 callback，沒有新增同步實例、上傳路徑、重試 worker、定時器頻率或自動重送。
- 沒有修改 `hooks/useSync.ts`、event writer、Repository、同步完成規則、RPC、RLS、migration、營收／庫存算法、權益與訂閱設定。
- 調整的是畫面完成標記與可見狀態；上傳／下載請求、角色驗證和 fail-closed 條件不變。初次 UI 的慢載入提示也涵蓋 IDLE 等待狀態。
- 一般紀錄待同步、心得／現金草稿與照片送達仍是不同契約，不使用「全部已保存」概括。沒有新增未經驗證的自動復原保證。
- 新增的呈現模型與元件沒有新增瀏覽器／裝置 API；會話標記仍經 `lib/platform` 的既有 session port。iOS／Android 可沿用同一份狀態與文字。
- 未修改 Demo；未操作雲端 SQL、正式帳號資料、付款或商店能力；未讀取／輸出密鑰。

## 驗證

- 30 個相關測試檔通過：登入／邀請、焦點與角色更新、角色 fail-closed、登出與清除保護、全域 overlay、同步呈現／完成、平台 network／lifecycle／secure storage、表單暫存、現金草稿、手機返回、首頁與帳號頁契約。
- 新增 [login-sync-ux.test.tsx](../tests/login-sync-ux.test.tsx)：以純函式與 SSR 檢查登入後各階段、離線／未送完不顯示成功、有效步驟計數、狀態入口始終可讀、失敗權限畫面的重試與保護、必要欄位標籤及平台界線。這些不是瀏覽器點擊測試。
- 修改元件、共用呈現模型與相關測試的指定 ESLint 通過。
- 最終程式的 `npm.cmd run build`、`npm.cmd run build:mobile`、`npm.cmd run verify:mobile` 均通過；手機靜態產物 378 檔、19.77 MiB。提示索引 `--check` 與文件相對連結核對通過。
- 提示索引已重新產生：目前 659 個來源、7,184 筆記錄、5,207 種文字／範本，包含候選與內部代碼，不是同時出現在畫面上的文字數；索引產生器的 10 個測試也已通過。
- 本輪沒有執行整份 433 檔清單；前批完整分段驗證結果與本輪 30 檔指定回歸分開記錄。

## 尚待實際操作驗收

後續實際操作已開始，見[手機完整流程驗收紀錄](MOBILE_FULL_FLOW_ACCEPTANCE_2026_10_26.md)。恢復本機服務後可操作正式 App；已驗證首頁／新增／同步詳情與登出照片保護，但時間設定發現阻斷，整條流程尚未通過。下文保留本批結束時的待補事項，不代表後續操作已全部完成。

瀏覽器工具在取得目前 `http://localhost:3000/markets/detail?...` 頁面時，被自動安全審查的網址存取政策拒絕。本輪停止瀏覽器操作，沒有改用其他瀏覽器、原始 CDP 或外部自動化繞過限制。因此沒有本輪新版 UI 截圖，也沒有宣稱新功能通過 390px／360px 或真實 iOS 驗收。

工具可用後應完成：

1. 乾淨測試瀏覽器的登入、錯誤後保留輸入、Email／密碼標籤，以及登入成功到資料準備的畫面銜接。
2. 390×844、360×640、短高度與平板：同步文字是否擠壓返回／編輯、面板捲動與明確關閉、焦點返回。
3. 測試帳號的離線、尚有待送紀錄、同步失敗與權限確認失敗；只用隔離測試情境，不以清空既有資料製造失敗。
4. 心得／現金草稿與照片的狀態是否仍不會被一般「已同步」誤導；本次沒有新增真實成交、金額或照片來取證。

本批優先改善辨識與失敗時的操作入口，沒有調整雲端資料讀取算法，也沒有新的登入耗時量測，因此不宣稱下載速度已提升。成交照片流程的整體優化與完整出攤流程實測，仍依前述優先順序接續。本批未 commit／push／正式部署。

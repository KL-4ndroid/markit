# 三方案雲端寫入權限：測試帳號階段

日期：2026-10-26。狀態：使用者已回報執行 082；已以真實 RPC 確認指定測試帳號就緒，本機雲端測試模式已啟用，三方案權益一致性檢查通過。這份文件不代表正式收費或全帳號分級已完成。

## 範圍與目的

前一階段完成免費／輕量／高階的畫面與入口。這一階段新增雲端保存時的方案檢查，避免只靠隱藏按鈕。沿用 `free`／`pro`／`team` 對照，不更動正式訂閱帳本、價格承諾、付款或取消功能。

| 寫入內容 | 免費 | 輕量 | 高階 |
| --- | --- | --- | --- |
| 市集安排、報名／錄取／繳費、開收攤狀態、個人清單、私人心得 | 沿用既有規則 | 同左 | 同左 |
| 成交／互動事件、商品、現金盤點、商品封面照片、營收摘要變更 | 阻擋 | 允許 | 允許 |
| 成交照片、團隊現場協作備註 | 阻擋 | 阻擋 | 允許 |

以上均另受既有角色、RLS、場次狀態與照片開關約束；高階身分不會取得其他品牌權限。現金盤點仍限老闆，商品／封面協作仍限有權限的 manager。協作備註與免費私人心得是不同功能。

## 雲端構造

- `082_add_subscription_write_guards.sql`：新增獨立啟用設定、指定帳號、限時測試身分及切換稽核；資料表禁止客戶端及 service_role 直接寫入，操作由受控 SECURITY DEFINER RPC 處理。
- `subscription_effective_plan`：有效、未過期的指定測試身分優先，其次為既有有效 admin 權益；promotion／billing 的正式啟用仍維持既有封閉狀態。
- `check_subscription_write_access`：authenticated 可為自身角色查詢；`check_subscription_write_for_actor` 只限伺服器呼叫。這是額外權益判斷，沒有取代原本的實體權限。
- 事件、商品、現金、照片及市集財務摘要新增 trigger。事件語意修改在指定帳號禁止，既有 metadata 確認不受降級影響。報名費、攤位費與押金等繳費參考欄位不在財務摘要限制中。
- `read_subscription_account_for_actor` 與 Team 共用權益判斷同時讀取限時測試身分，避免畫面與保存判定不同。真實 subscription_accounts 不會被切換功能覆寫。
- 照片上傳 API 在 metadata claim／R2 寫入前及 finalize 前檢查權益。上傳途中權益失效，沿用同次請求的補償刪除與失敗標記，保留本機照片 payload，不新增重試機制。
- 失敗／刪除／過期補償不會因降級被卡住；既有業務資料不會由本次遷移批次改寫或刪除。

## 啟用次序

1. 在同一 Supabase 專案完整執行 [082 遷移](../../supabase/migrations/082_add_subscription_write_guards.sql)。遷移本身不啟用任何帳號，`enforce_all` 預設 false。
2. 執行 [指定測試帳號啟用](../../supabase/repairs/082_enable_test_account_write_guards.sql)：只定位既有 `123@123` 且有 profile、不是有效員工的帳號，不建立帳號或修改市集／銷售資料。若查無或身分不符合，整段交易中止。
3. 執行 [唯讀驗證](../../supabase/verification/082_subscription_write_guard_readiness.sql)：結構／權限檢查通過，結果有一列測試帳號，enabled 與 allow_test_switch 都 true，enforce_all false。
4. 收到完成確認後，再將本機 `SUBSCRIPTION_SIMULATION_CLOUD_ENABLED=1` 與 `SUBSCRIPTION_WRITE_ENFORCEMENT_ENABLED=1` 加到 .env.local，重啟服務。保留原本 `SUBSCRIPTION_SIMULATION_ENABLED=true`。
5. 設定中的切換採雲端 RPC；只允許指定帳號，會同步影響同一帳號在本機與線上版本的權益，每次四小時到期，重啟伺服器不會清除雲端測試身分；可按還原立即結束。使用者整批人工驗收目前仍暫緩。

以上新開關在新環境預設關閉；目前 .env.local 已啟用上述兩個新開關，原本 SUBSCRIPTION_SIMULATION_ENABLED 保持 true。SQL 由使用者執行；本次沒有自行套用 SQL、開啟全帳號或部署正式版。伺服器檢查開啟後，缺少 RPC、權限資料或網路時回傳 503，不以本機測試假資料放行。切換回覆遺失時會使畫面權益重新讀取，並提示結果尚未確認，不假定雲端沒有保存，也不自動重送切換。非指定帳號維持既有行為。要停止試行可使用啟用 SQL 最下方的停用指令，稽核紀錄保留。

## 本機、離線與平台邊界

不改動 `lib/db/events.ts` 的交易、資料投影或同步路由，也不在每次離線成交前新增強制連線。離線佇列仍保留；若同步當下雲端權益不足，既有同步錯誤處理保留待處理資料，不自動刪除。如何處理降級前未同步的合法成交、到期唯讀／清理入口，需後續定義和驗證，不能把這一階段稱為完整降級政策。

共用決策合約在 `lib/subscription/write-access.ts`，伺服器金鑰與 Supabase RPC 在 `.server.ts`。沒有新增瀏覽器 storage、device API、原生套件或 native adapter。未來 iOS／Android 可沿用 API、資料庫與決策合約。

## 驗證與尚未完成

隔離 PGlite 腳本使用本機臨時資料庫，不讀取環境金鑰或連線雲端；覆蓋遷移／指定帳號啟用重跑、私有函式權限、免費基礎保存、三方案付費寫入、跨品牌／角色、權益讀取一致、期限還原、照片補償及 metadata 確認。服務測試另覆蓋查詢失敗封閉、雲端模式不退回記憶體假身分。照片 route 測試驗證拒絕前零 metadata／R2 寫入，以及中途降級補償。

待辦仍包括：實際成交／照片保存情境驗收（人工驗收暫緩）、其他 API／分析讀取入口全面盤點、正式全帳號啟用、既有資料與降級政策、圖片／商品額度決策、後台價格／活動／調價管理、商店付款與訂閱生命週期。本次沒有自行增加容量限制或恢復整批人工驗收。


## 本次驗證結果

- PGlite：8 組情境通過，包含實際 082、指定帳號啟用及驗證 SQL；啟用前驗證會明確拒絕，避免只安裝結構就誤認已啟用。
- 7 份訂閱／帳號服務／Team 回歸檔、商品封面契約及成交照片上傳 route 測試通過；route 新增上傳前拒絕與途中降級清理情境。
- 9 份本次修改的程式來源 ESLint、Web 生產建置與 TypeScript 檢查通過。
- 行動版靜態建置／資產驗證通過：378 檔案、19.73 MiB、35 個 segment aliases。這是共用 Web 資產，沒有原生商店或實機驗證。
- 文案清單重新產生並核對：679 個來源、7,268 筆紀錄、18 個輸出；產生器 10 項測試通過。
- SQL 由使用者手動執行；本機啟用未新增營運資料、正式部署、正式付款、全帳號啟用或整批人工驗收。


## 2026-10-26 真實雲端啟用核對

使用者回覆「已執行082」後，先以服務端唯讀 RPC 確認函式存在且指定帳號已 enabled／allow_test_switch；沒有要求使用者重跑。這是對實際接線的驗證，不代表已取得 SQL Editor 的結構驗證輸出。

- `read_subscription_test_switch` 回傳 cloudBacked=true、enabled=false，證實可使用雲端測試切換且最初沒有進行中的覆寫。
- 免費原始帳號的銷售 preflight：enabled=true、allowed=false、reason=plan_required。
- 本機 .env.local 啟用 SUBSCRIPTION_SIMULATION_CLOUD_ENABLED=1 與 SUBSCRIPTION_WRITE_ENFORCEMENT_ENABLED=1，原本 SUBSCRIPTION_SIMULATION_ENABLED=true 保留。Next dev 已自動重新載入；以本機 API 實際回傳 cloudBacked=true 確認，不只是檔案值。
- 使用使用者已提供的測試帳號登入，依序透過本機受驗證 API 切換 free／pro／team；每次 account-capabilities 的方案與商品／成交照片能力皆符合預期。每個方案對 sales、products、cash、product_photo、sales_photo、field_notes 六個 authenticated 雲端 preflight 的結果一致，共 18 項。
- 切換只寫入測試覆寫與稽核 metadata，沒有建立成交、商品、市集、現金盤點或照片，沒有操作 R2。
- 最後經同一 API 關閉測試覆寫，還原帳號原有方案；測試登入 session 以 local scope 登出，不影響使用者瀏覽器登入。
- 未登錄帳號的唯讀控制查詢回傳 enabled=false，確認沒有開啟全帳號 enforcement。authenticated 呼叫私人 plan helper 與讀取測試切換表皆被拒絕。

本次沒有驗證真實保存／離線佇列／四小時等待；期限行為仍以隔離 SQL 測試為證據。整批人工驗收保持暫緩。


## 後續完整性盤點

[2026-10-26 完整性補漏](SUBSCRIPTION_COMPLETENESS_AUDIT_2026_10_26.md) 已核對頁面／API／共用規則，修正商品照片能力與跨品牌讀取、直接網址尾斜線、到期更新及商品照片 API base／CORS。沒有新增 SQL 或將試行全域啟用；其他 API 盤點已有來源矩陣，保留的未決項目以該報告為準。

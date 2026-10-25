# UX-NEXT-05A 縣市基礎實作與驗收紀錄

日期：2026-10-23。來源依據：[完整整合規格](MARKET_CASH_JOURNAL_REGION_PLAN_2026_10_23.md)。

狀態：來源實作、隔離驗證、使用者確認的雲端 SQL 驗證完成；本機選填已開啟。後續已確認手動新增臺南市場次可雲端保存並於乾淨儲存來源還原，表單完成手機尺寸／桌面檢查。其他縣市案例、正式部署及真正跨裝置操作仍待驗收。

## 資料與平台邊界

- `lib/markets/market-region.ts`：22 個產品內部代碼、名稱、選填驗證與精確全名別名對應。不是外部地理編碼服務；不推測地址、不使用 GPS，也不自動分類歷史。
- `Market.regionCode`／`MarketCreatedPayload.regionCode`／`Venue.regionCode`：可缺省或 null；雲端對應 `region_code`。新增非索引屬性不需要 Dexie schema 升版。
- `lib/data-mappers.ts`：建立、修改、雲端列與事件重播的雙向對應。缺省表示不更新；null 表示清除；無效與衝突別名拒絕。讀取列不保留可能過期的 snake-case 分類別名。
- `lib/db/events.ts`：沿用 market／venue 事件與既有離線同步路徑，沒有新裝置能力、服務供應商、同步重試或路由。新增寫入先驗證版本開關；已同步讀取／重播不受開關影響。
- `scheduled-market-materializer.ts`／`schedule-operations.ts`：每場自己的快照；未分類來源明確為 null，避免未來更新時本機清空、雲端卻保留舊值。不送出沒變動的縣市欄位，使暫停新功能後仍可修改原有固定安排。
- 規則、資料模型、驗證和同步共用於 Web／iOS／Android；本切片沒有新增 browser/device API，因此不需要新 platform port。

## 操作入口與權限

- 手動場次新增／編輯、建立固定安排：縣市放在自由地點前，選填，不預設居住地或前一場。
- `MarketRegionField.tsx` 使用原生 select、連結 label／說明、48px 最小高度；手機單欄，較寬畫面沿用既有 grid。欄位不開放時顯示準備中，基本資料仍可照常新增。
- 新增市集草稿包含縣市；編輯只有真的變更才送縣市 patch，避免修改其他欄位就清空分類。
- Owner 管理分類；manager／operator／viewer 無新增分類寫入能力。既有 manager 欄位白名單保持原狀。
- `staff_accessible_markets` 最後附加 region_code，只提供既有可讀市集的非財務資訊；原有 owner 範圍、員工關係與財務 null 遮罩保持一致。
- Venue／排程管理沿用 070 owner-only 規則；更改 Venue 不直接更新已生成場次。排程修訂才按照既有保護規則更新允許的未來快照。
- 第一版沒有固定安排整批修改縣市的專用畫面、舊場批次補填、文字候選提示或縣市分析。單場覆寫可在既有單場編輯入口完成。

## 雲端與啟用

1. 先發布能讀取新欄位的相容來源，`NEXT_PUBLIC_MARKET_REGION_ENABLED=false`。正式發布前仍需完成下方真實操作驗收。
2. 在對應 Supabase 專案套用 [074 migration](../supabase/migrations/074_add_market_region_foundation.sql)。檔案新增 nullable 欄位、代碼約束、owner 防護、事件投影，以及檢視末尾欄位；沒有歷史 backfill。
3. 若曾套用早期 074，執行 [函式權限修正](../supabase/repairs/074_revoke_region_client_execution.sql)。它只調整函式 EXECUTE 權限。最新 074 已內含相同修正，無須再套另一份。
4. 執行 [唯讀 SQL 驗證](../supabase/verification/074_market_region_readiness.sql)：確認欄位、代碼、觸發器、約束與用戶無投影函式執行權。執行 `node scripts/check-market-region-cloud.mjs` 另外驗證 REST schema／純驗證函式；腳本不寫資料、不輸出密鑰。
5. 證據通過後，在目標環境設定 `NEXT_PUBLIC_MARKET_REGION_ENABLED=true` 並重新建置。變數是建置設定；只修改本機 `.env.local` 不會啟用 Vercel 或已打包 App。
6. 關閉功能時將開關改 false 後重建；保留資料欄位與讀取相容性，不刪欄位或回滾歷史。

本次處理記錄：第一次套用回報暫存表不存在，已將檢視 capture／replace／compare 收斂成單一 DO statement，移除連線暫存狀態依賴。接著唯讀驗證抓到 Supabase 的直接角色預設 EXECUTE 授權；已明確對 PUBLIC、anon、authenticated、service_role 撤權，再僅開純驗證函式給 authenticated／service_role。使用者最後回覆「完成，驗證也通過」；本機開關在驗證成功後重新啟用。

074 會比對替換前後檢視 SQL，除新增縣市欄位與空白外有差異就中止；不覆寫不符合目前來源的已部署權限檢視。

## 自動驗證與限制

- 41 個相關測試檔通過（`scripts/test-files.txt` 中的 recurring-operations、region、market-form、time-sync、owner replay、角色與相關 UX／收入回歸）。四個新增 region 測試已登錄一般測試清單。
- `node scripts/verify-market-region-sql.mjs`：14 組隔離 PostgreSQL/WASM 檢查通過。使用實際 056／069／070／072 投影／角色 SQL 與 074，最小舊 schema fixture；不連雲端。包括 Supabase 形式的直接預設函式授權、權限修正、跨 owner、員工遮罩、null 清除、未知代碼、重跑與檢視漂移拒絕。
- 可選隔離 runtime 安裝：`npm.cmd install --prefix .codex-artifacts/region-sql-runtime --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.11`。未變更 App 依賴、lockfile 或套件版本。
- `tsconfig.mobile.json`、受影響 TS／TSX lint、Web build、mobile static build 與 `verify:mobile` 通過。靜態手機產物 354 檔、19.40 MiB；不是原生安裝或實機測試。
- SQL fixture 驗證分類投影與角色，不取代既有 073 收入投影測試；074 不改原 market 投影函式，fixture 另核對函式定義不變。
- 尚未完成 360／390／430px 與桌面真實操作、真實帳號新增後跨裝置／乾淨瀏覽器恢復、離線重連送達，以及正式部署驗收。SSR 欄位測試不等於這些項目通過。
- 本次沒有新增營運測試市集、修改歷史資料或變更訂閱／付費範圍；Demo／素材的既有工作區修改保留，沒有納入本切片。

待上線前實際驗收：新增一場有縣市與一場未分類、修改／清除縣市、固定安排新場快照、過去／已開攤／單場覆寫保護、換裝置後一致、員工只讀分類及原有財務遮罩。使用可明確辨識的測試資料，不批次改舊場來湊證據。

## 後續手動新增與還原證據

2026-10-23 在期限驗收中，透過真實表單新增 `[驗收1023-A] 期限與縣市測試` 並選臺南市，雲端只讀確認 `region_code=tw-tainan-city`，全新 `localhost:3000` 儲存來源登入同一帳號後也還原臺南市及原地點。360／390／430px 手機與 1440px 桌面表單排版已檢視。該獨立測試場次最後標為已取消並保留，未改原有場次；詳見 [完整期限操作證據](MARKET_PAYMENT_DEADLINE_2026_10_23.md)。

此證據僅補足手動新增分類與同機乾淨儲存還原，不將未分類新增、清除／更正分類、固定安排保護、員工 UI 或真正第二裝置驗收標為完成。

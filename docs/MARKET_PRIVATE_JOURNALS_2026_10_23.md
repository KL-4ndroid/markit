# UX-NEXT-04A／B 私人出攤心得與集中回顧

日期：2026-10-23。依據：[完整整合規格](MARKET_CASH_JOURNAL_REGION_PLAN_2026_10_23.md)。

狀態：使用者已確認完整執行 076，雲端欄位唯讀檢查通過，本機心得功能已開啟；已補真實老闆測試帳號的新增、修改、草稿重載、集中搜尋、離線主動送出、可復原移除、獨立來源還原及版本衝突合併證據（見末節）。正式部署與真正 iOS／Android／第二裝置實機仍未驗收。沒有修改 Demo、訂閱分級、成交、庫存或淨利。

## 第一個可用範圍

2026-10-25 體驗決策：心得的主要流程為記錄、保存與回顧；「另建出攤待辦」僅在更多操作提供，不要求寫完心得繼續整理任務。可直接寫準備事項，原文挑選預設收合；詳見 [選用待辦需求](MARKET_JOURNAL_OPTIONAL_TASK_UX_2026_10_25.md)。

- 個別市集「回顧」頁提供出攤心得，可選整場總結或某個營業日，非連續營業日不把空檔當出攤日。不強制當天填寫，已結束場次可補寫。
- 自由文字最多 5,000 字，保存原場次 ID、owner、作者、建立／修改時間及目前修訂版號。一場可有多篇心得；第一版不提供逐版全文歷史瀏覽。
- 市集頁提供「出攤心得・集中回顧」入口，沒有新增固定底部頁籤。單場與集中清單使用同一份資料，可搜尋市集／地點／心得關鍵字、依縣市篩選；依心得營業日或整場結束日排序。日期區間篩選已於 2026-10-24 完成來源與真實 owner 畫面驗收（含首尾日，整場按結束日）。081 已於 2026-10-25 確認套用並啟用本機轉待辦，真實保存／去重／來源版本拒絕及獨立來源還原通過，原心得仍私人且不改寫，詳見 [後續細節紀錄](MARKET_FOLLOWUP_DETAILS_2026_10_24.md)。
- 只有該場 owner 讀寫自己的文字；manager／一般員工沒有雇主心得入口，也沒有新資料讀取權。UI 額外要求當前角色完成確認且非員工。不是公開評價或團隊筆記。
- 「移除」為可復原的軟刪除，內容及作者保留；集中與單場可選「顯示已移除心得」後編輯並復原。原市集被刪除則兩處都隱藏其心得，不能依名稱掛到另一場；實體刪除市集／auth user 時由 FK cascade 清理雲端心得。
- 市集已刪除時，原 owner 的本機草稿文字不再展示；集中頁提供明確捨棄已刪場次草稿的操作。僅缺少本機市集快取不視為已刪除，先等待原市集同步。

## 保存、衝突與復原規則

- `market_journals` 是獨立 owner-private 雲端來源；不把文字放進 `markets.notes`、`field_note_*`、共用 events、通用同步佇列或員工 view。雲端授權以 market owner 與登入者一致為準，與既有市集 owner 寫入邊界一致。
- Dexie v9 新增 `marketJournals`（已同步快取）及 `marketJournalDrafts`（尚未送出草稿），舊表不重建、不清除；兩張表有 owner／market 索引。
- 輸入即排隊保留本機草稿；只有「儲存到雲端」才呼叫 writer。離線與送達失敗保留草稿，重新連線後由使用者主動儲存，第一版沒有自動背景上傳心得。一般首頁同步提示不代表心得草稿已送達。
- 草稿先成功寫入裝置才送雲端。裝置儲存失敗會明示「未寫入裝置／未送到雲端」，不能顯示為草稿已保全。空白、超長或無效日期不可送出。
- 雲端寫入使用 owner／market 範圍、expected revision 及 mutation UUID。網路回應遺失可重送同一 mutation；其他裝置已修改則拒絕覆蓋，先比較雲端內容，使用者明確選擇基準後再合併保存。
- 同源多分頁草稿亦比較前次 mutation，避免另一分頁悄悄覆寫草稿；衝突時保留已儲存的一份，當前未寫入文字需先複製保留。
- 登出、身分／角色清除及清除本機資料使用既有未同步保護，新增心得草稿的阻擋原因與數量。一般事件 push 不會自動代送私人草稿；必須回心得儲存，或明確同意捨棄。
- 舊財務／資料匯出不含私人心得，不能把舊匯出當作心得保全；帳號刪除 preflight 遇心得草稿先阻擋，需回心得頁處理。已同步心得可從自己的雲端來源重新讀取。
- 清除認證快取前使 journal scope epoch 失效；舊請求／排隊寫入不能在清除後重新填回私人快取。UI 查詢與共用清單模型再次限定 owner、原場次且未刪除。
- 本機已存心得／草稿視為固定安排的使用者活動，禁止排程更新／略過覆寫；雲端 market trigger 額外保護已有心得（含軟刪心得）的 schedule revision／occurrence state。其他主辦備註與金額規則不變。

## 來源導航與平台邊界

| 範圍 | 檔案 |
| --- | --- |
| 共用模型、驗證、搜尋與排序 | `lib/markets/market-journal.ts` |
| owner cache／draft、送達與重讀協調 | `lib/markets/market-journal-repository.ts`、`market-journal-cache-scope.ts` |
| 雲端 adapter | `lib/supabase/market-journals.ts`：登入者 Supabase client、RLS reader、每頁 200 筆 UUID 游標、單場只查該場；沒有 server key 或同源 API 假設 |
| 請求等待上限 | `lib/markets/market-journal-request.ts`：共用 12 秒 timeout／abort，不依賴 window；失敗保留草稿、不自動重試 writer |
| 單場與集中畫面 | `components/markets/MarketJournalWorkspace.tsx`、`app/markets/journals/page.tsx`、既有市集頁與詳情回顧入口 |
| 本機與登出保護 | `lib/db/index.ts`、`lib/db/clear-user-data.ts`、`lib/sync/local-pending-write-report.ts` 及既有 auth／settings 提示 |
| 固定安排保護 | `lib/recurring-operations/{types,reconciliation,schedule-operations}.ts` |
| 雲端權限與寫入 | `supabase/migrations/076_add_private_market_journals.sql`；`save_market_journal` 為唯一一般 client writer |
| 驗證 | `tests/market-journal-persistence.test.ts`、`tests/fixtures/market-journal-sql.mjs`、`scripts/check-market-journal-cloud.mjs` |

新切片未直接使用 window、document、navigator、Web Storage 或原生套件；資料模型與協調使用既有 Dexie 與注入的雲端 port。沒有新增裝置能力或修改 native gate。日期為場次的曆日識別，不依裝置時區轉換；歷史日期已被更正時，允許文字編輯保留原紀錄日期。

## 雲端套用與啟用順序

1. 先完成 074／075（本專案使用者已確認）。完整執行 [076 遷移](../supabase/migrations/076_add_private_market_journals.sql)，內建 RLS、writer／trigger 權限檢查；不需切成多段、沒有暫存表或連線狀態依賴。
2. 執行 `node scripts/check-market-journal-cloud.mjs` 只查 `limit=0` 欄位可讀性，不讀心得文字、不呼叫 writer。角色與行為證據來自 migration 自檢／隔離 SQL 與後續真實帳號驗收，REST schema 不冒充 RLS 行為驗證。
3. 確認後才在目標環境設定 `NEXT_PUBLIC_MARKET_JOURNALS_ENABLED=true` 並重建。`.env.example` 預設 false；使用者確認 076、REST 欄位檢查通過後，本機 `.env.local` 已開啟，正式部署設定未修改。
4. 以明確標示的獨立測試資料驗收手機 360／390／430px 與桌面、逐場／集中、中文輸入、返回保留草稿、離線重連主動送出、版本衝突、軟刪復原、乾淨儲存還原與未授權拒絕。需要真正裝置證據的項目另記，不以瀏覽器尺寸代替實機。
5. 暫停時關閉新功能開關並重建，保留雲端表與本機草稿／未同步保護；不要破壞性回滾或刪除私人心得。

## 已完成與待補證據

- 46 個相關測試檔通過（含新增 route 回歸）；最新心得回歸另外覆蓋 owner／刪除市集清單隔離、搜尋、篩選及可復原列表。
- `node scripts/verify-market-region-sql.mjs --with-journals`：35 組隔離 PostgreSQL 檢查通過（14 region、10 deadline、11 journal），不連雲端。包含直接 client 寫入拒絕、員工／跨 owner、空白／超長／非連續日期、revision、重複 mutation、軟刪復原、刪場隱藏、固定安排保護及重跑保留。
- Web 建置、手機型別與新來源 lint 已通過；手機靜態建置與產物檢查通過（366 檔、19.54 MiB，包含 `/markets/journals`），不等於原生裝置或真實雲端功能已啟用。
- 初始 076 REST schema HTTP 404 時未啟用；後續使用者回覆「076 已完成」，重新檢查 HTTP 200 後才啟用本機並進行下列驗收。SQL 角色／結構驗證依據使用者完整執行含自檢的 migration 與隔離行為測試，並非只靠 REST schema 推論。
- 未 commit／push 或正式部署；員工／跨 owner 的實際登入 UI、真正 iOS／Android／第二實體裝置與裝置背景終止後恢復仍待驗收。

## 076 啟用後的實際驗收

- 使用既有獨立測試場次 `[驗收1023-A] 期限與縣市測試`（`d7b88518-a3e6-4a42-9969-06680418ee19`，已取消），沒有改動原有營運場次。新心得明確以 `[驗收1023-J]` 開頭，ID `55abb422-440d-4ae6-9600-0b27f021da7b`；保留作為後續驗收資料。
- 透過真實個別市集回顧頁填入中文、換行及 2026-10-24 分日心得；尚未送出時重新載入，仍能「續寫／處理草稿」。按儲存後真實雲端回傳第 1 版，草稿提示移除。
- 實測發現 Web legacy `/markets/:id` redirect 把 `journals` 誤認為 ID，現已在 `next.config.mjs` 與 detail／schedules 一起排除；新增 `tests/market-journal-routing.test.ts`。修正後，市集頁與單場的集中回顧連結皆開啟正確 `/markets/journals`，不是 `detail?id=journals`。
- 集中清單搜尋「停車」及臺南市能找到同一篇；不存在的文字顯示無結果。原日期、縣市、地點、文字與 revision 一致，未複製心得。
- 開發工具離線模擬最初仍容許外部請求送達，因此沒有把初次模擬當作離線成功。現已在 repository 透過既有 NetworkPort 檢查已知離線，先保留草稿，再停止 writer；不新增 browser globals。
- 複驗離線時輸入「待連線送出：預備遮雨布」，立即提示草稿留在裝置，保存／編輯控制不會卡死；獨立伺服器只讀核對雲端仍第 2 版、尚無此文字。連線恢復並手動按儲存後才成為第 3 版。失敗不再連續啟動另一個雲端讀取，避免已離線時卡在儲存中。
- 軟移除後一般清單為空（第 4 版）；顯示已移除心得再編輯並復原，仍是同一 ID、原作者與建立日（第 5 版）。
- 首次從另一個儲存來源 `localhost:3000` 讀取心得，成功從雲端取得完整第 5 版；原來源為 `127.0.0.1:3000`。這是同機獨立 origin 的首次心得還原，該來源已存在之前的登入／一般市集快取，不冒充全新瀏覽器或第二實體裝置。
- 跨來源保留舊草稿，再於原來源更新雲端。雲端不接受舊 revision 覆蓋；實際遠端舊版 RPC 沒有及時回應，另以短時限的測試帳號 API 探測確認會逾時。已加入送出前只讀 revision／mutation 核對，以及登入、讀取、writer 各 12 秒等待上限；server RPC 仍保留鎖定後原子 revision／owner 檢查，前置讀取不取代授權，也不消除競態。
- 修正後再次建立真實第 7／8 版差異：舊草稿進入可操作的衝突提示，原文字保留、儲存停用且可閱讀第 8 版。明確比較並合併後，成功存為第 9 版整場總結；同一 ID，沒有額外副本。極短競態或遠端異常仍可能逾時，這時不推定成功／失敗、不丟草稿，要求先重新讀取核對；使用同一 mutation 可安全確認重送。
- 實際 CSS 360×844、390×844、430×844、1440×900 檢查無文件橫向溢出，中文自然換行、範圍選單與儲存／收起／捨棄操作可捲動取得。原來源約 391px 完成主要寫入流程；尺寸以 DOM 實測為準，已排除分頁縮放差異。
- 本機截圖：`.codex-artifacts/journal-ui/list-390.png`、`editor-360.png`、`editor-430.png`、`list-1440.png`。只含明確標示的測試文字；忽略目錄不隨 Git 推送。

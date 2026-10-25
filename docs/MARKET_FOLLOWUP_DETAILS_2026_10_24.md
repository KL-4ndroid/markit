# 心得日期、心得轉待辦與固定安排縣市

日期：2026-10-24（Asia/Taipei）。

狀態（2026-10-25 更新）：使用者已確認完整執行 081，三個 authenticated RPC 的雲端 schema 已核對；兩個本機 writer 旗標已啟用。心得日期篩選、心得轉待辦及固定安排批次縣市已完成真實 owner UI／雲端保存、重複送出、過期來源／預覽拒絕及獨立來源還原驗收。範例旗標仍為 false；正式部署、真正第二裝置與原生實機另驗。

使用者最新決策：背景／原生通知留到正式開發 iOS 時實作。本輪沒有新增通知 port、原生通知套件、系統授權、推播或背景排程，也不將它列為本輪未完成依賴。

## 1. 心得集中頁日期區間

- 在 `/markets/journals` 提供選填起日／迄日、含首尾日的篩選；可只填一邊，與關鍵字、縣市、已移除顯示規則取交集。
- 按心得的營業日篩選；整場總結採該市集結束日。建立／修改日期不改變期間歸屬。
- 草稿明確改成整場總結時，使用市集結束日，不錯誤沿用雲端舊的分日日期；同時修正清單標示與排序。
- 無效曆日或起日晚於迄日顯示提示，不送出雲端查詢，也不把錯誤範圍顯示為「沒有心得」。清除篩選同時重設文字、縣市與起訖日期。
- 不修改心得文字、版本、草稿、收入或場次資料；沒有新 migration 或資料庫索引需求。

## 2. 從心得整理下次出攤待辦

- 2026-10-25 體驗調整：此功能定位為次要選用，不是寫心得的必要下一步。已保存、未移除且沒有未送出草稿的心得，在收合的「更多操作」提供「另建出攤待辦」；未啟用則隱藏入口。心得主要操作維持閱讀／修改，保存後不主動帶入待辦。完整需求見 [選用待辦體驗規格](MARKET_JOURNAL_OPTIONAL_TASK_UX_2026_10_25.md)。
- 先直接寫需要記得的事，原文逐行挑選預設收合且全不勾選，需要時再展開／改寫；收合後顯示已選數量。原心得維持私人且完整保留，場地經驗是否適用由使用者選定目標場次，不預選下一場。
- 先選擇同 owner、今日或之後的其他市集；排除刪除、結束、取消、延期、跳過及隱藏場次。最多 20 項、每項一行 1～200 字，拒絕空白及正規化後的重複內容。
- 預覽明確列出目標市集與會加入的文字，說明可使用該場待辦的員工也看得到。只有確認過的文字成為普通 `checklist_item_created` 事件，不加入心得全文、私人來源 ID 或來源連結。
- 原心得不刪除、不改成團隊共用；其他未勾選文字不會進共享事件。來源修訂或刪除會阻止新的套用。已完成套用的同批重送回原回條，不復活後來刪除的待辦或重設完成狀態。
- 雲端鎖定原場與目標場，重新檢查 owner／author／來源 revision、目標狀態及日期；相同文字含已完成項目略過，支援舊 payload-only 待辦事件的讀取。
- 使用者可連線送出；不新增自動重試、離線模板或 pending-operation route。未確認的勾選／改寫僅存在當前對話框，離開不保存；原心得仍可重新閱讀。

## 3. 固定安排批次編輯縣市

- 在固定安排卡片顯示縣市與「編輯未來縣市」。縣市屬於共用場地，不另造排程上的互相矛盾分類；畫面說明同一場地的進行中／暫停安排都會使用新預設。
- 雲端預覽回傳場地版本、相關安排版本，以及今天（Asia/Taipei）起已建立的未來場次分類與是否可更新。一次最多 250 場、100 個安排；超限明確停止，不默默截斷。
- 先選縣市（含明確清除為未分類），列出變更場數、前後縣市與受保護場數，再確認。更新場地預設與符合條件的既有未來快照；後續新產生場次使用同步後的場地預設。
- 保留過去、單場覆寫、取消／跳過／隱藏、正在營業／結束，以及已有成交、互動、待辦、私人心得、現金或其他使用紀錄的場次。現金、心得與舊 payload-only 操作同樣視為活動。
- 送出時重新鎖定場地、安排與場次，重算全部雲端預覽；包括新增私人紀錄但市集更新時間沒變的情況也會造成衝突。任何版本／活動差異整批拒絕，不進行半套更新。
- 僅透過既有 `venue_updated`／`market_updated` 的 `regionCode` 更新；不改地址原文、日期、時間、排程版本、財務或已保護的歷史。相同 request ID 與完全相同內容只回原結果。
- 本機未同步事件與私人草稿阻擋確認。若請求期間新增本機資料，回應不以舊快照覆蓋新內容；換帳號／快取清除使晚到工作失效。

## 4. 資料、權限與平台邊界

`081_add_owner_followup_workflows.sql` 需要已完成的 074／076／078，只新增：

- `owner_workflow_receipts`：owner-private、RLS 啟用、client 無 SELECT／INSERT／UPDATE／DELETE，隨 owner 帳號刪除 cascade；保存請求與原結果以處理失去回應後的明確重送。
- `apply_journal_checklist`、`preview_venue_region_change`、`apply_venue_region_change`：僅 authenticated EXECUTE，函式內重新檢查 owner 與非員工角色；匿名、PUBLIC 與 service_role 不取得 EXECUTE。migration 內含 grants／RLS 自我驗證。

沒有新 Dexie table、事件種類、訂閱價格／方案或員工財務權限。共用日期／選擇驗證在 `lib/markets`；網路及有界請求沿用既有 `lib/platform`、認證和 Supabase client，不引入新的瀏覽器專屬假設。角色／帳號快取清除會讓新請求 scope 失效。

## 5. 檔案導航

| 路徑 | 責任 |
| --- | --- |
| `lib/markets/market-journal.ts` | 日期驗證、含首尾日篩選、草稿整場語意及排序 |
| `components/markets/MarketJournalWorkspace.tsx` | 日期篩選與單場／集中心得的轉待辦入口 |
| `components/markets/JournalChecklistDialog.tsx` | 明確挑選、改寫、目標市集、分享範圍提示及確認 |
| `components/recurring-operations/VenueRegionEditDialog.tsx`、`app/markets/schedules/page.tsx` | 固定安排場地分類入口、預覽與確認 |
| `lib/markets/owner-followup.ts` | 共用候選／文字／變更範圍驗證、旗標與 scope |
| `lib/supabase/owner-followup.ts` | 帳號／網路／待同步保護、有界 RPC、結果驗證及局部快取 |
| `supabase/migrations/081_add_owner_followup_workflows.sql` | 原子 writer、權限、預覽版本與回條冪等 |
| `tests/owner-followup.test.ts` | 日期、隱私意圖、目標、旗標、離線、待同步、重送與 scope |
| `tests/fixtures/owner-followup-sql.mjs` | 真實投影／RLS／冪等／衝突與歷史保護的隔離 SQL |

## 6. 已驗證與仍待驗收

- 共用／fake IndexedDB 測試、原心得 persistence、固定安排 future-revision、帳號快取清除與破壞保護回歸通過。手機 TypeScript 與受影響 ESLint 通過。
- `node scripts/verify-market-region-sql.mjs --with-owner-followup`：30 組通過（既有 074 的 14 組、新 081 的 16 組）。驗證 migration 重跑、Supabase 預設 grants、owner／manager／他人／匿名隔離、私人來源不進共享事件、舊待辦去重、回條、來源 revision、取消／過去目標、共用場地、清除分類、歷史／活動保護與新私人心得造成的預覽失效。只用 PGlite，不連雲端。
- 真實 owner 手機／桌面：日期空結果、起訖日包含、錯誤順序、清除篩選；舊測試心得整場結束日 2026-10-24 正確列入，修改日 2026-10-23 不影響此分類。
- 2026-10-24 的啟用前驗收：轉待辦預設不勾選，僅挑一行、改寫並指定驗收場次；預覽只有該行文字。當時 081 未啟用，確認停用且沒有寫入。固定安排當時為正常空畫面；以下 2026-10-25 補足啟用後驗收。
- 手機日期篩選及待辦預覽截圖在忽略的 `.codex-artifacts/followup-journal-*`。391×844 無橫向溢出；手機尺寸不等於原生鍵盤／背景中斷／真實第二裝置驗收。
- 其他裝置尚未送達的離線事件或私人草稿，不在雲端預覽可知範圍；上線同步後需核對。不宣稱跨全部舊 writer 路徑的文字去重或未同步場次分類保證。

### 2026-10-25 真實保存與保護驗收

- 僅使用已授權測試 owner 與具名驗收資料。原心得 `[驗收1023-A]` 第 9 版保持不變；逐行挑選、改寫成 `[驗收1025-F] 提早半小時到場並帶推車`，在桌面確認加入 `[驗收1023-T]`，雲端新增恰好一個普通待辦事件。
- 新事件 payload 只有 `market_id`、`itemId`、`text`、`completed`；沒有來源心得 ID、全文或私人連結。來源心得、既有完成狀態、目標市集完整快照、現金各日 revision／內容皆與基線一致，營收 4,500／成交 2 筆未改。
- authenticated owner API 另確認相同文字略過、完全相同 request 回原回條、同 request 改內容拒絕、來源 revision 過期拒絕；均無新增事件或其他資料改動。手機 390×844 也實際完成相同文字確認，顯示加入 0／略過 1；原有勾選完成項目保留。
- 透過真正固定安排表單建立 `[驗收1025-V] 固定安排縣市測試`，範圍只有 2026-10-25～27、週日／一／二，共三場；地址明示測試，初始臺南市。沒有新增費用、成交或現金。
- 在 25 日那場新增 `[驗收1025-P]` 普通待辦作為已有使用紀錄。同步期間取得的舊預覽仍顯示三場可改，實際確認遭 `FOLLOWUP_CONFLICT` 整批拒絕；雲端三場及場地仍為原分類，沒有半套更新。
- 重新讀取後 UI 正確顯示可改兩場、保留一場；確認更新臺北市後，場地預設與 26／27 日兩場完成更新，25 日仍為臺南市。完整快照比對只允許分類及投影版本／時間欄位變動，地址、日期、成本與財務等其他欄位一致。
- 另外用更新前預覽建立新 request，再次證實衝突且零改動；目前分類的 no-op request 與相同 request replay 均無新增更新。隔離 SQL 另覆蓋有實際寫入的原批次 replay。
- `localhost` 與 `127.0.0.1` 為獨立快取來源：前者從雲端還原固定安排臺北市及一場保護資訊，後者還原新待辦與既有完成項目。這不是實體第二裝置測試。
- 桌面保存結果、衝突與手機預覽證據在忽略的 `.codex-artifacts/followup-081-*`，唯讀／驗收腳本及基線亦在該目錄；不納入版本控制，不含輸出密鑰。手機 DOM 寬 390、高 844，document scrollWidth 390。
- 兩個旗標啟用後重新完成 `npm.cmd run build`、`npm.cmd run build:mobile` 與 `npm.cmd run verify:mobile`；手機產物 378 檔、19.76 MiB，邊界／資源檢查通過。記錄為 `.codex-artifacts/followup-081-web-build.log`／`followup-081-mobile-build.log`。該次啟用驗收沒有修改 runtime 來源，沿用先前已通過的單元／型別／lint 與 30 組隔離 SQL；後續同日的入口與文案調整另於 [選用待辦體驗紀錄](MARKET_JOURNAL_OPTIONAL_TASK_UX_2026_10_25.md) 記錄新驗證。`git diff --check` 通過。

## 7. 啟用與回退

1. 已完成：使用者在同一 Supabase 專案完整執行 081；內建角色／結構自檢。執行本身不複製心得或批次改場次。
2. 已完成：核對 authenticated owner 雲端 schema，本機 `NEXT_PUBLIC_JOURNAL_TASKS_ENABLED=true` 與 `NEXT_PUBLIC_VENUE_REGION_EDIT_ENABLED=true`，重新載入 client。`.env.example` 保持 false；其他部署須各自設定並重新建置。
3. 已完成：具名測試心得、目標與三個固定場次的真實保存／重送／過期預覽／獨立來源還原。正式部署與真實角色／裝置另驗。
4. 回退關閉兩個 writer 旗標；既有心得、普通待辦及場次分類保持可讀。不刪歷史事件或回條，不破壞性回滾 schema。

本輪未 commit／push、未正式部署；背景／原生通知依使用者決策留到正式 iOS 開發。

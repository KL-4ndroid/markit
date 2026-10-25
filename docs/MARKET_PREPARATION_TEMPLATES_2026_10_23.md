# 出攤準備模板 UX-NEXT-02A

日期：2026-10-23。狀態：使用者已確認完整執行 077，雲端欄位檢查通過；本機旗標已啟用，真實測試 owner 的建立／套用／修改／去重／封存恢復與獨立來源還原驗收通過。範例旗標仍預設 false，未正式部署或驗收原生實機。

## 使用方式與範圍

2026-10-25 相鄰功能調整：02B 改稱選用「另建出攤待辦」，收進心得的更多操作；原私人心得不成為模板，保存後不要求整理任務。詳見 [體驗需求](MARKET_JOURNAL_OPTIONAL_TASK_UX_2026_10_25.md)。

- 在可管理的場次「現場工作 → 現場待辦」中，按「從準備模板加入」。首次開啟才讀模板，不增加首頁與登入的資料請求。
- 模板屬於品牌 owner。老闆與既有可管理待辦的 active Team manager 可建立、修改、封存／恢復及套用；operator／viewer 不取得模板內容或新增待辦能力。已套用的普通待辦仍沿原本角色規則讀取及勾選。
- 模板名稱 1～60 字；1～50 項、每項 1～200 Unicode 字元，每行一項。相同文字項目拒絕重複保存，編輯保留未改文字的項目識別。
- 選擇模板後可勾選這場需要的項目，再確認加入。不複製完成狀態，既有待辦不刪除、不重設；含已完成項目的相同文字會略過。文字去重保留大小寫，合併 ASCII 空白、tab 及換行。
- 套用內容是獨立場次快照，模板更新、封存或恢復不變動舊場次。來源 id／revision／application id 留於事件 metadata；沒有新增事件種類。
- 第一版的模板讀取、保存與套用需要連線；模板表不另建本機離線副本。普通待辦原有離線流程保留。若本機該場有未同步待辦，先阻擋模板套用，等待既有同步流程完成，不擴大 pending-operation drain／重試。
- 模板編輯在目前畫面保留；保存失敗不清除輸入，離開或重新整理前需儲存，畫面已明示。這一版未提供模板的持久離線草稿。02B 心得轉待辦已於 2026-10-25 完成 081 本機啟用與真實 owner 保存／去重／來源版本拒絕／獨立來源還原；不把私人心得轉成共用模板，見 [後續細節](MARKET_FOLLOWUP_DETAILS_2026_10_24.md)。

## 共用架構與資料安全

| 責任 | 檔案 |
| --- | --- |
| 模型、文字／項目驗證、去重與提示 | `lib/markets/preparation-template.ts` |
| 身分隔離、已知離線阻擋、未同步待辦阻擋、結果寫入 | `lib/markets/preparation-template-repository.ts` |
| 換帳號／cache reset／員工投影清除時使舊結果失效 | `lib/markets/preparation-template-scope.ts`、`lib/db/index.ts`、`lib/db/clear-user-data.ts` |
| Supabase reader／兩個 writer RPC，12 秒上限、不自動 retry | `lib/supabase/preparation-templates.ts`（沿共用 `runJournalRequest`） |
| 按需開啟、編輯、選取、預覽、封存／恢復 | `components/markets/PreparationTemplatePanel.tsx`、`ChecklistPanel.tsx` |
| 資料表／RLS／writer／批次回條／內建驗證 | `supabase/migrations/077_add_preparation_templates.sql` |
| 共用／本機檢查、隔離 PostgreSQL 執行 | `tests/preparation-template.test.ts`、`scripts/verify-preparation-template-sql.mjs` |

- `preparation_templates` 僅開授權 SELECT 與專用 writer EXECUTE。`preparation_template_applications` 不開任何 client table 存取，經 RPC 傳回本人同一請求結果；匿名不可讀／寫／執行。
- writer 重新檢查品牌、active manager 與老闆 Team entitlement；不信任 UI。角色、Team 權益撤回即拒絕。這是既有員工條件的交集，不核定新訂閱分級、價錢或開通收費。
- 模板儲存採 revision + mutation id，同一 mutation 的相同內容重試不增版；舊版本明確衝突，不使用會誘發傳輸重試的 SQLSTATE 40001。
- 套用鎖定場次；檢查模板版本／所選項目並重建目前有效待辦文字；一個交易寫入全部普通 `checklist_item_created` 事件與 request/result 回條。任一步失敗全部回滾。
- 同一 application id 的完全相同請求回傳原結果，不新增事件；即使之後模板改版、待辦被勾選／修改／刪除，重試仍不會重設狀態或復活已刪項目。不同 payload 重用 id 拒絕。另一次使用者明確套用視為新操作，可重新加入已刪項目。
- 不同套用操作在同場次序列化；原本手動新增待辦仍沿既有流程。另一裝置同時手動新增相同文字不在本次序列化範圍，不能宣稱跨所有舊寫入路徑絕不重複。
- 確認雲端結果後，將回傳的 creation events 存為本機 `synced`；不重播財務 handler、不覆寫後續 toggle／edit events。其他裝置由既有事件同步還原。晚到回應遇身分或 cache epoch 改變拒絕回填。
- `recordEvent` 對同一待辦的 edit／toggle／delete 保證 timestamp 晚於本機已有的該項紀錄，避免伺服器時鐘稍快時把緊接的勾選重播到建立之前。舊事件時間不改、其他事件種類不調整；不宣稱解決不同裝置同時改同一待辦的所有排序衝突。
- 共用層只使用既有 NetworkPort，不引入 navigator／window／檔案／通知等裝置依賴。沒有新路由、Dexie migration 或原生套件。

## 驗證與啟用

已完成：15 個相關回歸測試檔（含共用／fake IndexedDB、原待辦、權限／同步路由、auth cache、心得及 owner event replay）；15 組隔離 PostgreSQL 檢查（含重跑遷移、權限、Team 撤回、版本衝突、重複回條、完成狀態保留、封存恢復、整批回滾）。手機 TypeScript 與受影響 TS／TSX lint 通過；最後時鐘修正後的 Web／手機建置通過，手機產物檢查 **366 檔、19.56 MiB**。

雲端唯讀 schema probe 最初 HTTP 404，使用者確認 077 後已通過；已開本機 `.env.local` 的 `NEXT_PUBLIC_PREPARATION_TEMPLATES_ENABLED=true`。未變更正式部署環境。

實際 owner UI 驗收：

- 新增隔離零金額場次 `[驗收1023-T] 準備模板測試`（`8a9469ba-2c60-4d9f-801b-7c200fbbfb59`），沒有修改既有營運市集。
- 建立三項模板，只勾選其中兩項套用；立即完成「行動電源」後再套用新項目，原有完成狀態保留。改模板的「桌布」文字不回寫場次舊待辦。
- 模擬離線：NetworkPort 已知離線時保存被阻擋、輸入仍在；恢復連線後成功保存。未宣稱 OS 真斷網或離線保存模板可用，測試後已恢復正常網路。
- 封存後不能套用，恢復後可再選。兩個獨立來源 `localhost`／`127.0.0.1` 讀回同一模板及四個待辦（一個已完成），不靠來源間的 IndexedDB 副本。
- 雙來源同時編輯：較新版本先保存後，舊版立刻得到衝突提示，原輸入保留；沒有覆寫新版。驗收用衝突文字已顯式放棄，未遺留未儲存表單。
- 唯讀核對雲端：模板 `8c598637-eb66-4e41-98f2-8dac2fc3b199` 第 5 版、未封存、5 項；場次 4 個待辦、1 個完成、5 筆 checklist 事件，營收／淨利／成交數均為 0。
- DOM 實測 360×844、390×844、430×844 及 1440×900，文件 scrollWidth 不超過視窗；檢查編輯與預覽。截圖位於忽略的 `.codex-artifacts/preparation-template-ui/`，包含手機衝突保護與手機預覽。

尚待：真正第二台裝置、manager／operator／viewer 的實際登入 UI、OS 原生鍵盤／iOS／Android 實機、正式部署；以上不由手機尺寸模擬或隔離 SQL 取代。本輪未 commit／push。

1. 同一 Supabase 專案 SQL Editor 完整執行 `077_add_preparation_templates.sql`；內建 RLS／grant 驗證，交易失敗不保留半套結構。不改舊場次／待辦／營收。
2. 確認成功後，唯讀確認新表／RPC 就緒，再設定本機 `NEXT_PUBLIC_PREPARATION_TEMPLATES_ENABLED=true`，重新啟動開發伺服器；其他部署獨立管理旗標。
3. 只用明確標示驗收的市集／模板驗證。完成後再決定發布，不能將來源編譯成功視為上線。
4. 回退時關閉入口旗標；已產生的普通待辦仍可讀取及操作，模板與回條保留，不做破壞性 schema 回滾。

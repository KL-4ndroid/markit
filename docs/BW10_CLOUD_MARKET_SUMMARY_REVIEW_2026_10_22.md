# BW-10 雲端市集摘要差異與後續修正切片

狀態：073 已套用、指定測試場次已校正、手機新增／撤回與雲端一致。2026-10-22，Supabase `market-pulse-collab`／`fgejncfsvvsayiequubm`。
其他歷史場次尚未批次校正；既有紀錄重新開啟通過，重新登入及角色切換驗收仍未完成。

## 確認的案例

本輪透過正式應用程式介面，在測試帳號建立 `[驗收1022-BW10] 手機營業與離線測試`，
ID `f69d8d90-667c-4af0-ad00-4c52e60aafa8`。專用商品單價 100、成交成本快照 40、初始庫存 10；固定攤位費 100。

| 項目 | 成交事件／本機重播結果 | 雲端 markets 摘要 |
| --- | --- | --- |
| 收入 | 商品交易 200＋簡化補登 150＝350 | 350，正確 |
| 成交筆數 | 商品交易 1＋manualDealCount 2＝3 | 2，不一致 |
| 商品數量與庫存 | 售出 2、庫存 8；簡化補登不扣庫存 | 售出 2、庫存 8，正確 |
| 銷售利潤 | 200－2×40＋150－30＝240 | total_profit 仍為 0 |
| 估計淨利 | 240－攤位費 100＝140 | 本輪不以該雲端欄位推算 |

正常成交事件 `3c7ba41e-907b-4251-abf3-ac1e61816788`；離線補登事件 `d1edeb58-9c8e-4102-b7d2-b568db131cb7`。
恢復連線後，雲端恰有這兩筆 deal_closed；補登只有一筆，內容含 manualDealCount=2、manualCost=30。
重新載入 APP 後仍顯示收入 350、成交 3、銷售利潤 240、估計淨利 140。
這不是原始成交遺失，也不是為了對齊資料而應把本機成交數改成 2。

## 原因證據

SQL Editor 只讀 `pg_get_functiondef('public.update_market_read_model()')`，目前的 deal_closed 分支為：

```sql
UPDATE markets
SET total_revenue = total_revenue + (NEW.payload->>'totalAmount')::NUMERIC,
    total_deals = total_deals + 1,
    updated_at = NEW.timestamp
WHERE id = NEW.market_id;
```

查詢結果 increments_one_per_event=true、reads_manual_deal_count=false、reads_snapshot_cost=false。
每個事件加一忽略了補登摘要代表多筆成交；此分支也未更新 total_profit。
來源碼 `023_fix_market_updated_trigger.sql` 有相同分支，而較早的 `012_update_deal_closed_backfill.sql` 曾處理人工筆數／利潤；
僅憑 migration 編號不能推論雲端仍保留較早功能。此次結論有實際雲端函式與事件佐證。

## 原訂修正切片（下方記錄實際完成範圍）

1. 先盤點 events 上所有成交、刪除及商品庫存觸發器，確認哪些函式寫入 markets／daily_stats；不可只修改一條加總而漏掉刪除補償。
2. 以共用成交投影模型為契約：簡化補登使用 manualRevenue／manualCost／manualDealCount；商品成交合計各品項成交成本快照，不覆蓋前一品項成本。
   快速收款、舊欄位、缺少成本快照、零值、完整補登的庫存語義及刪除補償都需明確回歸。
3. 形成只修改必要分支的候選 migration；確認既有函式特徵，不符合預期即中止。保留 072 的 nullable 時間更新，不整份覆寫未知部署函式。
4. 先對指定測試場次跑單一交易內的 SQL 回滾驗證，涵蓋普通交易、人工多筆、不同成本的多商品、快速收款與刪除補償；證明事件、商品庫存與讀取模型均回滾。
5. 新規則與歷史摘要修正分開交付。歷史資料先做 owner／market 範圍明確的只讀差異預覽，再決定受影響場次與修正片段；本輪沒有授權全帳號重算、清除快取或刪除事件。
6. 雲端修正後，再驗證本機同步、重新登入／重建資料及分析／報表，才可關閉 BW-10 的端到端一致性項目。

目前不新增自動重試、pending-operation worker、帳號權限、RLS、原生付款或資料修復入口。
原訂切片的實際狀態以以下 073 驗收紀錄為準。

## 可重用查核

`tests/sql/bw10_market_summary_read_only.sql` 只讀取上述精確名稱與 ID 的測試場次，以及目前 projector 函式。
目前版本需先套用 073，會排除同場次刪除標記對應的原成交，再比對收入／筆數／銷售利潤；仍只適用指定測試場次，不能拿來批次更新真實資料。

本機證據：`.codex-artifacts/bw10-cloud-restored-final-20261022.json`、
`.codex-artifacts/bw10-cloud-projector-read-20261022.txt`、`.codex-artifacts/bw10-review-reloaded-20261022.txt`。
SQL 數值比較另保存於 `.codex-artifacts/bw10-cloud-summary-comparison-20261022.txt`：event_rows=2、event_deal_count=3、event_sales_profit=240、stored_deal_count=2、stored_profit=0、deal_count_matches=false。

## 073 完成紀錄（2026-10-22）

### 盤點與修正範圍

- 實際盤點 events 上五個應用觸發器；只有 market／product projector 的成交分支寫入本次摘要與庫存，沒有 daily_stats 雲端觸發器。
  原 product projector 也未辨識完整補登，會誤扣庫存；兩個 projector 均沒有 deal_deleted 分支。
- `supabase/migrations/073_align_cloud_deal_projections.sql` 僅替換已核對的成交分支；舊分支不符即整筆中止，已套用標記可重複執行。
  保留 072 四個時間欄位、其他事件分支、既有 SECURITY DEFINER／search_path／函式權限；沒有改 RLS、角色或上傳路由。
- 純數值函式對齊 `lib/events/event-read-model.ts` 的 camel／snake 欄位、nullish 優先順序、明確零值及品項成本快照加總。
  缺少成本快照且沒有事件成本欄位時，依共用事件模型當作零，不猜測商品目前成本；這不證明舊事件的成本完整。
  現有本機 handler 仍有使用目前商品成本的舊語義，073 沒有宣稱已把所有歷史重播規則整併。
- 一般成交更新售出量與有限庫存；完整補登只更新售出量；簡化補登不更新商品。商品列限制為該市集 owner 的商品。
  重複商品品項先合計，避免同一 UPDATE 的多重來源漏算。
- 刪除查回同場次原成交，依原始收入／成本／筆數／商品數量補償，不信任刪除 payload 的金額或產品。
  有明確一般成交旗標才恢復庫存；舊事件無法判斷補登狀態時不增加庫存。
  同場次鎖序列化判斷，重複刪除只補償一次；先收到刪除、同批成交＋刪除、同批多個刪除均已測試。
  PostgreSQL AFTER 觸發器同命令可見所有新列，因此以該次插入的 xmin／cmin 辨識同批，不依賴成交時間先後。
- 三個 helper 皆撤銷 PUBLIC／anon／authenticated 的直接執行權限，沒有開放讀取原始事件的新 RPC。
  本次僅修改共用雲端規則與測試／文件，沒有引入瀏覽器或裝置 API，Web／iOS／Android 共用契約不變。

### 回歸與實際雲端驗證

- `tests/fixtures/deal-projection-contract.json` 的 12 組數值案例，由 TypeScript 共用模型及實際 PostgreSQL 分別核對。
- `scripts/build-deal-projection-verification.ts` 產生單一交易內的候選 migration＋斷言＋ROLLBACK，沒有連線或寫入資料庫的能力。
  先用 `tests/sql/073_deal_projection_baseline.sql` 擷取資料及函式指紋，再產生測試。
  將 baseline 欄位 JSON 存成忽略檔 `.codex-artifacts/bw11-rollback-baseline.json`，執行
  `npx.cmd tsx scripts/build-deal-projection-verification.ts` 後，再由 SQL Editor 執行產生的 `.codex-artifacts/bw10-073-rollback.sql`。
  `tests/sql/073_deal_projection_assertions.sql` 涵蓋多商品不同快照成本、重複商品行、人工多筆、完整補登、快速收款、有限／無限庫存、
  原成交刪除、錯誤刪除金額、重複／先到／同批刪除、跨市集目標及 legacy 未知補登旗標。
- 套用前與套用後都在實際專案通過回滾驗證；同一交易內重複套用兩次。回滾後指定場次／原事件／原商品及兩個 projector／三個 helper 的指紋均一致，無測試事件或商品殘留。
- 單場摘要校正獨立於 migration：`tests/sql/073_bw10_fixture_summary_repair.sql` 嚴格檢查名稱、owner、原始兩個成交 ID、無刪除及預期 350／240／3。
  先 ROLLBACK 驗證，再只校正該場次 markets 摘要。該腳本保存的是當時兩筆成交的修正範圍；後續增加驗收紀錄後會故意拒絕重跑。
- 真正手機介面另新增 `[BW10-073]` 簡化補登 7 元／成本 2／成交 2，事件 `0e4c9f05-9b1a-4078-bbca-e074295b8439`。
  本機與雲端都變為收入 357、銷售利潤 245、成交 5；估計淨利 145，商品庫存仍為 8、售出仍為 2。
  再由成交詳情撤回該專用驗收紀錄，產生 tombstone `c96f7639-0d23-4139-8413-4c1c33312a90`。
  兩邊都恢復收入 350、銷售利潤 240、成交 3、估計淨利 140；庫存仍為 8、售出 2。
  原始兩筆有效成交保留；目前 raw deal_closed=3、deal_deleted=1，有效成交紀錄=2，代表成交次數=3。

### 歷史資料與限制

073 是後續事件規則修正，不會自動重算其他歷史場次，也不會反推或修復舊完整補登已誤扣的庫存。
既有錯誤摘要可能仍影響後續增減的基準，需先核對事件完整性與成本快照，再依明確場次安排歷史校正；不可宣稱全帳號已一致。
`tests/sql/073_test_owner_summary_preview.sql` 僅對已識別測試 owner 提供只讀差異預覽，無事件歷史不能直接用零覆蓋既有摘要。
實際預覽另有 10 場差異，多為總利潤未累加，一場人工成交 7 筆仍存成 1 筆；預覽已保存，沒有直接修正。
沒有執行全帳號重建、replace-cache、原始事件刪除、原生商店變更或 Demo 修改。
原生背景／程序終止、重新登入、員工與跨帳號操作仍需另外驗收；SQL Editor 測試不等於端使用者 RLS 驗收。

證據：`.codex-artifacts/bw11-trigger-inventory.txt`、`bw11-function-definitions.json`、`bw11-rollback-result.txt`、
`bw11-deployed-rollback-result.txt`、`bw11-migration-apply-result.txt`、`bw11-cloud-after-fixture-repair.json`、
`bw11-cloud-after-ui-add.json`、`bw11-cloud-after-ui-delete.json`、`bw11-mobile-after-add.png`。

## 補登撤回後重新開啟的相容修正

第一筆 UI 往返驗收後，重新載入被本機完整性檢查攔住；原因不是雲端資料遺失。
原成交 timestamp 被舊程式設為當日 23:59:59.999，撤回 timestamp 為 22:45，嚴格時間排序會先看到刪除。

- `getDealClosedRecordTimestamp` 將新補登 timestamp 限制為 `min(交易日日末, 真正記錄時間)`，正常交易保持原時刻。
  `dealDate` 保留原交易歸屬；未使用瀏覽器／裝置 API，三平台共用。
- `checkAppIntegrity` 只針對同日、同場次、明確補登、日末時間的既有錯誤降為警告，讓目前讀取模型正常開啟。
  依原事件推算原裝置時區，包含半小時／45 分鐘與 UTC−12／UTC+14，不依賴目前裝置仍在原時區。
  沒有改寫事件；重複 tombstone、一般交易順序錯誤、其他完整性錯誤仍拒絕。
  `checkBackupIntegrity`／`validateBackupReplayReadiness` 保持嚴格，這不是重播／匯入修復授權或證明。
- 新增回歸證明當天／過去／未來／不合法日期的記錄時刻、舊案例 App 可用但匯入仍拒絕、輸入不被修改及排除條件。
  實際原帳號重新載入後，清單與指定場次詳情恢復，收入 350、成交 3、利潤 240、淨利 140 仍一致。

補充證據：`.codex-artifacts/bw11-mobile-reopened.txt`、`.codex-artifacts/bw11-test-owner-preview.txt`。

最終驗證：19 項完整性回歸、成交投影／模式、事件讀取與 tombstone 相容、12 組雲端數值契約、ESLint 與手機 TypeScript 通過。
最終來源的 Web／手機建置、354 檔 19.37 MiB 產物邊界與 11 路由／資產 smoke 全通過。
`.codex-artifacts/bw11-cloud-final.json` 再次核對收入 350、銷售利潤 240、成交 3、庫存 8。
最終手機截圖：`.codex-artifacts/bw11-mobile-final.png`；本機服務已恢復，驗收頁保留供接續操作。
雲端 073 已生效；本機共用程式相容修正尚未 commit／push／發佈。

## 後續新瀏覽器驗收的重要補充（2026-10-22 約 23:12）

本文件前述 350／240／3 往返與重開驗證是原有快取情境，不能推論新裝置完整重建正確。
後續以隔離、未登入且沒有該帳號事件的瀏覽器實測，雲端回應仍為 350／240／3，但本機重建成交數為 4。
已用同一組事件與現有 handler 在記憶體資料庫重現，原因為舊當日補登的 tombstone 在 timestamp 排序中先於原成交，
筆數扣回先被截為零，原成交稍後又被加回。雲端 073 的結果正確；尚待修正的是本機歷史事件重播，而非再次批次改寫雲端。
詳見 [新瀏覽器登入恢復查核 CL-01](COLD_LOGIN_RESTORE_REVIEW_2026_10_22.md)。該次稽核未實作修正；後續使用者已授權實作。

後續本機重播已改為原事件先於同場次刪除、50 筆原子交易批次，並在完整雲端事件 ID 集合、同 owner、無 pending 的條件下校正受影響舊快取摘要。
原隔離手機分頁由 4 回到 3，另一獨立 origin 首次恢復後也確認收入 350、銷售利潤 240、成交 3、淨利 140。
未再次改寫雲端摘要、原始事件或庫存；072／073 狀態不變。完整測試與限制見上述查核文末實作結果。

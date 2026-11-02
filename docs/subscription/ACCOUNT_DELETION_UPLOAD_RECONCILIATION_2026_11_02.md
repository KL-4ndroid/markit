# 上傳結果不明：核對與恢復

後續更新：[單次 PUT 回條與 HTTP／SQL／真 staging R2](ACCOUNT_DELETION_TERMINAL_PUT_2026_11_02.md)已提供 receipt-backed drain，取代測試模式的 fixture attestor，且 commit 會在鎖內驗證 ledger。它只許本機／staging namespace，正式 handler 與 production target 尚未接入；下方「正式 adapter 尚未實作」保留為本批當時界線。真正遺失 provider 回應的寫入仍不自動放行，正式刪除保持關閉。

本批完成**本機／隔離的核對與恢復核心**。結果不明或補償失敗的上傳不再只能永久卡住：內部工作流程可以在取得可信停止證據、逐 key 核對且資料沒有再變動後，原子保存回條並解除該筆 attempt 的阻擋。其他未處理 attempt 仍各自阻擋清理。

**正式刪除保持關閉。沒有雲端 SQL、R2／Auth／正式資料操作，沒有提交／發布。** 正式的上傳停止證據來源尚未實作；本批使用明確標記的 fixture attestor，不能直接拿來啟用正式清理。

## 流程與安全條件

1. **取得範圍**：驗證真實 DB 的刪除申請、目前租約 token、actor／owner 歸屬、同一申請的 freeze，以及凍結／停止員工存取兩步均已完成。僅在第一個清理阻擋點處理；尚在有效期的 open attempt、未綁定或舊版未知 claim 不放行。
2. **取得停止證據**：注入的 `UploadDrainPort` 必須證明範圍內所有已發出 PUT ticket 的 transport／provider 工作已終止，而且不能再開始。證據綁定完整 attempt＋metadata 的 source hash，有效期最多兩分鐘。程序退出、HTTP abort、Promise rejected、計數器為零、租約逾期或等固定時間均不足以證明停止。
3. **逐 key 讀取**：只查看登記範圍，記錄確定存在／確定不存在。沿用 `DeletionObjectPort.isAbsent` 契約：403、網路失敗或未知回應必須拋錯，不能當成不存在。相同 key 在舊／新位置重複登記時只觀察一次，原 ledger 保持不變。
4. **再次確認停止狀態**，再用完全相同的 evidence 提交。資料庫依 request → 固定順序 actor／owner → attempt → metadata 取鎖；重新核對來源 hash、DB 時鐘、租約及證據期限，拒絕核對期間資料改動。
5. **原子完成**：同一交易新增不可更新的私人回條，並將 attempt 轉為 settled。一般上傳 token 仍不能自行把 uncertain 改為 settled。只有原證據完全相同的重試才讀回同一回條；不同核對結果、另一申請或另一 reviewer 的競爭提交會被拒。
6. **沿用原清理引擎**：恢復不刪圖片、不重設 upload metadata、不改商品／成交／庫存／收入。所有舊、新 key 保留給原 manifest；實際物件刪除與 absence 驗證仍屬後續引擎步驟。存在／不存在的觀察不是照片修復，也不是帳號刪除完成證明。

原 pending claim、已成功 finalize 且公開 key 都在 ledger 的 metadata、已標示 upload_failed 且尚存 key 均在 ledger 的 metadata、或 metadata 已不存在，可進入核對；不同的新 pending claim 保持人工審查。已成功保存但回應遺失的照片不會被當成失敗圖片刪掉；補償未完成時仍保留現存物件，核對不會改寫失敗狀態。

員工的 attempt 可能屬於其他品牌。核對仍需對應員工刪除申請的有效租約；後續員工匿名化會保留品牌的 key ledger／回條並移除 actor 歸屬。老闆 profile 清理則沿用原 hook 刪除其 ledger，回條 FK 隨之清除；回條不保留原 token、照片內容、原始 provider 回應或 reviewer 個資，只記錄摘要及數量。

## 實作位置

- [內部 worker port](../../lib/subscription/account-deletion-upload-reconciliation.server.ts)：明確注入 RPC、停止證據與物件讀取，提供 `prepare`／`commit`；保留相同 evidence 供回應遺失後明確重試。拒絕非 loopback endpoint，沒有環境變數 credential fallback、公開 route、排程或自動重試。
- [隔離 SQL](drafts/ACCOUNT_DELETION_UPLOAD_RECONCILIATION_2026_11_02.sql)：私人 reviews、不可更新回條與單一 service-only `bff_reconcile_deletion_upload`；只允許 `deletion_engine_test`，檔尾 ROLLBACK，**不是 production migration**。
- [原 fixture 工具](../../scripts/verify-account-deletion-upload-race.ts)新增 `--reconciliation-isolated`，重用捕獲 schema／原 BFF／觸發器與 Docker 清理，不重跑前批八組 race。
- [新 SQL 案例](../../scripts/lib/account-deletion-upload-reconciliation-checks.ts)、[worker 測試](../../tests/account-deletion-upload-reconciliation.test.ts)、[RPC allowlist](../../scripts/lib/account-deletion-access-fixture.ts)、[測試 manifest](../../scripts/test-files.txt)與[專用 TypeScript](../../tsconfig.account-deletion-workflow.json)同步。

跨平台邊界：新增的是 server SQL／注入式 worker 契約，沒有 browser／device API 或原生套件；Web、iOS、Android 沿用同一 server 業務規則。沒有改訂閱價格、付費功能或角色分界。

## 已驗證的範圍

[安全摘要](evidence/account-deletion-upload-reconciliation-2026-11-02.json)：真實可丟棄 PostgreSQL 17，以捕獲的 40 表結構／134 routines／5 views／45 原 triggers 及真 product／sale claim、product finalize、刪除 BFF／session coordinator 執行 **10 組新案例**：

| 組別 | 結果 |
| --- | --- |
| 1 | 精確租約、同一 freeze 與前置步驟不可省略；未核對的 uncertain 保持阻擋 |
| 2 | transport 未停止、停止證據綁錯範圍、403／讀取不明都不能產生回條 |
| 3 | 到期／stale source／缺 key／重複觀察／跨 owner／未知物件狀態拒絕且不解除 |
| 4 | metadata 變動被 CAS 拒絕；commit ack 遺失後相同證據只產生一筆回條，不改照片與 metadata；舊 token 不能改回結果，回條不能更新 |
| 5 | 原引擎恢復後 manifest 保留四個舊／新 key；三個存在、一個不存在均只是觀察 |
| 6 | 真 failure RPC 已寫 upload_failed、fixture 補償未完成時，核對保留物件與失敗 metadata；open 租約到期仍須停止證據，員工刪帳保留其他品牌 key／回條並移除 actor |
| 7 | 真雙連線等待 advisory lock，期間刪除租約或證據到期均拒絕提交 |
| 8 | 真 finalize 成功／回應遺失的圖片與 metadata 保留；兩個 reviewer 同時提交只接受一份回條 |
| 9 | 未綁定／舊版未知結果保持阻擋；anon／authenticated 無核對權限，service 無私人表讀取權限 |
| 10 | 刪除租約過期後不能查閱／解除 attempt，正式清理維持關閉 |

worker 測試另驗證遠端拒絕、錯誤範圍、證據到期／失效、慢讀取、敏感錯誤遮蔽、不可變 prepared evidence、重試及回條讀回。既有 upload barrier／access policy 測試、專用 TypeScript 與受影響檔案 ESLint 通過。容器無網路／對外 port／bind mount，finally 移除。

```powershell
npx.cmd tsx scripts/verify-account-deletion-upload-race.ts --reconciliation-isolated
npx.cmd tsx tests/account-deletion-upload-reconciliation.test.ts
npx.cmd tsc --noEmit -p tsconfig.account-deletion-workflow.json
```

本批停止證據與 object observations 都是 fixture；沒有聲稱真實 R2／HTTP 已能證明 quiescence。未接入產品 route／UI，因此不重跑完整 Web build、Web／PDF、登入效能、前批 race／帳務／GoTrue／staging R2 大矩陣。

## 無法在本批宣告完成的部分

- **正式停止證據 adapter**：需可查驗的 transport／provider 終止證據及不可重啟的範圍 fence；不能以本批 fixture、人工填入任意 hash 或多等幾分鐘取代。SQL 驗證授權、scope、CAS 與時效，無法自行驗證 provider 的物理事實。正式 worker 必須把該 adapter 放在可信服務邊界內。
- 真 HTTP＋R2 的延遲／中斷／補償故障整合；未綁定／舊版 claim 的額外審查策略；所有 producers 強制接入及 production migration／部署目標／備份等發布證據。
- 公開管理 UI、自動核對／自動重試、解除未確認結果與正式帳號刪除均未啟用。`productionUploadRaceClosed=false`、release-ready=false，Gate 2／AD4 不解除。

下一個切片應先建立可查驗的 producer 終止證據，再連接真 HTTP／staging R2 驗證。若某次未知 PUT 無法取得該證據，正確結果仍是保持人工審查，不讓正式刪除因逾時而繼續。

# 刪除引擎：隔離實作與正式啟用界線

最新第四批：[全部 captured RPC／檢視／public-table trigger 的凍結相容性](ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.md)已通過 19 組存取／營運及 16 組帳務整合。完整 fence 仍隔離、正式刪除仍關閉；另 095 快照隱私修補已獨立套用雲端。下方各批的「尚未完成」為當批歷史，現況以第四批紀錄為準。

第二批最新進度：[部署結構對照、營運資料清理與帳務保留契約](ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.md)。已讀取部署 public catalog 並擴充 40 表隔離契約；下方「僅極小資料契約」為第一批範圍。正式帳務 detach、所有 API/view fence 與真 R2 仍未完成。

本批承接已完成的申請／確認／撤回及真實本機 Supabase 整合，建立實際執行層。正式環境不啟用，不使用 `.env.local`，不刪除正式帳號或 Cloudflare 物件。

## 實作順序與安全設計

1. 沿用現有 saga、私有申請表、租約及逐步證據；執行器取得同一租約，每次操作重新核對請求、身分種類、期限與下一步，不能由客戶端指定刪除者。
2. 先凍結資料存取與 Auth 登入，再撤銷團隊關係。已有 JWT 的資料讀寫另由資料庫 fence 阻擋，不能只依賴禁用登入。
3. 老闆先封存目前 metadata 的照片 manifest；每次最多處理 20 個物件，逐筆保存進度（隔離契約上限 1,000 個，超過停止人工檢視）。403、逾時、服務故障不能冒充 404。manifest 中照片尚未證明不存在，就不得刪除其 metadata 或帳號。尚未把 manifest 以外的孤兒／在途物件當成已清除。
4. 員工自行刪帳只刪自己的身分／關係，保留其他老闆的場次與成交。保留事實的已知身分欄位匿名化；未知 payload 或表格停止人工檢視，不能直接 cascade 刪除。
5. 帳務保留不得直接 cascade。本批資料庫 adapter **僅支援明確的隔離資料契約及沒有實際 billing ledger 的案例**；偵測到帳務資料或不支援的資料表／欄位，即停止，不聲稱已完成計費身分分離。
6. 清除 operational 資料後才刪 profile；最後透過真正的 Supabase Auth Admin API 刪除帳號，再查證 Auth／session 不存在。所有必需步驟有證據才完成；失敗留在可重試或人工檢視，沒有排程自動重送。

平台相依能力僅為 server 的 PostgreSQL、Auth Admin、S3 介面；沒有瀏覽器／裝置 API、前端刪除權限、新原生套件或付款變更。未改動使用者既有本機待送資料。

## 本批與正式引擎的差別

資料庫執行草稿限定 `deletion_engine_test` 可丟棄 DB，保留 ROLLBACK，不列入自動 migration。它驗證真實 SQL 的刪除、交易回復、租約與帳號關聯，但不是正式站完整 schema 的清理授權。

正式啟用前仍須：以部署實際 catalog 補齊每一個 operational／audit／support／billing 表的策略、保留欄位與到期工作；帳務 subject 遷移與 restore 防重綁；真實 R2（含孤兒物件、在途上傳、版本與備份）證據；Production 權限／RPC fence 全面檢查；公開揭露、監控與發布審核。這些未完成時，release-ready 仍為 false。

## 驗證紀錄

2026-11-02 完成以下 10 組新整合案例，命令：

```powershell
npx.cmd tsx scripts/verify-account-deletion-engine.ts --isolated
```

| 組別 | 實際驗證 |
| --- | --- |
| 1 | 真 PostgreSQL 租約互斥；錯 token／身分種類／跳步／過期 lease 拒絕 |
| 2 | Auth 禁用後不能再登入；既有身分的 SQL 讀取為零、寫入拒絕；DB 已提交但回條遺失後，從 durable receipt 續跑而非重新計數 |
| 3 | 真 GoTrue 員工 hard delete、Auth session 歸零；老闆市場／99 元成交仍在；保留成交移除測試員工 UUID／email，標示 deletedActor |
| 4 | anon／authenticated 不能執行 engine RPC；包括 service_role 也不能直接讀取私有物件表 |
| 5 | 真 AWS SDK 經 loopback HTTP S3 協定替身：部分 DELETE 503 後續跑，不重刪已確認的物件；HEAD 403 停止，保留 profile／照片 metadata |
| 6 | 刻意讓市場 DELETE trigger 失敗，先前照片 metadata／商品刪除與該步收據一起回復，不留半套交易 |
| 7 | 老闆 23 張物件跨批清理；Auth 故障時尚未標完成，恢復後才刪 Auth 並完成；另一老闆的市場／商品／照片不受影響；重跑終態不再執行 |
| 8 | billing_status 非 none 或新增未盤點表，即人工檢視；未凍結／刪除這些身分 |
| 9 | metadata 刻意放入另一老闆的照片 key，scope 驗證拒絕；不刪除該物件 |
| 10 | 真 DB 重啟後，owner／staff completed 與 17 個步驟收據仍存在 |

整合證據：忽略提交的 `.codex-artifacts/account-deletion-engine-acceptance.json`。測試使用新建、具專用標籤的 PostgreSQL 17 與 Supabase GoTrue v2.196.0，GoTrue 的唯一公開 port 綁定 127.0.0.1；沒有 host bind mount。結束後容器、匿名 volume、network、記憶體金鑰／HTTP 物件替身均清除；未讀取正式 `.env.local`。

其他檢查：`account-deletion-engine.test.ts`（跨 owner key／路徑驗證、每物件重新核對租約、absence 失敗、偽造 snapshot、hosted endpoint 拒絕）、既有 AD2／AD3A repository／request workflow 回歸、工具 TypeScript、受影響檔案 ESLint、diff 檢查通過。AD4 checker 仍回報 ready=false、13 項 release blockers。沒有 UI／裝置 API 變更，沿用已驗證的手機申請流程，沒有重跑整套 Web／PDF 或登入效能驗收。

這些測試**不等於**正式 Supabase 的全部 schema／RLS／SECURITY DEFINER RPC、真 Cloudflare R2、各供應商備份與原生平台驗收。這批只提供本機受限引擎，沒有新增正式排程／HTTP worker 入口，也沒有完成正式計費身分分離。SQL 草稿保留 ROLLBACK，不需要使用者現在手動執行。

技術判定參照：[Supabase Auth Admin deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)；[S3 HeadObject 的 403／404 差別與版本語意](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html)。對這些服務的正式環境支援仍須逐一驗證，不能用 HTTP 替身推定。

## 下一個必要項目

對照**實際部署的唯讀 catalog**建立逐表策略，尤其 events_archive／snapshots／pending operations／市場心得／盤點／稽核／帳務表及所有 RPC；先完成帳務 subject／保留與不可重綁的遷移設計，再補到這個引擎。現有極小隔離契約不可直接轉成 production migration，正式站不應開啟「正式刪除」。

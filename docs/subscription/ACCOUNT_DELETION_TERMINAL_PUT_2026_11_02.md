# 單次 PUT 終止證據：HTTP／SQL／R2 整合

後續更新：[商品／成交 handler 的本機回條模式](ACCOUNT_DELETION_PHOTO_HANDLER_RECEIPTS_2026_11_02.md)已接入並通過 16 組整合檢查。標準照片 scope 僅許 loopback、預設關閉；下方「handler 尚未接入」保留為本批當時界線。正式 target／migration／所有 producers 強制接入與安全重送仍未完成，正式刪除保持關閉。

本批把前一輪 fixture 停止證據替換成**可由資料庫回讀的單次 PUT 成功回條**，完成 5 組隔離 HTTP／SQL 案例與 3 組真實 staging R2 案例。staging 只建立 1 個自建小型 marker，最後 DELETE／HEAD 確認不存在。沒有碰正式照片、雲端 SQL、Auth、正式設定或帳號；沒有提交／發布，正式刪除仍關閉。

## 能證明什麼

新 writer 在單次 SDK PUT 前，先以原 upload token 登記不可重複使用的 ticket，綁定確切 key、body SHA-256 與 endpoint／bucket 指紋。它自行建立 SDK client，固定 `maxAttempts: 1`、停用區域重新導向，不接受自訂 client／retry strategy；使用記憶體內固定 bytes、Content-MD5 與 `If-None-Match: *`，沒有 multipart。SDK 200、attempts=1 且有有效 ETag 才能記錄成功回條；保存 ETag 摘要，不保存金鑰或原始 provider 回應。

新私人 SQL ledger 要求範圍內**每一個已授權 key**都有同一個已配置 target 的完整回條，才能產生與核對 source hash 綁定的 drain digest。未收到 PUT 回應、SDK abort、403／412、超時或遺失 issue 回應，一律保持未確認；HEAD 404、租約逾期或目前物件內容相符都不能替它補造回條。

新 receipt-backed drain adapter 不靠程序內計數器；重新建立 reader 即可透過獨立 SQL 呼叫讀回回條。reconciliation commit 在鎖內重新計算並驗證 digest，不接受任意填入的 drain hash。SQL ack 可以在 freeze 後落盤，因為它只記錄先前單次 PUT 的結果，不能授權另一筆 PUT；重複 ticket、不同 body／target、非單次嘗試或改寫回條均拒絕。

這項證據的前提是 producer 使用這個受控 writer，且所有寫入都經過原 authorizer 與 intent／receipt 路徑。舊 SDK 自動重試、未知 legacy writer、未登記請求仍不符合前提。真正遺失 **R2→server** 回應的 PUT 仍保留人工審查，不會因新增 adapter 就自動恢復。

依據：[Cloudflare R2 一致性說明](https://developers.cloudflare.com/r2/reference/consistency/)、[R2 conditional write／未知寫入說明](https://developers.cloudflare.com/r2/api/s3/extensions/)、[AWS SDK retry 設定](https://github.com/aws/aws-sdk-js-v3/blob/main/supplemental-docs/CLIENTS.md)。官方規則支持 create-once 與未確認寫入的保守判定；本批沒有把 404 或等待固定秒數當成終止證據。

## 已驗證的流程

使用前一批同一套捕獲 schema／函式／觸發器 fixture，真實 PostgreSQL 跑在可丟棄 Docker，沒有網路、對外 port 或 bind mount。受控 HTTP producer 使用真 upload session、claim BFF、新 writer、新 drain adapter 與原 reconciliation RPC，**不是正式 Next.js upload handler 的整體驗收**。

| 測試 | 結果與證據界線 |
| --- | --- |
| 隔離 1 | 真 loopback S3 SDK 請求已被 server 接收，freeze 後才回 200；成功回條仍可保存，後續 PUT 被拒。producer HTTP 回應故意中斷，新 reader 能核對 |
| 隔離 2 | 偽造 drain digest 在 SQL commit 內拒絕；重用 writer 不產生第二個網路 PUT |
| 隔離 3 | production bucket、其他 endpoint path、不同 run 被拒，無外部寫入 |
| 隔離 4 | 真 HTTP socket 在儲存後中斷，SDK 只嘗試一次；HEAD 404、租約逾期、fixture 物件再出現都不能產生終止證據／核對回條 |
| 隔離 5 | body／target 不符、宣稱 attempts=2、改寫回條拒絕；anon／authenticated 不能 attest，service 不能直接讀私人表 |
| 真 staging 1 | 真實 R2 200 回條已保存後，故意遺失 SQL ack 及 producer HTTP 回應；新 reader 仍以 DB 回條核對成功，freeze 阻擋第二個 PUT |
| 真 staging 2 | 同一真 R2 流程中，假 digest 與重用 writer 同樣拒絕 |
| 真 staging 3 | production bucket／endpoint path／run 邊界拒絕；唯一嘗試建立的 marker 已刪除並 HEAD 404 |

真 staging 案例的 **R2 回應本身已被 SDK 成功接收**；故障注入在 SQL ack 和 caller HTTP 回應，不能稱為已恢復遺失的 R2 回應。隔離 server 用於可控制的 provider 回應遺失／延遲，沒有將它冒稱成 Cloudflare 的內部排程。兩個 Docker 容器與本機 HTTP servers 均已清理。

[隔離摘要](evidence/account-deletion-terminal-put-isolated-2026-11-02.json)、[staging 摘要](evidence/account-deletion-terminal-put-staging-2026-11-02.json)不含 credentials／key／token。忽略提交的 `.codex-artifacts/terminal-put-<run>.manifest.json` 記錄精確測試 key 與清理狀態；staging attempted=1、confirmedAbsent=1，不需要使用者手動清理。

```powershell
npx.cmd tsx scripts/verify-account-deletion-upload-race.ts --terminal-put-isolated
npx.cmd tsx scripts/verify-account-deletion-upload-race.ts --terminal-put-staging-disposable
```

專用 TypeScript、受影響檔案 ESLint、upload barrier／reconciliation／access policy 單測通過。本批未接產品畫面／正式 handler，因此不重跑 Web build、Web／PDF、效能、原帳務／GoTrue／R2 八組或前一輪十組大矩陣。

## 檔案與目前狀態

- [單次 writer／receipt-backed drain](../../lib/subscription/account-deletion-terminal-put.server.ts)：只接受 loopback DB、loopback S3 或固定 staging bucket 的明確 R2 endpoint；拒絕 deployment、production bucket，沒有環境變數密鑰 fallback 或自動重試。writer 限制自建測試 namespace、1 MiB 以內 marker，**不是可以直接切換正式 bucket 的通用 production adapter**。
- [SQL 草案](drafts/ACCOUNT_DELETION_TERMINAL_PUT_2026_11_02.sql)：私人 target／puts、兩個 service-only BFF 及強制回條驗證 hook。只允許 `deletion_engine_test`、ROLLBACK 結尾；缺少 target 配置必須拒絕，target 由隔離測試明確配置，沒有 production migration。
- [reconciliation 草案](drafts/ACCOUNT_DELETION_UPLOAD_RECONCILIATION_2026_11_02.sql)新增可替換的驗證 hook，保留前輪 fixture 模式；terminal-PUT 安裝後以真 ledger 驗證替換。**no-op fixture hook 不可用於正式停止證據**。
- [整合檢查](../../scripts/lib/account-deletion-terminal-put-checks.ts)、[原工具新模式](../../scripts/verify-account-deletion-upload-race.ts)、[RPC allowlist](../../scripts/lib/account-deletion-access-fixture.ts)與[型別配置](../../tsconfig.account-deletion-workflow.json)同步；不複製原刪除引擎或重建測試框架。

server 端新 capability／SQL 契約沒有 browser／device API、同源 Web 假設或原生套件，未改訂閱價格、角色或功能權益。商品／成交的正式上傳器尚未接入；它們仍不能提供本批新回條，不能把 staging 通過當成全 App upload race 已封閉。

下一個切片：將單次寫入與回條介面接入商品／成交既有上傳路徑，以預設關閉的本機模式驗證兩個真 handler、claim／失敗補償／finalize 與舊版相容性；再審查正式 target 配置、migration 與所有 producers 的強制接入。備份、部署／managed Auth 等原發布阻擋另行保留。

`productionUploadRaceClosed=false`、release-ready=false；Gate 2／AD4 與正式刪除都未解除。無須使用者執行 SQL。

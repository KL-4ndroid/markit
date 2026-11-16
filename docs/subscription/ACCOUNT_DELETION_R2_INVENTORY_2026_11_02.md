# R2 刪除範圍：唯讀盤點與尚未完成的核對

後續：[staging 真 R2 刪除與錯誤邊界](ACCOUNT_DELETION_R2_LIVE_STAGING_2026_11_02.md)已完成 8 組、3 個自建 marker 全部清除。本文是唯讀盤點的歷史範圍；下一批改為 server PUT／freeze 競爭，正式照片／設定仍未修改、正式刪除仍關閉。

本批只盤點，不刪照片、不下載照片內容、不改 SQL／bucket／權限或正式設定。沿用前批 SQL／帳務驗證，沒有重跑 Web、PDF、登入效能或刪除矩陣。新增的是 audit tooling，沒有產品 runtime、前端或原生 API 變更；正式刪除仍關閉。

## 最新結果：Cloudflare 登入後的實體物件比對

使用者完成 Cloudflare 登入後，管理頁列出兩個 bucket：`markit-media-production` 有 **4 個物件、66.65 kB**（UI 顯示值）；`markit-sales-photo-staging` 為空。已完整讀取 production bucket 的平面 metadata 清單，沒有開啟或下載照片。

[安全摘要證據](evidence/account-deletion-r2-production-inventory-2026-11-02.json)：

| 比對項目 | 結果 |
| --- | --- |
| 現存物件 | 4 個均匹配 DB 引用；1 組商品原圖／縮圖＋1 組成交原圖／縮圖 |
| 本次無引用物件 | 0；是這次觀察結果，不能保證未來一直沒有孤兒物件 |
| DB 引用未在清單中 | 18 keys，全都已超過 DB `expires_at`，對應 9 筆成交照片 metadata |
| 未到期引用未列出 | 0；沒有據此宣稱已驗證每物件 HEAD absence |
| owner 路徑不符／跨 owner 共用 | 0／0 |
| 盤點前後 DB | 完整且指紋一致；active upload leases 0 |

管理頁確認：成交原圖 `sales-evidence/7d/` 與縮圖 `sales-evidence-thumbs/7d/` 各有啟用的 **7 天刪除**規則；另有全 bucket **7 天中止 multipart** 的預設規則。未見商品照片刪除規則；公開存取停用、沒有自訂網域／bucket lock，物件存取日誌停用。沒有更改任何規則。18 個過期引用未列出與這些期限相容，但沒有稽核紀錄可證明每一個物件實際被誰／何時刪除。

沿用工具新增 `--bucket` 明確選擇唯讀目標、`--ui-inventory` 接受已登入 dashboard 的完整清單，並重用同一 metadata 查詢／分析 helper；沒有第二套盤點器。UI 原始 key 僅存忽略提交的 `.codex-artifacts/r2-production-ui-inventory.json`，摘要不含 key／owner UUID／credentials。UI byte 大小是顯示值，不當成精確位元組；過期引用也不當成資料遺失或刪除授權。

```powershell
npx.cmd tsx scripts/inventory-account-deletion-r2.ts --configured-readonly --bucket markit-media-production --ui-inventory .codex-artifacts/r2-production-ui-inventory.json
```

現有本機 API credential 對 production bucket 的 List／multipart／lifecycle 都回 **403**，未擴大權限，也沒有在列舉失敗後把零結果當成空桶或發出 HEAD 探測；後續以使用者已登入的 Cloudflare 管理頁完成上述合法唯讀比對。UI 模式不發 S3 請求，輸入須符合 bucket／endpoint、數量、時間與上限；其來源是人工操作管理頁觀察，不是可供刪除引擎接受的供應商簽章證據。

**仍未完成**：Vercel Production Secret 的字面值不可讀回，所以 bucket 身分是依共用 endpoint、Cloudflare 命名與現存 DB key 匹配判斷，沒有宣稱完成部署值證明。production multipart 當下清單、真 API per-object absence、備份／其他副本及 live 刪除尚未驗證。下一個可獨立推進的切片是 **staging 自建可丟棄前綴的真 R2 刪除／失敗邊界測試**，再處理現有 server PUT 在凍結後完成的競爭；不需為這一步索取 production 寫入金鑰。此處及下方舊盤點的未確認項目，不得用來開啟正式刪除。

## 後續核對：Vercel 管理頁（2026-11-02）

已以 Chrome 的既有登入開啟 `masons-projects-1db534c5/markit-app` 的 Environment Variables 管理頁，沒有下載環境檔或讀取密鑰。Vercel 連接器對指定 project／deployment 回傳 404，因此此處改用已登入管理介面，不是再次嘗試下載受拒的環境檔。

- `R2_BUCKET_NAME`：Production 是 **Secret**，不提供讀回；All Pre-Production Environments 的 Config 值已在使用者驗證後確認為 `markit-sales-photo-staging`，與本機設定一致。不能因此推定 Production 也使用此 bucket。
- `R2_ENDPOINT`：是 All Environments 的 **Config**；使用者已完成 Vercel 郵件二次驗證。已核對共用 endpoint 與本機一致，屬於同一 R2 帳戶；沒有讀取密鑰、發送驗證碼、讀取郵件或更改設定。
- 正式 bucket 值仍不可從 Vercel 讀回；後續 Cloudflare 登入及實體照片清單比對已完成，結果以本文最新段落為準。沒有改 Secret 類型、嘗試讀密鑰或下載受拒的環境檔。

另核對目前原始碼：商品照片與成交照片的既有 upload route 都由 server adapter 直接 PUT 到 R2；全專案搜尋未見正在發出 presigned URL 的實作，只有預留的 upload transport 型別。故下一批應先處理**已取得 lease 的伺服器上傳在凍結後繼續完成**的競爭，不能把尚不存在的 presigned URL 改造排成必做工程。沒有修改上傳流程，也沒有宣稱已完成該競爭驗證。

## 實測結果

[唯讀結果](evidence/account-deletion-r2-inventory-2026-11-02.json)來自本機 `.env.local` 指向的真實 Cloudflare R2，以及既定 Supabase 專案 `fgejncfsvvsayiequubm` 的照片 metadata；**尚未證實這是正式部署使用的 R2 目標**。

| 項目 | 結果 |
| --- | --- |
| 商品照片 metadata | 1 筆 uploaded |
| 成交照片 metadata | 23 筆：uploaded 10、expired 12、upload_failed 1 |
| 在途 metadata 租約 | 0；盤點前後 metadata 指紋一致 |
| metadata 物件 key | 22 個；未發現 owner 路徑不符或跨 owner 共用 |
| 本機設定指向的 R2 | 完整列舉 0 個物件、0 個 multipart uploads |
| 抽樣 HEAD | 10 個 uploaded key 回傳明確 404；只代表這個配置目標，不代表正式照片遺失 |
| Lifecycle 設定 | AccessDenied／403，沒有把無權查看當成沒有規則 |
| 正式目標／備份 | 未完成核對，不能判定正式站沒有孤兒物件、備份或在途照片 |

這延續 10/27 舊盤點所記錄的「本機空桶／DB 有 uploaded 紀錄」差異，沒有新增證據可把它解讀為正式站照片消失。11 筆 uploaded metadata 對應 22 個原圖／縮圖 key；不是 22 筆照片。

## 已完成的工具與守門

- [唯讀 CLI](../../scripts/inventory-account-deletion-r2.ts)：僅 ListObjectsV2、ListMultipartUploads、GetBucketLifecycleConfiguration、最多 10 筆 HEAD 及兩輪 metadata SELECT；無 GetObject、Put、Delete、Abort 或 SQL RPC。R2 host 須符合明確 account endpoint，Supabase project 固定；每頁／總頁數／逾時有界，SDK maxAttempts=1。
- [分析 helper](../../scripts/lib/account-deletion-r2-inventory.ts)：重用既有 owner key 驗證。只有完整列舉、完整且穩定的 metadata 才產生比對；24 小時內／mtime 不明／未知路徑／owner 不符不成為清理依據。老舊無引用物件仍只是候選，永不產生刪除授權。
- [針對性測試](../../tests/account-deletion-r2-inventory.test.ts)：缺頁、metadata 變動、跨 owner、近期／mtime 不明物件皆不能誤判為可刪除。TypeScript 與受影響檔案 ESLint 通過。
- 輸出只保存數量、狀態與安全錯誤碼；沒有 key、owner UUID、照片內容、credentials 或原始供應商錯誤 body。

```powershell
npx.cmd tsx scripts/inventory-account-deletion-r2.ts --configured-readonly
npx.cmd tsx tests/account-deletion-r2-inventory.test.ts
```

`--production-readonly` 僅接收呼叫端提供的正式環境，不會靜默退回 `.env.local`。本機模式會明確標示 production binding unverified。Vercel `env run` 本次無法提供必要 R2 值，不能將它當成正式設定可比對；`env ls production` 只確認相關變數存在，沒有顯示密鑰。

## 阻擋與下一個最小步驟

下載正式環境設定至一次性暫存檔的操作被**自動核准審查拒絕**，只提供 `blocked by policy`，沒有其他原因。操作未執行；沒有改用其他方式繞過審查或輸出密鑰。

先由部署／Cloudflare 管理介面確認正式 R2 的 bucket 與 endpoint，與本機配置比對；再取得既有授權範圍內的 lifecycle／multipart／備份資訊。**不需要把金鑰貼到對話中**。若需要擴大安全敏感權限，應先提出具體最小權限及期間，再請使用者決定；本批沒有更改權限。

目標確認後，重用同一工具做正式目標唯讀比對，不重寫盤點器。接著才設計可丟棄測試前綴的實際刪除驗證，以及既有伺服器 PUT 的 lease／補寫競爭保護、凍結後物件重現、孤兒物件收據與備份處理。日後若新增 presigned transport，再另驗證其過期與撤銷邊界。這些目前仍未完成，不得以「空桶」解除 AD4／真實 R2 阻擋。

官方對照：[Cloudflare R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/) 支援上述列舉／HEAD；GetBucketVersioning 不在支援清單。API 能力不代表此帳號已授權或不存在其他備份副本。

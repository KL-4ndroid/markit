# 商品／成交上傳：單次寫入回條接入

本批把前一輪單次 PUT／回條機制接入**既有商品照片與成交照片 handler**，完成本機預設關閉模式與 16 組新整合檢查。沿用原驗證、claim、finalize、錯誤回應與本地待傳資料契約；沒有新增另一套產品上傳 API。

**沒有改 `.env.local`、雲端 SQL、正式設定、照片或 Auth；未提交／發布，正式刪除仍關閉。** 本批只使用可丟棄 PostgreSQL 與 loopback HTTP S3 server，沒有重跑 staging R2 或操作真實照片。

## 實作與保護

- [coordinator](../../lib/subscription/account-deletion-upload-barrier.server.ts)新增可選 `writeObject`／`canCompensate`。新模式把授權、固定 bytes 的單次 PUT、intent／200 回條與 finish 放在同一 session；所有已等待的寫入結束後才關閉 SDK client。原 actor／owner 身分與 token 保留在 server，不提供給 client。
- [單次 writer](../../lib/subscription/account-deletion-terminal-put.server.ts)接受**僅限 loopback** 的標準照片 key scope，保留正確 JPEG／WebP Content-Type；仍限制已綁定老闆／精確 key、1 MiB 以內、create-only、maxAttempts=1。既有 staging marker 模式仍限測試 namespace，不開放標準照片或 production bucket。
- [商品 handler](../../app/api/product-cover-photo/upload/route.ts)與[成交 handler](../../app/api/sales-photo-evidence/upload/route.ts)在新模式選用 recorded writer；失敗不會回退到舊 PUT。刪除補償只允許本次 provider 200 已確認建立的物件，避免收到 412 或結果不明時誤刪原圖。成功 finalize 後的舊版本清理保留原規則。
- finalize 回應不明仍保留圖片／待傳資料，不把可能成功的提交當成失敗清掉；未確認 PUT、補償失敗及 freeze 都保留 uncertain。已成功存入 DB 的回條可以另行核對，但其他 unknown attempt 仍阻擋整個帳號清理。

[.env.example](../../.env.example)新增 `ACCOUNT_DELETION_UPLOAD_RECEIPTS_ENABLED=0`。必須同時有 barrier=1、loopback Supabase、loopback `R2_ENDPOINT`、指定 staging bucket、明確 R2 credentials 及隔離 SQL target 指紋，才能使用；遠端／deployment／缺少 barrier 的設定在註冊或 claim 前拒絕。**不需要使用者手動打開旗標或執行 SQL。**

旗標關閉時沿用原上傳分支；未改免費／輕量／高階方案、價格、員工權限或正式付款。新 capability 是 server 端 object storage／SQL 存取，沒有 browser／device API、同源假設或原生套件，手機與 Web 沿用同一 API 業務規則。

## 驗證結果與界線

[安全摘要](evidence/account-deletion-photo-handlers-2026-11-02.json)、[整合案例](../../scripts/lib/account-deletion-photo-handler-checks.ts)。[原 fixture 工具](../../scripts/verify-account-deletion-upload-race.ts)新增 `--photo-handler-isolated`，使用同一套捕獲 schema／BFF／觸發器與清理機制，不複製刪除引擎。

| 範圍 | 已通過 |
| --- | --- |
| 設定邊界 1 組 | default-off、缺少 barrier、deployment、遠端 Supabase／R2、production bucket 均在註冊／claim／寫入前停止 |
| 商品 7 組 | 成功、縮圖失敗且補償失敗、PUT 結果不明、真 finalize 提交後遺失回應、真回條保存後遺失 ack、412 原圖保護、PUT 回應前 freeze |
| 成交 7 組 | 相同七種情境，執行原 mutation repository 與真正 claim／finalize／mark-failed BFF；保留照片 Content-Type 與待傳資料 |
| 核對 1 組 | 兩個 handler 的已提交 finalize 回應遺失，可由真回條核對而不刪圖；其他 unknown attempt 仍阻擋帳號清理 |

HTTP S3 server 使用真 AWS SDK 請求，驗證 conditional header／Content-MD5／MIME，控制 412、503、socket 中斷及 freeze。補償檢查驗證 handler 請求清理本次已確認建立的 key；provider 拒絕或連線未完成都不能宣告清乾淨。核對與故障注入只處理本批合成資料。

auth／方案 gate 為注入的測試決策；metadata read 使用 test SQL bridge，沒有測真 GoTrue／PostgREST、Vercel HTTP routing 或實機選圖。product／sale 既有 handler 工廠與原 repository 確實執行，claim／finalize／freeze／回條則為真 PostgreSQL 邏輯。測試 DB 無網路／對外 port／bind mount，容器及 loopback server 已清理。

```powershell
npx.cmd tsx scripts/verify-account-deletion-upload-race.ts --photo-handler-isolated
```

既有商品 handler 九情境、成交 handler 回歸、upload barrier 守門通過；專用 TypeScript、受影響檔案 ESLint、完整 Web build 通過。未重跑帳務／GoTrue／Web／PDF／效能大矩陣，前一輪真 staging 證據沿用。

## 正式啟用前仍缺少

1. **相同照片重送的安全讀回／冪等規則**：本批 412 保護證明不覆寫、不刪除既有圖，但遇到既存 key 時會保留 payload 並停止，沒有新增自動信任 HEAD 或自動重送 PUT。正式啟用前應確認同次已提交成功、舊版本與真正衝突如何區分，避免已成功的照片持續重試。
2. 正式 target／所有 producers 強制接入、production migration 與完整部署整合。新模式仍拒絕 hosted DB／R2，不能只改 bucket 或開旗標就用在正式站。
3. 真正未收到 provider 回應的未知請求仍須持續阻擋；備份、managed Auth、帳務等原發布條件保留。

下一個切片先處理第 1 項的安全讀回／重送，再整理正式 migration 候選。`productionUploadRaceClosed=false`、release-ready=false，Gate 2／AD4 不解除。

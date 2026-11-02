# 帳號刪除：在途照片上傳與凍結協調

後續更新：[uncertain 核對與恢復](ACCOUNT_DELETION_UPLOAD_RECONCILIATION_2026_11_02.md)已完成本機／隔離核心，原 upload token 仍不能自動解除 uncertain。下方「下一步」是本批結束時的狀態；新的恢復 RPC 需要可信 drain attestor，而正式 adapter 與真 HTTP＋R2 證據仍未完成，正式刪除保持關閉。

本批完成本機／隔離修補，正式刪除仍關閉。沿用既有申請、凍結、租約與清理引擎，補齊照片 claim → PUT → finalize 之間的協調；沒有套用雲端 SQL、改正式環境設定、操作真實照片或提交／發布。

## 保護的行為

1. 商品與成交照片在 metadata claim 前登記私人 upload attempt，claim 後綁定實際版本／attempt 指紋及可能涉及的舊、新 key。每次 PUT 與 finalize 前再確認 actor、owner 未凍結。
2. actor／owner 以固定順序取得同一組 advisory lock，讓凍結與登記／授權／完成序列化。只接受 READ COMMITTED；其他隔離等級回 40001，避免等待鎖後仍使用舊 snapshot。
3. 已授權的 PUT 可以在凍結後返回，但下一個 PUT／finalize 被拒。清理 manifest 等待在途工作結束；租約到期、HTTP 中斷或單次 HEAD 404 都不能證明 writer 已停止。
4. PUT／finalize 結果不明、失敗補償不完整，attempt 進入不可自動降回 settled 的 uncertain 狀態，停止清理並要求核對。關閉回應遺失可以用相同結果重試，不能用過期計時器直接解除。
5. manifest 合併私人登記的舊／新 key，包含尚未 finalize 的物件。同 key 有其他未結束或 uncertain writer 時拒絕再寫。無法對應的舊上傳 claim 要求人工審查；既有 metadata 不記錄所有 staff writer，故採保守檢查。
6. 員工刪帳先等待其跨品牌上傳結束，再移除私人紀錄的 actor 歸屬；其他品牌仍保留 owner 與 key。老闆刪帳於 profile 清理階段移除其私人 upload ledger。

私人表與 token hash 不提供 client 存取；四個新 BFF 僅 service_role 可呼叫，且仍驗證 attempt token。既有商品／成交 BFF 負責角色、品牌與付費權限；本批沒有改方案價格或角色授權。

## 產品上傳的額外修正

- 商品照片完成 finalize 後，清除舊圖失敗不再連已成功保存的新圖一起刪掉；同 key replay 也不刪除目前圖片。
- 讀取舊 metadata 失敗時，於 claim／PUT 前停止。finalize 回應不明時保留圖片與本地待傳資料，避免把可能已提交成功的圖片刪掉。
- 已確認的 SQL 拒絕才依原流程補償；補償失敗保留 claim，不冒充已清乾淨。

## 檔案與啟用界線

- [server 協調器](../../lib/subscription/account-deletion-upload-barrier.server.ts)：登記、綁定、單次 PUT 授權、完成與結果不明處理。
- [隔離 SQL 草案](drafts/ACCOUNT_DELETION_UPLOAD_BARRIER_2026_11_02.sql)：私人 registry、四個 BFF、清理 hooks。只允許 `deletion_engine_test`，以 ROLLBACK 結束，**不是正式 migration**。
- [商品 handler](../../app/api/product-cover-photo/upload/route.ts)、[成交 handler](../../app/api/sales-photo-evidence/upload/route.ts)串接可選協調器；[商品清理 helper](../../lib/products/product-cover-photo-upload-cleanup.ts)為平台中立邏輯。
- 原 [engine 草案](drafts/ACCOUNT_DELETION_ENGINE_2026_11_02.sql)增加預設無作用 hooks；[營運草案](drafts/ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.sql)僅在新追蹤安裝後改由 drain guard 負責。未安裝時保留舊保護。
- `.env.example` 的 `ACCOUNT_DELETION_UPLOAD_BARRIER_ENABLED=0` 預設關閉；協調器拒絕 deployment／遠端 Supabase。沒有改 `.env.local` 或正式旗標。

本批是 server API／SQL 工作，沒有新增 browser／device 存取、原生套件或商店 adapter。固定隔離等級的理由參見 [PostgreSQL transaction isolation](https://www.postgresql.org/docs/17/transaction-iso.html)。

## 驗證

[無密鑰結果](evidence/account-deletion-upload-race-2026-11-02.json)由[專用驗證工具](../../scripts/verify-account-deletion-upload-race.ts)產生。真實可丟棄 PostgreSQL 17 使用捕獲的 40 表結構、134 函式、5 views、45 triggers 與原照片 claim BFF；容器無網路／對外 port，結束後移除。

| 範圍 | 結果與界線 |
| --- | --- |
| 隔離 SQL 8 組 | 真 claim 指紋／四個舊新 key、延遲 PUT／凍結／到期不放行、員工跨品牌保留、未知結果、token／同 key／跨 owner 拒絕、舊 claim 審查、雙連線鎖競爭及角色 ACL；亦拒絕 REPEATABLE READ |
| 商品真 handler 9 案例 | 凍結、補償失敗、舊圖清理失敗、finalize 不明、舊 metadata 讀取失敗、同 key replay、begin 失敗、已知 SQL 拒絕、協調器關閉 |
| 成交真 handler | 既有 28 項回歸及新增 6 情境：成功、首／次 PUT 後凍結、補償失敗、finalize 不明、begin 失敗 |
| 共用測試 | 本機／遠端 gate、在途不可提前 finish、結果不明不可自動解除、遺失 finish 回應重試、保留目前 key、錯誤分類；既有 access／engine／商品照片測試通過 |
| 靜態檢查 | 專用 TypeScript、受影響 TS 檔 ESLint、完整 Web build 通過；未更新依賴 |

SQL 競爭測試的延遲 PUT 是可控制的替身，handler 的 R2 也是 stub，不能稱為真 R2 競爭通過。前一批[真實 staging R2 8 組](ACCOUNT_DELETION_R2_LIVE_STAGING_2026_11_02.md)沿用既有結果，本批未重跑；沒有重跑已結案的 19／16 組 SQL／帳務、Web／PDF、登入效能或 GoTrue 矩陣。

## 尚未完成與下一步

`productionUploadRaceClosed=false`，正式引擎 release-ready 仍 false，Gate 2／AD4 不解除。尚須受審查的正式 migration、所有 upload producer 的強制接入與舊 claim 處置、真 HTTP＋R2 競爭、部署目標／備份與完整發布證據；不能只打開旗標。

下一個獨立切片：**結果不明／補償失敗的核對與恢復流程**。目前 uncertain 刻意沒有解除 RPC；應先證明 producer 已停止、核對 metadata 與精確 key，再以可審核且防競爭的方式完成處置。不能僅改狀態、等租約逾期或把重試成功當作安全證據。本批沒有自行新增自動恢復／清理排程。

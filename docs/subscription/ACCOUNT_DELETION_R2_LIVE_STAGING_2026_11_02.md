# 刪除引擎：真實 staging R2 刪除與錯誤邊界

後續進度：[在途上傳／凍結協調](ACCOUNT_DELETION_UPLOAD_BARRIER_2026_11_02.md)已完成本機 SQL／handler 修補與針對性驗證，下方「下一個切片」保留為本批結束時的歷史。正式接入、真 HTTP＋R2 競爭與 uncertain 恢復仍未完成；本批真 R2 結果不重跑，正式刪除保持關閉。

本批接續唯讀盤點，對 `markit-sales-photo-staging` 的 **3 個自建 marker 物件**完成 8 組真實 R2 測試；最後逐一 DELETE／HEAD 確認所有嘗試建立的 key 不存在。未碰 production bucket、真實照片、SQL、Auth、商店或環境權限；正式刪除保持關閉。marker 是小型測試文字內容，不是真實照片，也沒有建立商品／成交 metadata。

## 範圍與實作

- [專用測試工具](../../scripts/verify-account-deletion-r2-live.ts)只接受 `--staging-disposable`，拒絕部署環境及非指定 staging bucket；無 bucket override、沒有批次刪除或全桶清除。使用既有本機 staging credential，密鑰只在記憶體，不傳到命令參數或報告。
- [staging probe](../../scripts/lib/account-deletion-r2-staging.ts)綁定 R2 HTTPS endpoint、獨立隨機 actor／run namespace 與逐 key allowlist。刪除前讀 HEAD，現存物件必須具有本次 run 的 ownership metadata。未知 owner、不同 run、清單外 key 或讀取失敗皆停止。建立時先確認不存在，再使用 `If-None-Match: *`，不覆寫任何舊物件。
- [既有 adapter](../../lib/subscription/account-deletion-engine-adapters.server.ts)僅抽出嚴格 404 classifier，供真實結果與原 adapter 共用；產品用的 object／DB／Auth adapter **仍拒絕非 loopback endpoint**，沒有加入 production worker、route 或啟用旗標。staging probe 只在 scripts，沒有繞過 loopback guard 將假 endpoint 配給真 client。
- 在第一筆 PUT 前保存可恢復的忽略提交 manifest；每次嘗試 PUT 後，即使回應不明，也只會以本次 run metadata 驗證及清理那些精確 key。finally 清理失敗會保留 manifest 並讓命令失敗，不會假裝已清乾淨。本次 cleanup 完整成功。

這是 server S3 測試能力，沒有瀏覽器／裝置 API、原生套件或共用 UI 改動。沿用既有 `DeletionObjectPort`／executor，沒有重新實作 saga、帳務或 SQL 清理。

## 真實結果

[無密鑰、無 key 的結果摘要](evidence/account-deletion-r2-live-2026-11-02.json)：

| 組別 | 通過的行為 |
| --- | --- |
| 1 | 3 個 create-only marker 的 HEAD 確實存在，與刪除後不存在區分 |
| 2 | 重複 conditional PUT 真實回 412，原 ownership metadata 保留 |
| 3 | 故意錯誤簽章取得真實 403；嚴格 classifier 不把它當 404／absence |
| 4 | 原 executor 遇 fixture stale lease 或真實 403 不產生 object acknowledgement，另一 actor canary 保留 |
| 5 | 真 DELETE 成功但 fixture acknowledgement 故意遺失後，可明確重跑；刪除不存在的同 key 仍成功 |
| 6 | 嘗試跨 actor 刪 canary 在送出 SDK 命令前被拒，canary 仍存在 |
| 7 | DELETE 後、absence 驗證前重新 PUT，executor 拒絕完成；明確清理後才以真 404 完成 |
| 8 | 已驗證不存在後仍可由有寫權限的測試 client 重新 PUT，確認 upload-quiescence 尚需另行整合 |

8 組結束後，所有 marker 均再次由合法 scoped probe 清除並 HEAD 確認不存在。沒有產生永久照片、修改生命週期或擴大權限。

**證據的界線**：lease／ack／receipt 是記憶體 fixture，並非本輪新增的真 PostgreSQL／GoTrue 證據；403 是刻意錯誤簽章，不是聲稱已測到各種 IAM 政策。ack 遺失也是明確注入，沒有假稱真網路故障。第 8 組證明 R2 允許有權限的 writer 重新建立 key，沒有單憑這個 admin probe 判定 App 已發生資料洩漏。未測 production 刪除、版本／備份、R2 outage、全部 server upload compensation 或完整 Gate 2／AD4。

```powershell
npx.cmd tsx scripts/verify-account-deletion-r2-live.ts --staging-disposable
npx.cmd tsx tests/account-deletion-r2-staging.test.ts
npx.cmd tsx tests/account-deletion-engine.test.ts
```

範圍／metadata 反例、403／未知錯誤不能冒充 404、原 runtime loopback 拒絕回歸、工具 TypeScript 與受影響檔案 ESLint 通過。未重跑已結案的 19／16 組 SQL／帳務、Web／PDF、登入效能或原 GoTrue 矩陣。可恢復 manifest 位於 `.codex-artifacts/r2-deletion-<runId>.manifest.json`，不含 credentials，記錄本次 3 個 key 均已確認不存在；摘要已另保存，無需使用者手動清理。

## 下一個切片

**既有 server PUT 在帳號凍結後完成的競爭**：對照商品／成交上傳的 claim、兩個變體 PUT、finalize／失敗補償，讓已取得 lease 的在途上傳完成或可證明停止後，才建立／重核刪除 manifest。要驗證延遲 PUT、lease 到期、finalize 被凍結拒絕及補償失敗時不會提早宣告帳號清理完成。

目前照片走 server PUT；沒有對外 presigned URL 實作，不安排無必要的 presigned transport 改造。本批沒有實作上述競爭保護，因此 `productionUploadRaceClosed=false`、正式引擎 release-ready 仍 false，不能開啟正式刪除。下一批沿用本批 staging 能力與結果，不重造 R2 adapter 或重跑全部既有矩陣。

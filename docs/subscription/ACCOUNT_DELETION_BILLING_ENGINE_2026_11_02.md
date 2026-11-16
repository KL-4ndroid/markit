# 刪除引擎第三批：帳務分離與保留期限

後續進度：[第四批存取凍結相容性](ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.md)已完成 134 個 captured 函式／5 檢視／45 原 public-table trigger 的整合；本文件 14 組帳務案例在新保護下回歸通過，加完整 surface 共存與 combined manifest 共 16 組。完整 engine 未部署，正式刪除仍關閉；下一個必要切片是真實 R2 範圍證據。下方第三批的「下一步」為歷史紀錄。

本批僅在可丟棄 `deletion_engine_test` 驗證，正式站、付款、商店取消與 restore 均不啟用。

## 設計與安全界線

- 沿用已核對的五類最小化轉換。必要證據移至沒有 owner/profile FK 的私人 subject-only 保留區，保留金額、幣別、期間及退款關聯；舊表在同一交易內受限清除，避免把 email/token 或自由文字僅換個地方繼續保留。
- 保留原有 ledger guard，增加有效租約、正確步驟、同一交易及已核對保留副本的 DELETE 例外。沒有一般 UPDATE/DELETE 權限，也不停用 trigger。
- prepare → 最小化 → stage → detach；來源 hash 改變即拒絕，失敗整批回復。HMAC 使用獨立且有版本的金鑰，不能使用 app Auth/service key 替代。
- event inbox 必須由既有私有 reconciliation FK 唯一歸屬；不能從 payload 猜 owner。未知／共用歸屬先停止。raw payload／provider snapshot reference 必須先有同一來源與同一指紋的分類／清理回條，才可移除原指標；不能把未知 blob 當成普通字串丟掉。
- 原始 provider binding 以指紋退役，拒絕重新寫入已退役識別。查無 binding 仍需人工／供應商核對，不代表可自動重綁；不恢復 workspace 或權益。
- purge 使用 DB 時鐘、subject revision、operation id、已完成的帳號刪除、保留截止與 hold／provider review 條件。保留到期不等於可忽略法律保留或未核對的持續扣款。
- 所有期限由既有政策及已分類證據指定；本批不提供法律結論。真實 inbox ingress、provider closure、金鑰保存與輪替操作、供應商 raw blob／備份，以及其餘 RPC/view fence 仍須獨立驗證。

本批選擇受限搬遷而非讓所有舊帳務表接受 NULL owner：資料最小化及舊 FK 邊界較清楚，保留區只接受無帳號 FK 的證據。這是隔離實作設計，並非正式 migration 授權。

## 驗證與結果

## 已實作

- [受限 SQL 草稿](drafts/ACCOUNT_DELETION_BILLING_RETENTION_2026_11_02.sql)：private keys、subjects、plans、最小保留 records、retired bindings、來源指標回條、review／hold 與 purge receipts。所有資料表不向 client／service_role 開放直接存取；service_role 只可呼叫必要 BFF RPC。
- [worker preparation port](../../lib/subscription/account-deletion-billing-engine.server.ts)：明確 loopback endpoint／key version，prepare 後沿用五類共享最小化轉換，另接受 DB 已唯一分類的 inbox；stage 的金額、日期、ref、來源 hash 及欄位由資料庫再次獨立核對，沒有自動重試或新 HTTP 入口。
- [既有 fixture helper](../../scripts/lib/account-deletion-catalog-fixture.ts) 沿用已捕捉並核對 fingerprint 的帳務 guard 定義，僅加入 DELETE 的狹窄交易例外；原 UPDATE／INSERT 規則繼續執行。沒有停用原 trigger。
- 基底 `billing_ready`／`detach_billing` ports 及營運 preflight 可接已 stage 的計畫。未安裝這批模組時仍是原來的保守阻擋，不因檔案存在就開放帳務清理。
- 準備期間 provider 狀態由 expired 轉 active 時，必須重新核對來源；同時提高 subject revision 並開啟待核對旗標。明確的 review RPC 只能延長截止日並記錄核對證據，不能修改金額或偷偷提前清除。
- purge 依 DB 時鐘、revision 與 operation id 執行，成功回條不可更寫；legal hold 插入和 purge 鎖住同一 subject，避免判斷後才被加入 hold 的競爭。key version 的內容不可覆寫，仍有證據／binding 使用時也不能刪 key。

## 14 組新 SQL 整合結果

命令：`npx.cmd tsx scripts/verify-account-deletion-billing.ts --isolated`。

| 組別 | 驗證 |
| --- | --- |
| 1 | 部署版本的 append-only／RESTRICT guard 仍拒絕一般修改與刪除 |
| 2 | raw payload／snapshot 指標尚無回條就停止；raw blob 不能以 provider_identifier 類別放行 |
| 3 | 未分類 inbox、同一 inbox 對應不同 owner、指標回條不匹配均拒絕 |
| 4 | 錯／NULL lease、偽造金額、重複證據、夾帶 email 等欄位不能 stage |
| 5 | 來源更新後舊 stage 拒絕；明確 reprepare 使用同一 subject／key，正確提高 active-provider 風險旗標 |
| 6 | 故意在舊 customer row DELETE 前失敗，先前保留副本、binding 與交易 DELETE 全部回復 |
| 7 | 五類 ledger 加已分類 inbox 共 7 筆證據原子分離，保留 58,800 分及零元退款，不含 owner／email／原 token；另一品牌不受影響 |
| 8 | 退役 purchase/customer 不能重新綁到另一 owner；未知 binding 也不自動允許，保留區不可一般更寫 |
| 9 | 拿掉原有 profile FK 阻礙後可以移除 profile；期限未到／缺少 revision 都不可 purge |
| 10 | client 不能執行清理／讀私人表，service_role 也不能直接讀保留區或 key |
| 11 | 加入 v2 key 不破壞 v1 binding 查核；舊 key 不可改／不可在使用中刪除；review 只延長期限、回條冪等、舊 revision 失效 |
| 12 | 到期 purge 中途失敗不留下成功回條，資料整批回復；相同 operation 可再執行 |
| 13 | DB 時鐘下已到期才清理；legal hold／provider review／過期 revision 阻擋，重送同 operation 不重複計數，也不清掉其他 subject |
| 14 | 兩個獨立 PostgreSQL session 的 hold 插入／purge 競爭，已先取得鎖的 hold 會阻止 purge |

[純邏輯／port 測試](../../tests/account-deletion-billing-engine.test.ts)、既有最小化測試、TypeScript 與受影響檔案 ESLint 通過。基底 SQL hook 有變更，因此額外重跑原 7 組營運 SQL 回歸，均通過；沒有重跑手機 UI、PDF、登入效能或正式站流程。

證據在 `.codex-artifacts/account-deletion-billing-acceptance.json`，不含密鑰或正式客戶資料。測試為專用 label、network=none、無 host port／bind mount 的可丟棄 PostgreSQL 17，結束後容器與匿名 volume 已移除。這一批沒有 GoTrue／R2 服務或真 merchant，SQL data-stage 的 Auth／物件前置條件由 fixture 提供，不能當成新的 Auth／R2 證據。

## 重要限制與下一步

這批沒有連線到商店、驗證真實簽章、取消扣款、或真的清除外部 blob。來源指標回條與 provider closure 是合成測試證據；正式時必須由已驗證的 provider／processor adapter 產生，不能讓 client 自稱已完成。`review` 只是記錄事先核對，不會自行證明商店已停止扣款。

目前 inbox 歸屬以既有私有 reconciliation FK 為必要依據；只要有未分類 inbox 就保守停止準備。未來正式 ingress 必須先建立可驗證的歸屬，避免把這個隔離 fallback 當成正常營運策略。指向已退役帳號的後續續費／退款，現在不能回寫 live owner ledger，須由後續受驗證的匿名帳務 ingress 處理；本批未實作這個商店入口。

金鑰採顯式注入並在隔離 DB 私有表測試，尚不是 production vault／金鑰託管／輪替作業。法定起訖、特殊 10 年會計分類、hold 申請／撤回介面、證據記錄自身的保存期限、備份與供應商傳播仍是正式發布前項目。既有 envelope 的 retainUntil 是分離時紀錄，後續延長以 subject 的最新截止日及 immutable review 為準。

這份 SQL 仍為 ROLLBACK 草稿，需配合 captured guard generator，不能單獨拿去正式站執行。本批未提交／發布，沒有安裝 worker 或啟用旗標，不需要使用者手動 SQL。

本批「帳務搬遷／保留到期」隔離切片結案。**下一個建議切片是所有 RPC／5 個 view 與其餘 trigger 的凍結相容性**；沿用本次結案證據，不重造帳務引擎。正式刪除／AD4 仍未完成，不能開啟 production deletion。

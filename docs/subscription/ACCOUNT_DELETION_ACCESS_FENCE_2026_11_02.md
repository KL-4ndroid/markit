# 刪除引擎第四批：凍結存取、檢視與觸發器相容性

本批延續既有引擎，沒有重建申請／帳務流程。**完整凍結保護仍是隔離實作，正式刪除維持關閉。** 另發現的既有快照 RPC 隱私問題，以獨立 migration 095 修補並完成雲端唯讀驗證，與正式刪除啟用分開處理。

## 範圍與實際改動

- 從專案 `fgejncfsvvsayiequubm` 唯讀取得 134 個 public 函式完整定義、EXECUTE grants、45 個 relation 的 owner／view options／具名 RLS；來源 MD5 與前批 catalog 一致。證據為 [完整結構擷取](evidence/account-deletion-access-definitions-2026-11-02.json)，不含市集、成交或快照內容。
- 逐一分類 134 個來源函式：13 個只處理傳入資料的 helper 保留原樣（包含全部 12 個 IMMUTABLE 函式）；9 個申請／稽核 control 保留原授權；80 個資料存取函式加外層凍結檢查（其中 12 個權限 predicate 回傳 false）；其餘 31 個一般 trigger function 加檢查；舊直接刪帳函式禁用。3 個稽核 control 也屬於原有 34 個 trigger function。
- 外層檢查放在原本 DECLARE 區塊之前，避免預設運算先查資料。UUID、UUID 陣列、邀請 token、pending operation 與 JSON 內的已知 owner／market／product 等目標都有獨立範圍檢查；未知 UUID 參數必須重新審查。
- 5 個檢視保留原欄位、員工售價／庫存權限、成本／利潤／metadata 遮罩及 security barrier，再加明確的 caller／owner 過濾。沒有直接改成 invoker view，以免破壞既有員工存取。
- 清理租約改為核對同一 actor、確認／前置狀態、有效期限、token 及下一個尚未完成步驟。不能拿有效租約修改成交金額、提前刪 profile，或處理另一個凍結品牌。必要的匿名化只能精確改身分欄位；共享商品只能解除指定場次連結。
- RLS 分清「所屬品牌」與「紀錄作者」：凍結員工不能繼續讀寫，但其他老闆仍可查閱其品牌的歷史成交。一般應用程式角色移除 TRUNCATE 及 trigger function／舊刪帳函式的直接執行權限。
- 新的私有存取 manifest 比對函式定義／ACL、檢視／options／ACL、RLS、觸發器內容及啟用狀態。新增未知入口、還原 TRUNCATE grant、移除政策或停用 trigger，都會讓清理 preflight 停止。manifest 安裝前先核對來源函式及明確列舉的 request／engine／billing controls，不能自動核准未知函式。

平台相依僅限 server SQL／測試容器；分類政策本身沒有瀏覽器、裝置 API、原生套件或新付款行為。沒有修改 Demo、手機 UI、IndexedDB 恢復方向或自動重送。

## 驗證及去重

```powershell
npx.cmd tsx scripts/verify-account-deletion-operational.ts --isolated --captured-access
npx.cmd tsx scripts/verify-account-deletion-billing.ts --isolated --captured-access
npx.cmd tsx tests/account-deletion-access-policy.test.ts
npx.cmd tsc --noEmit -p tsconfig.account-deletion-workflow.json
```

隔離 SQL 重建捕獲的 40 表欄位／FK／CHECK、134 個函式、5 個檢視、45 個 public-table trigger、原 EXECUTE grants 及具名 RLS。保留觸發器開啟；沒有用停用原 guard 的方式通過清理。角色與 auth.uid／role 是 SQL fixture，不是假稱新的真實 GoTrue／JWT／手機驗收。fixture 沒有完整還原所有 column defaults／獨立 index；測試資料明確填入依賴欄位。Auth managed schema 上的外部 trigger 不包含在這 45 個 public-table trigger 中，正式整合仍須驗證。

營運與存取共 19 組，含既有 7 組營運回歸及新的關鍵案例：

| 類別 | 通過的行為 |
| --- | --- |
| 既有角色 | owner／viewer／operator／manager 的查閱與金額遮罩；canonical 角色更新仍由原 trigger 驗證 |
| 正常寫入 | authenticated 成交經全部原投影；收入 +99、銷售利潤 +76、成交 +1、庫存 -1；同 ID 再送不重複累加 |
| 凍結入口 | 80 個資料函式在原 body 前阻擋；12 個 predicate 回 false；5 個檢視對凍結 caller 皆為零列 |
| 目標範圍 | service-role RPC 不能指定凍結 owner；UUID 陣列、巢狀 JSON 與匿名邀請 token 不能繞過 |
| 資料保留 | 員工匿名化後，其他品牌收入、商品與歷史成交仍保留；source event guard 仍拒絕一般金額改寫 |
| 工作租約 | 過期／錯 token／錯步驟／跨凍結品牌／提前刪資料被拒；進度查詢仍可用，processing 不能撤回 |
| 結構變動 | 未盤點表／欄位／函式／檢視、權限／RLS／trigger drift 皆停止 preflight |
| 清理相容 | 全部原 public-table trigger 開啟下，staff／owner 清理至 profile 正常，保留另一品牌共享商品 |

帳務整合另外保留前批 14 組回歸，並增加完整 captured surface 共存與 combined manifest 檢查，共 16 組。此次重跑是因為新保護實際包住了原帳務 guard；不是重新開發帳務引擎。故障注入案例先測 guard／交易回復，最後才安裝完整 manifest，避免故意新增的測試 fault function 被當成正式允許入口；營運矩陣另直接驗證 manifest 阻擋未知入口。

機器結果為忽略提交的 `.codex-artifacts/account-deletion-access-acceptance.json` 與 `account-deletion-billing-acceptance.json`。純邏輯及生成器守門、工具 TypeScript、受影響檔案 ESLint（scripts 使用 `--no-ignore`）通過。測試容器限定 Docker Desktop、network=none、無 host port／bind mount，結束後清除。未重跑已結案的 Web／PDF、登入效能或前批真 GoTrue／S3 協定測試。

## 已獨立套用的快照隱私修補：095

原 `get_latest_snapshot(uuid)` 與 `cleanup_old_snapshots(uuid)` 為 SECURITY DEFINER，沒有本人範圍檢查且可由匿名角色執行；前者可能被用來跨帳號讀取快照。這是結構與隔離重現確認的風險，沒有查詢正式快照，也沒有證據表示曾被利用。

[migration 095](../../supabase/migrations/095_scope_snapshot_rpcs_to_owner.sql) 加入本人或既有 service-role 驗證、固定空 search_path／完整表名、撤掉 PUBLIC／anon EXECUTE，保留既有 authenticated／service 呼叫者。清理仍保留最新兩份，改正 UUID 被塞入 integer 的原計數問題，並加入相同時間戳的 id 排序。安裝只更新函式及 grants，不呼叫 cleanup，不刪任何資料。

遷移接受明確的舊／新定義指紋，拒絕其他來源；指紋先正規化 CRLF，因 SQL Editor 的換行格式與 psql 不同。隔離已驗證 self／cross-owner／anonymous、正確清理計數、可重複套用及 [095 唯讀驗證](../../supabase/verification/095_snapshot_owner_scope_readiness.sql)。

已透過 Chrome SQL Editor 套用至同一 Supabase 專案；[雲端結果](evidence/snapshot-095-cloud-verification-2026-11-02.json)為 `095_snapshot_scope_ready=true`，兩個函式的精確定義、search_path、PUBLIC／anon／authenticated／service grants 全部通過。[畫面證據](evidence/snapshot-095-cloud-verification-2026-11-02.png)。這不代表其他引擎 SQL 已發布。

## 尚未完成與下一步

1. 完整凍結 SQL 尚未整合成經審查的 production migration；目前 draft 仍限定 `deletion_engine_test`、保留 ROLLBACK。不能讓使用者執行它啟用正式刪除。
2. 下一個必要切片：**真實 R2 清理範圍與孤兒／在途物件證據**。先確認既有 metadata 與供應商列舉能力、版本／備份／上傳租約、404／403／逾時及每物件收據，再做限定可丟棄前綴的驗證；不刪實際照片。先完成可驗證的資源範圍，才可安排真實刪除確認。
3. 正式帳務 ingress／退役 subject 的後續通知、真 provider／vault／外部 blob、備份及保存作業仍未完成。這些不因本批 SQL 測試轉為完成。
4. 正式 API 的直接 service-role 查表、SQL fixture 之外的 managed Auth trigger、真 JWT／PostgREST 及生產 query plan 仍需在完整候選版驗證。service role 的直接基表讀取具有 BYPASSRLS，這批測試沒有宣稱限制該管理能力；受保護的是對外 RPC／view 與寫入入口。

AD4 checker 仍 `ready=false`、13 個 release blockers，正式刪除／排程／公開 worker 仍未啟用。本批未 commit／push；唯一雲端變更為 095 隱私修補，沒有正式刪帳、商店操作或照片清除。不需要使用者現在手動執行 SQL。

檢視設計參照：[PostgreSQL 17 CREATE VIEW](https://www.postgresql.org/docs/17/sql-createview.html)（security barrier 與 invoker 是不同選項）、[CREATE TRIGGER](https://www.postgresql.org/docs/17/sql-createtrigger.html)。來源擷取與隔離結果不取代正式發布證據。

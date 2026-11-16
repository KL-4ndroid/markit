# 刪除引擎第二批：部署結構對照、營運資料清理與帳務保留契約

後續進度：第三批帳務分離已隔離完成；[第四批存取凍結](ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.md)完成 captured 134 函式／5 檢視／45 原 public-table trigger 的 19 組營運／權限與 16 組帳務整合。完整 engine 仍未正式發布；只有 095 快照隱私修補獨立套用雲端。本文其餘未完成敘述為第二批歷史。

日期：2026-11-02。承接 [第一批引擎](ACCOUNT_DELETION_ENGINE_2026_11_02.md)。本批已實作並驗證隔離 SQL 擴充；**正式刪除、正式 migration 與 worker 仍關閉，尚未提交／發布**。

後續更新：[第三批帳務分離與到期清理](ACCOUNT_DELETION_BILLING_ENGINE_2026_11_02.md)已完成隔離實作。下方「帳務尚未搬動」為第二批範圍，不代表目前仍只有轉換契約；正式 provider／processor、全部 RPC/view fence 與發布界線仍保留。

## 這批解決的新缺口

第一批只支援小型隔離契約，遇到其他表即停止；這批直接透過使用者已登入的 Supabase SQL Editor 讀取目前專案 `fgejncfsvvsayiequubm` 的結構，沒有讀取客戶資料列或執行雲端 DDL／DML。

- [盤點 SQL](../../supabase/verification/account_deletion_schema_inventory.sql) 與 [179 筆部署結構證據](evidence/account-deletion-catalog-2026-11-02.json)：40 個實體表、5 個檢視、134 個 public 函式。
- [必要定義 SQL](../../supabase/verification/account_deletion_guard_definitions.sql) 與 [20 筆函式／型別／view options](evidence/account-deletion-guards-2026-11-02.json)：13 個必要函式的定義 MD5 均對得上前份盤點。
- [逐表分類](../../lib/subscription/account-deletion-data-policy.ts) 覆蓋這 45 個 relation。新增／缺少／重複 relation 都可檢出，分類完整不等於自動准許刪除。範圍是本次查詢的 public 及 billing/deletion 命名 schema，並非所有外部處理者或任意其他 schema 的完整盤點。

實際發現：events／events_archive.actor_id 皆 NOT NULL；archive.archived_by 還指向 profile；範本套用的 actor 指向 Auth 且會 cascade；雲端 pending_operations 會跟 profile cascade；事件更新還會被現有不可更寫規則阻擋。原第一批若直接套到正式 schema，無法通過這些限制，因此沒有直接把它發布。

## 已實作的擴充

[隔離 SQL 擴充](drafts/ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.sql) 只接受 `deletion_engine_test`，保留 ROLLBACK。沿用既有 saga／租約／收據／Auth-last，不另造執行引擎。沒有瀏覽器或裝置 API、付款、價格、權益或原生套件變更。

| 資料 | 老闆刪帳 | 員工刪帳 |
| --- | --- | --- |
| 即時／封存事件 | 清除本品牌場次與本人全域事件；在其他品牌留下的事實匿名化 | 保留場次、金額與成交，只移除 actor／archiver 等身分關聯 |
| 快照 | 刪除本人快照與含刪帳身分的衍生快照 | 使含身分的快照失效；未污染快照及來源歷史保留 |
| 準備範本／套用回條／工作流回條 | 清除本品牌資料 | 保留其他品牌資料，匿名化 actor 與 request/result 內的已知身分 |
| 心得、盤點、財務核對、固定安排、地點 | 依 FK 順序清除本品牌資料 | 保留其他老闆的私人資料；若員工也擁有這類資料則停止確認種類 |
| 共享商品 | 另一品牌的商品保留，只移除它對已刪場次的 market_id | 保留 |
| 邀請／團隊 | 撤銷本品牌及本人使用的關係／token | 撤銷本人關係與可識別身分的邀請 token |
| 雲端待送作業 | 非 synced 的相關作業會在凍結前停止，不靜默丟棄 | 同樣保護本人尚未完成的雲端作業 |
| 照片 | 活躍 upload lease 先停止；既有 manifest／absence 步驟保持必要 | 不刪老闆照片 |

事件保護函式沒有停用：工具以這次匯出的真實函式為底，僅加上有效租約、正確步驟與精確可變欄位的匿名化例外。一般語意修改仍被拒絕；修改金額不屬於匿名化授權。SQL 會讓三個已知 actor 欄位可為 NULL；共用讀取 factory 同時將雲端 null actor 正規化為 optional actor，保持 synced，不替已刪成員補上目前登入者。

匿名化限已知結構化身分。完整 UUID 值改為 JSON null，內文中的 UUID／email 移除；只有 actorName／staffName／memberName 等身分欄位會處理顯示名稱，不因商品名恰與成員同名就改掉商品。其他人的 actor 不因 payload 引用刪帳者而被清掉，也不標成 deletedActor。這不是對任意自由文字、裝置快取或外部備份的全面抹除承諾。

## 帳務保留：已完成契約，尚未搬動 ledger

[共享最小化轉換](../../lib/subscription/account-deletion-billing-retention.ts) 及 [專用 HMAC port](../../lib/subscription/account-deletion-billing-retention.server.ts) 支援 customer link／subscription／transaction／reconciliation／price assignment 五類已分類證據：

- 保留必要的金額、幣別、退款／交易狀態、期間與正規化方案；零元與整數分單位不能被誤判或失真。
- 不輸出 owner_id、email、原始 token、snapshot/raw payload ref、支援備註或不必要自由文字。
- 主鍵／供應商識別／關聯鍵以專用、具版本及用途區隔的 HMAC 表示；客戶／訂閱／交易之間可維持匿名關聯。不同商店或 sandbox/production 不共用相同 fingerprint 用途。
- 明確要求已核對的 actor／billing subject、保留截止日與同版金鑰。跨帳號、無法分類的 event inbox、缺少必要事實、超過安全整數或不一致 key version 都拒絕。

這是保留資料的輸出契約，**不是**實際 detach migration。既有 ledger 的 append-only／RESTRICT／不可更寫 trigger 保持原狀；新引擎遇到本人帳務列仍在凍結前停止。沒有刪除 subscription、取消商店扣款、自動釋出 binding 或實作付費／restore。

下一份帳務遷移必須另做：私有 billing subject 與 scope、可追蹤的金鑰保存／輪替；五類表在同一交易內的狹窄 detach 例外與 owner-null/subject-only 限制；event inbox 的可靠歸屬及 raw payload 清理；未來事件只能接匿名帳務，不得重建 workspace 或自動重綁帳號。保留政策沿用既有五年方向，但本轉換器不自行推算法律起訖或宣稱到期 purge 已完成；截止日由已核對的分類決定，legal hold／purge／processor 備份仍須實作。

## 新驗證與邊界

命令：`npx.cmd tsx scripts/verify-account-deletion-operational.ts --isolated`。

7 組新 SQL 整合案例通過：40 表欄位／型別／nullability 與實際 FK／CHECK；staff 的 archive／receipt／snapshot 清理並保留 99 元成交；既有事件 guard 仍拒絕一般語意更寫；實際 FK 下可移除員工 profile；pending／in-flight upload／帳務列在凍結前拒絕；老闆營運清理順序、全域事件與其他品牌共享商品；未知欄位／表拒絕。

這批 fixture 重建的是捕捉到的 40 表契約與兩個真實事件 guard，**沒有重建所有 134 個函式、所有投影 trigger、所有原 view 的完整執行環境或 PostgREST**。SQL data-stage 的外部前置證據是明確的 fixture 條件，不算新的 R2／Auth 成功證據。原真實 GoTrue／S3 協定替身 10 組回歸也通過，這是因為共用匿名化及 extension hook 有新變更，沒有重跑登入效能、PDF 或手機介面驗收。

[新測試](../../tests/account-deletion-data-policy.test.ts) 驗證 45 relation 分類、13 個函式 fingerprint、五類最小化資料、退款／零元／跨帳號／未知 inbox／不安全整數／key version 拒絕與 synced-null-actor 讀取。TypeScript 與受影響檔案 ESLint 通過。專用 Docker PostgreSQL／GoTrue 測試容器、匿名 volume 與 network 均已清除。證據存 `.codex-artifacts/account-deletion-operational-acceptance.json` 與原 engine acceptance，不含正式客戶內容或金鑰。

## 明確未完成，避免重複驗收

本批 public 結構盤點與營運 SQL 切片結案，不再把「只有小型 fixture、尚未讀正式 catalog」當成原狀。仍須完成：

1. **帳務 detach migration／可靠 inbox 歸屬／到期 purge**：本批只有可測試的最小化契約。
2. **所有 RPC／view 與其餘 trigger 的凍結相容性**：本次 5 個 view 僅標示 security_barrier，不能把它當成 security_invoker 或保證已繼承新 RLS。
3. **真 R2／孤兒與在途物件／版本／備份**，以及公開揭露、監控、production 發布與原生商店證據。

目前不能開啟正式刪除；不需使用者執行任何 SQL。下一個建議切片是第一項的受限帳務遷移及隔離驗證，完成後再安排第二項，避免重跑已完成的營運案例。

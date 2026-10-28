# 事件寫入授權：隔離重現與修補

日期：2026-10-28，Asia/Taipei。086／087 已套用雲端並完成唯讀複驗。

## 結果

以實際雲端結構建立全新的 PGlite PostgreSQL，使用隨機合成 UUID 及
`example.test` 帳號，重現了兩類真實授權缺口：

- 非所屬品牌帳號可透過 `market_updated` 改寫另一個老闆的市集名稱。
- 查看者可修改市集；也可把事件的市集指向合法品牌、商品指向其他品牌，
  讓既有商品投影修改另一品牌的售價。

這是完整快照下的隔離成功重現，沒有對正式營運資料嘗試上述寫入。
無法由此證明歷史上曾發生利用或資料外洩，也不代表其他資料表的所有入口
都已完成安全盤點。

## 證據與範圍

先前只讀政策未區分 permissive／restrictive，曾無法排除其他保護。
本輪取得 `pg_policies.permissive`、實際 INSERT grant、所有八個 events
非內建觸發器、相依函式、完整五表欄位、事件 constraints，以及市集／商品／
員工關係／成員表的下游觸發器和 constraints。

- [原始事件快照](../tests/fixtures/event-write-deployed-2026-10-27.json)
- [相依函式快照](../tests/fixtures/event-write-deployed-helpers-2026-10-27.json)
- [下游觸發器及限制](../tests/fixtures/event-write-deployed-downstream-2026-10-28.json)
- [通用唯讀診斷](../supabase/verification/event_write_authorization_readonly.sql)

快照不含任何營運資料列、密鑰、會話或帳號 ID。相依函式
`current_user_owned_market_ids()` 另由 SQL Editor 單獨查詢取得並併入 helper
fixture。擷取透過使用者已授權的 Chrome Supabase SQL Editor，沒有取得管理
憑證或建立額外資料庫連線。

隔離資料庫載入實際事件政策、全部八個事件觸發器及其完整函式、全部十個
下游觸發器及其完整函式與資料限制。額外支援表（現金、心得、venue、schedule）
使用所需參照欄位的合成結構；本輪未驗收完整固定安排 writer 流程。
`uuid_generate_v4()` 在隔離環境以 `gen_random_uuid()` 實作等價 UUID 產生。
其他直接資料表 RLS 並非本輪完整複製／盤點範圍；已重現的事件投影為
SECURITY DEFINER，會以其 owner 執行下游 UPDATE。

根因是 `users_can_insert_own_events` 與較嚴的市集成員檢查同為 PERMISSIVE，
前者只要求 actor 等於登入身分。固定安排的額外限制是 RESTRICTIVE，但只限制
固定安排事件。原有方案觸發器限制付費層級，並不取代操作者、品牌與角色授權。
投影中的 envelope／payload ID 優先順序也不一致。

## 修補

[086 遷移](../supabase/migrations/086_enforce_event_actor_authorization.sql) 新增
`a00_event_actor_authorization`，在原投影之前執行：

- 登入身分須等於事件 actor；事件本體只容許 metadata／sync_status 回執更新，
  ID、時間、內容及未來新增的業務欄位皆不可直接改寫。
- envelope、`market_id`、`marketId` 必須指向相同市集；商品別名與成交商品也須
  屬於該品牌，防止以合法市集包覆另一品牌的商品。
- 員工須維持 active 關係、有效 Team 及符合操作的 operator／manager 角色。
  查看者不能寫入；管理員僅可更動既定基本欄位，不能改費用、成本、利潤、
  品牌歸屬或老闆專用的新增／刪除／營業狀態。
- 出攤助手可記成交、互動與勾選待辦；不能混入待辦文字編輯或交接筆記操作。
- 員工刪除成交／互動須為自己當日的原始紀錄，並驗證原始事件類型和市集。
  日期以目前產品的 Asia/Taipei 日界判斷，需同時符合交易時間與建立日期；
  跨日才送達的員工刪除不會自動獲准。
- 保留既有 backend service_role 維護及老闆 metadata 使用；原付費限制仍執行。

既有 RLS、投影、訂閱 pilot 啟用名單及歷史事件未被替換／重播。
未新增任何外部可呼叫的權限入口。

[087 遷移](../supabase/migrations/087_guard_staff_role_permission_consistency.sql)
在新建、變更角色或 permissions 時驗證既定組合：viewer 為 L0，operator／manager
為 L2。這會讓舊 permissions-only RPC 與直接表格寫入一併受保護。
舊資料完全不變時仍可更新狀態，避免卡住停權或方案暫停流程。

這是平台共用的資料庫授權／一致性規則，沒有新增瀏覽器或裝置 API。
Web、iOS、Android 共用同一個後端驗證，不需要增加 lib/platform adapter。

## 測試與雲端確認

執行：

```powershell
node scripts/verify-event-write-authorization-sql.mjs
node scripts/verify-event-write-authorization-sql.mjs --deployed
node scripts/verify-subscription-write-guards-sql.mjs
npx.cmd tsx tests/staff-role-consistency.test.ts
```

驗證 script 沒有讀取 .env、管理憑證或網路連線；重用既有的可選 PGlite runtime
`.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite`，不加入 App 依賴。

- 12 組事件／角色 SQL 檢查通過，包括修補前重現、修補後拒絕、正常 staff 成交
  及庫存投影、管理員基本欄位、撤銷／降級立即拒絕、免費 metadata、原事件
  不可變、混合批次全數回復、backend cleanup、087 舊資料不自動修復及重跑。
- 既有 8 組訂閱 SQL 回歸通過；角色可見度 characterization 通過。
- 086／087 透過同一已授權專案 SQL Editor 執行，均顯示 Success。
- [086 唯讀驗證](../supabase/verification/086_event_actor_authorization_readiness.sql)及
  [087 唯讀驗證](../supabase/verification/087_staff_role_permission_readiness.sql)
  的檢查在雲端通過；兩個 trigger enabled=true，anon／authenticated EXECUTE=false。
- 匯出[實際部署函式與 ACL](../tests/fixtures/event-write-patched-deployed-2026-10-28.json)，
  移除 SQL 註解／排版後，兩個 function body 與本機版本逐字相符。
  `--deployed` 再將匯出的函式載入隔離資料庫重跑同一矩陣，12 組通過。
- [雲端驗證截圖](ux-evidence/2026-10-28/event-authorization-deployed.png)。

此處的雲端複驗是結構、函式及 ACL 確認；拒絕與成功寫入測試均在隔離環境。
沒有以服務密鑰模擬客戶端權限，也沒有在正式資料庫建立攻擊樣本。

## 保留的待辦

最後增量：Team 失效／重新啟用的缺口已由 Sol 以
[088](subscription/STAFF_PLAN_REACTIVATION_FIX_2026_10_28.md) 修補並雲端驗證；
13 組含實際函式的隔離案例通過。下文「交 Sol」為修補前歷史，非目前阻塞。
指定角色矛盾已按使用者明確授權透過 canonical writer 修正為 operator／L2；
本輪結束保留此範圍，測試 Team 覆寫關閉。角色全矩陣及同步疑點仍另列待辦。

2026-10-28 續驗：使用者已明確批准指定測試員工使用標準 operator 資料範圍；
該筆由 owner role writer 修正為 L2。下段原有的「仍有一筆矛盾」是修正前歷史。
三角色已進行部分實際畫面／待辦操作，完整角色寫入矩陣仍未通過。指定082
測試覆寫在未更動關係時重新啟用 Team 可讓原 active 員工再次取得存取，與
使用者後來確認「重升時逐一恢復」的規則不一致；完整授權修補交 Sol 處理。

雲端仍有一筆既有 role／permissions 不一致的關係；087 沒有替它升權或回填。
測試員工的售價／庫存 0 問題仍需要老闆明確確認想給的資料範圍，再透過
canonical role writer 修正及重新同步，不能把本輪保護當成數字已恢復。
原[角色可見度診斷](STAFF_ROLE_CONSISTENCY_DIAGNOSIS_2026_10_27.md)的本機提示
仍是輔助辨識用途。

真正員工三種登入角色的完整 UI／寫入矩陣、實機及其他資料表入口安全盤點
仍屬後續驗收。本輪本機檔案尚未 commit／push；資料庫保護已生效。

# 訂閱方案變更導航與完整檔案索引

2026-11-02 整合候選版：[唯一整合結果與未完清單](subscription/ACCOUNT_DELETION_INTEGRATED_DELIVERY_PLAN_2026_11_02.md)。新增[安全讀回 server](../lib/subscription/photo-upload-readback.server.ts)與[SQL／最小審查清單](subscription/drafts/ACCOUNT_DELETION_PHOTO_READBACK_2026_11_02.sql)，兩既有照片 handler 預設關閉接線；[真 GoTrue／PostgREST helper](../scripts/lib/account-deletion-candidate-services.ts)接入原 runner `--candidate-isolated`，[22 組結果／來源指紋](subscription/evidence/account-deletion-integrated-candidate-2026-11-02.json)。[來源清單](../scripts/lib/account-deletion-candidate-sources.ts)、[準備工具](../scripts/prepare-account-deletion-candidate.ts)、[review manifest](subscription/candidate/manifest.json)、[唯讀 preflight](subscription/candidate/PREFLIGHT.sql)及[遠端安裝阻擋](subscription/candidate/INSTALL_BLOCKED.sql)新增。[/account-deletion 公開頁](../app/account-deletion/page.tsx)、[公開路由](../lib/navigation/public-route.ts)與[支援入口](../app/support/page.tsx)為草案，未宣稱自助正式開放；[AD4 checker](../scripts/check-account-deletion-ad4-preparation.ts)分開實作／證據／正式資格。[Preview 最小部署證據](subscription/evidence/account-deletion-preview-2026-11-02.json)記錄 `5b2f5c3` Ready、公開頁／入口與 disabled API；只發布候選分支，未合併 main。正式 migration、遠端整套驗收及未知／legacy 處置仍未完成；不可逆刪除維持關閉。Gate 2 canonical 已 complete，歷史下文 Gate 2 關閉／尚未開始整合的敘述已被本段取代；未改方案／價格／正式付款。

2026-11-02 既有照片 handler 接入回條（本機預設關閉）：[流程／16 組檢查／限制](subscription/ACCOUNT_DELETION_PHOTO_HANDLER_RECEIPTS_2026_11_02.md)、[安全摘要](subscription/evidence/account-deletion-photo-handlers-2026-11-02.json)。[coordinator](../lib/subscription/account-deletion-upload-barrier.server.ts)新增可選 writeObject／canCompensate，[writer](../lib/subscription/account-deletion-terminal-put.server.ts)增加 loopback 標準照片精確 scope／MIME；[商品](../app/api/product-cover-photo/upload/route.ts)與[成交](../app/api/sales-photo-evidence/upload/route.ts)只補償本次已確認建立的物件，412／未知結果不誤刪原圖。新增[真 handler／SQL／loopback S3 檢查](../scripts/lib/account-deletion-photo-handler-checks.ts)，[原工具](../scripts/verify-account-deletion-upload-race.ts)加 `--photo-handler-isolated`，[.env.example](../.env.example)加 `ACCOUNT_DELETION_UPLOAD_RECEIPTS_ENABLED=0`。遠端／deployment／缺少 barrier 拒絕，舊分支回歸及 Web build 通過；未改 .env.local／雲端／正式資料、未提交發布，正式刪除及 Gate 2／AD4 仍關閉。新模式的相同照片安全重送／讀回仍須補齊，再整理正式 migration；未改方案價格、權益或付款。

2026-11-02 單次 PUT 終止證據：[HTTP／SQL／真 staging R2 結果](subscription/ACCOUNT_DELETION_TERMINAL_PUT_2026_11_02.md)、[隔離 5 組](subscription/evidence/account-deletion-terminal-put-isolated-2026-11-02.json)、[真 staging 3 組](subscription/evidence/account-deletion-terminal-put-staging-2026-11-02.json)。新增[單次 writer／receipt-backed drain](../lib/subscription/account-deletion-terminal-put.server.ts)、[私人 intent／receipt 與兩個 service BFF 草案](subscription/drafts/ACCOUNT_DELETION_TERMINAL_PUT_2026_11_02.sql)、[HTTP／R2 檢查](../scripts/lib/account-deletion-terminal-put-checks.ts)；[原工具](../scripts/verify-account-deletion-upload-race.ts)加 terminal-put 兩種模式，[reconciliation 草案](subscription/drafts/ACCOUNT_DELETION_UPLOAD_RECONCILIATION_2026_11_02.sql)加可替換的 drain 驗證 hook，[manifest](../scripts/lib/account-deletion-access-fixture.ts)與[型別配置](../tsconfig.account-deletion-workflow.json)同步。真 R2 200 回條在注入 SQL ack／HTTP response 遺失後可由新 reader 核對；不明 provider 回應仍保持阻擋。staging 僅 1 個自建 marker，DELETE／HEAD 已確認不存在；無 production 照片／SQL／Auth／設定變更。新 writer 只許本機／staging 測試 namespace，正式商品／成交 handler 尚未接入，未提交發布或啟用正式刪除，Gate 2／AD4 維持關閉；下一步是既有兩種上傳路徑的本機預設關閉接入。

2026-11-02 uncertain 核對與恢復（本機／隔離）：[流程、安全與限制](subscription/ACCOUNT_DELETION_UPLOAD_RECONCILIATION_2026_11_02.md)、[10 組新證據](subscription/evidence/account-deletion-upload-reconciliation-2026-11-02.json)。新增[內部 worker port](../lib/subscription/account-deletion-upload-reconciliation.server.ts)、[單一 service-only 核對 RPC／私人回條草案](subscription/drafts/ACCOUNT_DELETION_UPLOAD_RECONCILIATION_2026_11_02.sql)、[SQL 檢查](../scripts/lib/account-deletion-upload-reconciliation-checks.ts)及[單元測試](../tests/account-deletion-upload-reconciliation.test.ts)。[原工具](../scripts/verify-account-deletion-upload-race.ts)以 `--reconciliation-isolated` 重用 fixture、不重跑原 race；[存取 manifest](../scripts/lib/account-deletion-access-fixture.ts)、[測試列表](../scripts/test-files.txt)、[型別配置](../tsconfig.account-deletion-workflow.json)同步。精確 lease／freeze、可信 drain 契約、逐 key 觀察、metadata CAS、DB-clock 期限、同證據 ack 重試與不可更新回條完成隔離驗證；保留品牌照片與 metadata。新 port 拒絕遠端、無預設 credentials／route／排程；停止證據與物件端為 fixture，正式 adapter／真 HTTP＋R2 仍待完成。沒有雲端變更、提交發布或正式清理啟用，Gate 2／AD4 仍關閉；不改方案、價格或正式付款。

2026-11-02 在途上傳／凍結協調：[修補與驗證界線](subscription/ACCOUNT_DELETION_UPLOAD_BARRIER_2026_11_02.md)、[8 組隔離證據](subscription/evidence/account-deletion-upload-race-2026-11-02.json)。新增 [server coordinator](../lib/subscription/account-deletion-upload-barrier.server.ts)、[私人 registry SQL 草案](subscription/drafts/ACCOUNT_DELETION_UPLOAD_BARRIER_2026_11_02.sql)、[隔離驗證工具](../scripts/verify-account-deletion-upload-race.ts)、[coordinator 測試](../tests/account-deletion-upload-barrier.test.ts)、[商品 handler 測試](../tests/product-cover-upload-freeze.test.ts)及[平台中立清理 helper](../lib/products/product-cover-photo-upload-cleanup.ts)。[商品 route](../app/api/product-cover-photo/upload/route.ts)與[成交 route](../app/api/sales-photo-evidence/upload/route.ts)可選接入；[成交回歸](../tests/sales-photo-evidence-upload-route-disabled.test.ts)加 6 情境。[engine 草案](subscription/drafts/ACCOUNT_DELETION_ENGINE_2026_11_02.sql)、[營運草案](subscription/drafts/ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.sql)加入 quiescence／manifest hooks；[adapter](../lib/subscription/account-deletion-engine-adapters.server.ts)區分在途重試與人工核對，[fixture manifest](../scripts/lib/account-deletion-access-fixture.ts)明列四個 service-only BFF。[.env.example](../.env.example)、[測試 manifest](../scripts/test-files.txt)、[專用 tsconfig](../tsconfig.account-deletion-workflow.json)同步。新 gate 預設關閉且拒絕遠端／部署，未套用雲端 SQL、未改角色或正式付款、未提交／發布。正式 race／Gate 2／AD4 仍未完成；下一步是 uncertain 核對與恢復，不重跑既有 R2／SQL 大矩陣。

2026-11-02 真實 staging R2：[8 組結果與界線](subscription/ACCOUNT_DELETION_R2_LIVE_STAGING_2026_11_02.md)、[安全摘要](subscription/evidence/account-deletion-r2-live-2026-11-02.json)。新增[真 R2 測試工具](../scripts/verify-account-deletion-r2-live.ts)、[限定 staging／run／exact key 的 probe](../scripts/lib/account-deletion-r2-staging.ts)及[範圍／ownership／absence 守門](../tests/account-deletion-r2-staging.test.ts)；[原 adapter](../lib/subscription/account-deletion-engine-adapters.server.ts)只抽出共用嚴格 404 classifier，保留 loopback-only。3 個自建 marker 最後全部確認不存在；真 412／403／DELETE／404、fixture ack 遺失及跨 actor 保護通過。未碰正式照片／SQL／Auth／權限，沒有開啟引擎；重建物件的結果指出下一批須處理 server PUT／freeze 競爭，Gate 2／AD4 不因此解除。

2026-11-02 R2 Cloudflare 登入後：[實體清單與生命週期結果](subscription/ACCOUNT_DELETION_R2_INVENTORY_2026_11_02.md)、[無密鑰摘要](subscription/evidence/account-deletion-r2-production-inventory-2026-11-02.json)。沿用[盤點工具](../scripts/inventory-account-deletion-r2.ts)新增顯式 bucket／dashboard 清單輸入，重用[分析 helper](../scripts/lib/account-deletion-r2-inventory.ts)並區分過期引用。production bucket 4 物件全部匹配、0 無引用物件、18 未列出 keys 全已到期；既有 credential production 403，不擴權，僅以登入管理頁觀察比對。7 天 lifecycle 已查看、未修改；Secret 部署值／multipart／HEAD／備份與真刪除仍待完成，正式引擎保持關閉。

2026-11-02 R2 目標核對續記：[盤點文件最新段落](subscription/ACCOUNT_DELETION_R2_INVENTORY_2026_11_02.md)確認使用者完成 Vercel 二次驗證後，共用 endpoint 與本機一致，pre-production 為 `markit-sales-photo-staging`；Production bucket 仍為不可讀回 Secret。Cloudflare 管理頁需使用者登入或提供非密鑰 bucket 名稱，正式目標尚未確認。無新產品程式／SQL／環境變更；只更新證據與待辦，將現有 server PUT／lease 競爭取代尚不存在的 presigned transport 改造。

2026-11-02 R2 唯讀盤點：[結果、差異與阻擋](subscription/ACCOUNT_DELETION_R2_INVENTORY_2026_11_02.md)、[安全摘要證據](subscription/evidence/account-deletion-r2-inventory-2026-11-02.json)。新增[有界唯讀工具](../scripts/inventory-account-deletion-r2.ts)、[比對／候選分類](../scripts/lib/account-deletion-r2-inventory.ts)及[不完整／變動／跨 owner／近期物件測試](../tests/account-deletion-r2-inventory.test.ts)。本機配置指向的真 R2 為空，DB 有 11 筆 uploaded metadata／22 keys；未確認與正式部署同目標，不能當成正式照片遺失或已完成孤兒清理。Lifecycle 403、正式設定下載遭自動核准拒絕，沒有改權限、刪除／上傳或開啟正式引擎。後續先確認正式目標，再沿用工具，不重造盤點器。

2026-11-02 刪除引擎第四批：[存取凍結與相容性結果](subscription/ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.md)。[完整函式／檢視／ACL 唯讀查詢](../supabase/verification/account_deletion_access_definitions.sql)及[134 函式／45 relation 定義](subscription/evidence/account-deletion-access-definitions-2026-11-02.json)補齊來源。[平台中立分類](../lib/subscription/account-deletion-access-policy.ts)、[local-only SQL](subscription/drafts/ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.sql)、[重建／改寫／存取 manifest](../scripts/lib/account-deletion-access-fixture.ts)、[範圍與角色檢查](../scripts/lib/account-deletion-access-checks.ts)、[純邏輯守門](../tests/account-deletion-access-policy.test.ts)新增；既有 [營運](../scripts/verify-account-deletion-operational.ts)／[帳務](../scripts/verify-account-deletion-billing.ts)工具加入 `--captured-access`。134 函式分類、5 檢視遮罩及 45 原 trigger、精確 worker 租約／匿名化／TRUNCATE 撤權與 drift guard 經 19＋16 組隔離案例通過。完整 engine fence 尚未發布，正式刪除仍關閉。另 [095 快照本人範圍修補](../supabase/migrations/095_scope_snapshot_rpcs_to_owner.sql)已獨立套用雲端，[唯讀驗證](../supabase/verification/095_snapshot_owner_scope_readiness.sql)及[結果](subscription/evidence/snapshot-095-cloud-verification-2026-11-02.json)／[畫面](subscription/evidence/snapshot-095-cloud-verification-2026-11-02.png)通過；只收緊既有快照讀取與清理 RPC，未執行清理、不刪營運資料、不開啟刪帳或付款。真 R2、外部帳務／vault、API 直接 service 查表與 production migration／發布仍待完成，AD4 ready=false。

2026-11-02 刪除引擎第三批（隔離完成，未發布）：[帳務分離與保留期限結果](subscription/ACCOUNT_DELETION_BILLING_ENGINE_2026_11_02.md)。新增[private subject／stage／detach／purge SQL](subscription/drafts/ACCOUNT_DELETION_BILLING_RETENTION_2026_11_02.sql)、[受限 preparation worker port](../lib/subscription/account-deletion-billing-engine.server.ts)、[14 組帳務 SQL 驗證](../scripts/verify-account-deletion-billing.ts)及[worker 隱私／邊界測試](../tests/account-deletion-billing-engine.test.ts)。沿用[最小化契約](../lib/subscription/account-deletion-billing-retention.ts)，[capture helper](../scripts/lib/account-deletion-catalog-fixture.ts)核對原 guard 後加入交易內 DELETE 例外；[base SQL](subscription/drafts/ACCOUNT_DELETION_ENGINE_2026_11_02.sql)／[operational SQL](subscription/drafts/ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.sql)以預設拒絕的 private hooks 接入。帳號無 FK 的保留區、原子清理、來源指標回條、key version、退役 binding、review／hold、DB-clock purge／immutable 回條已驗證；額外重跑 7 組營運回歸。未連真實商店／blob／vault；正式 inbox ingress、匿名後續帳務、所有 RPC/view fence、公開揭露及 production migration 仍未完成，ready=false，不改價格、實際扣款／取消／restore 或正式啟用狀態。

2026-11-02 刪除引擎第二批（隔離完成，未發布）：[部署結構對照、營運清理與帳務契約](subscription/ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.md)。[唯讀盤點](../supabase/verification/account_deletion_schema_inventory.sql)／[必要定義查詢](../supabase/verification/account_deletion_guard_definitions.sql)取得[45 relation／134 函式結構](subscription/evidence/account-deletion-catalog-2026-11-02.json)與[20 筆必要定義](subscription/evidence/account-deletion-guards-2026-11-02.json)。新增[逐表政策](../lib/subscription/account-deletion-data-policy.ts)、[營運擴充草稿](subscription/drafts/ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.sql)、[對照 fixture／guard fingerprint](../scripts/lib/account-deletion-catalog-fixture.ts)、[7 組資料階段驗證](../scripts/verify-account-deletion-operational.ts)、[帳務最小化契約](../lib/subscription/account-deletion-billing-retention.ts)／[專用 HMAC](../lib/subscription/account-deletion-billing-retention.server.ts)及[分類／保留／null actor 測試](../tests/account-deletion-data-policy.test.ts)。[基底 SQL](subscription/drafts/ACCOUNT_DELETION_ENGINE_2026_11_02.sql)加入受限 extension hooks；[synced factory](../lib/sync/synced-event-factory.ts)／[Event metadata](../types/db.ts)相容已刪 actor。正式 DB 只讀結構，未套 migration。帳務表仍不可更寫，實際 detach／purge、全部 RPC/view fence 與真 R2 尚未完成，ready=false；不改價格、付款、restore 或正式啟用狀態。

2026-11-02 刪除引擎（隔離實作，未發布）：[設計、範圍與驗證](subscription/ACCOUNT_DELETION_ENGINE_2026_11_02.md)。新增[逐步執行核心](../lib/subscription/account-deletion-engine.server.ts)、[受限 PostgreSQL／Auth／S3 adapters](../lib/subscription/account-deletion-engine-adapters.server.ts)、[僅限可丟棄 DB 的 SQL 草稿](subscription/drafts/ACCOUNT_DELETION_ENGINE_2026_11_02.sql)、[真實 PostgreSQL／GoTrue 整合工具](../scripts/verify-account-deletion-engine.ts)與[隔離／fence 測試](../tests/account-deletion-engine.test.ts)，沿用[既有 saga](../lib/subscription/account-deletion-saga.server.ts)並傳遞同一租約、支援物件分批續跑。沒有產品 worker、正式 route／環境啟用、付款或定價變更。S3 為 HTTP 協定替身，不等於真實 R2；實際部署 schema、帳務 subject／保留遷移、孤兒照片及完整 fence 仍須補齊，release-ready 保持 false。

2026-11-01 帳號刪除第二批（真實本機整合完成，未發布）：[同一計畫的第二批結果](subscription/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.md#第二批真實本機-supabase-整合2026-11-01)。新增[精確 local target／fixture guard](../scripts/lib/account-deletion-local-supabase.ts)、[真實匯出 API 的 loopback server](../scripts/serve-account-deletion-supabase.ts)、[真實登入 UI](../scripts/account-deletion-workflow/supabase-browser.tsx)、[16 項分階段整合檢查](../scripts/verify-account-deletion-supabase.ts)，更新[工具型別設定](../tsconfig.account-deletion-workflow.json)。真實 Auth／PostgREST／私人表、DB／API 重啟、stale AMR refresh／同帳號另一 session、跨 actor 與 grant 拒絕、手機操作均通過；資料保留 proof 後已銷毀獨立合成環境並移除 private keys。產品 runtime、SQL 草案、正式旗標、方案／價格／付款不變，AD4／整體刪除仍未完成；不再把真實整合列為未做。

2026-11-01 帳號刪除第一批（本機／隔離，未發布）：[影響、安全評估與驗收](subscription/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.md)。沿用 AD2／AD3A 申請及查詢，新增[確認](../app/api/account-deletion/confirm/route.ts)／[撤回](../app/api/account-deletion/cancel/route.ts)、[session-bound 重新驗證與 loopback gate](../lib/subscription/account-deletion-request-workflow.server.ts)、[共用 client](../lib/subscription/account-deletion-client.ts)、[裝置待送判讀](../lib/subscription/account-deletion-experience.ts)、[UI gate](../lib/subscription/account-deletion-workflow-gate.ts)、[手機面板](../components/settings/AccountDeletionPanel.tsx)及[設定頁](../app/settings/account/deletion/page.tsx)。[SQL 草案](subscription/drafts/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.sql)預設 ROLLBACK、未套用雲端；[隔離 PostgreSQL 競爭驗證](../scripts/verify-account-deletion-request-workflow.mjs)、[同元件 loopback 操作環境](../scripts/serve-account-deletion-workflow.ts)、[瀏覽器入口](../scripts/account-deletion-workflow/browser.tsx)、[路由／client／preflight 測試](../tests/account-deletion-request-workflow.test.ts)、[合成 fixture](../tests/fixtures/account-deletion-workflow-fixture.ts)、[工具型別設定](../tsconfig.account-deletion-workflow.json)與 manifest 同步新增。AD4 掃描不因檔案存在而解除正式阻擋；預設旗標關閉，拒絕遠端 Supabase／部署環境，沒有 worker、R2／Auth／營運資料刪除、正式付款或正式啟用。

2026-11-01 正式版發布整理（已發布與最小線上確認）：[入口盤點與驗收去重](FORMAL_RELEASE_CLEANUP_2026_11_01.md)、[測試資料 ID 清冊](TEST_DATA_INVENTORY_2026_11_01.md)。`426e485`／Production `dpl_2EYbpTJkfmpKqzGw2ih712RQsrEH` Ready、主要 health 同版；研究實驗室網址含子路徑正式 404，設定／市集 HTML shell 200。本批結案。僅研究實驗室沿用既有 `TEST_TOOLS_ENABLED` 正式／測試版本界線；訂閱指定帳號測試開關、082 allowlist、權益、價格、付款與保留規則不變。已發布的讀取恢復／下載／重播分批成果沿用證據，不因文件殘留歷史狀態重做。

2026-11-01 完整重播批次投影（已發布）：[效能與一致性驗收](OWNER_REPLAY_PROJECTION_PERFORMANCE_2026_11_01.md)。新增[transaction 內投影快取](../lib/sync/replay-projection-batch.ts)，[owner replay](../lib/sync/owner-event-replay.ts)僅對手動收入／互動整批套用，沿用原 handler 與 50 筆原子提交；其他事件保留原路徑。[參考路徑 parity 測試](../tests/replay-projection-batch.test.ts)、[Web 隔離量測 UI](../scripts/replay-benchmark/browser.ts)、[loopback 建置器](../scripts/serve-replay-benchmark.mjs)及[工具型別設定](../tsconfig.replay-benchmark.json)新增並更新 manifest。三輪原生 IndexedDB 量測、回滾／重試、14 測試與 Web／手機靜態建置通過；程式 `9c7cba7` 已推送 main，Production `dpl_GjhvEqEYo4Rxz2RY3V3q8TMbcBAQ` Ready，主要網域 health 同版，[核心線上複驗](OWNER_REPLAY_PROJECTION_PERFORMANCE_2026_11_01.md#正式發布與線上複驗)完成。沒有新 SQL、價格、方案、付款或雲端 writer，不改免費→付費 payload 恢復及 pending 保留。

2026-11-01 大量歷史首載修正已發布：程式 `71db0e3` 已推送 main，Production `dpl_Ennx12181gWMAfzchNGkX5sqTjHq` Ready，主要網域 health 同版；[正式發布與慢網路複驗](FIRST_LOGIN_LARGE_HISTORY_PERFORMANCE_2026_11_01.md#正式發布)通過乾淨登入、金額／筆數、明細返回及手機畫面。沒有新 SQL、價格、付款或權益變更。後續完整重播效能為另一批；下段未發布為先前本機狀態。

2026-11-01 大量歷史首載優化（本機，未提交／發布）：[量測與驗收](FIRST_LOGIN_LARGE_HISTORY_PERFORMANCE_2026_11_01.md)。新增[有限併發讀取](../lib/sync/bounded-cloud-reading.ts)，[owner pull](../lib/sync/owner-pull-service.ts)沿用本人／方案 view、以本機交集保持原市集範圍，移除巨型 UUID URL 並回報已讀筆數；[ID 清單](../lib/sync/owner-market-access-service.ts)分頁、[metadata](../lib/sync/owner-market-hydration-service.ts)100 ID 分組讀取。[replay](../lib/sync/owner-event-replay.ts)按相關 ID 讀取及略過相同 synced payload；免費→付費需恢復的變動 payload 仍更新、pending 不覆寫。[handler](../lib/db/events.ts)及 [context 型別](../types/db.ts)支援成交／互動重播靜默訊息，不改帳務規則。新增[隔離測試](../tests/large-owner-pull-performance.test.ts)、[量測腳本](../scripts/benchmark-first-login-pull.ts)，同步更新 flow audit 與 manifest；沒有新 SQL、價格、權益、付款或 outbox 重送。

2026-11-01 首次登入讀取恢復已發布：程式 `8b42c1b` 已推送 main；Production `dpl_8y3Ay1gFLrmM8UAjunGp1WUeR3vi` Ready，主要網域 health 同版。[線上複驗](FIRST_LOGIN_READ_RECOVERY_2026_11_01.md#正式發布與線上複驗)完成正式部署乾淨登入、單次只讀故障自動恢復、主要網域離線重連、成交進入／返回與手機畫面。不改方案、價格、SQL、付款或自動重送；下段未發布為本機驗收時狀態。完整異常矩陣及實機仍待後續。

2026-11-01 首次登入讀取恢復（本機，尚未提交／發布）：[修正與驗收](FIRST_LOGIN_READ_RECOVERY_2026_11_01.md)。新增[本人快取準備判斷](../lib/markets/owner-cache-readiness.ts)、[財務讀取恢復](../lib/markets/financial-review-reading.ts)、[場次活動讀取](../lib/markets/market-activity-reading.ts)及 [activity hook](../hooks/useMarketActivity.ts)；[核對 hook](../hooks/useFinancialReviews.ts)等待本人資料就緒，暫時性只讀錯誤重試一次，重連／前景／session 更新後重讀，[repository](../lib/markets/financial-review-repository.ts)阻止舊讀取覆蓋快取。[單場](../components/markets/MarketDetailScreen.tsx)觀察雲端重播並避免未完成歷史顯示已確認零筆。新增[恢復測試](../tests/first-login-read-recovery.test.ts)、[活動觀察測試](../tests/market-activity-live-reading.test.ts)及 manifest。沿用本人／付費 gate 與平台 ports；不改權益、價格、SQL、付款、草稿保存或 outbox 重送。

2026-11-01 草稿保護發布收尾：正式重新登入、原帳號私人草稿恢復及專用測試草稿清理皆已確認，成本還原 0／收入 50／成交 1／淨利 -50；原有待送照片未強制捨棄。此輪僅補提交[完整發布驗收](FINANCIAL_DRAFT_LIFECYCLE_2026_10_31.md#2026-11-01-收尾)與進度導航，不改執行碼／方案／SQL／付款。

2026-10-31 草稿保護已發布並完成核心複驗：程式 `bd9acca` 已推送 main，Production `dpl_4GUCMCyfvSo5TRn7ny6xpZki6gnx` Ready，主要網域 health 同版。[發布與驗收狀態](FINANCIAL_DRAFT_LIFECYCLE_2026_10_31.md#發布執行)包含真實草稿重開、衝突比較／明確保存、正式 alias 的 A→B→A、手機畫面與照片 guard；主要網域 3 筆未送照片保留，測試成本還原 0。初次載入自動恢復、完整歷史監控及實機仍有範圍限制，沒有把未取到日誌當作零錯誤。下方「尚未提交／發布」為歷史狀態。無新 SQL、旗標、價格或付款變更。

2026-10-31 財務核對草稿生命週期（本機實作）：[規則與驗收](FINANCIAL_DRAFT_LIFECYCLE_2026_10_31.md)。新增[私人草稿模型](../lib/markets/financial-review-drafts.ts)、[編輯 session](../lib/markets/financial-review-draft-session.ts)，[repository](../lib/markets/financial-review-repository.ts)加入 owner 隔離、本機比較交換及來源重讀；[表單](../components/markets/FinancialReviewPanel.tsx)提供繼續／捨棄／明確衝突確認。[schema 12](../lib/db/index.ts)新增裝置私人草稿，auth cache reset 保留、舊 scope 失效，明確 clearAllData 移除。[生命週期回歸](../tests/financial-review-drafts.test.ts)、[渲染存取邊界](../tests/financial-review-draft-access.test.tsx)與 manifest 同步更新。不延長權益，不改方案、價格、付款、094 SQL 或雲端自動同步；本輪尚未提交／發布，不能把本機草稿保存視為已正式啟用訂閱。

本輪收尾補充：[scope 通知](../lib/markets/financial-review-scope.ts)與[讀取 hook](../hooks/useFinancialReviews.ts)重建失效 repository、隔離舊請求；[帳號頁](../components/settings/AccountSyncPanel.tsx)說明草稿留在原裝置、不隨登出自動送出。[auth reset](../lib/db/clear-user-data.ts)補齊據點／固定安排快取清理，避免 A→B→A 重播 `venue_created` 撞 ID；私人財務草稿仍保留，既有 pending／照片 guard 不變。真實重開、雙 origin 衝突、帳號切回與修正後同步通過；真正到期為隔離時鐘證據、實機仍待驗，詳見上方驗收紀錄。

舊分頁補齊：[功能權益提示](../components/subscription/SubscriptionFeatureNotice.tsx)在 unavailable 時提供既有登入視窗入口，原帳號可重新驗證，不必先登出或丟棄待送照片；不繞過方案／資料 gate。

2026-10-31 線上方案時間差修正：[正式驗收與異常紀錄](FINANCIAL_PRODUCTION_RELEASE_2026_10_31.md)。`f126e99` 成本核對及 `efd6a67` 時鐘差修正已正式 Ready；線上重現伺服器核發比裝置回應時間快約 30–65 ms 而被判 unavailable。[共用 freshness](../lib/subscription/subscription-capabilities.ts)只對核發時間增加最多 5 秒容差，[模型回歸](../tests/subscription-feature-gates.test.ts)及 [API client 回歸](../tests/subscription-account-capability-api.test.ts)保留到期／刷新期限／過量未來時間拒絕。正式單場、分析、報告返回、三尺寸報告及 PDF 實際下載／渲染通過；同一斷線重連案例的草稿仍保留，沒有自動重送。真正到期／帳號切換／程序重開的草稿生命週期與多裝置完整矩陣仍待驗。方案、價格、資料範圍、正式付款、離線期限與 DB gate 不變。

2026-10-31 正式成本核對發布執行中：[發布設定與線上複驗追蹤](FINANCIAL_PRODUCTION_RELEASE_2026_10_31.md)。使用者授權提交、發布及正式啟用；Vercel Production 已設定 `NEXT_PUBLIC_FINANCIAL_REVIEWS_ENABLED=true`，需新建置及線上驗證後才算啟用完成。094 資料庫與 owner／付費規則不變，不含正式付款。下方尚未提交／正式旗標未改為先前驗收時的歷史狀態。

2026-10-31 財務真實複驗（最新）：[操作紀錄與限制](FINANCIAL_CROSS_PAGE_ACCEPTANCE_2026_10_31.md)，本機 094 保存／更正／撤回／重開與四頁返回、三尺寸、PDF 下載已驗；補上[每日日卡可信條件](../lib/analytics/financial-record-quality.ts)、[日卡傳入確認](../components/markets/DailyRevenueStats.tsx)及[渲染測試](../tests/daily-revenue-financial-quality.test.tsx)。員工仍隱藏利潤，不改價格／方案／權益。正式版核對表單尚未啟用，本批尚未提交／發布。下段瀏覽器停用是前批歷史狀態。

2026-10-31 財務跨頁收尾：[修正與驗證](POST_WEB_READINESS_PROGRESS_2026_10_31.md)、[共用判讀](../lib/analytics/market-financial-reading.ts)、[老闆批次讀取 hook](../hooks/useMarketFinancialReadings.ts)、[回歸](../tests/market-financial-reading.test.ts)。094 overlay 延伸到列表及分析，保留免費／員工讀取限制；未改方案價格、權益、正式付款或旗標。未知成本／矛盾舊費用不再產生確定淨利，真實 RPC 權限再驗通過；瀏覽器被 Work 設定停用，畫面與正式啟用仍待複驗。本批未提交／發布。

2026-10-29 報告批次 2 雲端接通（最新）：使用者確認 094 完成；[真實保存／撤回／重開與 PDF 複驗](SETTLEMENT_REPORT_FINANCIAL_REVIEWS_2026_10_29.md)已完成核心案例，僅 `.env.local` 啟用，Vercel／正式版仍未啟用。新增[真實 RPC 驗證腳本](../scripts/verify-financial-reviews-live.mjs)，只用暫時環境變數傳入測試登入、不含密鑰、不改角色；老闆回讀成功，員工 read／save 及匿名呼叫拒絕。新增[每日零收入分類 helper](../lib/ui/daily-revenue-totals.ts)及[測試](../tests/daily-revenue-totals.test.ts)，[types](../types/db.ts)增加只供可信 overlay 使用的零收入標記；每日表現不再把已確認零收入顯示為無紀錄。不改 Free／Light／Advanced 分界、價格或付款；下方「094 尚未套用／旗標關閉」為啟用前歷史狀態。自動 PDF 預覽受工具安全政策阻擋，未當作通過。

2026-10-29 報告批次 2（最新狀態）：[成本核對與明確零值](SETTLEMENT_REPORT_FINANCIAL_REVIEWS_2026_10_29.md)。[094](../supabase/migrations/094_add_owner_financial_reviews.sql)與[唯讀驗證](../supabase/verification/094_owner_financial_reviews_readiness.sql)新增付費老闆專用保存／讀取 RPC；[domain](../lib/markets/financial-reviews.ts)、[repository](../lib/markets/financial-review-repository.ts)、[scope](../lib/markets/financial-review-scope.ts)、[Supabase adapter](../lib/supabase/financial-reviews.ts)、[hook](../hooks/useFinancialReviews.ts)、[表單](../components/markets/FinancialReviewPanel.tsx)串接既有單場與報告。新增 owner 讀取快取，帳號重設會清除；[單元測試](../tests/financial-reviews.test.ts)、[隔離 SQL 腳本](../scripts/verify-financial-reviews-sql.mjs)及 manifest 同步更新。新旗標見 [.env.example](../.env.example)：預設關閉，094 尚未套用雲端，尚未真實保存驗收或發布；不改方案、價格、角色或付款。取代下方首批「尚無 writer／SQL」的目前狀態描述。

2026-10-29 報告第二輪首批：[進度與保存待辦](SETTLEMENT_REPORT_IMPLEMENTATION_PROGRESS_2026_10_29.md)、[實作計畫](SETTLEMENT_REPORT_IMPLEMENTATION_PLAN_2026_10_29.md)。新增[財務資料判讀契約](../lib/analytics/financial-record-quality.ts)與[來源比對測試](../tests/financial-record-quality.test.ts)；[reading](../lib/reporting/settlement-report-reading.ts)加入來源相符的零值確認接收契約、已確認場次小計、商品明細涵蓋及 action/status/method 分組。[Reader](../components/reports/settlement/SettlementReportReader.tsx)與 PDF 同步呈現範圍；[單場限制提示](../components/markets/MarketFinancialRecordNotice.tsx)只在付費老闆工作區按 owner 範圍讀取；導航及每日表現支援報告指定日期。零值確認尚未串接正式 Screen／writer／SQL，不能把模型測試當作雲端已啟用。本輪不改價格、方案、角色、付費存取或正式付款。

2026-10-29 報告判讀改善（最新）：[規格與驗收](SETTLEMENT_REPORT_FACTS_AND_UX_2026_10_29.md)。[共用 reading 模型](../lib/reporting/settlement-report-reading.ts)新增活動日期分攤、分項可信條件、缺漏／零值分類與同長期間比較；[舊模型契約](../lib/reporting/settlement-report.ts)附加 reading。正式[Screen](../components/reports/settlement/SettlementReportScreen.tsx)使用新 reading，[Reader](../components/reports/settlement/SettlementReportReader.tsx)精簡首屏與具體補紀錄入口。[預覽契約](../lib/reporting/settlement-report-preview.ts)、[PDF view model](../lib/reporting/settlement-report-pdf-view-model.ts)、[PDF 模板](../components/reports/settlement/SettlementReportPdfDocument.tsx)對 reading 使用相同口徑並移除固定分數／再參加評級。[安全返回](../lib/reporting/settlement-report-navigation.ts)保存期間、排序、展開筆數及來源項目；[場次詳情](../components/markets/MarketDetailScreen.tsx)新增 costs／performance 指定分頁入口。[reading 回歸](../tests/settlement-report-reading.test.ts)、[閱讀回歸](../tests/settlement-report-reader.test.tsx)、[導航](../tests/settlement-report-navigation.test.ts)及 manifest 同步更新。僅本機實作，未更改方案價格、角色／訂閱權益、writer、正式付款或資料庫啟用狀態；下方第一輪畫面行為已由本段取代。

2026-10-29 報告閱讀介面：[網頁閱讀優先紀錄](SETTLEMENT_WEB_READER_2026_10_29.md)。[分析入口](../app/analytics/page.tsx)改為「查看完整報告」；[路由](../app/reports/settlement/page.tsx)以 Suspense 掛載[Screen](../components/reports/settlement/SettlementReportScreen.tsx)，原 owner／高階 gate、資料 scope 與 PDF view model 移至 Screen；[Reader](../components/reports/settlement/SettlementReportReader.tsx)負責手機卡片／桌面表格、品質說明與頁尾選用 PDF。更新[方案說明](../lib/subscription/subscription-presentation.ts)，不改權益、價格或付款啟用狀態。新增[導航／日期](../lib/reporting/settlement-report-navigation.ts)；返回原期間報告頂端，章節索引使用一般頁內連結，不新增平台存取。[場次返回](../components/markets/MarketReturnLink.tsx)、[商品返回](../components/products/ProductDetailScreen.tsx)保留期間。[閱讀測試](../tests/settlement-report-reader.test.tsx)與[導航測試](../tests/settlement-report-navigation.test.ts)已加入 manifest；既有 preview／訂閱／PDF／品牌／角色檢查改讀搬移後 Screen。此為本機實作，正式發布另行記錄。

2026-10-29 指定測試基準更新：使用者要求 `123@123` 固定為高階帳號，以利後續測試。已經由伺服器管理 API 將 canonical account 指派為 `team/admin/none/active`，`entitlement_ends_at=NULL`，並清除四小時覆寫；正式站能力 API 已確認高階能力開啟。未扣款、未開正式付款、未恢復或改動任何員工。未來暫切 Free／Light 後「還原原方案」應回高階，不能再假設此帳號原方案是免費。[等效管理 SQL 參考](../supabase/repairs/set_123_test_account_advanced.sql)保留指定帳號與來源檢查；本次實際使用管理 API，不需要使用者再執行 SQL。下方還原免費版的紀錄為本次指派前的歷史驗收。

2026-10-29 最新：[到期／降級／保留實作與發布](SUBSCRIPTION_RETENTION_IMPLEMENTATION_2026_10_29.md)。使用者同意直接套用所有帳號；[091](../supabase/migrations/091_owner_product_event_visibility.sql)及[091驗證](../supabase/verification/091_owner_product_event_visibility_readiness.sql)、[092](../supabase/migrations/092_subscription_retained_data_reads.sql)與[readiness](../supabase/verification/092_subscription_retained_data_readiness.sql)均已雲端生效。相容前端 `5452e08` production Ready 後已執行[全體啟用](../supabase/repairs/092_activate_all_subscription_data_guards.sql)，讀寫皆 true；Free／Light／Team、照片保留及三角色讀取複驗通過，測試覆寫已關閉、員工還原 operator 並依原方案暫停。下方 pilot-only 與部署待確認均為歷史狀態；正式付款仍未啟用。

- 共用讀取／scope：[read-access](../lib/subscription/read-access.ts)、[owner pull](../lib/sync/owner-pull-service.ts)、[重播](../lib/sync/owner-event-replay.ts)、[市場範圍](../lib/sync/owner-market-access-service.ts)、[補齊](../lib/sync/owner-market-hydration-service.ts)、[計數](../lib/sync/sync-count-service.ts)、[付費 pending 暫停](../lib/sync/sync-push-service.ts)。不刪資料、不重複投影。
- 照片：[server授權](../lib/products/product-cover-photo-server.ts)、[metadata](../app/api/product-cover-photo/metadata/route.ts)、[image](../app/api/product-cover-photo/image/route.ts)。Free 拒絕讀取，錯誤不當空照片。
- 補強：[capability](../app/api/product-cover-photo/capability/route.ts)與上述照片 API 將權益服務不可用回 503，維持 UI-11 的保留／重試語意。[093現金同筆重試入口](../supabase/migrations/093_guard_cash_save_retained_reads.sql)、[093唯讀驗證](../supabase/verification/093_cash_save_retention_readiness.sql)、[實際cash save fixture](../tests/fixtures/cash-save-retention-deployed-2026-10-29.json)已核對；093 雲端生效，合併隔離案例為 24 項。091–093 均無須使用者再手動執行。
- 畫面：[方案模型](../lib/subscription/subscription-center-view.ts)、[方案摘要](../components/subscription/SubscriptionAccountSummary.tsx)、[入口](../lib/subscription/surface-access.ts)。[原帳號登入提示](../components/auth/AuthCacheBlockedDialog.tsx)、[事件helper](../lib/auth/auth-cache-blocked-events.ts)保留 pending。
- 驗證：[SQL案例](../scripts/subscription-retention-sql-cases.mjs)、[SQLrunner](../scripts/verify-event-write-authorization-sql.mjs)、[部署唯讀盤點](../supabase/verification/subscription_retention_deployed_readonly.sql)、[實際結構fixture](../tests/fixtures/subscription-retention-deployed-2026-10-29.json)、[retention回歸](../tests/subscription-retained-data.test.ts)、[登入恢復](../tests/auth-cache-resume.test.ts)、[cold login](../tests/cold-login-pull.test.ts)、[owner replay](../tests/owner-event-replay.test.ts)、[照片](../tests/product-cover-photo.test.ts)、[完整性](../tests/subscription-completeness.test.ts)、[sync audit](../tests/sync-flow-audit.test.ts)、[固定安排](../tests/recurring-operations-sync-contract.test.ts)、[cache guard](../tests/auth-cache-destruction-guard.test.ts)。未啟用正式付款。

2026-10-28晚間續作（最新）：[員工／Web／PDF修補驗收](STAFF_WEB_PDF_ACCEPTANCE_2026_10_28.md)記錄本輪真實三角色正向／拒絕測試與還原。測試owner覆寫已關閉，指定員工operator／L2依原方案暫停；沒有改價格、正式付款或pilot範圍。本輪新前端依使用者要求收錄於本次提交；部署及發布後複驗仍待確認。

- 既有manager基本欄位真正持久化：[089描述](../supabase/migrations/089_project_product_description.sql)、[089唯讀驗證](../supabase/verification/089_product_description_readiness.sql)、[090狀態](../supabase/migrations/090_project_product_active_state.sql)、[090唯讀驗證](../supabase/verification/090_product_active_state_readiness.sql)。均雲端生效，ACL／084／086維持，不回填。實際[修補前](../tests/fixtures/product-description-deployed-2026-10-28.json)、[089後](../tests/fixtures/product-description-patched-deployed-2026-10-28.json)、[090後](../tests/fixtures/product-description-active-patched-deployed-2026-10-28.json)快照由[隔離SQL](../scripts/verify-event-write-authorization-sql.mjs)核對。此為既定權限保存修補，不新增manager權益。
- 員工可見銷量與快照：[staff pull](../lib/sync/staff-pull-service.ts)、[cache writer](../lib/sync/local-cache-writer.ts)、[可見場次銷量重建](../lib/sync/staff-product-sales.ts)、[事件處理](../lib/db/events.ts)、[本機投影型別](../types/db.ts)、[脫敏](../lib/permissions/PermissionGate.ts)、[快照回歸](../tests/staff-product-snapshot.test.ts)。stock沿雲端snapshot，歷史事件不重扣；pending本機事件保留。商品呈現見[列表](../app/products/page.tsx)、[卡片](../components/products/ProductCard.tsx)、[詳情](../components/products/ProductDetailScreen.tsx)及[viewer紀錄](../components/markets/StaffMarketDetailView.tsx)。未宣稱所有原始view／RPC讀取揭露已驗完。
- 降級後外品牌快取入口：[歸屬判斷](../lib/permissions/cached-entity-access.ts)、[保留提示](../components/common/RetainedDataAccessNotice.tsx)、[場次詳情](../components/markets/MarketDetailScreen.tsx)、[商品詳情](../components/products/ProductDetailScreen.tsx)、[隔離回歸](../tests/cached-entity-access.test.ts)。無active staff後可回自己的工作區，但外品牌快取不得變成自己的老闆UI；不刪資料或照片。
- manager表單刷新／部分更新：[EditProductForm](../components/products/EditProductForm.tsx)、[表單patch](../lib/products/product-form.ts)、[並行欄位回歸](../tests/product-edit-patch.test.ts)。實際拒絕探針：[指定測試員工script](../scripts/verify-staff-live-denials.mjs)，只用普通JWT及process密碼，不保存憑證。
- 高階PDF輸出沿既有權限：[檔案操作controller](../lib/reporting/pdf-file-actions.ts)、[文字排版helper](../lib/reporting/pdf-display-text.ts)、[預覽／儲存](../components/reports/settlement/SettlementReportPdfPreviewButton.tsx)、[五頁模板](../components/reports/settlement/SettlementReportPdfDocument.tsx)、[檔案測試](../tests/pdf-file-actions.test.ts)、[長資料視覺回歸](../tests/settlement-report-pdf-browser-visual.test.ts)。未開staff報告、無新價格／付款／公開下載端點。照片未啟用提示見[manual upload client](../lib/sales/photo-evidence-manual-upload-client.ts)，只改文案、不改旗標或writer。

2026-10-28 提交整理：使用者要求 commit／push，本次收錄下列 086–088、相關
提示、測試及驗收紀錄；歷史段落的「未提交」由本段及 Git 歷程取代。資料庫
修補已生效；前端自動部署結果與發布後複驗需另外確認。

2026-10-28 收尾狀態以[三項任務進度與剩餘範圍](ACCEPTANCE_AND_LIFECYCLE_PROGRESS_2026_10_28.md)為準。降級決策與局部畫面：[新三方案到期／降級／保留](subscription/THREE_TIER_LIFECYCLE_RETENTION_2026_10_28.md)、[方案中心共用 view model](../lib/subscription/subscription-center-view.ts)、[方案中心畫面](../components/subscription/SubscriptionAccountSummary.tsx)、[呈現測試](../tests/subscription-center-view.test.ts)。免費版保留舊銷售／收入／商品但限制查閱；高階降級保留員工，重升由老闆逐一恢復。可信停用／寬限／排定停止續訂的說明已本機實作，完整 API／快取限制及商店來源接線尚未完成。

2026-10-28 員工重新啟用保護：[088 修補與邊界](subscription/STAFF_PLAN_REACTIVATION_FIX_2026_10_28.md)、[遷移](../supabase/migrations/088_guard_staff_plan_reactivation.sql)、[唯讀檢查](../supabase/verification/088_staff_plan_reactivation_readiness.sql)、[隔離 script](../scripts/verify-staff-plan-reactivation-sql.mjs)、[修補前實際函式](../tests/fixtures/staff-lifecycle-deployed-2026-10-28.json)、[修補後實際函式](../tests/fixtures/staff-lifecycle-patched-deployed-2026-10-28.json)。088 已雲端生效，13 組含實際部署函式的隔離測試通過，兩來源失效／失效後續期需明確恢復，連續有效 Team 續期不誤停用。沒有批次回填、付款、排程或擴大權益；純時間到期仍由動態 gate 先拒絕，下一次來源寫入才持久化暫停，商店事件及真實多連線競態另驗。指定員工已按使用者授權修正為 canonical operator／L2，三角色操作後還原出攤助手，測試覆寫關閉。本機檔案尚未 commit／push。

2026-10-28 事件／員工授權修補：[隔離重現與雲端驗證](EVENT_WRITE_AUTHORIZATION_FIX_2026_10_28.md)、[086事件授權](../supabase/migrations/086_enforce_event_actor_authorization.sql)、[086驗證](../supabase/verification/086_event_actor_authorization_readiness.sql)、[087角色權限一致性](../supabase/migrations/087_guard_staff_role_permission_consistency.sql)、[087驗證](../supabase/verification/087_staff_role_permission_readiness.sql)、[隔離驗證script](../scripts/verify-event-write-authorization-sql.mjs)、[雲端唯讀盤點](../supabase/verification/event_write_authorization_readonly.sql)。以實際[事件快照](../tests/fixtures/event-write-deployed-2026-10-27.json)、[helper快照](../tests/fixtures/event-write-deployed-helpers-2026-10-27.json)、[下游快照](../tests/fixtures/event-write-deployed-downstream-2026-10-28.json)重現漏洞，再以[實際部署保護函式](../tests/fixtures/event-write-patched-deployed-2026-10-28.json)重跑12組通過；086／087已雲端生效。沿既定Team角色及免費metadata邊界，沒有改價格、pilot名單、正式付款或批次回填權限。既有一筆角色矛盾保留；[提示helper](../lib/permissions/staff-role-consistency.ts)、[共用呈現](../lib/permissions/staff-access-presentation.ts)、[老闆團隊UI](../components/settings/StaffManagement.tsx)、[角色characterization](../tests/staff-role-consistency.test.ts)、[初始診斷](STAFF_ROLE_CONSISTENCY_DIAGNOSIS_2026_10_27.md)與[角色唯讀檢查](../supabase/verification/staff_role_consistency_readonly.sql)均為導航／輔助，不能將提示當成既有資料已修復。本機檔案尚未commit／push。

2026-10-27 UI-04／UI-11發布：提交`4546192`已推送`main`並由Vercel production部署READY；新商品照片讀取契約在線上啟用且既有測試封面可見，免費／輕量／高階各以合成場次核對單一攤位費與獨立保證金。詳見[部署後複驗與待辦](ONLINE_ACCEPTANCE_2026_10_27.md)。員工真實角色矩陣、PDF實際預覽／下載、舊費用衝突線上案例仍待完成；無正式訂閱付款啟用。本段取代下方關於UI-04／UI-11尚未部署的歷史描述。

2026-10-27 UI-11本機完成：[實作與驗收](UI11_PRODUCT_PHOTO_STATES_2026_10_27.md)、[共用唯讀狀態契約](../lib/products/product-cover-photo-read.ts)、[HTTP／合併／保留與表單回歸](../tests/product-cover-photo-read.test.tsx)。[image API](../app/api/product-cover-photo/image/route.ts)區分明確空白／停用／讀取錯誤；[metadata API](../app/api/product-cover-photo/metadata/route.ts)成功需ready，失敗或雲端待上傳不能當空集合；[capability](../app/api/product-cover-photo/capability/route.ts)授權後提供照片存在狀態。[client](../lib/products/product-cover-photo-client.ts)、[照片元件](../components/products/ProductCoverPhotoImage.tsx)、[編輯欄位](../components/products/ProductCoverPhotoField.tsx)及[商品清單](../app/products/page.tsx)接到重試、空殼隱藏與資料保留。未改價格／權益／上傳writer／雲端SQL／正式旗標；尚未提交部署，線上UI-11仍需發布後複驗。此段取代下方「讀取狀態契約尚待實作」的歷史狀態。

2026-10-27 已獲授權直接操作Chrome Supabase：讀到實際函式後新增[085照片權益對齊](../supabase/migrations/085_align_product_photo_entitlements.sql)、[唯讀驗證](../supabase/verification/085_product_photo_entitlement_readiness.sql)、[隔離SQL回歸](../scripts/verify-product-photo-entitlements-sql.mjs)、[實際舊函式fixture](../tests/fixtures/product-photo-deployed-legacy-2026-10-27.sql)。pilot沿082 canonical product_photo決策，非pilot沿舊旗標；Free、角色、到期與容量仍受保護。085／084及各自唯讀驗證均已雲端成功。照片保留payload重試上傳並重載成功，實際成交庫存3→2；詳細[驗收紀錄](ONLINE_ACCEPTANCE_2026_10_27.md)。084新增[部署投影fixture](../tests/fixtures/product-stock-deployed-2026-10-27.sql)，既有隔離script以--deployed核對相同欄位修正；實際扣庫存另由線上流程驗證。這段取代下方「尚待函式定義／084執行」的歷史狀態；未開正式付款／全體權益限制，UI-11讀取狀態契約仍待實作。


2026-10-27 083已由使用者確認通過，OpenAPI亦核對照片版本bigint與相容參數。線上輕量版重傳仍403／paid_entitlement_required，新分級read與product_photo寫入preflight卻允許，舊照片權益列不存在；尚待定位拒絕段落。新增[部署函式唯讀診斷](../supabase/verification/083_product_photo_deployed_functions.sql)以取得實際base內文後修正；未放寬免費／staff權限、未寫舊權益、未搬移或刪照片。詳見[線上紀錄](ONLINE_ACCEPTANCE_2026_10_27.md)。此段取代下方083「雲端待確認」的歷史狀態；084仍待使用者執行。

2026-10-27 083第二次雲端回報：`Unexpected legacy RPC shape`是先前修正檔依賴函式內文格式的檢查失敗，不能視為已套用。最新版改由PostgreSQL系統目錄重建版本參數宣告、原樣保留部署內文／語言／設定／owner；舊版缺少boolean時建立僅限service_role的相容入口，保留原bigint入口讓舊呼叫仍可用，true／null拒絕。新版[遷移檔](../supabase/migrations/083_widen_product_photo_versions.sql)與[唯讀驗證](../supabase/verification/083_product_photo_version_readiness.sql)須重新整份讀取執行；12項隔離測試通過，雲端仍待確認。這段取代下方前一版083的格式相容描述，未更換R2或放寬用戶端權限。

2026-10-27 照片基礎設施成本：[Supabase Storage／Cloudflare R2比較與決策](storage/PHOTO_STORAGE_COST_BENEFIT_2026_10_27.md)、[唯讀用量摘要](storage/PHOTO_STORAGE_USAGE_SNAPSHOT_2026_10_27.json)。核對官方價目、已付Pro／新增Pro增額情境及現有Vercel代理路徑後，保留R2；沒有證據支持立即遷移。尚未取得正式帳單與production桶對照，本機空桶不代表正式照片不存在。不更動方案價格、照片額度／保留、權限或讀寫路徑。

2026-10-27 UI-04決策增量：使用者確認報名費與攤位費為同一筆。新增[共用單一費用規則](../lib/markets/market-booth-fee.ts)、[舊值差異提示](../components/markets/MarketFeeConflictNotice.tsx)、[回歸測試](../tests/market-booth-fee.test.tsx)，接到免費費用卡、單場、表單、固定安排、分析與結算。只計一次、缺值回退舊別名、不同舊值保留並由owner確認；保證金獨立，不批次改歷史。沒有改方案權限／價格；本機實作尚未發佈。[線上驗收紀錄](ONLINE_ACCEPTANCE_2026_10_27.md)追蹤083／084、合成資料及待驗項目。

2026-10-27 線上驗收補漏：合成商品從不限庫存改有限庫存，事件已保存false但雲端投影仍true，造成扣庫存條件不生效。新增 [084 投影修正](../supabase/migrations/084_project_product_stock_mode.sql)、[唯讀驗證](../supabase/verification/084_product_stock_mode_readiness.sql)、[隔離回歸](../scripts/verify-product-stock-mode-sql.mjs)，只補既有product_updated函式遺漏欄位，保留其他分支／ACL／角色規則，不批次重放或改舊商品。雲端待使用者執行；不是新增訂閱能力。

2026-10-27 線上商品照片驗收：輕量版 capability 允許，但合成測試封面上傳回應 403／claim_failed。唯讀雲端 OpenAPI 確認 version／pending_version 及 claim／finalize 的版本參數仍為 integer，客戶端傳毫秒版本；隔離 PostgreSQL 已重現溢位。新增 [083 版本欄位修正](../supabase/migrations/083_widen_product_photo_versions.sql)、[唯讀結構／權限驗證](../supabase/verification/083_product_photo_version_readiness.sql)、[隔離回歸](../scripts/verify-product-photo-version-sql.mjs)。初版套用因雲端舊RPC缺少boolean參數而中止；新版支援含／不含該參數的部署簽章，舊版相容參數僅接受false（true／null拒絕），6項隔離回歸通過。修正擴大版本數值範圍並沿用部署函式內容；不更動方案、席次、RLS、儲存額度或既有照片。雲端待使用者執行，尚未宣稱照片上傳通過。

2026-10-27 三方案手機 UI 分批實作：[修正與複驗紀錄](subscription/THREE_TIER_MOBILE_UI_FIXES_2026_10_27.md)、[原巡檢逐項進度（第 8 節）](subscription/THREE_TIER_MOBILE_UI_REVIEW_2026_10_26.md)。新增[共用呈現規則](../lib/subscription/ui-presentation.ts)、[呈現回歸測試](../tests/subscription-mobile-ui.test.tsx)；免費報名／費用／期限整合、空殼／收攤卡、跨方案頁名與返回、5／6 分頁、方案卡／PDF 文案、載入狀態及照片數量語意已接線。商品照片既有資料的空／失敗契約仍待處理；費用不搬值，沒有改價格／權益／資料保留或正式購買。

2026-10-26 三方案手機實際巡檢：[UI 問題與修正方案](subscription/THREE_TIER_MOBILE_UI_REVIEW_2026_10_26.md)。使用者授權本輪內建瀏覽器操作，實際切換免費／輕量／高階並回免費，主要尺寸 390×844；16 類路由與 30 張截圖。確認免費收攤樣式、繳費卡、未開放空殼，以及跨方案標題／返回／方案卡／報告文字等 19 項問題，提出分三批的具體方案。這次僅操作、閱讀來源及產生報告，沒有修改程式／價格／權益、儲存營運資料、送邀請、實際上傳或全帳號啟用；不能冒充完整保存驗收。

2026-10-26 完整性盤點與補漏：[26 個頁面來源／15 個 API 來源矩陣與待辦](subscription/SUBSCRIPTION_COMPLETENESS_AUDIT_2026_10_26.md)。新增 [共用直接網址規則](../lib/subscription/surface-access.ts)、[權益期限排程](../lib/subscription/capability-refresh.ts)、[完整性測試](../tests/subscription-completeness.test.ts)；更新 [商品照片 owner／role／Team 判斷](../lib/products/product-cover-photo-server.ts)、五條商品照片 API 的 capability／CORS／認證故障回覆、client API base、capability hook／provider、surface gate、單場隱藏照片讀取及 [實際接線登記](../lib/subscription/subscription-capability-implementation.ts)。商品／成交照片記為 pilot_verified_global_pending，保留正式上線 blocker。本輪不需要新 SQL，未改價格、額度、降級保留或正式付款；整批人工驗收仍暫緩。

2026-10-26 雲端寫入試行：[範圍與啟用手冊](subscription/SUBSCRIPTION_WRITE_GUARD_PILOT_2026_10_26.md)。新增 [082 遷移](../supabase/migrations/082_add_subscription_write_guards.sql)、[指定測試帳號啟用](../supabase/repairs/082_enable_test_account_write_guards.sql)、[唯讀驗證](../supabase/verification/082_subscription_write_guard_readiness.sql)、[隔離 SQL 測試](../scripts/verify-subscription-write-guards-sql.mjs)、[共用寫入決策契約](../lib/subscription/write-access.ts)、[伺服器 RPC 與限時切換](../lib/subscription/write-access.server.ts) 及 [服務測試](../tests/subscription-write-access.test.ts)。既有 capability storage 匯出安全設定解析器；設定切換 route／client／panel 支援雲端模式，商品／成交照片上傳增加前後權益檢查與同次補償測試。新環境開關預設關閉；082 已由使用者回報執行，真實 RPC 確認指定帳號就緒，本機雲端模式已啟用，三方案共 18 項 authenticated preflight 與 capability API 一致。測試後已關閉覆寫並還原原有方案，只指定測試帳號試行，非全帳號啟用，不含付款、容量或動態價格後台。

2026-10-26 三方案呈現實作：[接線與邊界紀錄](subscription/THREE_TIER_EXPERIENCE_IMPLEMENTATION_2026_10_26.md)。沿既有 `free`／`pro`／`team` 契約映射免費／輕量／高階；新增 [呈現規則與失效通知](../lib/subscription/experience.ts)、[基本月摘要模型](../lib/subscription/basic-business-summary.ts)、[共用 provider](../components/subscription/SubscriptionExperienceProvider.tsx)、[路由呈現 gate](../components/subscription/SubscriptionSurfaceGate.tsx)、[方案提示](../components/subscription/SubscriptionFeatureNotice.tsx)、[輕量紀錄](../components/subscription/BasicBusinessSummary.tsx)、[免費單場](../components/markets/FreeMarketWorkspace.tsx) 及兩份同名 domain 測試。設定沿 [既有模擬工具](../components/subscription/SubscriptionSimulationPanel.tsx) 提供只限本機切換；新分級同步到導覽、單場、清單、表單、分析／結算讀取與方案文案。修正 client 拒絕 Free 模擬的解析問題，普通 admin-Free 仍拒絕。沒有改 SQL／RLS、雲端權益／角色或正式購買／取消。完整付費寫入 enforcement、動態價格後台與線上測試切換仍未完成；整批人工驗收保持暫緩。

2026-10-26 最新三方案決策：[功能與價格基線](subscription/SUBSCRIPTION_FEATURE_TIERS_2026_10_26.md) 為功能規劃入口。免費提供市集安排／報名／繳費與個人準備／心得；輕量提供完整單人銷售記錄與基本成果（59／月、588／年）；高階提供深入分析／比較、完整 PDF、成交照片與協作（249／月、2490／年，owner＋3 位成員）。使用者再次確認後台必須可設定訂閱價格：兩個付費方案的月／年價格各自按版本、平台與生效時間管理，保留優惠、舊客調價及通知歷程，詳見規格第 4 節及[後台需求](subscription/SUBSCRIPTION_PRICING_PROMOTION_ADMIN_REQUIREMENTS_2026_10_23.md)。圖片等額度、席次擴充及舊 plan 對照仍待定。本次只更新文件，未改 runtime／雲端／商店／帳號，價格後台尚未實作，測試驗收暫緩。

2026-10-26 呈現增量核對：[手機操作優化](MOBILE_OPERATION_OPTIMIZATION_2026_10_26.md)。[呈現 helper](../lib/subscription/subscription-presentation.ts) 將預覽提示改為使用者用語；[方案卡](../components/subscription/PricingCard.tsx) 移除說明固定高度；[升級提示](../components/subscription/UpgradePrompt.tsx) 改善按鈕觸控尺寸；[方案頁](../app/subscription/page.tsx) 標頭改「可用範圍」；[結算頁](../app/reports/settlement/page.tsx) 以具名說明收納 PDF 長文。僅呈現與可及性調整，Free／Pro／Team、價格、席次、角色、購買／恢復、續訂揭露與啟用 gate 均未變；新兩級商業規格仍未取代 runtime。文案清單及相關呈現／結算權限測試同步核對，本機未部署。

> 依使用者要求採 `.mk` 副檔名，內容使用 Markdown 格式；這是文件，不是 Makefile 或建置腳本。

建立：2026-10-20。最後增量核對：2026-10-25（081 已確認、本機心得轉待辦與固定安排縣市已啟用並完成 owner 雲端驗收；縣市分析仍沿用進階分析 gate，未改價格／方案）。調價政策仍以 2026-10-23 確認的月繳提前 60 天通知、年繳續訂調整及限期保價為準。初次程式盤點基準：`62422e7`。

用途：未來修改訂閱方案時，先找到規格、程式、資料庫、畫面、測試與發布紀錄，再依實際變更同步維護。這份索引提供導航，不代表服務啟用或發布驗收。

2026-10-25 提示用語導航：[App 提示與介面文字總索引](APP_UI_COPY_INDEX.md)、[訂閱／方案文案分冊](ui-copy/10-subscription.md)、[帳號／團隊／權限文案分冊](ui-copy/09-account-team.md)。逐筆記錄來源位置、用途與接線／候選狀態，供未來查找價格、資格及購買說明；本次只是來源盤點，沒有修改方案、價格、gate 或服務啟用狀態。完整產生器與動態來源限制見總索引。

2026-10-25 提示分層提案：[全功能提示規劃](APP_CONTEXTUAL_HELP_PLAN_2026_10_25.md) 第 3.10 節列出方案摘要、資格限制、購買／續訂說明的呈現邊界；決定付款必需的條件須直接可見。此為尚未實作的 UI 設計提案，沒有變更價格／續訂政策／資格、商店 gate 或現有揭露。

2026-10-25 首批提示實作：[實作與驗證](CONTEXTUAL_HELP_IMPLEMENTATION_2026_10_25.md)、[共用 ContextHelp](../components/ui/ContextHelp.tsx)、[成員管理](../components/settings/StaffManagement.tsx)、[員工角色卡](../components/staff/StaffPermissionCard.tsx)。角色的目前存取狀態／摘要仍直接可見，詳細角色規則改為具名 ⓘ；只有呈現方式改變，沒有變動角色、價格、Team 資格、購買／續訂揭露或啟用 gate。既有分析架構測試僅補齊已存在的縣市分頁預期；訂閱執行邏輯不變。

2026-10-25 UX07 文案增量：[角色／存取呈現 helper](../lib/permissions/staff-access-presentation.ts)、[六項 UIUX 測試](../tests/uiux-six-improvements.test.tsx)、[實作紀錄](UIUX_SIX_IMPROVEMENTS_IMPLEMENTATION_2026_10_25.md)。成員管理與員工權限卡區分角色規則、關係狀態與既有 Team 資格結果；helper 僅呈現，不能作為授權來源。沒有改方案、價格、席次或 gate；新檔為初次 305 檔盤點後的增量導航，不重算歷史數量。

2026-10-25 手機入口整理：[完整出攤流程驗收](MOBILE_MARKET_FLOW_REVIEW_2026_10_25.md) 將單場 owner 回顧的現金、心得改為選定才掛載；普通現場收款提前，成功收攤回成果回顧。沒有新增付費能力或修改價格、既有 Team／財務／照片權限；原模型、writer 與啟用旗標沿用。

2026-10-25 體驗補充：[心得與選用待辦需求](MARKET_JOURNAL_OPTIONAL_TASK_UX_2026_10_25.md) 將 02B 收進「更多操作」，改為選用「另建出攤待辦」。這是現有 owner 功能的入口與文案調整，沒有改變訂閱 gate／價格、Team 分享權限或 081 保存契約；不將整理心得待辦列為付費或上手的必要條件。

2026-10-25 owner 後續功能：[日期／心得轉待辦／固定安排分類紀錄](MARKET_FOLLOWUP_DETAILS_2026_10_24.md)、[共用規則](../lib/markets/owner-followup.ts)、[client](../lib/supabase/owner-followup.ts)、[081 SQL](../supabase/migrations/081_add_owner_followup_workflows.sql)、[測試](../tests/owner-followup.test.ts)。均沿既有 owner 角色，不新增付費能力、價格或 staff 私人心得讀權；只有明確確認的待辦文字沿原 Team 員工角色規則分享。081 已確認套用且 schema 核對，本機兩項 writer 已啟用並通過真實保存／重送／過期預覽／獨立來源還原；範例旗標仍預設關閉，正式部署及實機另驗。

2026-10-24 縣市分析增量：[切片紀錄](MARKET_REGION_ANALYTICS_BACKFILL_2026_10_24.md)、[顯示元件](../components/analytics/RegionAnalyticsPanel.tsx)、[共用分析模型](../lib/analytics/region-analytics.ts)、[分析／gate 測試](../tests/region-analytics.test.ts)。沿用既有 `analytics.advanced`，未新增付費能力。相鄰的 [縣市整理頁](../app/markets/regions/page.tsx)、[補填驗證](../lib/markets/market-region-backfill.ts)、[補填 client](../lib/supabase/market-region-backfill.ts)、[080 SQL](../supabase/migrations/080_add_owner_region_backfill.sql)、[隔離 SQL 測試](../tests/fixtures/market-region-backfill-sql.mjs) 為 owner metadata 管理，不以 Pro／Team 解鎖，也不授予財務分析權限；080 已確認套用，本機補填已啟用並通過 owner 保存／重送／衝突／獨立來源還原；範例旗標仍預設關閉。價格／功能修改時應分別檢查兩種權限。

## 1. 修改前先確認

1. 先讀 [AGENTS.md](../AGENTS.md) 與 [跨平台規範](CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md)，保留共用邏輯與平台邊界。
2. 最新功能與輕量版價格先看 [2026-10-26 分級決策](subscription/SUBSCRIPTION_FEATURE_TIERS_2026_10_26.md)；優惠、後台及調價看 [價格／活動後台需求](subscription/SUBSCRIPTION_PRICING_PROMOTION_ADMIN_REQUIREMENTS_2026_10_23.md)。新方案已沿既有 free／pro／team 對照接線，雲端限制仍僅指定帳號試行；以頁首最新紀錄為準。舊 [訂閱總規格](SUBSCRIPTION_TIER_PLAN_2026_07_24.md)、[方案功能矩陣](subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md) 及 [實作計畫](SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md) 保留作為現有接線／歷史入口。
3. 實際功能接線看 [程式狀態對照](../lib/subscription/subscription-capability-implementation.ts)、[功能 gate 登記表](subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md) 與目前呼叫端；舊 registry／audit 必須再次核對原始碼。
4. 發布狀態看 [canonical 任務](LAUNCH_EXECUTION_TASKS_2026_08_09.json) 與 [原生發布 gates](subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json)。程式檔存在、靜態引用或本機測試通過，不等於正式服務啟用。
5. 使用者已明確指定的新方案決策優先於舊草案，不因舊文件寫 planning only 就重問已授權的例行來源碼工作。涉及商業選擇、真實付費、受保護設定或不可逆資料操作時，依實際範圍處理必要人工決策。

## 2. 修改項目與主要關聯

表中是優先入口；第 6 節收錄完整來源清單及直接引用者。

| 想修改什麼 | 規格／狀態入口 | 主要程式／資料庫 | 優先驗證 |
| --- | --- | --- | --- |
| Free／Pro／Team 名稱、功能與額度 | [總規格](SUBSCRIPTION_TIER_PLAN_2026_07_24.md)、[功能矩陣](subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md) | [subscription-plans.ts](../lib/subscription/subscription-plans.ts)、[subscription-capabilities.ts](../lib/subscription/subscription-capabilities.ts)、[subscription-access.ts](../lib/subscription/subscription-access.ts) | [方案模型](../tests/subscription-plan-model.test.ts)、[功能映射](../tests/subscription-feature-gate-mapping.test.ts) |
| 月繳／年繳、價格版本、Founder 鎖價 | [價格基礎](subscription/F3A_PRICE_CATALOG_MIGRATION_RUNBOOK.md)、[商店商品拓樸](subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md) | [subscription-pricing.ts](../lib/subscription/subscription-pricing.ts)、[native-store-catalog.ts](../lib/subscription/native-store-catalog.ts)、[migration 066](../supabase/migrations/066_add_subscription_price_catalog_foundation.sql) | [價格規則](../tests/subscription-pricing.test.ts)、[價格資料庫基礎](../tests/subscription-price-catalog-foundation.test.ts) |
| 升級／降級、到期、退款與資料保留 | [帳務狀態機](subscription/BILLING_LIFECYCLE_STATE_MACHINE.md)、[降級保留](subscription/execution-pack/05_LIFECYCLE_DOWNGRADE_RETENTION.md) | [subscription-pricing.ts](../lib/subscription/subscription-pricing.ts)、[subscription-access.ts](../lib/subscription/subscription-access.ts)、[reconciliation decision](../lib/subscription/native-reconciliation-decision.ts) | [帳號權益](../tests/native-account-entitlement.test.ts)、[對帳基礎](../tests/native-reconciliation-foundation.test.ts) |
| 方案頁、目前方案、升級提示與文案 | [功能 gate 登記表](subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md)、[一致性稽核](subscription/SUBSCRIPTION_CAPABILITY_CONSISTENCY_AUDIT_2026_08_06.md) | [方案頁](../app/subscription/page.tsx)、[方案卡](../components/subscription/PricingCard.tsx)、[帳號摘要](../components/subscription/SubscriptionAccountSummary.tsx)、[升級提示](../components/subscription/UpgradePrompt.tsx)、[顯示文案](../lib/subscription/subscription-presentation.ts)、[中心 view model](../lib/subscription/subscription-center-view.ts) | [方案頁 UI](../tests/subscription-center-ui.test.ts)、[中心 view model](../tests/subscription-center-view.test.ts) |
| 帳號方案與權益查詢 | [讀取模型](subscription/SUBSCRIPTION_CAPABILITY_READ_MODEL.md) | [API](../app/api/account-capabilities/route.ts)、[hook](../hooks/useAccountCapabilities.ts)、[client](../lib/subscription/account-capability-client.ts)、[server](../lib/subscription/account-capability-server.ts)、[storage](../lib/subscription/account-capability-storage.server.ts)、[migration 063](../supabase/migrations/063_add_subscription_accounts.sql) | [API](../tests/subscription-account-capability-api.test.ts)、[billing 讀取邊界](../tests/account-capability-billing-read-contract.test.ts) |
| 分析頁的 Free 預覽／付費限制 | [功能 gate 登記表](subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md) | [分析 view model](../lib/analytics/subscription-view.ts)、[分析頁](../app/analytics/page.tsx)、[分析 hook](../hooks/useAnalyticsCache.ts)、[日期篩選](../components/analytics/DateRangeFilter.tsx) | [分析權限](../tests/analytics-subscription-access.test.ts)、[進階分析](../tests/advanced-analytics-subscription-access.test.ts) |
| 報表、PDF 與角色限制 | [PDF 規格](SETTLEMENT_REPORT_PDF_VISUAL_SPEC_2026_07_01.md)、[功能 gate 登記表](subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md) | [報表 view model](../lib/reporting/settlement-subscription-view.ts)、[報表頁](../app/reports/settlement/page.tsx) | [報表權限](../tests/settlement-report-subscription-access.test.ts)、[PDF 預覽](../tests/settlement-report-pdf-preview-button.test.ts) |
| Team 員工、manager、席次與邀請 | [Team 限制](subscription/TEAM_SUBSCRIPTION_ENFORCEMENT.md)、[權限分配](role-permission-distribution.md) | [團隊頁](../app/settings/team/page.tsx)、[團隊元件](../components/settings/StaffManagement.tsx)、[staff 存取](../lib/supabase/staff.ts)、[migration 064](../supabase/migrations/064_enforce_team_subscription.sql)、[migration 065](../supabase/migrations/065_fix_team_invitation_verification_return_type.sql) | [Team 限制](../tests/team-subscription-enforcement.test.ts)、[狀態轉換 smoke](../tests/team-subscription-transition-live-smoke.test.ts) |
| 新方案、首購優惠與可設定營運後台 | [最新需求](subscription/SUBSCRIPTION_PRICING_PROMOTION_ADMIN_REQUIREMENTS_2026_10_23.md) | 249／2490 牌價、限期優惠、活動版本、未來調價及跨店管理；模型、管理 API 與後台尚未實作 | 需求／來源與官方規則核對；不代表收費啟用 |
| 新客牌價／優惠到期價格／舊客調價批次／訂戶通知歷程 | [已確認政策第 4 節與待辦第 7.1 節](subscription/SUBSCRIPTION_PRICING_PROMOTION_ADMIN_REQUIREMENTS_2026_10_23.md#4-漲價與既有訂戶) | ADMIN-PRICE-01～06：三類價格管理分開、逐戶價格／通知、月繳至少提前 60 天通知、年繳續訂調整及限期保價；均未實作 | 驗收優惠條件不誤改、60 天邊界與商店條件、已付年度保留、限期保價及逐戶狀態 |
| 2026-10-23 訂閱制度對齊與未完成工作 | [整備清單](subscription/SUBSCRIPTION_RULES_ALIGNMENT_2026_10_23.md) | 舊 Free／Pro／Team runtime 快照，員工屬 Team；admin／billing 差異、席次候選、付費 gate 缺口與有效期防禦；新產品方向看上列需求 | [共用權益回歸](../tests/subscription-feature-gates.test.ts)；不是收費啟用證據 |
| 商品／成交照片、容量與方案交互作用 | [商品照片計畫](PRODUCT_COVER_PHOTO_EXECUTION_PLAN_2026_07_24.md)、[功能 gate 登記表](subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md) | [實際接線狀態](../lib/subscription/subscription-capability-implementation.ts)、[商品照片模型](../lib/products/product-cover-photo-model.ts)、[server](../lib/products/product-cover-photo-server.ts)、[上傳 API](../app/api/product-cover-photo/upload/route.ts)、[migration 062](../supabase/migrations/062_add_product_cover_photos.sql) | [實際接線檢查](../tests/subscription-capability-implementation.test.ts)、[功能映射](../tests/subscription-feature-gate-mapping.test.ts) |
| 原生購買、恢復與管理訂閱 | [原生執行計畫](subscription/NATIVE_SUBSCRIPTION_EXECUTION_PLAN_2026_08_06.md)、[購買前揭露](subscription/NATIVE_PURCHASE_DISCLOSURE_CONTRACT_2026_08_06.md) | [IAP port](../lib/platform/contracts/in-app-purchase.ts)、[目前不可用實作](../lib/platform/unavailable-native-purchases.ts)、[購買流程](../lib/subscription/native-purchase-workflow.ts)、[揭露判斷](../lib/subscription/native-purchase-disclosure.ts)、[操作元件](../components/subscription/NativeSubscriptionActions.tsx) | [購買流程](../tests/native-purchase-workflow.test.ts)、[揭露](../tests/native-purchase-disclosure.test.ts)、[平台邊界](../tests/platform-in-app-purchase-boundary.test.ts) |
| Apple／Google 商品映射與商店名稱 | [商品映射 JSON](subscription/NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json)、[商品 metadata](subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json)、[拓樸](subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md) | [catalog](../lib/subscription/native-store-catalog.ts)、[config parser](../lib/subscription/native-store-catalog-config.ts)、[metadata model](../lib/subscription/native-store-product-metadata.ts)、[檢查腳本](../scripts/check-native-store-catalog-config.ts) | [映射](../tests/native-store-catalog-config.test.ts)、[商品 metadata](../tests/native-store-product-metadata.test.ts) |
| 交易驗證、對帳與權益寫入準備 | [驗證合約](subscription/NATIVE_STORE_VERIFICATION_CONTRACT_2026_08_06.md)、[F3C 提案](subscription/F3C_ENTITLEMENT_PROJECTION_WRITER_PROPOSAL_2026_08_06.md)、[來源基礎證據](subscription/NATIVE_RECONCILIATION_FOUNDATION_EVIDENCE_2026_10_20.md) | [驗證介面](../lib/subscription/native-store-verification-contract.ts)、[帳號權益](../lib/subscription/native-account-entitlement.ts)、[decision](../lib/subscription/native-reconciliation-decision.ts)、[server orchestration](../lib/subscription/native-reconciliation.server.ts)、[migration 067](../supabase/migrations/067_add_billing_event_transaction_ledger.sql) | [驗證合約](../tests/native-store-verification-contract.test.ts)、[對帳基礎](../tests/native-reconciliation-foundation.test.ts)、[帳本基礎](../tests/subscription-billing-ledger-foundation.test.ts) |
| 帳號刪除、訂閱與資料保留 | [刪除提案](subscription/ACCOUNT_DELETION_IMPLEMENTATION_PROPOSAL_2026_08_06.md)、[AD4](subscription/ACCOUNT_DELETION_AD4_PREPARATION_2026_08_21.md) | [刪除 API](../app/api/account-deletion/route.ts)、[合約](../lib/subscription/account-deletion-contract.ts)、[saga](../lib/subscription/account-deletion-saga.server.ts)、[storage](../lib/subscription/account-deletion-storage.server.ts)、[migration 071](../supabase/migrations/071_add_account_deletion_request_foundation.sql) | [基礎](../tests/account-deletion-ad2-foundation.test.ts)、[DB/RLS](../tests/account-deletion-ad3a-migration-repository.test.ts)、[AD4 準備度](../tests/account-deletion-ad4-readiness.test.ts) |
| 隱私、條款、商店素材、支援與發布狀態 | [listing metadata](subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.json)、[資料揭露](subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.json)、[支援 runbook](subscription/NATIVE_SUBSCRIPTION_SUPPORT_RUNBOOK_2026_08_17.md)、[任務 JSON](LAUNCH_EXECUTION_TASKS_2026_08_09.json) | [條款頁](../app/terms/page.tsx)、[支援頁](../app/support/page.tsx)、[metadata model](../lib/deployment/native-store-listing-metadata.ts)、[素材檢查](../scripts/check-native-store-assets.ts)、[發布檢查](../scripts/check-native-launch-readiness.ts) | [資料揭露](../tests/native-store-data-disclosure-baseline.test.ts)、[listing](../tests/native-store-listing-metadata.test.ts)、[素材](../tests/native-store-asset-preflight.test.ts)、[任務](../tests/launch-execution-plan.test.ts) |
| 本機模擬與驗收工具 | [本機模擬](subscription/LOCAL_SUBSCRIPTION_SIMULATION.md)、[測試矩陣](subscription/BILLING_TEST_MATRIX.md) | [模擬 server](../lib/subscription/subscription-simulation.server.ts)、[dev API](../app/api/dev/subscription-simulation/route.ts)、[模擬畫面](../components/subscription/SubscriptionSimulationPanel.tsx)、[fake IAP](../lib/platform/testing/fake-in-app-purchase.ts)、[測試清單](../scripts/test-files.txt) | [模擬](../tests/subscription-simulation.test.ts)、[對帳基礎](../tests/native-reconciliation-foundation.test.ts) |

## 3. 執行邊界：2026-10-20 快照

- 部分分析、PDF、Team 限制已有程式，各功能的角色、資料與環境 gate 不同；不能假設所有付費標籤都有伺服器限制。
- 商品封面仍有 pre-subscription/open 模式，成交照片權益限制仍有缺口；改方案內容時務必查 `subscription-capability-implementation.ts`，不能只改畫面。
- `account-capability-server.ts` 仍對 billing／promotion 來源回傳未接通狀態；原生購買由 `unavailable-native-purchases.ts` 回報不可用。
- `native-reconciliation.server.ts` 有來源碼與 memory transaction 測試；本次只找到測試引用，未串接真實 provider、API 或正式 DB writer。
- 候選價格、JSON 商品映射與假 IAP 結果不能啟用付費。SQL 檔案存在不等於已套用，selected sandbox 證據不能當成 Production 證據。
- 訂閱／帳務、功能權益、角色權限、價格鎖定、裝置功能及發布驗收分開核對。方案變更不能自動放寬 RLS、刪除降級後資料或恢復已刪除的工作空間。
- 舊文件可能保留歷史。特別是 `SUBSCRIPTION_CURRENT_STATE_AUDIT.md`，不可只讀其早期結論就判斷目前程式不存在。

## 4. 每次訂閱變更的維護清單

- 確認變更的是產品規格、模型、顯示、伺服器限制、價格、商品映射或正式啟用；同步核對受影響層級。
- 功能／額度變更：同步方案模型、capability 映射、角色交集、功能入口、伺服器限制與降級保留。
- 價格／週期／優惠變更：查不可變 price-version、既有指派、商店映射、Founder／續訂；不直接覆寫帳務歷史。
- 若改角色、RLS、RPC、PermissionGate、useUserRole、同步或 Dexie，同步維護 `docs/role-permission-distribution.md`。
- 共用邏輯可跨 Web／iOS／Android；裝置／瀏覽器操作留在 `lib/platform`。
- 跑與改動相稱的測試。共用／手機邊界變更需檢查手機型別與靜態打包；純索引文件只需檔案、連結與差異核對。
- 新增、移動、刪除或改變訂閱相關檔案職責／啟用狀態時，在同一變更維護本索引、第 6 節分類與數量。
- 按證據要求更新 canonical task／gate。人工 checklist 由既有工具產生，不手動勾選。
- 保留無關的使用者工作，不把 Demo／素材或密鑰環境檔一起提交。

## 5. 盤點範圍與補查方法

第 6 節初次收錄 303 個來源檔，不含本索引及 `.codex-artifacts` 本機產物。包含目前工作目錄的可讀文字檔，不是遠端部署盤點。來源：306 個字詞命中，核對排除 7 個一般事件訂閱，再加入 4 個依檔名／直接引用找到的接線檔。

2026-10-23 增量新增訂閱制度整備報告與新方案價格／活動後台需求共 2 份，目前清單共 305 個來源檔。這次沒有重新盤點全部歷史檔案或宣稱雲端啟用狀態已更新。

排除 node_modules、.next、out 等產物、Git 忽略檔、密鑰環境檔、套件鎖定檔與二進位圖片。圖片與截圖沿素材 manifest 查找；本索引不是所有二進位素材的清單。

直接 import 關聯包含型別及動態引用，最多列前 5 個引用者；這不是執行或啟用證明。框架路由、HTTP、SQL RPC、動態讀檔與文件字串不一定出現在 import 欄。

在專案根目錄補查可用以下唯讀搜尋，並評估新命名、新目錄與非直接依賴：

```text
rg --files docs/subscription lib/subscription components/subscription
rg -n -i "訂閱|subscription|entitlement|billing|inAppPurchase|in_app_purchase|StoreKit" app components hooks lib scripts tests supabase docs AGENTS.md package.json
rg -n "subscription-plans|subscription-pricing|subscription-capabilities|subscription-access|useAccountCapabilities" app components hooks lib tests
```

Supabase `onAuthStateChange`、`subscription.unsubscribe()` 與網路監聽的一般事件訂閱，應與產品收費訂閱分開判讀。

## 6. 完整來源清單

| 分類 | 目前來源檔數 |
| --- | ---: |
| 核心訂閱文件與設定 | 51 |
| 相鄰文件：帳號刪除與訂閱關係 | 10 |
| 其他政策、發布、功能與歷史文件 | 53 |
| 訂閱核心程式 | 33 |
| 原生購買平台介面與實作狀態 | 11 |
| 頁面、功能限制、API 與其他程式接線 | 45 |
| 資料庫遷移、驗證與本機 SQL | 10 |
| 檢查、驗證與操作腳本 | 17 |
| 自動測試與測試資料 | 70 |
| 專案設定、資料與其他資源 | 5 |
| 合計（不含本索引） | 305 |

### 核心訂閱文件與設定

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [docs/subscription/SUBSCRIPTION_PRICING_PROMOTION_ADMIN_REQUIREMENTS_2026_10_23.md](subscription/SUBSCRIPTION_PRICING_PROMOTION_ADMIN_REQUIREMENTS_2026_10_23.md) | 新兩級方案、249／2490 牌價與首發優惠；已確認調價政策、月繳 60 天通知、年繳續訂調整、限期保價、三類價格管理、訂戶明細及 ADMIN-PRICE-01～06 待辦；尚未實作。 | 最新需求入口，不能當成 runtime 或商店啟用證據。 |
| [docs/subscription/SUBSCRIPTION_RULES_ALIGNMENT_2026_10_23.md](subscription/SUBSCRIPTION_RULES_ALIGNMENT_2026_10_23.md) | 舊 Free／Pro／Team 與員工屬 Team 的確認及 runtime 快照；付費 gate、付款接線缺口與共用時間補強；頁首導向同日新方案決策。 | 文件導航，不是 runtime 啟用或 gate 完成證據。 |
| [docs/subscription/BILLING_DATA_SECURITY_DESIGN.md](subscription/BILLING_DATA_SECURITY_DESIGN.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/BILLING_LIFECYCLE_STATE_MACHINE.md](subscription/BILLING_LIFECYCLE_STATE_MACHINE.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/BILLING_PROVIDER_ADAPTER_CONTRACT.md](subscription/BILLING_PROVIDER_ADAPTER_CONTRACT.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/BILLING_PROVIDER_DECISION.md](subscription/BILLING_PROVIDER_DECISION.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/BILLING_TEST_MATRIX.md](subscription/BILLING_TEST_MATRIX.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/F3A_PRICE_CATALOG_MIGRATION_RUNBOOK.md](subscription/F3A_PRICE_CATALOG_MIGRATION_RUNBOOK.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/F3B_BILLING_LEDGER_MIGRATION_RUNBOOK.md](subscription/F3B_BILLING_LEDGER_MIGRATION_RUNBOOK.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/F3C_ENTITLEMENT_PROJECTION_WRITER_PROPOSAL_2026_08_06.md](subscription/F3C_ENTITLEMENT_PROJECTION_WRITER_PROPOSAL_2026_08_06.md) | DB writer 後續切片；source foundation 已另行完成，勿混淆範圍。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/FREE_MONETIZATION_AND_AD_PRESENTATION_PLAN_2026_08_10.md](subscription/FREE_MONETIZATION_AND_AD_PRESENTATION_PLAN_2026_08_10.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/LOCAL_SUBSCRIPTION_SIMULATION.md](subscription/LOCAL_SUBSCRIPTION_SIMULATION.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json](subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json) | 機器可讀草稿／狀態／檢查設定。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.md](subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_LAUNCH_GATE_CHECK.md](subscription/NATIVE_LAUNCH_GATE_CHECK.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_LAUNCH_PROMOTION_CODE_DESIGN_2026_08_17.md](subscription/NATIVE_LAUNCH_PROMOTION_CODE_DESIGN_2026_08_17.md) | 舊 Pro／Team、FERIA50 與續訂鎖價歷史設計；頁首導向新的限期首購與活動後台需求。 | 不能將歷史 Gate 2 描述或舊優惠政策當成最新啟用／新方案狀態。 |
| [docs/subscription/NATIVE_PURCHASE_DISCLOSURE_CONTRACT_2026_08_06.md](subscription/NATIVE_PURCHASE_DISCLOSURE_CONTRACT_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_RECONCILIATION_FOUNDATION_EVIDENCE_2026_10_20.md](subscription/NATIVE_RECONCILIATION_FOUNDATION_EVIDENCE_2026_10_20.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_RECONCILIATION_FOUNDATION_REVIEW_2026_10_20.md](subscription/NATIVE_RECONCILIATION_FOUNDATION_REVIEW_2026_10_20.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json](subscription/NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json) | 機器可讀草稿／狀態／檢查設定。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md](subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.json](subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.json) | 機器可讀草稿／狀態／檢查設定。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.md](subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_LISTING_ASSET_BASELINE_2026_08_06.md](subscription/NATIVE_STORE_LISTING_ASSET_BASELINE_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.json](subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.json) | 機器可讀草稿／狀態／檢查設定。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.md](subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json](subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json) | 機器可讀草稿／狀態／檢查設定。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.md](subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_STORE_VERIFICATION_CONTRACT_2026_08_06.md](subscription/NATIVE_STORE_VERIFICATION_CONTRACT_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_SUBSCRIPTION_EXECUTION_PLAN_2026_08_06.md](subscription/NATIVE_SUBSCRIPTION_EXECUTION_PLAN_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json](subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json) | 機器可讀草稿／狀態／檢查設定。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/NATIVE_SUBSCRIPTION_SUPPORT_RUNBOOK_2026_08_17.md](subscription/NATIVE_SUBSCRIPTION_SUPPORT_RUNBOOK_2026_08_17.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/STRATEGIC_GROWTH_DATA_RESERVE_DESIGN.md](subscription/STRATEGIC_GROWTH_DATA_RESERVE_DESIGN.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/SUBSCRIPTION_CAPABILITY_CONSISTENCY_AUDIT_2026_08_06.md](subscription/SUBSCRIPTION_CAPABILITY_CONSISTENCY_AUDIT_2026_08_06.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/SUBSCRIPTION_CAPABILITY_READ_MODEL.md](subscription/SUBSCRIPTION_CAPABILITY_READ_MODEL.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/SUBSCRIPTION_CURRENT_STATE_AUDIT.md](subscription/SUBSCRIPTION_CURRENT_STATE_AUDIT.md) | 保留早期稽核，有歷史狀態；先查現行程式。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md](subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md](subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/TEAM_SUBSCRIPTION_ENFORCEMENT.md](subscription/TEAM_SUBSCRIPTION_ENFORCEMENT.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/evidence/billing/f3a/2026-08-05/F3A_PRICE_CATALOG_LIVE_VERIFICATION_2026-08-05.md](subscription/evidence/billing/f3a/2026-08-05/F3A_PRICE_CATALOG_LIVE_VERIFICATION_2026-08-05.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/evidence/billing/f3b/2026-08-04/F3B_BILLING_LEDGER_LIVE_VERIFICATION_2026-08-04.md](subscription/evidence/billing/f3b/2026-08-04/F3B_BILLING_LEDGER_LIVE_VERIFICATION_2026-08-04.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/00_README_EXECUTION_ORDER.md](subscription/execution-pack/00_README_EXECUTION_ORDER.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/01_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md](subscription/execution-pack/01_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/02_TIER_AND_FEATURE_DEFINITION_MATRIX.md](subscription/execution-pack/02_TIER_AND_FEATURE_DEFINITION_MATRIX.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/03_SUBSCRIPTION_DOMAIN_MODEL.md](subscription/execution-pack/03_SUBSCRIPTION_DOMAIN_MODEL.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/04_PLAN_ROLE_PERMISSION_INTERSECTION.md](subscription/execution-pack/04_PLAN_ROLE_PERMISSION_INTERSECTION.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/05_LIFECYCLE_DOWNGRADE_RETENTION.md](subscription/execution-pack/05_LIFECYCLE_DOWNGRADE_RETENTION.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/06_IMPLEMENTATION_SLICES_S0_S2.md](subscription/execution-pack/06_IMPLEMENTATION_SLICES_S0_S2.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/07_IMPLEMENTATION_SLICES_S3_S6.md](subscription/execution-pack/07_IMPLEMENTATION_SLICES_S3_S6.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/08_PLATFORM_RESERVE_AND_BILLING_S7_S9.md](subscription/execution-pack/08_PLATFORM_RESERVE_AND_BILLING_S7_S9.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/execution-pack/09_TEST_VALIDATION_AND_AI_HANDOFF.md](subscription/execution-pack/09_TEST_VALIDATION_AND_AI_HANDOFF.md) | 分階段執行包；與最新程式／task 核對。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |

### 相鄰文件：帳號刪除與訂閱關係

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [docs/subscription/ACCOUNT_DELETION_AD0_READ_ONLY_AUDIT_2026_08_17.md](subscription/ACCOUNT_DELETION_AD0_READ_ONLY_AUDIT_2026_08_17.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/ACCOUNT_DELETION_AD1_THREAT_MODEL_2026_08_17.md](subscription/ACCOUNT_DELETION_AD1_THREAT_MODEL_2026_08_17.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/ACCOUNT_DELETION_AD2_FOUNDATION_EVIDENCE_2026_08_17.md](subscription/ACCOUNT_DELETION_AD2_FOUNDATION_EVIDENCE_2026_08_17.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/ACCOUNT_DELETION_AD3A_LOCAL_FOUNDATION_EVIDENCE_2026_08_17.md](subscription/ACCOUNT_DELETION_AD3A_LOCAL_FOUNDATION_EVIDENCE_2026_08_17.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/ACCOUNT_DELETION_AD4_PREPARATION_2026_08_21.md](subscription/ACCOUNT_DELETION_AD4_PREPARATION_2026_08_21.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/ACCOUNT_DELETION_AI_IMPLEMENTATION_EVIDENCE_PLAN_2026_08_17.md](subscription/ACCOUNT_DELETION_AI_IMPLEMENTATION_EVIDENCE_PLAN_2026_08_17.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/ACCOUNT_DELETION_IMPLEMENTATION_PROPOSAL_2026_08_06.md](subscription/ACCOUNT_DELETION_IMPLEMENTATION_PROPOSAL_2026_08_06.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/ACCOUNT_DELETION_LEGAL_SECURITY_REVIEW_PACKET_2026_08_17.md](subscription/ACCOUNT_DELETION_LEGAL_SECURITY_REVIEW_PACKET_2026_08_17.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/drafts/ACCOUNT_DELETION_AD1_REQUEST_FOUNDATION_DRAFT.sql](subscription/drafts/ACCOUNT_DELETION_AD1_REQUEST_FOUNDATION_DRAFT.sql) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/subscription/templates/ACCOUNT_DELETION_AD4_RELEASE_CANDIDATE_EVIDENCE.template.json](subscription/templates/ACCOUNT_DELETION_AD4_RELEASE_CANDIDATE_EVIDENCE.template.json) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |

### 其他政策、發布、功能與歷史文件

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [AGENTS.md](../AGENTS.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/APP_WIDE_UIUX_BASELINE_2026_08_12.md](APP_WIDE_UIUX_BASELINE_2026_08_12.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/APP_WIDE_UIUX_REMEDIATION_EXECUTION_PLAN_2026_08_12.md](APP_WIDE_UIUX_REMEDIATION_EXECUTION_PLAN_2026_08_12.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/C3.6_LEAVE_TEAM_CLEANUP_AUDIT.md](C3.6_LEAVE_TEAM_CLEANUP_AUDIT.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/CAPACITOR_IOS_ANDROID_EXECUTION_PLAN_2026_08_16.md](CAPACITOR_IOS_ANDROID_EXECUTION_PLAN_2026_08_16.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/CODEX_HANDOFF_2026-08-04_F3B.md](CODEX_HANDOFF_2026-08-04_F3B.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md](CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/FERIA_RECURRING_HYBRID_OPERATIONS_IMPLEMENTATION_SPEC_v1.1.md](FERIA_RECURRING_HYBRID_OPERATIONS_IMPLEMENTATION_SPEC_v1.1.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_BOOTSTRAP_SOURCE_REVIEW_2026_10_19.md](IOS_BOOTSTRAP_SOURCE_REVIEW_2026_10_19.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_CAPACITOR_EXECUTION_PLAN_2026_07_16.md](IOS_CAPACITOR_EXECUTION_PLAN_2026_07_16.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_CAPACITOR_PROGRESS.md](IOS_CAPACITOR_PROGRESS.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_FILES_EVIDENCE_2026_10_20.md](IOS_FILES_EVIDENCE_2026_10_20.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_MAC_HANDOFF_2026_10_20.md](IOS_MAC_HANDOFF_2026_10_20.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_NAVIGATION_AND_HANDOFF_SOURCE_REVIEW_2026_10_20.md](IOS_NAVIGATION_AND_HANDOFF_SOURCE_REVIEW_2026_10_20.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_PHASE2_GATE2_COMPENSATION_RUNBOOK.md](IOS_PHASE2_GATE2_COMPENSATION_RUNBOOK.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_PLATFORM_BOOTSTRAP_EVIDENCE_2026_10_20.md](IOS_PLATFORM_BOOTSTRAP_EVIDENCE_2026_10_20.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_PLATFORM_BOOTSTRAP_SOURCE_REVIEW_2026_10_20.md](IOS_PLATFORM_BOOTSTRAP_SOURCE_REVIEW_2026_10_20.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_RUNTIME_PORTS_EVIDENCE_2026_10_20.md](IOS_RUNTIME_PORTS_EVIDENCE_2026_10_20.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_WINDOWS_FIRST_DELIVERY_PROPOSAL_2026_10_19.md](IOS_WINDOWS_FIRST_DELIVERY_PROPOSAL_2026_10_19.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/IOS_WINDOWS_FIRST_IMPLEMENTATION_EVIDENCE_2026_10_20.md](IOS_WINDOWS_FIRST_IMPLEMENTATION_EVIDENCE_2026_10_20.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/LAUNCH_EXECUTION_MASTER_PLAN_2026_08_09.md](LAUNCH_EXECUTION_MASTER_PLAN_2026_08_09.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/MANUAL_LAUNCH_OPERATIONS_CHECKLIST_2026_08_09.md](MANUAL_LAUNCH_OPERATIONS_CHECKLIST_2026_08_09.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/MANUAL_LAUNCH_OPERATIONS_GUIDE_2026_08_09.md](MANUAL_LAUNCH_OPERATIONS_GUIDE_2026_08_09.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/MOBILE_UIUX_DELTA_AUDIT_2026_08_16.md](MOBILE_UIUX_DELTA_AUDIT_2026_08_16.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/MOBILE_UIUX_FULL_FLOW_AUDIT_2026_08_10.md](MOBILE_UIUX_FULL_FLOW_AUDIT_2026_08_10.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/PRODUCT_COVER_PHOTO_EXECUTION_PLAN_2026_07_24.md](PRODUCT_COVER_PHOTO_EXECUTION_PLAN_2026_07_24.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/PRODUCT_COVER_PHOTO_PRODUCTION_ENABLEMENT_GUIDE_2026_07_24.md](PRODUCT_COVER_PHOTO_PRODUCTION_ENABLEMENT_GUIDE_2026_07_24.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/PROJECT_WIDE_UIUX_INTEGRATION_AUDIT_AND_EXECUTION_PLAN_2026_07_15.md](PROJECT_WIDE_UIUX_INTEGRATION_AUDIT_AND_EXECUTION_PLAN_2026_07_15.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/SESSION1_POLICY_DECISION_WORKSHEET_2026_08_17.md](SESSION1_POLICY_DECISION_WORKSHEET_2026_08_17.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/SETTLEMENT_REPORT_PDF_VISUAL_SPEC_2026_07_01.md](SETTLEMENT_REPORT_PDF_VISUAL_SPEC_2026_07_01.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/SETTLEMENT_REPORT_PRESENTATION_PLAN_2026_07_01.md](SETTLEMENT_REPORT_PRESENTATION_PLAN_2026_07_01.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md](SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/SUBSCRIPTION_TIER_PLAN_2026_07_24.md](SUBSCRIPTION_TIER_PLAN_2026_07_24.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_AUTHENTICATED_RELEASE_MATRIX_2026_08_01.md](WEB_AUTHENTICATED_RELEASE_MATRIX_2026_08_01.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_DEPLOYMENT_RELEASE_IDENTITY.md](WEB_DEPLOYMENT_RELEASE_IDENTITY.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_LAUNCH_MANUAL_ACTIONS_2026_08_01.md](WEB_LAUNCH_MANUAL_ACTIONS_2026_08_01.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_LAUNCH_READINESS_2026_07_30.md](WEB_LAUNCH_READINESS_2026_07_30.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_LEGAL_SUPPORT_LAUNCH_REVIEW.md](WEB_LEGAL_SUPPORT_LAUNCH_REVIEW.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_OPERATIONAL_OBSERVABILITY.md](WEB_OPERATIONAL_OBSERVABILITY.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_PRODUCTION_BOUNDARY_SMOKE.md](WEB_PRODUCTION_BOUNDARY_SMOKE.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_PRODUCTION_CONFIG_CHECK.md](WEB_PRODUCTION_CONFIG_CHECK.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_PWA_RELEASE_SMOKE.md](WEB_PWA_RELEASE_SMOKE.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_RELEASE_SMOKE_ORCHESTRATOR.md](WEB_RELEASE_SMOKE_ORCHESTRATOR.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_SECURITY_HEADERS.md](WEB_SECURITY_HEADERS.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_UIUX_BASELINE_2026_07_23.md](WEB_UIUX_BASELINE_2026_07_23.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_UIUX_SCORE_IMPROVEMENT_EXECUTION_PLAN_2026_07_23.md](WEB_UIUX_SCORE_IMPROVEMENT_EXECUTION_PLAN_2026_07_23.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/architecture/RECURRING_HYBRID_OPERATIONS_IMPACT_AUDIT.md](architecture/RECURRING_HYBRID_OPERATIONS_IMPACT_AUDIT.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/feria-demo-mode-implementation.md](feria-demo-mode-implementation.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/role-permission-distribution.md](role-permission-distribution.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/security/SUPABASE_SECURITY_ADVISOR_INVENTORY_EVIDENCE_2026_08_24.md](security/SUPABASE_SECURITY_ADVISOR_INVENTORY_EVIDENCE_2026_08_24.md) | 日期／環境限定的報告，可能保留歷史。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/security/SUPABASE_SECURITY_ADVISOR_REMEDIATION_PLAN_2026_08_05.md](security/SUPABASE_SECURITY_ADVISOR_REMEDIATION_PLAN_2026_08_05.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/security/SUPABASE_SECURITY_ADVISOR_SRA_A_MINIMAL_REMEDIATION_PROPOSAL_2026_08_24.md](security/SUPABASE_SECURITY_ADVISOR_SRA_A_MINIMAL_REMEDIATION_PROPOSAL_2026_08_24.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/staff-role-matrix.md](staff-role-matrix.md) | 規格、政策、計畫或相關功能／發布紀錄。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |

### 訂閱核心程式

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [lib/subscription/account-capability-access.ts](../lib/subscription/account-capability-access.ts) | 訂閱／帳號刪除共用程式。 | [app/analytics/page.tsx](../app/analytics/page.tsx)<br>[app/reports/settlement/page.tsx](../app/reports/settlement/page.tsx)<br>[app/settings/team/page.tsx](../app/settings/team/page.tsx)<br>[tests/analytics-subscription-access.test.ts](../tests/analytics-subscription-access.test.ts) |
| [lib/subscription/account-capability-client.ts](../lib/subscription/account-capability-client.ts) | 訂閱／帳號刪除共用程式。 | [hooks/useAccountCapabilities.ts](../hooks/useAccountCapabilities.ts)<br>[lib/subscription/account-capability-access.ts](../lib/subscription/account-capability-access.ts)<br>[lib/subscription/subscription-center-view.ts](../lib/subscription/subscription-center-view.ts)<br>[tests/account-capability-billing-read-contract.test.ts](../tests/account-capability-billing-read-contract.test.ts)<br>[tests/analytics-subscription-access.test.ts](../tests/analytics-subscription-access.test.ts)<br>另 2 個，請搜尋模組名稱。 |
| [lib/subscription/account-capability-contract.ts](../lib/subscription/account-capability-contract.ts) | 訂閱／帳號刪除共用程式。 | [lib/subscription/account-capability-client.ts](../lib/subscription/account-capability-client.ts)<br>[lib/subscription/account-capability-server.ts](../lib/subscription/account-capability-server.ts)<br>[lib/subscription/subscription-presentation.ts](../lib/subscription/subscription-presentation.ts) |
| [lib/subscription/account-capability-server.ts](../lib/subscription/account-capability-server.ts) | 伺服器權益解析；billing／promotion 仍未接通。 | [app/api/account-capabilities/route.ts](../app/api/account-capabilities/route.ts)<br>[lib/products/product-cover-photo-server.ts](../lib/products/product-cover-photo-server.ts)<br>[lib/subscription/account-capability-storage.server.ts](../lib/subscription/account-capability-storage.server.ts)<br>[lib/subscription/subscription-simulation.server.ts](../lib/subscription/subscription-simulation.server.ts)<br>[tests/product-cover-photo.test.ts](../tests/product-cover-photo.test.ts)<br>另 1 個，請搜尋模組名稱。 |
| [lib/subscription/account-capability-storage.server.ts](../lib/subscription/account-capability-storage.server.ts) | 訂閱／帳號刪除共用程式。 | [app/api/account-capabilities/route.ts](../app/api/account-capabilities/route.ts)<br>[app/api/product-cover-photo/capability/route.ts](../app/api/product-cover-photo/capability/route.ts)<br>[app/api/product-cover-photo/upload/route.ts](../app/api/product-cover-photo/upload/route.ts) |
| [lib/subscription/account-deletion-ad4-readiness.ts](../lib/subscription/account-deletion-ad4-readiness.ts) | 訂閱／帳號刪除共用程式。 | [scripts/check-account-deletion-ad4-preparation.ts](../scripts/check-account-deletion-ad4-preparation.ts)<br>[tests/account-deletion-ad4-readiness.test.ts](../tests/account-deletion-ad4-readiness.test.ts) |
| [lib/subscription/account-deletion-api-contract.ts](../lib/subscription/account-deletion-api-contract.ts) | 訂閱／帳號刪除共用程式。 | [app/api/account-deletion/route.ts](../app/api/account-deletion/route.ts)<br>[tests/account-deletion-ad2-foundation.test.ts](../tests/account-deletion-ad2-foundation.test.ts) |
| [lib/subscription/account-deletion-contract.ts](../lib/subscription/account-deletion-contract.ts) | 訂閱／帳號刪除共用程式。 | [lib/subscription/account-deletion-api-contract.ts](../lib/subscription/account-deletion-api-contract.ts)<br>[lib/subscription/account-deletion-preflight.ts](../lib/subscription/account-deletion-preflight.ts)<br>[lib/subscription/account-deletion-saga.server.ts](../lib/subscription/account-deletion-saga.server.ts)<br>[lib/subscription/account-deletion-storage.server.ts](../lib/subscription/account-deletion-storage.server.ts)<br>[tests/account-deletion-ad1-contract.test.ts](../tests/account-deletion-ad1-contract.test.ts)<br>另 1 個，請搜尋模組名稱。 |
| [lib/subscription/account-deletion-preflight.ts](../lib/subscription/account-deletion-preflight.ts) | 帳號刪除前檢查；私人心得與現金草稿需先回原功能儲存或明確捨棄，舊匯出不視為已保全。現金 078 已完成、本機啟用及 owner 草稿保護驗收通過；未改訂閱分級／購買／發布 gate。 | [tests/account-deletion-ad2-foundation.test.ts](../tests/account-deletion-ad2-foundation.test.ts)<br>[tests/market-journal-persistence.test.ts](../tests/market-journal-persistence.test.ts)<br>[tests/market-cash.test.ts](../tests/market-cash.test.ts)<br>[現金切片紀錄](MARKET_OPTIONAL_CASH_RECORDS_2026_10_23.md) |
| [lib/subscription/account-deletion-reauth.server.ts](../lib/subscription/account-deletion-reauth.server.ts) | 訂閱／帳號刪除共用程式。 | [app/api/account-deletion/route.ts](../app/api/account-deletion/route.ts)<br>[tests/account-deletion-ad2-foundation.test.ts](../tests/account-deletion-ad2-foundation.test.ts) |
| [lib/subscription/account-deletion-saga.server.ts](../lib/subscription/account-deletion-saga.server.ts) | 訂閱／帳號刪除共用程式。 | [lib/subscription/account-deletion-storage.server.ts](../lib/subscription/account-deletion-storage.server.ts)<br>[tests/account-deletion-ad2-foundation.test.ts](../tests/account-deletion-ad2-foundation.test.ts) |
| [lib/subscription/account-deletion-storage.server.ts](../lib/subscription/account-deletion-storage.server.ts) | 訂閱／帳號刪除共用程式。 | [app/api/account-deletion/route.ts](../app/api/account-deletion/route.ts)<br>[tests/account-deletion-ad3a-migration-repository.test.ts](../tests/account-deletion-ad3a-migration-repository.test.ts) |
| [lib/subscription/billing-provider-contract.ts](../lib/subscription/billing-provider-contract.ts) | 訂閱／帳號刪除共用程式。 | [lib/subscription/native-account-entitlement.ts](../lib/subscription/native-account-entitlement.ts)<br>[lib/subscription/native-reconciliation-decision.ts](../lib/subscription/native-reconciliation-decision.ts)<br>[lib/subscription/native-store-verification-contract.ts](../lib/subscription/native-store-verification-contract.ts)<br>[lib/subscription/subscription-center-view.ts](../lib/subscription/subscription-center-view.ts)<br>[tests/subscription-billing-data-security-design.test.ts](../tests/subscription-billing-data-security-design.test.ts) |
| [lib/subscription/native-account-entitlement.ts](../lib/subscription/native-account-entitlement.ts) | 訂閱／帳號刪除共用程式。 | [lib/subscription/native-reconciliation-decision.ts](../lib/subscription/native-reconciliation-decision.ts)<br>[lib/subscription/native-store-verification-contract.ts](../lib/subscription/native-store-verification-contract.ts)<br>[tests/native-account-entitlement.test.ts](../tests/native-account-entitlement.test.ts) |
| [lib/subscription/native-purchase-disclosure.ts](../lib/subscription/native-purchase-disclosure.ts) | 訂閱／帳號刪除共用程式。 | [lib/subscription/native-purchase-workflow.ts](../lib/subscription/native-purchase-workflow.ts)<br>[tests/native-purchase-disclosure.test.ts](../tests/native-purchase-disclosure.test.ts)<br>[tests/native-purchase-workflow.test.ts](../tests/native-purchase-workflow.test.ts) |
| [lib/subscription/native-purchase-workflow.ts](../lib/subscription/native-purchase-workflow.ts) | 訂閱／帳號刪除共用程式。 | [components/subscription/NativeSubscriptionActions.tsx](../components/subscription/NativeSubscriptionActions.tsx)<br>[tests/native-purchase-workflow.test.ts](../tests/native-purchase-workflow.test.ts) |
| [lib/subscription/native-reconciliation-decision.ts](../lib/subscription/native-reconciliation-decision.ts) | 對帳來源基礎；本身不驗證收據、不授予真實方案。 | [lib/subscription/native-reconciliation.server.ts](../lib/subscription/native-reconciliation.server.ts)<br>[tests/native-reconciliation-foundation.test.ts](../tests/native-reconciliation-foundation.test.ts) |
| [lib/subscription/native-reconciliation.server.ts](../lib/subscription/native-reconciliation.server.ts) | 私有驗證／current query／交易介面來源；本次只有測試引用。 | [tests/native-reconciliation-foundation.test.ts](../tests/native-reconciliation-foundation.test.ts) |
| [lib/subscription/native-store-catalog-config.ts](../lib/subscription/native-store-catalog-config.ts) | 訂閱／帳號刪除共用程式。 | [scripts/check-native-store-catalog-config.ts](../scripts/check-native-store-catalog-config.ts)<br>[tests/native-store-catalog-config.test.ts](../tests/native-store-catalog-config.test.ts) |
| [lib/subscription/native-store-catalog.ts](../lib/subscription/native-store-catalog.ts) | 訂閱／帳號刪除共用程式。 | [lib/subscription/native-purchase-disclosure.ts](../lib/subscription/native-purchase-disclosure.ts)<br>[lib/subscription/native-store-catalog-config.ts](../lib/subscription/native-store-catalog-config.ts)<br>[tests/native-store-catalog.test.ts](../tests/native-store-catalog.test.ts) |
| [lib/subscription/native-store-product-metadata.ts](../lib/subscription/native-store-product-metadata.ts) | 訂閱／帳號刪除共用程式。 | [scripts/check-native-store-product-metadata.ts](../scripts/check-native-store-product-metadata.ts)<br>[tests/native-store-product-metadata.test.ts](../tests/native-store-product-metadata.test.ts) |
| [lib/subscription/native-store-verification-contract.ts](../lib/subscription/native-store-verification-contract.ts) | 商店驗證介面／型別；沒有真實 verifier。 | [lib/subscription/native-reconciliation-decision.ts](../lib/subscription/native-reconciliation-decision.ts)<br>[lib/subscription/native-reconciliation.server.ts](../lib/subscription/native-reconciliation.server.ts)<br>[tests/fixtures/native-store-verification.ts](../tests/fixtures/native-store-verification.ts)<br>[tests/native-reconciliation-foundation.test.ts](../tests/native-reconciliation-foundation.test.ts)<br>[tests/native-store-verification-contract.test.ts](../tests/native-store-verification-contract.test.ts) |
| [lib/subscription/subscription-access.ts](../lib/subscription/subscription-access.ts) | 角色、方案、操作、資料與 runtime gate 的判斷。 | [components/subscription/FeatureLimitDialog.tsx](../components/subscription/FeatureLimitDialog.tsx)<br>[components/subscription/UpgradePrompt.tsx](../components/subscription/UpgradePrompt.tsx)<br>[lib/analytics/subscription-view.ts](../lib/analytics/subscription-view.ts)<br>[lib/products/product-cover-photo-server.ts](../lib/products/product-cover-photo-server.ts)<br>[lib/reporting/settlement-subscription-view.ts](../lib/reporting/settlement-subscription-view.ts)<br>另 5 個，請搜尋模組名稱。 |
| [lib/subscription/subscription-capabilities.ts](../lib/subscription/subscription-capabilities.ts) | 帳號權益、功能、額度與有效期限的共用模型；拒絕有填但無效的到期日與非有限評估時間，保留明確 null 的既有授權語意。 | [lib/subscription/account-capability-client.ts](../lib/subscription/account-capability-client.ts)<br>[lib/subscription/account-capability-contract.ts](../lib/subscription/account-capability-contract.ts)<br>[lib/subscription/account-capability-server.ts](../lib/subscription/account-capability-server.ts)<br>[lib/subscription/native-account-entitlement.ts](../lib/subscription/native-account-entitlement.ts)<br>[lib/subscription/subscription-access.ts](../lib/subscription/subscription-access.ts)<br>另 10 個，請搜尋模組名稱。 |
| [lib/subscription/subscription-capability-implementation.ts](../lib/subscription/subscription-capability-implementation.ts) | 實際功能接線／執行狀態。 | [tests/subscription-capability-implementation.test.ts](../tests/subscription-capability-implementation.test.ts) |
| [lib/subscription/subscription-center-view.ts](../lib/subscription/subscription-center-view.ts) | 訂閱／帳號刪除共用程式。 | [components/subscription/SubscriptionAccountSummary.tsx](../components/subscription/SubscriptionAccountSummary.tsx)<br>[tests/subscription-center-view.test.ts](../tests/subscription-center-view.test.ts) |
| [lib/subscription/subscription-plans.ts](../lib/subscription/subscription-plans.ts) | 方案代碼、功能定義、候選額度。 | [app/api/dev/subscription-simulation/route.ts](../app/api/dev/subscription-simulation/route.ts)<br>[components/subscription/FeatureLimitDialog.tsx](../components/subscription/FeatureLimitDialog.tsx)<br>[components/subscription/SubscriptionSimulationPanel.tsx](../components/subscription/SubscriptionSimulationPanel.tsx)<br>[components/subscription/UpgradePrompt.tsx](../components/subscription/UpgradePrompt.tsx)<br>[lib/subscription/account-capability-client.ts](../lib/subscription/account-capability-client.ts)<br>另 11 個，請搜尋模組名稱。 |
| [lib/subscription/subscription-presentation.ts](../lib/subscription/subscription-presentation.ts) | 訂閱／帳號刪除共用程式。 | [app/subscription/page.tsx](../app/subscription/page.tsx)<br>[components/TopNavigation.tsx](../components/TopNavigation.tsx)<br>[components/products/ProductCoverPhotoField.tsx](../components/products/ProductCoverPhotoField.tsx)<br>[components/settings/AccountSyncPanel.tsx](../components/settings/AccountSyncPanel.tsx)<br>[components/subscription/FeatureLimitDialog.tsx](../components/subscription/FeatureLimitDialog.tsx)<br>另 6 個，請搜尋模組名稱。 |
| [lib/subscription/subscription-price-foundation-smoke-client.ts](../lib/subscription/subscription-price-foundation-smoke-client.ts) | 訂閱／帳號刪除共用程式。 | [components/subscription/SubscriptionSimulationPanel.tsx](../components/subscription/SubscriptionSimulationPanel.tsx)<br>[tests/subscription-price-foundation-authenticated-smoke.test.ts](../tests/subscription-price-foundation-authenticated-smoke.test.ts) |
| [lib/subscription/subscription-price-foundation-smoke.server.ts](../lib/subscription/subscription-price-foundation-smoke.server.ts) | 訂閱／帳號刪除共用程式。 | [app/api/dev/subscription-price-foundation-smoke/route.ts](../app/api/dev/subscription-price-foundation-smoke/route.ts)<br>[tests/subscription-price-foundation-authenticated-smoke.test.ts](../tests/subscription-price-foundation-authenticated-smoke.test.ts) |
| [lib/subscription/subscription-pricing.ts](../lib/subscription/subscription-pricing.ts) | 價格版本、Founder、升降級與報價模型；候選值不等於啟用。 | [lib/subscription/billing-provider-contract.ts](../lib/subscription/billing-provider-contract.ts)<br>[lib/subscription/native-account-entitlement.ts](../lib/subscription/native-account-entitlement.ts)<br>[lib/subscription/native-reconciliation-decision.ts](../lib/subscription/native-reconciliation-decision.ts)<br>[lib/subscription/native-store-catalog-config.ts](../lib/subscription/native-store-catalog-config.ts)<br>[lib/subscription/native-store-catalog.ts](../lib/subscription/native-store-catalog.ts)<br>另 5 個，請搜尋模組名稱。 |
| [lib/subscription/subscription-simulation-client.ts](../lib/subscription/subscription-simulation-client.ts) | 訂閱／帳號刪除共用程式。 | [components/subscription/SubscriptionSimulationPanel.tsx](../components/subscription/SubscriptionSimulationPanel.tsx)<br>[tests/subscription-simulation.test.ts](../tests/subscription-simulation.test.ts) |
| [lib/subscription/subscription-simulation.server.ts](../lib/subscription/subscription-simulation.server.ts) | 訂閱／帳號刪除共用程式。 | [app/api/account-capabilities/route.ts](../app/api/account-capabilities/route.ts)<br>[app/api/dev/subscription-price-foundation-smoke/route.ts](../app/api/dev/subscription-price-foundation-smoke/route.ts)<br>[app/api/dev/subscription-simulation/route.ts](../app/api/dev/subscription-simulation/route.ts)<br>[tests/subscription-simulation.test.ts](../tests/subscription-simulation.test.ts) |

### 原生購買平台介面與實作狀態

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [lib/platform/capacitor/assemble-platform.ts](../lib/platform/capacitor/assemble-platform.ts) | 平台介面、組裝、adapter 或匯出。 | [lib/platform/capacitor/load-platform.ts](../lib/platform/capacitor/load-platform.ts)<br>[tests/ios-platform-workflow-integration.test.ts](../tests/ios-platform-workflow-integration.test.ts)<br>[tests/native-platform-startup.test.ts](../tests/native-platform-startup.test.ts) |
| [lib/platform/capacitor/load-platform.ts](../lib/platform/capacitor/load-platform.ts) | 平台介面、組裝、adapter 或匯出。 | [lib/platform/capacitor/app-bootstrap.ts](../lib/platform/capacitor/app-bootstrap.ts) |
| [lib/platform/contracts/in-app-purchase.ts](../lib/platform/contracts/in-app-purchase.ts) | 平台介面、組裝、adapter 或匯出。 | [components/subscription/NativeSubscriptionActions.tsx](../components/subscription/NativeSubscriptionActions.tsx)<br>[lib/platform/contracts/index.ts](../lib/platform/contracts/index.ts)<br>[lib/platform/in-app-purchase-capability.ts](../lib/platform/in-app-purchase-capability.ts)<br>[lib/platform/testing/fake-in-app-purchase.ts](../lib/platform/testing/fake-in-app-purchase.ts)<br>[lib/platform/unavailable-native-purchases.ts](../lib/platform/unavailable-native-purchases.ts)<br>另 7 個，請搜尋模組名稱。 |
| [lib/platform/contracts/index.ts](../lib/platform/contracts/index.ts) | 平台介面、組裝、adapter 或匯出。 | [lib/platform/capacitor/assemble-platform.ts](../lib/platform/capacitor/assemble-platform.ts)<br>[lib/platform/index.ts](../lib/platform/index.ts)<br>[lib/platform/platform.ts](../lib/platform/platform.ts)<br>[lib/platform/startup.ts](../lib/platform/startup.ts)<br>[lib/platform/web/index.ts](../lib/platform/web/index.ts)<br>另 2 個，請搜尋模組名稱。 |
| [lib/platform/in-app-purchase-capability.ts](../lib/platform/in-app-purchase-capability.ts) | 平台介面、組裝、adapter 或匯出。 | [components/subscription/NativeSubscriptionActions.tsx](../components/subscription/NativeSubscriptionActions.tsx)<br>[lib/platform/index.ts](../lib/platform/index.ts)<br>[lib/platform/platform.ts](../lib/platform/platform.ts)<br>[tests/platform-in-app-purchase-boundary.test.ts](../tests/platform-in-app-purchase-boundary.test.ts) |
| [lib/platform/index.ts](../lib/platform/index.ts) | 平台介面、組裝、adapter 或匯出。 | [app/register-sw.tsx](../app/register-sw.tsx)<br>[components/PWAUpdatePrompt.tsx](../components/PWAUpdatePrompt.tsx) |
| [lib/platform/platform.ts](../lib/platform/platform.ts) | 平台介面、組裝、adapter 或匯出。 | [components/platform/NativeLinkNavigation.tsx](../components/platform/NativeLinkNavigation.tsx)<br>[lib/platform/capacitor/app-bootstrap.ts](../lib/platform/capacitor/app-bootstrap.ts)<br>[lib/platform/capacitor/camera-bootstrap.ts](../lib/platform/capacitor/camera-bootstrap.ts)<br>[lib/platform/index.ts](../lib/platform/index.ts)<br>[tests/capacitor-runtime-ports.test.ts](../tests/capacitor-runtime-ports.test.ts)<br>另 4 個，請搜尋模組名稱。 |
| [lib/platform/testing/fake-in-app-purchase.ts](../lib/platform/testing/fake-in-app-purchase.ts) | 測試 adapter，不構成交易權威。 | [tests/native-purchase-workflow.test.ts](../tests/native-purchase-workflow.test.ts)<br>[tests/platform-in-app-purchase-boundary.test.ts](../tests/platform-in-app-purchase-boundary.test.ts) |
| [lib/platform/unavailable-native-purchases.ts](../lib/platform/unavailable-native-purchases.ts) | 原生購買明確不可用。 | [lib/platform/capacitor/load-platform.ts](../lib/platform/capacitor/load-platform.ts)<br>[tests/ios-platform-workflow-integration.test.ts](../tests/ios-platform-workflow-integration.test.ts)<br>[tests/native-platform-startup.test.ts](../tests/native-platform-startup.test.ts) |
| [lib/platform/web/in-app-purchase.ts](../lib/platform/web/in-app-purchase.ts) | 平台介面、組裝、adapter 或匯出。 | [lib/platform/in-app-purchase-capability.ts](../lib/platform/in-app-purchase-capability.ts)<br>[lib/platform/web/index.ts](../lib/platform/web/index.ts) |
| [lib/platform/web/index.ts](../lib/platform/web/index.ts) | 平台介面、組裝、adapter 或匯出。 | [lib/platform/platform.ts](../lib/platform/platform.ts) |

### 頁面、功能限制、API 與其他程式接線

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [app/analytics/page.tsx](../app/analytics/page.tsx) | 框架頁面／入口。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [app/api/account-capabilities/route.ts](../app/api/account-capabilities/route.ts) | HTTP API；需核對身分、權限、環境及 DB 邊界。 | [tests/subscription-account-capability-api.test.ts](../tests/subscription-account-capability-api.test.ts) |
| [app/api/account-deletion/route.ts](../app/api/account-deletion/route.ts) | HTTP API；需核對身分、權限、環境及 DB 邊界。 | [lib/subscription/account-deletion-storage.server.ts](../lib/subscription/account-deletion-storage.server.ts)<br>[tests/account-deletion-ad2-foundation.test.ts](../tests/account-deletion-ad2-foundation.test.ts) |
| [app/api/dev/subscription-price-foundation-smoke/route.ts](../app/api/dev/subscription-price-foundation-smoke/route.ts) | 開發／隔離測試 API。 | [tests/subscription-price-foundation-authenticated-smoke.test.ts](../tests/subscription-price-foundation-authenticated-smoke.test.ts) |
| [app/api/dev/subscription-simulation/route.ts](../app/api/dev/subscription-simulation/route.ts) | 開發／隔離測試 API。 | [tests/subscription-simulation.test.ts](../tests/subscription-simulation.test.ts) |
| [app/api/product-cover-photo/capability/route.ts](../app/api/product-cover-photo/capability/route.ts) | HTTP API；需核對身分、權限、環境及 DB 邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [app/api/product-cover-photo/upload/route.ts](../app/api/product-cover-photo/upload/route.ts) | HTTP API；需核對身分、權限、環境及 DB 邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [app/reports/settlement/page.tsx](../app/reports/settlement/page.tsx) | 框架頁面／入口。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [app/settings/team/page.tsx](../app/settings/team/page.tsx) | 框架頁面／入口。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [app/subscription/loading.tsx](../app/subscription/loading.tsx) | 框架頁面／入口。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [app/subscription/page.tsx](../app/subscription/page.tsx) | 框架頁面／入口。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [app/support/page.tsx](../app/support/page.tsx) | 框架頁面／入口。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [app/terms/page.tsx](../app/terms/page.tsx) | 框架頁面／入口。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [components/TopNavigation.tsx](../components/TopNavigation.tsx) | 畫面或操作元件；不是權益權威。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [components/analytics/DateRangeFilter.tsx](../components/analytics/DateRangeFilter.tsx) | 畫面或操作元件；不是權益權威。 | [app/analytics/page.tsx](../app/analytics/page.tsx)<br>[components/demo/FormalDemoApp.tsx](../components/demo/FormalDemoApp.tsx) |
| [components/products/ProductCoverPhotoField.tsx](../components/products/ProductCoverPhotoField.tsx) | 畫面或操作元件；不是權益權威。 | [components/products/AddProductForm.tsx](../components/products/AddProductForm.tsx)<br>[components/products/EditProductForm.tsx](../components/products/EditProductForm.tsx) |
| [components/settings/AccountSyncPanel.tsx](../components/settings/AccountSyncPanel.tsx) | 畫面或操作元件；不是權益權威。 | [app/settings/account/page.tsx](../app/settings/account/page.tsx) |
| [components/settings/StaffManagement.tsx](../components/settings/StaffManagement.tsx) | 畫面或操作元件；不是權益權威。 | [app/settings/team/page.tsx](../app/settings/team/page.tsx) |
| [components/subscription/FeatureLimitDialog.tsx](../components/subscription/FeatureLimitDialog.tsx) | 畫面或操作元件；不是權益權威。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [components/subscription/NativeSubscriptionActions.tsx](../components/subscription/NativeSubscriptionActions.tsx) | 畫面或操作元件；不是權益權威。 | [components/subscription/SubscriptionAccountSummary.tsx](../components/subscription/SubscriptionAccountSummary.tsx) |
| [components/subscription/PricingCard.tsx](../components/subscription/PricingCard.tsx) | 畫面或操作元件；不是權益權威。 | [app/subscription/page.tsx](../app/subscription/page.tsx) |
| [components/subscription/SubscriptionAccountSummary.tsx](../components/subscription/SubscriptionAccountSummary.tsx) | 畫面或操作元件；不是權益權威。 | [app/subscription/page.tsx](../app/subscription/page.tsx) |
| [components/subscription/SubscriptionBackButton.tsx](../components/subscription/SubscriptionBackButton.tsx) | 畫面或操作元件；不是權益權威。 | [app/subscription/page.tsx](../app/subscription/page.tsx) |
| [components/subscription/SubscriptionSimulationPanel.tsx](../components/subscription/SubscriptionSimulationPanel.tsx) | 畫面或操作元件；不是權益權威。 | [app/subscription/page.tsx](../app/subscription/page.tsx) |
| [components/subscription/UpgradePrompt.tsx](../components/subscription/UpgradePrompt.tsx) | 畫面或操作元件；不是權益權威。 | [app/analytics/page.tsx](../app/analytics/page.tsx)<br>[app/reports/settlement/page.tsx](../app/reports/settlement/page.tsx)<br>[app/settings/team/page.tsx](../app/settings/team/page.tsx) |
| [components/sync/SyncStatus.tsx](../components/sync/SyncStatus.tsx) | 畫面或操作元件；不是權益權威。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [hooks/useAccountCapabilities.ts](../hooks/useAccountCapabilities.ts) | 查詢、同步或畫面狀態接線。 | [app/analytics/page.tsx](../app/analytics/page.tsx)<br>[app/reports/settlement/page.tsx](../app/reports/settlement/page.tsx)<br>[app/settings/team/page.tsx](../app/settings/team/page.tsx)<br>[components/subscription/SubscriptionAccountSummary.tsx](../components/subscription/SubscriptionAccountSummary.tsx) |
| [hooks/useAnalyticsCache.ts](../hooks/useAnalyticsCache.ts) | 查詢、同步或畫面狀態接線。 | [app/analytics/page.tsx](../app/analytics/page.tsx) |
| [hooks/useStaffStatusMonitor.ts](../hooks/useStaffStatusMonitor.ts) | 查詢、同步或畫面狀態接線。 | [components/auth/StaffStatusMonitor.tsx](../components/auth/StaffStatusMonitor.tsx)<br>[tests/p5-4a-downgrade-detection.test.ts](../tests/p5-4a-downgrade-detection.test.ts) |
| [hooks/useSync.ts](../hooks/useSync.ts) | 查詢、同步或畫面狀態接線。 | [app/analytics/page.tsx](../app/analytics/page.tsx)<br>[app/page.tsx](../app/page.tsx)<br>[components/common/SyncStatusIndicator.tsx](../components/common/SyncStatusIndicator.tsx)<br>[components/settings/AccountSyncPanel.tsx](../components/settings/AccountSyncPanel.tsx)<br>[components/staff/StaffInvitationDialog.tsx](../components/staff/StaffInvitationDialog.tsx)<br>另 8 個，請搜尋模組名稱。 |
| [lib/analytics/subscription-view.ts](../lib/analytics/subscription-view.ts) | 分析呈現／查詢 gate；縣市頁籤始終要求既有進階分析權益，最近三場不能繞過。 | [app/analytics/page.tsx](../app/analytics/page.tsx)<br>[components/analytics/DateRangeFilter.tsx](../components/analytics/DateRangeFilter.tsx)<br>[components/analytics/RegionAnalyticsPanel.tsx](../components/analytics/RegionAnalyticsPanel.tsx)<br>[tests/advanced-analytics-subscription-access.test.ts](../tests/advanced-analytics-subscription-access.test.ts)<br>[tests/region-analytics.test.ts](../tests/region-analytics.test.ts) |
| [lib/deployment/launch-execution-plan.ts](../lib/deployment/launch-execution-plan.ts) | 發布、設定、素材或準備度檢查。 | [lib/deployment/manual-launch-checklist.ts](../lib/deployment/manual-launch-checklist.ts)<br>[scripts/check-launch-execution-plan.ts](../scripts/check-launch-execution-plan.ts)<br>[scripts/update-manual-launch-checklist.ts](../scripts/update-manual-launch-checklist.ts)<br>[tests/launch-execution-plan.test.ts](../tests/launch-execution-plan.test.ts)<br>[tests/manual-launch-operations-checklist.test.ts](../tests/manual-launch-operations-checklist.test.ts) |
| [lib/deployment/manual-launch-checklist.ts](../lib/deployment/manual-launch-checklist.ts) | 發布、設定、素材或準備度檢查。 | [scripts/update-manual-launch-checklist.ts](../scripts/update-manual-launch-checklist.ts)<br>[tests/manual-launch-operations-checklist.test.ts](../tests/manual-launch-operations-checklist.test.ts) |
| [lib/deployment/native-external-account-readiness.ts](../lib/deployment/native-external-account-readiness.ts) | 發布、設定、素材或準備度檢查。 | [lib/deployment/manual-launch-checklist.ts](../lib/deployment/manual-launch-checklist.ts)<br>[scripts/check-account-deletion-ad4-preparation.ts](../scripts/check-account-deletion-ad4-preparation.ts)<br>[scripts/check-native-external-account-readiness.ts](../scripts/check-native-external-account-readiness.ts)<br>[scripts/update-manual-launch-checklist.ts](../scripts/update-manual-launch-checklist.ts)<br>[tests/manual-launch-operations-checklist.test.ts](../tests/manual-launch-operations-checklist.test.ts)<br>另 1 個，請搜尋模組名稱。 |
| [lib/deployment/native-launch-gate.ts](../lib/deployment/native-launch-gate.ts) | 發布、設定、素材或準備度檢查。 | [lib/deployment/launch-execution-plan.ts](../lib/deployment/launch-execution-plan.ts)<br>[scripts/check-launch-execution-plan.ts](../scripts/check-launch-execution-plan.ts)<br>[scripts/check-native-launch-readiness.ts](../scripts/check-native-launch-readiness.ts)<br>[scripts/update-manual-launch-checklist.ts](../scripts/update-manual-launch-checklist.ts)<br>[tests/launch-execution-plan.test.ts](../tests/launch-execution-plan.test.ts)<br>另 2 個，請搜尋模組名稱。 |
| [lib/deployment/native-store-asset-preflight.ts](../lib/deployment/native-store-asset-preflight.ts) | 發布、設定、素材或準備度檢查。 | [scripts/check-native-store-assets.ts](../scripts/check-native-store-assets.ts)<br>[tests/native-store-asset-preflight.test.ts](../tests/native-store-asset-preflight.test.ts) |
| [lib/deployment/native-store-listing-metadata.ts](../lib/deployment/native-store-listing-metadata.ts) | 發布、設定、素材或準備度檢查。 | [scripts/check-native-store-listing-metadata.ts](../scripts/check-native-store-listing-metadata.ts)<br>[tests/native-store-listing-metadata.test.ts](../tests/native-store-listing-metadata.test.ts) |
| [lib/deployment/web-launch-gate.ts](../lib/deployment/web-launch-gate.ts) | 發布、設定、素材或準備度檢查。 | [lib/deployment/launch-execution-plan.ts](../lib/deployment/launch-execution-plan.ts)<br>[scripts/check-launch-execution-plan.ts](../scripts/check-launch-execution-plan.ts)<br>[scripts/check-web-launch-readiness.ts](../scripts/check-web-launch-readiness.ts)<br>[scripts/update-manual-launch-checklist.ts](../scripts/update-manual-launch-checklist.ts)<br>[tests/launch-execution-plan.test.ts](../tests/launch-execution-plan.test.ts)<br>另 2 個，請搜尋模組名稱。 |
| [lib/deployment/web-production-config.ts](../lib/deployment/web-production-config.ts) | 發布、設定、素材或準備度檢查。 | [scripts/check-web-production-config.ts](../scripts/check-web-production-config.ts)<br>[tests/web-production-config.test.ts](../tests/web-production-config.test.ts) |
| [lib/navigation/app-navigation.ts](../lib/navigation/app-navigation.ts) | 訂閱的鄰近功能、設定或接線。 | [components/BottomNavigation.tsx](../components/BottomNavigation.tsx)<br>[components/demo/FormalDemoApp.tsx](../components/demo/FormalDemoApp.tsx)<br>[components/navigation/AppBottomNavigationBar.tsx](../components/navigation/AppBottomNavigationBar.tsx)<br>[components/navigation/AppDesktopNavigation.tsx](../components/navigation/AppDesktopNavigation.tsx)<br>[components/navigation/AppNavigationIcon.tsx](../components/navigation/AppNavigationIcon.tsx)<br>另 1 個，請搜尋模組名稱。 |
| [lib/products/product-cover-photo-client.ts](../lib/products/product-cover-photo-client.ts) | 訂閱的鄰近功能、設定或接線。 | [app/products/page.tsx](../app/products/page.tsx)<br>[components/products/ProductCoverPhotoField.tsx](../components/products/ProductCoverPhotoField.tsx)<br>[components/products/ProductCoverPhotoImage.tsx](../components/products/ProductCoverPhotoImage.tsx)<br>[lib/products/product-cover-photo-pending.ts](../lib/products/product-cover-photo-pending.ts) |
| [lib/products/product-cover-photo-model.ts](../lib/products/product-cover-photo-model.ts) | 訂閱的鄰近功能、設定或接線。 | [app/api/product-cover-photo/image/route.ts](../app/api/product-cover-photo/image/route.ts)<br>[app/api/product-cover-photo/upload/route.ts](../app/api/product-cover-photo/upload/route.ts)<br>[components/products/AddProductForm.tsx](../components/products/AddProductForm.tsx)<br>[components/products/EditProductForm.tsx](../components/products/EditProductForm.tsx)<br>[components/products/ProductCoverPhotoField.tsx](../components/products/ProductCoverPhotoField.tsx)<br>另 6 個，請搜尋模組名稱。 |
| [lib/products/product-cover-photo-server.ts](../lib/products/product-cover-photo-server.ts) | 訂閱的鄰近功能、設定或接線。 | [app/api/product-cover-photo/capability/route.ts](../app/api/product-cover-photo/capability/route.ts)<br>[app/api/product-cover-photo/image/route.ts](../app/api/product-cover-photo/image/route.ts)<br>[app/api/product-cover-photo/metadata/route.ts](../app/api/product-cover-photo/metadata/route.ts)<br>[app/api/product-cover-photo/route.ts](../app/api/product-cover-photo/route.ts)<br>[app/api/product-cover-photo/upload/route.ts](../app/api/product-cover-photo/upload/route.ts)<br>另 1 個，請搜尋模組名稱。 |
| [lib/reporting/settlement-subscription-view.ts](../lib/reporting/settlement-subscription-view.ts) | 訂閱的鄰近功能、設定或接線。 | [app/reports/settlement/page.tsx](../app/reports/settlement/page.tsx)<br>[tests/settlement-report-subscription-access.test.ts](../tests/settlement-report-subscription-access.test.ts) |
| [lib/supabase/staff.ts](../lib/supabase/staff.ts) | 訂閱的鄰近功能、設定或接線。 | [components/settings/StaffManagement.tsx](../components/settings/StaffManagement.tsx)<br>[components/staff/StaffInvitationDialog.tsx](../components/staff/StaffInvitationDialog.tsx)<br>[tests/staff-relationship-id-fallback.test.ts](../tests/staff-relationship-id-fallback.test.ts) |

### 資料庫遷移、驗證與本機 SQL

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [supabase/migrations/062_add_product_cover_photos.sql](../supabase/migrations/062_add_product_cover_photos.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [supabase/migrations/063_add_subscription_accounts.sql](../supabase/migrations/063_add_subscription_accounts.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [supabase/migrations/064_enforce_team_subscription.sql](../supabase/migrations/064_enforce_team_subscription.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [supabase/migrations/065_fix_team_invitation_verification_return_type.sql](../supabase/migrations/065_fix_team_invitation_verification_return_type.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [supabase/migrations/066_add_subscription_price_catalog_foundation.sql](../supabase/migrations/066_add_subscription_price_catalog_foundation.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [supabase/migrations/067_add_billing_event_transaction_ledger.sql](../supabase/migrations/067_add_billing_event_transaction_ledger.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [supabase/migrations/071_add_account_deletion_request_foundation.sql](../supabase/migrations/071_add_account_deletion_request_foundation.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [supabase/tests/account_deletion_ad3a_local.sql](../supabase/tests/account_deletion_ad3a_local.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [supabase/verification/066_subscription_price_foundation_read_only.sql](../supabase/verification/066_subscription_price_foundation_read_only.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [supabase/verification/067_billing_event_transaction_ledger_read_only.sql](../supabase/verification/067_billing_event_transaction_ledger_read_only.sql) | 資料庫或驗證 SQL；需另查套用環境與證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |

### 檢查、驗證與操作腳本

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [scripts/check-account-deletion-ad4-preparation.ts](../scripts/check-account-deletion-ad4-preparation.ts) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/check-launch-execution-plan.ts](../scripts/check-launch-execution-plan.ts) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/check-native-external-account-readiness.ts](../scripts/check-native-external-account-readiness.ts) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/check-native-launch-readiness.ts](../scripts/check-native-launch-readiness.ts) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/check-native-store-assets.ts](../scripts/check-native-store-assets.ts) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/check-native-store-catalog-config.ts](../scripts/check-native-store-catalog-config.ts) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/check-native-store-listing-metadata.ts](../scripts/check-native-store-listing-metadata.ts) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/check-native-store-product-metadata.ts](../scripts/check-native-store-product-metadata.ts) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/run-tests.mjs](../scripts/run-tests.mjs) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/smoke-subscription-billing-ledger-foundation.mjs](../scripts/smoke-subscription-billing-ledger-foundation.mjs) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/smoke-subscription-price-foundation.mjs](../scripts/smoke-subscription-price-foundation.mjs) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/smoke-subscription-read-model.mjs](../scripts/smoke-subscription-read-model.mjs) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/smoke-team-subscription-enforcement.mjs](../scripts/smoke-team-subscription-enforcement.mjs) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/smoke-team-subscription-transition.mjs](../scripts/smoke-team-subscription-transition.mjs) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/smoke-web-production-boundary.mjs](../scripts/smoke-web-production-boundary.mjs) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/test-files.txt](../scripts/test-files.txt) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [scripts/update-manual-launch-checklist.ts](../scripts/update-manual-launch-checklist.ts) | 檢查／smoke／操作腳本；先核對目標與邊界。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |

### 自動測試與測試資料

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [tests/account-capability-billing-read-contract.test.ts](../tests/account-capability-billing-read-contract.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/account-deletion-ad1-contract.test.ts](../tests/account-deletion-ad1-contract.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/account-deletion-ad2-foundation.test.ts](../tests/account-deletion-ad2-foundation.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/account-deletion-ad3a-fake-r2.test.ts](../tests/account-deletion-ad3a-fake-r2.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/account-deletion-ad3a-migration-repository.test.ts](../tests/account-deletion-ad3a-migration-repository.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/account-deletion-ad4-readiness.test.ts](../tests/account-deletion-ad4-readiness.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/account-deletion-implementation-proposal.test.ts](../tests/account-deletion-implementation-proposal.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/advanced-analytics-subscription-access.test.ts](../tests/advanced-analytics-subscription-access.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/analytics-information-architecture.test.ts](../tests/analytics-information-architecture.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/analytics-subscription-access.test.ts](../tests/analytics-subscription-access.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/app-navigation.test.ts](../tests/app-navigation.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/app-wide-uiux-presentation-contract.test.ts](../tests/app-wide-uiux-presentation-contract.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/f3c-entitlement-projection-writer-proposal.test.ts](../tests/f3c-entitlement-projection-writer-proposal.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/fixtures/native-store-verification.ts](../tests/fixtures/native-store-verification.ts) | 測試、合成資料或結構守門。 | [tests/native-store-verification-contract.test.ts](../tests/native-store-verification-contract.test.ts) |
| [tests/ios-phase2-gate2-compensation-runbook.test.ts](../tests/ios-phase2-gate2-compensation-runbook.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/ios-platform-workflow-integration.test.ts](../tests/ios-platform-workflow-integration.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/launch-execution-plan.test.ts](../tests/launch-execution-plan.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/manual-launch-operations-checklist.test.ts](../tests/manual-launch-operations-checklist.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/manual-launch-operations-guide.test.ts](../tests/manual-launch-operations-guide.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-account-entitlement.test.ts](../tests/native-account-entitlement.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-external-account-readiness-cli.test.ts](../tests/native-external-account-readiness-cli.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-external-account-readiness.test.ts](../tests/native-external-account-readiness.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-launch-gate-cli.test.ts](../tests/native-launch-gate-cli.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-launch-gate.test.ts](../tests/native-launch-gate.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-platform-startup.test.ts](../tests/native-platform-startup.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-purchase-disclosure.test.ts](../tests/native-purchase-disclosure.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-purchase-workflow.test.ts](../tests/native-purchase-workflow.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-reconciliation-foundation.test.ts](../tests/native-reconciliation-foundation.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-asset-preflight-cli.test.ts](../tests/native-store-asset-preflight-cli.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-asset-preflight.test.ts](../tests/native-store-asset-preflight.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-catalog-config-cli.test.ts](../tests/native-store-catalog-config-cli.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-catalog-config.test.ts](../tests/native-store-catalog-config.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-catalog.test.ts](../tests/native-store-catalog.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-data-disclosure-baseline.test.ts](../tests/native-store-data-disclosure-baseline.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-listing-metadata-cli.test.ts](../tests/native-store-listing-metadata-cli.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-listing-metadata.test.ts](../tests/native-store-listing-metadata.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-product-metadata-cli.test.ts](../tests/native-store-product-metadata-cli.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-product-metadata.test.ts](../tests/native-store-product-metadata.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-store-verification-contract.test.ts](../tests/native-store-verification-contract.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/native-subscription-direction.test.ts](../tests/native-subscription-direction.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/platform-in-app-purchase-boundary.test.ts](../tests/platform-in-app-purchase-boundary.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/product-cover-photo.test.ts](../tests/product-cover-photo.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/settlement-report-pdf-preview-button.test.ts](../tests/settlement-report-pdf-preview-button.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/settlement-report-subscription-access.test.ts](../tests/settlement-report-subscription-access.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-account-capability-api.test.ts](../tests/subscription-account-capability-api.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-billing-data-security-design.test.ts](../tests/subscription-billing-data-security-design.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-billing-ledger-foundation.test.ts](../tests/subscription-billing-ledger-foundation.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-billing-provider-decision.test.ts](../tests/subscription-billing-provider-decision.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-capability-implementation.test.ts](../tests/subscription-capability-implementation.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-capability-presentation.test.ts](../tests/subscription-capability-presentation.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-center-ui.test.ts](../tests/subscription-center-ui.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-center-view.test.ts](../tests/subscription-center-view.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-feature-gate-mapping.test.ts](../tests/subscription-feature-gate-mapping.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-feature-gates.test.ts](../tests/subscription-feature-gates.test.ts) | 方案、角色、時效、降級保留與授權回歸；含 Pro／Team 無效期限、非有限時間、離線拒絕及明確無期限授權。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-plan-model.test.ts](../tests/subscription-plan-model.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-price-catalog-foundation.test.ts](../tests/subscription-price-catalog-foundation.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-price-foundation-authenticated-smoke.test.ts](../tests/subscription-price-foundation-authenticated-smoke.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-price-foundation-live-smoke.test.ts](../tests/subscription-price-foundation-live-smoke.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-pricing.test.ts](../tests/subscription-pricing.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-read-model-smoke-script.test.ts](../tests/subscription-read-model-smoke-script.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-simulation.test.ts](../tests/subscription-simulation.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/subscription-strategic-growth-data-reserve.test.ts](../tests/subscription-strategic-growth-data-reserve.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/sync-incident-live-smoke.test.ts](../tests/sync-incident-live-smoke.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/team-subscription-enforcement.test.ts](../tests/team-subscription-enforcement.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/team-subscription-transition-live-smoke.test.ts](../tests/team-subscription-transition-live-smoke.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/web-launch-ci.test.ts](../tests/web-launch-ci.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/web-launch-gate.test.ts](../tests/web-launch-gate.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/web-production-config.test.ts](../tests/web-production-config.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/web-production-surface-boundary.test.ts](../tests/web-production-surface-boundary.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [tests/web-uiux-baseline-contract.test.ts](../tests/web-uiux-baseline-contract.test.ts) | 測試、合成資料或結構守門。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |

### 專案設定、資料與其他資源

| 檔案 | 用途／狀態 | 直接 import 引用者（導航用） |
| --- | --- | --- |
| [.env.example](../.env.example) | 訂閱的鄰近功能、設定或接線。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json](LAUNCH_EXECUTION_TASKS_2026_08_09.json) | canonical 任務、依賴與完成證據。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/MANUAL_LAUNCH_ITEM_STATUS_2026_08_17.json](MANUAL_LAUNCH_ITEM_STATUS_2026_08_17.json) | 訂閱的鄰近功能、設定或接線。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [docs/WEB_LAUNCH_GATES_2026_08_01.json](WEB_LAUNCH_GATES_2026_08_01.json) | 訂閱的鄰近功能、設定或接線。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |
| [package.json](../package.json) | 訂閱的鄰近功能、設定或接線。 | 未列直接 import；仍需查文件、路由、腳本或 SQL 呼叫。 |

## 7. 初次排除的一般事件訂閱檔案

- [docs/IOS_AUTH_STORAGE_EVIDENCE_2026_10_20.md](IOS_AUTH_STORAGE_EVIDENCE_2026_10_20.md)
- [docs/IOS_AUTH_STORAGE_SOURCE_REVIEW_2026_10_20.md](IOS_AUTH_STORAGE_SOURCE_REVIEW_2026_10_20.md)
- [lib/supabase/auth-context.tsx](../lib/supabase/auth-context.tsx)
- [scripts/patch-supabase-auth-initial-session.mjs](../scripts/patch-supabase-auth-initial-session.mjs)
- [tests/auth-storage-initialization.test.ts](../tests/auth-storage-initialization.test.ts)
- [tests/auth-storage-sdk-patch.test.ts](../tests/auth-storage-sdk-patch.test.ts)
- [tests/platform-network-boundary.test.ts](../tests/platform-network-boundary.test.ts)

上述檔案在本次只命中登入／網路事件訂閱；若未來加入付費方案依賴，應移回第 6 節。

## 8. 維護紀錄

### 2026-10-23 增量：準備模板的既有 Team 交集

- [migration 077](../supabase/migrations/077_add_preparation_templates.sql)：新模板 helper／writer 沿 `has_authoritative_team_entitlement` 限制同品牌 active manager；owner 不增加付費限制。已確認雲端套用、本機啟用及真實 owner 驗收，沒有改方案、價格、席次或購買接線；正式部署仍待做。
- [模板 UI](../components/markets/PreparationTemplatePanel.tsx)：沿現有待辦管理能力與 fresh role 顯示，不是商店訂閱驗證。
- [模板切片紀錄](MARKET_PREPARATION_TEMPLATES_2026_10_23.md)、[隔離 SQL 檢查](../scripts/verify-preparation-template-sql.mjs)：記錄 Team 撤回即拒絕讀／寫／套用與目前啟用狀態。以上為初次清單後的增量導航，不重算歷史 305 檔盤點。

| 日期 | 變更 | 核對方式 |
| --- | --- | --- |
| 2026-10-20 | 建立變更導航、303 個來源檔索引、執行狀態與維護規則 | 檔案掃描、直接 import、關鍵程式與連結核對；沒有啟用產品服務 |
| 2026-10-23 | 新增制度整備報告，總數 304；確認員工仍屬 Team，補強共用層無效到期日／評估時間拒絕授權 | 本機來源與 canonical 任務核對、先失敗後修正的權益回歸；未變更方案、價格、SQL 或付款啟用 |
| 2026-10-23 | 新增已確認價格／首購優惠與可設定營運後台需求，總數 305；舊制度與 FERIA50 文件標示歷史入口 | 核對本機價格模型、migration 066、canonical gates、Apple／Google 官方規則及文件連結；只更新需求與導航，未啟用收費 |
| 2026-10-23 | 依使用者要求增補新客牌價、優惠到期價格、舊客調價批次、逐戶價格及通知歷程與 5 項待辦；來源檔總數仍為 305 | 文件內容、連結與差異核對；未實作後台、核定通知天數或執行調價 |
| 2026-10-23 | 使用者確認未來調價政策：首發優惠按揭露還原、既有月繳至少提前 60 天通知、年繳於符合條件續訂調整、早期用戶限期保價；待辦增至 6 項，來源檔總數仍為 305 | 核對本輪決策、移除 60 天尚未核定的現行描述、文件連結與差異；未實作或執行調價，一年保價仍為活動範例 |

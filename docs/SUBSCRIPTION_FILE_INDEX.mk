# 訂閱方案變更導航與完整檔案索引

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

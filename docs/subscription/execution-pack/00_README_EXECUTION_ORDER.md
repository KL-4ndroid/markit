# Feria 訂閱制執行文件包｜AI 執行順序

日期：2026-07-24  
最後更新：2026-07-29  
狀態：規劃與執行切片文件  
適用專案：Feria / BoothBook / markit

本文件包由下列 canonical 文件重整而成：

- `SUBSCRIPTION_TIER_PLAN_2026_07_24.md`
- `SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md`
- `subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md`

本文件包是衍生執行清單，不是獨立 source of truth。權威順序為：

1. `docs/SUBSCRIPTION_TIER_PLAN_2026_07_24.md`
2. `docs/subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md`
3. `docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md`
4. 本 execution-pack

發生衝突時必須以前三份 canonical 文件為準。

目的不是立即上線收費，而是先建立一套可驗證、可逐步擴充、不可由前端偽造的訂閱能力模型。

## 1. 核心原則

1. Free 必須能完成真實市集工作，不得在出攤當天阻擋基本記錄。
2. 付費價值集中於決策、專業輸出、團隊協作、照片與高成本能力。
3. 訂閱權限必須以 server-side source of truth 為準。
4. 訂閱方案權限不得取代 owner / manager / operator / viewer 的角色權限。
5. 付費能力必須同時通過帳戶方案能力、角色權限、runtime gate、資料完整度。
6. 降級不得刪除既有資料。
7. 未批准前不得接金流、不得顯示假付款成功或假續訂日期。
8. 未批准前不得建立公開 marketplace、創作者端、聊天媒合或抽成結算。
9. Growth Reserve 目前只保留為策略能力，不作為正式 runtime 方案。
10. 任何 staff role、viewer、operator、manager、owner、PermissionGate、useUserRole、role-capabilities、sync / Dexie 權限行為的修改，都必須同步更新專案中的權限分布 Markdown 文件。
11. 初期推薦採直接一層、雙邊、里程碑式 Pro Pass；不因註冊發獎勵，不做現金或多層推薦。
12. Pro 創始年繳鎖價是 server-owned 的固定價格指派；公開價調漲不得改寫有效鎖價，取消必須到期末實際中斷才失效。
13. Pro 升 Team 在 provider 確認後立即生效，保留 actual-paid Pro 剩餘價值，Team 使用當時價且不套用 65%；創始 Pro 鎖價在連續 Team 付費期間轉 dormant。

## 2. 執行順序

AI 必須依序閱讀：

1. `../SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md`
2. `01_PRODUCT_DECISIONS_AND_OPEN_QUESTIONS.md`
3. `02_TIER_AND_FEATURE_DEFINITION_MATRIX.md`
4. `03_SUBSCRIPTION_DOMAIN_MODEL.md`
5. `04_PLAN_ROLE_PERMISSION_INTERSECTION.md`
6. `05_LIFECYCLE_DOWNGRADE_RETENTION.md`
7. `06_IMPLEMENTATION_SLICES_S0_S2.md`
8. `07_IMPLEMENTATION_SLICES_S3_S6.md`
9. `08_PLATFORM_RESERVE_AND_BILLING_S7_S9.md`
10. `09_TEST_VALIDATION_AND_AI_HANDOFF.md`

不得跳過前面的產品決策與權限規則，直接實作後面的 UI 或 API。

## 3. AI 執行方式

每次只執行一個 slice。

開始前必須輸出：

- 本次 slice 名稱；
- 目標；
- 預計修改檔案；
- 預計新增測試；
- 明確不修改的檔案；
- 是否觸及 stop condition。

完成後必須輸出：

- 已修改檔案；
- 測試結果；
- build / lint / TypeScript 結果；
- 權限文件是否同步更新；
- 尚未處理風險；
- commit hash；
- 是否可進入下一個 slice。

## 4. 第一階段允許範圍

預設只允許執行：

- S0A / S0B：現況稽核與誠實呈現守衛；
- S1A / S1B：純方案、能力與 access resolver；
- S2A / S2B：共用 presentation model 與 hardcoded UI 替換。

未經明確批准，不得進入 S3–S9 或 P1–P5。P0 僅限規劃文件。

## 5. 明確禁止

未經批准不得：

- 安裝 Stripe、StoreKit、Google Play Billing 或其他金流 SDK；
- 建立 checkout、付款卡、試用啟用、取消或退款流程；
- 修改 Supabase RLS 或 staff views；
- 擴張角色能力；
- 啟用 production photo upload、sales evidence、PDF / Excel；
- 建立公開品牌頁、partner snapshot、creator search、chat、matching；
- 刪除降級後的既有資料；
- 用 localStorage、public env、disabled button 或 UI 標籤授予付費權限；
- 建立 referral attribution、reward grant、Pro Pass activation、contact import、subscription credit、cash commission 或 multi-level reward；
- 建立 founder eligibility、price assignment、price lock table、provider price / discount / offer code、plan-change quote、proration、credit / refund、upgrade / downgrade 或結帳流程。

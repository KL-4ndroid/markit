# Feria 人工上架工作操作指南

日期：2026-08-10

狀態：執行指南；所有列出的人工工作仍待完成

對應任務矩陣：`docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json`

本文件把目前七類人工工作整理成單一操作入口。它不是完成證據、法律意見、
Production 核准或上架核准。完成一項工作後，仍須由 Codex 依去識別化回報與
canonical evidence 更新任務狀態；不得僅因看過本文件而把 Gate 改為 `complete`。

Web 綠界定期定額維持延後。這份指南的付費上架主線是 Apple App Store 與
Google Play 帳號綁定訂閱；不得在本批工作中啟用 ECPay、Web checkout、
付款 callback、退款 mutation 或 entitlement mutation。

## 1. 共通執行規則

### 1.1 建議順序

可立即平行進行：

1. 核准商業政策、帳號刪除政策及正式法務內容。
2. 完成 Apple／Google 帳號、協議、稅務、收款與裝置準備。
3. 執行 SRA-000 唯讀安全盤點。
4. 在有明確維護時段與安全回復能力時，執行兩個 Capacitor Gate 2 R2 受控失敗案例。
5. 設定 Web Production 與 observability provider。

有前置依賴：

- Apple／Google 訂閱商品只能在商業政策核准後建立。
- PWA 真實安裝、service worker 第二次部署更新、最終 security headers 證據，
  必須綁定選定的 Production release SHA。
- 原生 store API、通知、sandbox 完整訂閱生命週期，必須等待另行核准的
  verifier、entitlement writer、Capacitor 專案與 native adapter。

### 1.2 證據分層

| 存放位置 | 允許內容 | 禁止內容 |
| --- | --- | --- |
| 受限外部 evidence vault | 原始 console 截圖、完整報表、內部 object 定義、簽核文件 | 不得公開分享 |
| Git repository | 日期、環境類型、固定檢查 ID、PASS/FAIL、計數、SHA、masked target、雜湊 | secret、token、完整 project ref、帳密、銀行／稅務資料、tester 身分、客戶資料、object key |
| 回報 Codex | task ID、狀態、日期、環境、結果、去識別摘要 | 任何完整環境值、平台帳號或 provider reference |

所有 Production 或 provider console 操作都應由擁有對應權限的人執行。截圖前先
遮蔽帳號、信箱、地址、識別碼、金流與稅務內容；不把 `.env` 檔、console 匯出、
SQL 原始輸出或付款文件加入 Git。

### 1.3 共通停止條件

出現以下情況立即停止該項操作，保持 fail closed，記錄去識別化失敗原因：

- 無法確認 target、部署 SHA、操作者角色或測試資料隔離範圍。
- 需要放寬 RLS、grant、CORS、function EXECUTE 或 store 權限才能繼續。
- 發現跨 owner、跨角色或未授權資料可見／可寫。
- 受控失敗後無法證明 R2 清理完成、暫時變數已移除或安全部署已恢復。
- 平台要求接受新的商務、法律、稅務或價格條款，但尚未取得負責人核准。
- 測試可能產生正式扣款、退款、取消、資料刪除或 Production migration。

## 2. Capacitor Gate 2：兩個 R2 受控失敗證據

任務 ID：`NATIVE-GATE2-EVIDENCE`

Canonical runbook：

- `docs/IOS_PHASE2_GATE2_COMPENSATION_RUNBOOK.md`
- `docs/IOS_PHASE2_GATE2_COMPENSATION_EVIDENCE_TEMPLATE.md`

本節是操作索引；故障注入值、exact scope 與復原判定一律以 runbook 為準，不得
自行建立第二條 route、probe 或清理流程。

### 2.1 開始前

- 選定一個已核准、可回復、可檢查 R2 的部署與 exact release SHA。
- 使用隔離 owner、隔離 market、兩筆各自獨立的 sale，以及不含個資的測試圖片。
- 確認正常 sync idle、無其他 pending writes，兩筆 sale 各保留一個 local pending payload。
- 確認目前安全部署不存在七個 fault-injection 變數。
- 確認可用唯讀方式檢查 R2 object 是否存在，且不會輸出 object key。
- 先建立 evidence template，再安排一位執行者與一位能確認安全回復的 reviewer。

### 2.2 Probe A：`thumbnail_upload_failed`

1. 只對第一筆隔離 sale 設定 runbook 規定的七個變數與 exact scope。
2. 部署後先確認 release SHA，再由 owner UI 提交一次；故障部署期間不得重試。
3. 驗證固定結果：`r2_thumbnail_upload_failed`、`cleanupIncomplete=false`、local payload 保留。
4. 驗證 metadata 未成為 `uploaded`，且本次建立的 image object 已從 R2 消失。
5. 只記錄固定 code、boolean、時間、SHA 與 masked target。
6. 移除全部七個變數，重新部署安全版本並再次確認 SHA。
7. 在安全版本正常重試一次：pending 清零、私有圖片可讀、只出現一筆 metadata，
   且沒有重複 object pair。

### 2.3 Probe B：`metadata_finalize_failed`

1. 改用第二筆隔離 sale，依相同部署紀律設定 exact scope。
2. 提交一次後驗證：`metadata_finalize_failed`、`cleanupIncomplete=false`、local payload 保留。
3. 驗證 metadata 未成為 `uploaded`，本次 image 與 thumbnail object 均已從 R2 消失，
   finalize mutation 未被接受。
4. 移除全部七個變數，部署並確認安全版本。
5. 正常重試一次，驗證 pending 清零、私有圖片可讀，且沒有重複 row 或 object pair。

### 2.4 每次 Probe 後的安全檢查

```powershell
$env:APP_API_SMOKE_BASE_URL='https://<selected-host>'
npm.cmd run smoke:api:staging
```

另執行現行 deployment runbook 規定的 commit-bound release smoke。完成定義是兩個
Probe 都具有 fault release 與 safe release 身分、預期 failure code、完整 compensation、
local payload 正常重試、零重複，以及 provider console 顯示七個暫時變數全部移除。

若 `cleanupIncomplete` 不是 `false`、object 仍存在或安全部署無法確認，不得進行
第二個 Probe，也不得把 Gate 2 回報為完成。

## 3. Apple／Google 帳號與實機準備

任務 ID：`APPLE-ACCOUNT-READINESS`、`GOOGLE-ACCOUNT-READINESS`

Canonical handoff：

- `docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.md`
- `docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json`

平台規則會變動，執行當日要以 console 與官方文件為準。Apple 官方要求提供 IAP
前由 Account Holder 接受 Paid Apps Agreement；Google 個人帳號的裝置驗證與封閉測試
條件則須依帳號類型與建立日期判斷。

### 3.1 Apple 完成清單

| Check ID | 人工操作 | 完成判定 |
| --- | --- | --- |
| `apple.developer_program_enrollment` | 完成 Apple Developer Program enrollment | Membership 顯示有效 |
| `apple.account_holder_access` | 確認 Account Holder 可登入並具簽署權 | 能查看 Business／Agreements，不需分享帳密 |
| `apple.compliance_review` | 完成平台要求的身分與商務 compliance | Console 無待補 blocker |
| `apple.paid_apps_agreement` | 由 Account Holder 接受最新 Paid Apps Agreement | 狀態為有效，不只是已送出 |
| `apple.tax_information` | 在受保護 console 提交適用稅務資料 | 平台顯示完成／有效 |
| `apple.banking_information` | 設定並驗證收款帳戶 | 平台顯示完成／有效 |
| `apple.bundle_id` | 建立正式 Bundle ID | 已保留且與預定 app 身分一致 |
| `apple.app_store_connect_record` | 建立 App Store Connect app record | record 綁定正確 Bundle ID |
| `apple.sandbox_tester` | 建立 Sandbox Apple Account | 可用於 sandbox，不記錄 tester 身分 |
| `apple.mac_xcode_device` | 準備支援版本的 Mac、Xcode 與 iPhone | 可簽署開發 build、裝置已可測試 |
| `apple.subscription_group_products` | 商業政策核准後建立 group、Pro／Team monthly／annual 商品 | 商品存在但未被本文件授權上架或收款 |

官方入口：[Apple account help](https://developer.apple.com/help/account/)、
[App Store Connect agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/)、
[sandbox testing](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox/)。

### 3.2 Google 完成清單

| Check ID | 人工操作 | 完成判定 |
| --- | --- | --- |
| `google.account_type_decision` | 選定並確認 Personal 或 Organization | 類型符合實際法律／商務身分 |
| `google.developer_account` | 完成 Play Console developer account | 帳號有效且可管理 app |
| `google.identity_verification` | 完成平台要求的身分與聯絡方式驗證 | Console 無待補 blocker |
| `google.merchant_payments_profile` | 建立 monetization 所需 merchant payments profile | profile 可供 app 銷售使用 |
| `google.payout_method_verification` | 設定並驗證收款方式 | 平台顯示可收款 |
| `google.app_record_package` | 建立 app record 並保留 package name | record 與預定 Android 身分一致 |
| `google.device_verification_requirement` | 檢查是否適用新個人帳號裝置驗證 | 已完成，或有證據可標 `not_applicable` |
| `google.closed_test_requirement` | 檢查並完成適用的封閉測試門檻 | 已完成，或有證據可標 `not_applicable` |
| `google.license_tester` | 設定 license tester | tester 可取得 sandbox billing，不記錄身分 |
| `google.android_device` | 準備實體 Android 裝置與受支援 Play Store | 可安裝測試 build 並切換測試帳號 |
| `google.subscription_base_plans` | 商業政策核准後建立 Pro／Team subscriptions 與 monthly／annual base plans | 商品存在但未被本文件授權正式啟用 |

官方入口：[Google developer account types](https://support.google.com/googleplay/android-developer/answer/13634885)、
[required account information](https://support.google.com/googleplay/android-developer/answer/13628312)、
[Google Play Billing testing](https://developer.android.com/google/play/billing/test)。

### 3.3 不要提前完成的項目

以下四項維持 `blocked_dependency`，直到 server verification／notification slice
另行核准：

- `apple.server_api_access`
- `apple.server_notifications`
- `google.play_developer_api_access`
- `google.rtdn`

完成帳號清單後，只回報各 check 的狀態。由 Codex 更新 status-only JSON 並執行：

```powershell
npm.cmd run check:native-external-readiness
```

## 4. Pro／Team、試用、寬限期與 Founder 政策核准

任務 ID：`COMMERCIAL-POLICY`

Canonical design：

- `docs/subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md`
- `docs/subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.md`
- `docs/subscription/NATIVE_PURCHASE_DISCLOSURE_CONTRACT_2026_08_06.md`

此工作是商業決策，不是在 store console 直接試填價格。請先建立一份有日期與核准人的
決策紀錄，至少填完下表，再建立任何訂閱商品。

| 決策 | 必填內容 |
| --- | --- |
| Pro | 月繳公開價、年繳公開價、台幣含稅呈現、首發地區 |
| Team | 月繳公開價、年繳公開價、台幣含稅呈現、首發地區 |
| 試用 | 哪些方案／週期可用、天數、每帳號或每 store account 的使用次數 |
| Apple grace period | 是否啟用、適用期間、期間內 entitlement 與通知規則 |
| Google grace/account hold | grace 與 account hold 天數、entitlement 何時保留／降級 |
| Pro -> Team | 立即或下期生效、價差處理、Founder 資格是否延續 |
| Team -> Pro | 立即或下期生效、seat／角色清理、Founder 資格是否延續 |
| 取消／到期 | 何時降級、再次訂閱是否視為新價格、資料與團隊狀態如何處理 |
| 漲價 | 舊訂戶是否保留舊價、需同意時的處理、拒絕或失敗後的狀態 |

目前 Founder 候選承諾是：符合資格者在 Pro 試用期間訂閱 Pro 年繳，可用公開
Pro 年繳價的 65% 購買，之後只要付費連續性不中斷便維持該續訂價；取消、到期或
其他明定中斷後失去資格並恢復當時公開價。核准時還必須明確決定：

1. 「65%」是固定 store price point 對應的顯示價格，不由 client 自行計算或扣款。
2. 哪一個 server-owned eligibility timestamp 判斷「試用期間」。
3. billing retry、grace、account hold 是否仍算連續；refund、chargeback、取消後重訂是否中斷。
4. Pro -> Team、Team -> Pro 與跨平台 restore 時，Founder 價格保留或失效的精確規則。
5. 實作機制選擇：首發價格 cohort、受限專用 Founder 商品／base plan、改為有限期 offer，
   或原生首發暫緩 Founder。
6. 選定機制必須在 Apple 與 Google sandbox 證明不會讓不符合資格的人自行取得低價。

若 Apple／Google 無法可靠實現「永久續訂 65% 且取消即失效」，不得用前端文案承諾；
應選擇修改政策或原生首發暫緩 Founder。核准價格不等於啟用 catalog，也不授權扣款。

## 5. 帳號刪除、資料保留與有效訂閱政策

任務 ID：`ACCOUNT-DELETION-POLICY`

Canonical proposal：`docs/subscription/ACCOUNT_DELETION_IMPLEMENTATION_PROPOSAL_2026_08_06.md`

由產品、法律／隱私、安全、客服與會計共同簽核以下七項：

1. 刪除在重新驗證後立即執行，或先進入可撤回的有限等待期；定義撤回期限。
2. 每一類資料的法律依據、最長保留期、刪除／不可逆匿名化結果與 backup purge 上限。
3. 員工帳號刪除後，owner 的營運歷史如何保留意義，但不保留 email 或可逆 account reference。
4. 付費 identity 如何先與 `profiles.id` 解耦；不得讓既有 F3A/F3B `ON DELETE RESTRICT`
   成為無法刪除帳號的唯一結果。
5. 有效 Apple／Google 訂閱下刪除 Feria 帳號的行為。必須清楚告知：刪除 Feria 帳號
   不等於已向原 store 取消訂閱，並提供 store 管理入口與客服處理路徑。
6. owner workspace 中屬於員工或第三人的資料，哪些保留、匯出、匿名化或刪除。
7. 客服 SLA、身分驗證升級、申訴、證據保留，以及自動清理失敗時的人工處理方式。

保留表至少要逐列涵蓋：profile／workspace、sales／events、staff invitations、audit／security
logs、support cases、product covers、sales photo objects、price assignments、billing ledgers、
store transaction references、device cache／pending writes 與 backups。

完成定義是有日期的七項決策與 retention table 均已核准。這只解除 runtime 設計前置；
不代表刪除 API、server saga、billing detachment 或 store cancellation 已實作。

## 6. 正式法務、隱私、退款、取消、客服與 retention

任務 ID：`LEGAL-SUPPORT-APPROVAL`

Canonical review：

- `docs/WEB_LEGAL_SUPPORT_LAUNCH_REVIEW.md`
- `docs/subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.md`
- `docs/subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.md`

這是工程 Gate 的人工簽核清單，不取代台灣律師、會計師或平台政策審查。

### 6.1 要核准的內容

- 法律營運者名稱、代表人、合法公開地址、管轄與第一審法院文字。
- 隱私告知：目的、資料類別、期間、地區、對象、方式、權利與不提供資料的影響。
- Supabase、Vercel、Cloudflare 與未來 observability provider 的區域、subprocessor、
  跨境、DPA、刪除與 retention 行為。
- 帳號刪除驗證、pending offline write、完成證據、申訴與 backup purge 說明。
- Apple／Google 訂閱的價格、幣別、試用、週期、自動續訂、漲價、取消入口、生效時間、
  refund、invoice／tax、dispute 與 chargeback 文字。
- 不自行假設通訊交易七日解除權一定排除；任何數位內容或線上服務例外須有適用條件、
  事前揭露、明確同意與法律審查。
- 安全事件分級、通知 owner、證據保存、客服升級及演練方式。

### 6.2 客服操作完成條件

1. 建立正式公開客服信箱，指定 primary 與 backup responder。
2. 定義一般、帳務、隱私／刪除、安全事件的首次回覆與升級 SLA。
3. 用不含真實客戶資料的案例完成 received -> replied -> closed 測試。
4. 完成一次非 Production fixture 的 incident escalation drill。
5. 保存 dated product、legal、accounting、privacy/security 與 support-owner 簽核，
   並綁定確切文件版本、公開 URL 與 release SHA。

正式發布後，以 `published` 模式對相同 release 執行：

```powershell
$env:WEB_LEGAL_SMOKE_BASE_URL='https://<production-origin>'
$env:WEB_SMOKE_EXPECTED_COMMIT_SHA='<deployed-sha>'
$env:WEB_LEGAL_SMOKE_MODE='published'
npm.cmd run smoke:web:legal-support
```

smoke PASS 只證明公開 route、headers 與 release identity；沒有簽核、support case、
incident drill 與最終 retention table 時，`LEGAL-SUPPORT` 仍不得完成。

## 7. SRA-000 Supabase 唯讀安全盤點

任務 ID：`SEC-SRA000-EXECUTION`

Canonical runbook：`docs/security/SUPABASE_SECURITY_ADVISOR_INVENTORY_RUNBOOK_2026_08_09.md`

Canonical SQL：`supabase/verification/security_advisor_read_only_inventory.sql`

1. 明確選定 sandbox、staging 或 Production target，記錄 masked target 與時間。
2. 用授權的唯讀 review session 開啟 Supabase SQL Editor。
3. 原樣執行 canonical SQL；不得移除 `READ ONLY`、`ROLLBACK` 或擴大 object filter。
4. 將原始輸出保存到受限 evidence vault，不提交 Git。
5. 從相同 target 匯出當日 Security Advisor findings。
6. 另行記錄 Auth leaked-password protection 的目前狀態。
7. 對照 remediation plan，將 live finding 映射到 `SRA-001` 至 `SRA-010`。
8. 只回報 section 完整性、計數、hash、bounded finding ID、masked target 與 review outcome。

完成時八個 result sections 必須齊全：`inventory_summary`、`staff_view`、
`view_select_acl`、`public_function`、`rls_policy`、`function_execute_acl`、
`function_trigger`、`function_dependency`。

任何 syntax／permission error 都算盤點失敗，不授權放寬 grant。若盤點顯示現存跨 owner
或越權存取，立即停止後續 remediation apply，回報安全問題；不得使用 Advisor bulk fix。

## 8. Web Production、PWA 與 Observability

任務 ID：`WEB-PRODUCTION-CONFIG`、`WEB-SECURITY-HEADERS-FINAL`、
`WEB-PWA-INSTALL`、`WEB-OBSERVABILITY`

### 8.1 Web Production 設定

Canonical references：

- `docs/WEB_PRODUCTION_CONFIG_CHECK.md`
- `docs/WEB_LAUNCH_MANUAL_ACTIONS_2026_08_01.md`
- `docs/WEB_SECURITY_HEADERS.md`

1. 在受保護的 deployment provider 設定 Production 變數與正確 scope；不得貼值到 issue、
   chat、截圖或 Git。
2. 確認 debug、subscription simulation、test page、fault injection 全部關閉。
3. 確認 Supabase public／server 邊界、精確 CORS、release metadata、公開客服／營運者／法務
   日期、private R2、media gates、quota 與 cron 符合已核准狀態。
4. 對本機受保護的 Production env file 執行結構檢查：

```powershell
npm.cmd run check:production-config -- --env-file=.env.production.local
```

5. 部署選定 SHA，先用 `/api/health` 確認 exact release identity，再執行 canonical
   remote release smoke。只保存 check ID、結果、SHA、時間與 deployment 類型。
6. 對最終 release 重跑 security header smoke，並以 unrelated HTTPS origin 完成
   anti-frame probe；截圖只能包含公開資料。

Production config checker PASS 是必要條件，不代表 credentials 可用、media 已核准、
資料庫已套用、付款已啟用或 release 可以 canary。

### 8.2 PWA 真實安裝與更新

Canonical runbook：`docs/WEB_PWA_RELEASE_SMOKE.md`

1. 對選定 SHA 執行 commit-bound resource smoke：

```powershell
$env:WEB_PWA_SMOKE_BASE_URL='https://<production-origin>'
$env:WEB_SMOKE_EXPECTED_COMMIT_SHA='<deployed-sha>'
npm.cmd run smoke:web:pwa
```

2. 在一台 Chromium 桌面完成真正的 OS 安裝，從 installed icon 啟動，確認 standalone shell。
3. 在一台實體 Android 裝置完成安裝，從主畫面 icon 啟動，確認沒有 overflow／遮蔽。
4. 以 owner 驗證 create-market、create-product shortcuts；以 staff 驗證相同 shortcuts
   fail closed，不得繞過 `PermissionGate`。
5. 部署第二個經審查的 revision，重新從 installed app 啟動並驗證 service worker
   取得更新；記錄舊／新 SHA，不記錄私有頁面內容。
6. 保存 install prompt、installed public shell 與 update 結果的公開資料截圖。

完成證據必須同時包含 desktop install、Android install、兩端 installed-icon launch、
second-deployment update、owner shortcuts、staff fail-closed shortcuts。既有 localhost
與 Android-class viewport 證據只能保留為 compatibility baseline，不能取代真實安裝。

### 8.3 Observability provider

Canonical contract：`docs/WEB_OPERATIONAL_OBSERVABILITY.md`

1. 核准一個可接收 schema-v1 JSON server events 與五分鐘 `/api/health` probe 的 provider。
2. 確認 sink 丟棄 identifier、email、IP、user-agent、raw error、request body、R2 key、
   signed URL、token 與 secret；失敗的 logging 不得改變 API 或 sync 行為。
3. 建立 health、media upload／read／delete／compensation／expiration、
   `sync.permission_blocked`、`sync.unexpected_failure` 的 saved query 或 dashboard。
4. 逐項實作 canonical fixed thresholds；低流量時使用絕對次數，不得只用百分比。
5. 指定 primary、backup 與 escalation contact，核准 provider retention、access control、
   audit 與 deletion 設定。
6. 發送一個有日期的 test alert，完成一次 non-production fixture incident drill。
7. 取得完整 36 小時資料後，只匯出 canonical sanitized projection，執行：

```powershell
npm.cmd run check:operational-alerts -- --input=<sanitized-snapshot.json>
```

完成定義是 provider ingestion、dashboard、alerts、通知路由、owner、retention／access、
test alert 與 incident drill 均有證據。billing callback／reconciliation／payment signals
仍等待 Web S9，不屬於此次 observability 設定。

## 9. 完成後回報 Codex

每完成一個 task，使用以下格式回報。若同一大項包含多個 check，附上 check ID 與狀態
列表即可，不要附值、帳號、平台識別碼或未遮蔽截圖。

```text
taskId: <matrix task id>
status: complete | pending_manual | blocked_dependency
executedAt: YYYY-MM-DD
environment: sandbox | staging | production | provider_console | physical_device
result: pass | fail
evidenceStoredExternally: true | false
checks: <bounded check ids and statuses only>
sanitizedSummary: <no secrets, identifiers, account data, or customer data>
```

Codex 收到後應先驗證 canonical completion criteria，再同步 task matrix、對應 Gate 與
status-only handoff。不得從單一 PASS 推導整組 Gate 已完成。

## 10. 本批人工工作完成判定

只有以下條件全部成立，才可說本指南列出的人工批次完成：

- Gate 2 兩個 R2 Probe 與每次 safe recovery 都通過。
- Apple／Google 所有目前適用的 manual checks 完成，四個 runtime-dependent checks
  仍依實際依賴維持 blocked 或在後續核准流程完成。
- 商業價格、lifecycle 與 Founder 機制具有 dated approval，且選定機制可 sandbox 證明。
- 帳號刪除七項決策與 retention table 完整核准。
- 法務／隱私／退款／取消／客服內容已發布並完成 support／incident drill。
- SRA-000 raw inventory、Advisor export、Auth 狀態與 sanitized mapping 完整。
- Web Production、final headers、PWA 真實 lifecycle 與 observability provider evidence 完整。

即使上述人工批次全部完成，整體 `overallStatus` 仍應保持 `not_ready`，直到後續
store verification、entitlement writer、native adapters、account deletion runtime、
完整 sandbox lifecycle、store compliance、canary 與所有 release gates 分別完成。

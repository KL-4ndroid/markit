# Feria 人工上架工作 Checklist

狀態來源更新日：2026-08-27

> 此檔案由 `npm.cmd run update:manual-launch-checklist` 產生，請勿直接手動勾選。
> 操作步驟與停止條件以 `docs/MANUAL_LAUNCH_OPERATIONS_GUIDE_2026_08_09.md` 為準。
> 只有 canonical task、Apple／Google status-only check，或 manual item status 具有完整核准證據時才會自動勾選。`proposed_ai` 只是草案，不算完成。

## 自動化摘要

- 人工 tasks：3/12 完成
- Checklist items：70/134 自動勾選
- 整體 launch 狀態：`not_ready`

## 1. Capacitor Gate 2：兩個 R2 受控失敗證據

指南章節：2　任務：`NATIVE-GATE2-EVIDENCE`

執行模式：`Shared` — AI 執行前後檢查與證據驗證；Human 選檔、操作 Production 變數並確認安全復原

- [x] 任務完成（canonical 狀態：完成／`complete`）
  - [x] 選定可回復、可檢查 R2 的部署與 exact release SHA（已核准；item-status:gate2.release）
  - [x] 準備隔離 owner、market、兩筆 sale 與不含個資的測試圖片（已核准；item-status:gate2.fixtures）
  - [x] 確認 sync idle、無其他 pending writes，且兩筆 sale 各有一個 local pending payload（已核准；item-status:gate2.pending）
  - [x] 確認安全部署沒有七個 fault-injection 變數（已核准；item-status:gate2.safe-baseline）
  - [x] 確認可用唯讀方式檢查 R2 object，且不輸出 object key（已核准；item-status:gate2.r2-read）
  - [x] 建立 evidence template，安排執行者與安全回復 reviewer（已核准；item-status:gate2.evidence-reviewer）
  - [x] 完成 thumbnail_upload_failed Probe，驗證固定錯誤、cleanupIncomplete=false 與 payload 保留（已核准；item-status:gate2.probe-a）
  - [x] 證明 Probe A metadata 未 uploaded，image object 已刪除（已核准；item-status:gate2.probe-a-cleanup）
  - [x] 移除暫時變數、恢復安全部署並正常重試，確認零重複（已核准；item-status:gate2.probe-a-recovery）
  - [x] 完成 metadata_finalize_failed Probe，驗證固定錯誤、cleanupIncomplete=false 與 payload 保留（已核准；item-status:gate2.probe-b）
  - [x] 證明 Probe B metadata 未 uploaded，image 與 thumbnail objects 已刪除，finalize 未接受（已核准；item-status:gate2.probe-b-cleanup）
  - [x] 移除暫時變數、恢復安全部署並正常重試，確認零重複（已核准；item-status:gate2.probe-b-recovery）
  - [x] 每次 Probe 後執行 API smoke 與 commit-bound release smoke（已核准；item-status:gate2.release-smoke）
  - [x] 保存兩組 fault/safe release、完整 compensation、正常重試與暫時變數移除的去識別證據（已核准；item-status:gate2.final-evidence）

## 2. Apple 帳號、協議、商品與實機準備

指南章節：3.1、3.3　任務：`APPLE-ACCOUNT-READINESS`

執行模式：`Shared` — Human 操作 Apple 受保護帳號與裝置；AI 驗證 status-only handoff 與依賴

- [ ] 任務完成（canonical 狀態：待人工完成／`pending_manual`）
  - [ ] 完成 Apple Developer Program enrollment（待人工完成；external:apple.developer_program_enrollment）
  - [ ] 確認 Account Holder access 與簽署權（待人工完成；external:apple.account_holder_access）
  - [ ] 完成 Apple 身分與商務 compliance（待人工完成；external:apple.compliance_review）
  - [ ] 接受並啟用 Paid Apps Agreement（待人工完成；external:apple.paid_apps_agreement）
  - [ ] 提交並完成適用稅務資料（待人工完成；external:apple.tax_information）
  - [ ] 設定並驗證收款帳戶（待人工完成；external:apple.banking_information）
  - [ ] 建立正式 Bundle ID（待人工完成；external:apple.bundle_id）
  - [ ] 建立 App Store Connect app record（待人工完成；external:apple.app_store_connect_record）
  - [ ] 建立可用的 Sandbox Apple Account（待人工完成；external:apple.sandbox_tester）
  - [ ] 準備 Mac、Xcode 與實體 iPhone（待人工完成；external:apple.mac_xcode_device）
  - [ ] 政策核准後建立 subscription group 與 Pro／Team 商品（待人工完成；external:apple.subscription_group_products）
  - [ ] 後續核准 Apple server API access（等待依賴；external:apple.server_api_access）
  - [ ] 後續核准 Apple server notifications（等待依賴；external:apple.server_notifications）

## 3. Google Play 帳號、商品與實機準備

指南章節：3.2、3.3　任務：`GOOGLE-ACCOUNT-READINESS`

執行模式：`Shared` — Human 操作 Play Console 與裝置；AI 驗證 status-only handoff、適用性與依賴

- [ ] 任務完成（canonical 狀態：待人工完成／`pending_manual`）
  - [ ] 選定 Personal 或 Organization account type（待人工完成；external:google.account_type_decision）
  - [ ] 完成 Play Console developer account（待人工完成；external:google.developer_account）
  - [ ] 完成身分與聯絡方式驗證（待人工完成；external:google.identity_verification）
  - [ ] 建立 merchant payments profile（待人工完成；external:google.merchant_payments_profile）
  - [ ] 設定並驗證收款方式（待人工完成；external:google.payout_method_verification）
  - [ ] 建立 app record 並保留 package name（待人工完成；external:google.app_record_package）
  - [ ] 完成裝置驗證，或以證據標示不適用（待人工完成；external:google.device_verification_requirement）
  - [ ] 完成封閉測試門檻，或以證據標示不適用（待人工完成；external:google.closed_test_requirement）
  - [ ] 設定 license tester（待人工完成；external:google.license_tester）
  - [ ] 準備支援 Play Store 的實體 Android 裝置（待人工完成；external:google.android_device）
  - [ ] 政策核准後建立 Pro／Team subscriptions 與 base plans（待人工完成；external:google.subscription_base_plans）
  - [ ] 後續核准 Google Play Developer API access（等待依賴；external:google.play_developer_api_access）
  - [ ] 後續核准 Google RTDN（等待依賴；external:google.rtdn）

## 4. Pro／Team、試用、寬限期與 Founder 政策核准

指南章節：4　任務：`COMMERCIAL-POLICY`

執行模式：`Human` — AI 可整理選項與檢查完整性；價格、優惠與 Founder 規則必須由負責人核准

- [ ] 任務完成（canonical 狀態：待人工完成／`pending_manual`）
  - [x] 建立包含日期與核准人的商業決策紀錄（已核准；item-status:commercial.record）
  - [x] 核准 Pro 月繳／年繳公開價、含稅呈現與首發地區（已核准；item-status:commercial.pro）
  - [x] 核准 Team 月繳／年繳公開價、含稅呈現與首發地區（已核准；item-status:commercial.team）
  - [x] 核准首發優惠碼的折扣、適用資格、不中斷續訂價格與失效規則（已核准；item-status:commercial.launch-promo）
  - [x] 核准首發優惠碼的活動起訖、總兌換上限與公開代碼（已核准；item-status:commercial.launch-promo-operations）
  - [ ] 在 Apple／Google sandbox 證明首發價格 cohort、連續續訂、失效與不合格阻擋（待人工完成；item-status:commercial.launch-promo-continuity）
  - [x] 核准試用方案、週期、天數與使用次數規則（已核准；item-status:commercial.trial）
  - [ ] 在 Apple／Google sandbox 證明 14 天試用、FERIA50 疊加、取消不扣款與重複試用阻擋（待人工完成；item-status:commercial.trial-sandbox）
  - [x] 核准 Apple grace period 與 entitlement／通知規則（已核准；item-status:commercial.apple-grace）
  - [x] 由 support_owner 核准 Apple 付款異常文案、管理入口、升級與值班責任（已核准；item-status:commercial.apple-grace-support）
  - [x] 核准 Google grace／account hold 與降級規則（已核准；item-status:commercial.google-grace）
  - [x] 由 support_owner 核准 Google 付款異常／account hold 文案、管理入口、升級與值班責任（已核准；item-status:commercial.google-grace-support）
  - [x] 核准 Pro 到 Team 的生效、價差、FERIA50、試用與失敗回復規則（已核准；item-status:commercial.upgrade）
  - [x] 核准 Team 到 Pro 的生效、FERIA50、試用、staff／seat 與失敗回復規則（已核准；item-status:commercial.downgrade）
  - [x] 由 support_owner 核准降級通知、staff 存取說明、升級與恢復處理（已核准；item-status:commercial.downgrade-support）
  - [x] 核准取消／到期的降級、價格、資料與團隊規則（已核准；item-status:commercial.cancel-expiry）
  - [x] 由 support_owner 核准取消／到期／退款通知、申訴與誤判恢復流程（已核准；item-status:commercial.cancel-expiry-support）
  - [x] 核准漲價、既有訂戶、同意／拒絕與失敗處理（已核准；item-status:commercial.price-change）
  - [x] 確認 Founder 65% 使用固定 store price point，不由 client 計算（不適用（已有證據）；item-status:commercial.founder-price）
  - [x] 定義 server-owned Founder eligibility timestamp（不適用（已有證據）；item-status:commercial.founder-eligibility）
  - [x] 定義 retry、grace、hold、refund、chargeback 與重訂的連續性（不適用（已有證據）；item-status:commercial.founder-continuity）
  - [x] 定義升降級與跨平台 restore 的 Founder 規則（不適用（已有證據）；item-status:commercial.founder-transition）
  - [x] 選定可由 Apple／Google 支援的 Founder 實作機制或延後方案（已核准；item-status:commercial.founder-mechanism）
  - [x] 在 Apple 與 Google sandbox 證明 Founder 機制不會被未符合資格者取得（不適用（已有證據）；item-status:commercial.founder-sandbox）

## 5. 帳號刪除、資料保留與有效訂閱政策

指南章節：5　任務：`ACCOUNT-DELETION-POLICY`

執行模式：`Human` — AI 可檢查資料類別與矛盾；法律依據、保留期、訂閱與客服政策必須人工核准

- [x] 任務完成（canonical 狀態：完成／`complete`）
  - [x] 核准立即刪除或有限等待期與撤回期限（已核准；item-status:deletion.timing）
  - [x] 由 legal_privacy_owner 核准立即刪除、有效商店訂閱告知與必要保留例外（已核准；item-status:deletion.timing-legal）
  - [x] 核准一般營運資料的刪除／匿名化、物件、裝置 cache 與 backup purge 工程上限（已核准；item-status:deletion.retention）
  - [x] 核准 audit／security、support、subscription、store evidence 與會計帳證的工程分類與上限（已核准；item-status:deletion.retention-regulated）
  - [x] 由 legal_privacy_owner 核准法律依據、精確保留期、legal hold、processor 與完整 retention table（已核准；item-status:deletion.retention-legal）
  - [x] 由 security_owner 核准 audit scope、pseudonymization、存取、事件延長與 purge 證據（已核准；item-status:deletion.retention-security）
  - [x] 核准員工刪除後 owner 營運歷史的不可逆匿名化方式（已核准；item-status:deletion.staff-history）
  - [x] 核准付費 identity 與 profiles.id 的解耦方式（已核准；item-status:deletion.billing-identity）
  - [x] 由 legal_privacy_owner 核准 billing subject 法律基礎、最小化與 erasure boundary（已核准；item-status:deletion.billing-identity-legal）
  - [x] 由 security_owner 核准 billing subject key、存取、加密、audit 與不可重新識別（已核准；item-status:deletion.billing-identity-review）
  - [x] 核准有效 Apple／Google 訂閱下刪除 Féria 帳號的行為與告知（已核准；item-status:deletion.active-store）
  - [x] 核准 owner workspace 中員工／第三方資料的保留、匯出、匿名化或刪除（已核准；item-status:deletion.third-party-data）
  - [x] 由 legal_privacy_owner 核准第三方權利、controller 邊界、shared object 與 appeal（已核准；item-status:deletion.staff-third-party-legal）
  - [x] 由 security_owner 核准匿名化欄位／演算法、linkage resistance 與 evidence（已核准；item-status:deletion.staff-third-party-review）
  - [x] 核准客服 SLA、身分升級、申訴、證據與自動清理失敗處理（已核准；item-status:deletion.support）
  - [x] 由 legal_privacy_owner 核准 active billing、restore boundary、appeal 與 disclosure（已核准；item-status:deletion.active-store-support-legal）
  - [x] 由 security_owner 核准 prior binding、single-owner、anti-replay／race 與 fraud recovery（已核准；item-status:deletion.active-store-support-review）
  - [x] 完成並核准涵蓋指南所列全部資料類別的 retention table（已核准；item-status:deletion.retention-table）
  - [x] 保存產品、法律／隱私、安全、客服與會計的 dated approval（已核准；item-status:deletion.dated-approval）

## 6. 帳號刪除 AI 實作與發布證據

指南章節：5　任務：`ACCOUNT-DELETION-RUNTIME`

執行模式：`Shared` — AI 實作與執行 synthetic／non-Production 驗證；Human 核准 destructive scope、外部帳號與 Production go/no-go

- [ ] 任務完成（canonical 狀態：待核准／`pending_approval`）
  - [x] AD0 完成 repository-only schema、FK、RLS、R2 與既有刪除路徑盤點（已核准；item-status:deletion-runtime.ad0）
  - [x] AD1 完成 threat model、共享 contracts、review-only migration／RLS 草案與 synthetic tests（已核准；item-status:deletion-runtime.ad1）
  - [x] AD2 完成預設關閉的 server route、recent reauth、leased saga、pending-write preflight 與 legacy UI cutover foundation（已核准；item-status:deletion-runtime.ad2）
  - [x] AD3A 完成 reviewed numbered migration、concrete RPC repository、local-target fail-closed guard 與 synthetic guardrails（已核准；item-status:deletion-runtime.ad3a-code）
  - [x] AD3 在指定 non-Production target 套用 reviewed migration/repository，完成 disposable lifecycle、R2 purge 與 restore tests（已核准；item-status:deletion-runtime.ad3）
  - [x] AD4 preparation 完成 release-candidate blocker inventory、store/device evidence matrix 與 fail-closed readiness checker（已核准；item-status:deletion-runtime.ad4-prep）
  - [ ] AD4 完成實機 store lifecycle、公開政策、客服與 release-candidate 對齊（待人工完成；item-status:deletion-runtime.ad4）
  - [ ] AD5 取得 exact Production go/no-go、發布與 release-bound evidence（待人工完成；item-status:deletion-runtime.ad5）

## 7. 正式法務、隱私、退款、取消、客服與 retention

指南章節：6　任務：`LEGAL-SUPPORT-APPROVAL`

執行模式：`Human` — AI 可做版本與必填欄位檢查；法律、公開內容、信箱責任與跨職能簽核必須人工完成

- [ ] 任務完成（canonical 狀態：待人工完成／`pending_manual`）
  - [ ] 核准法律營運者、代表人、公開地址、管轄與法院文字（待人工完成；item-status:legal.operator）
  - [ ] 核准隱私告知的目的、資料類別、期間、地區、對象、方式與權利（AI 草案待核准；item-status:legal.privacy）
  - [ ] 核准 Supabase、Vercel、Cloudflare 與 observability provider 的跨境／DPA／retention 行為（AI 草案待核准；item-status:legal.subprocessors）
  - [ ] 核准帳號刪除、offline pending write、證據、申訴與 backup purge 說明（AI 草案待核准；item-status:legal.deletion）
  - [ ] 核准 Apple／Google 價格、試用、續訂、取消、退款、稅務與爭議文字（AI 草案待核准；item-status:legal.subscription）
  - [ ] 完成通訊交易解除權與數位服務例外的法律審查（待人工完成；item-status:legal.withdrawal-right）
  - [ ] 核准安全事件分級、通知、證據保存、客服升級與演練方式（AI 草案待核准；item-status:legal.security）
  - [ ] 建立公開客服信箱並指定 primary／backup responder（待人工完成；item-status:support.mailbox）
  - [ ] 定義一般、帳務、隱私／刪除與安全事件 SLA（AI 草案待核准；item-status:support.sla）
  - [ ] 以無客戶資料案例完成 received 到 replied 到 closed 測試（待人工完成；item-status:support.case-drill）
  - [ ] 完成一次 non-Production fixture incident escalation drill（待人工完成；item-status:support.incident-drill）
  - [ ] 保存 dated 跨職能簽核並綁定文件版本、公開 URL 與 release SHA（待人工完成；item-status:support.approvals）
  - [ ] 對正式發布 release 執行 published-mode legal support smoke（待人工完成；item-status:legal.published-smoke）

## 8. SRA-000 Supabase 唯讀安全盤點

指南章節：7　任務：`SEC-SRA000-EXECUTION`

執行模式：`Shared` — Human 提供授權 read-only session；AI 驗證 canonical sections、計數、hash 與 finding mapping

- [x] 任務完成（canonical 狀態：完成／`complete`）
  - [x] 選定 target，記錄 masked target 與時間（完成；parent task）
  - [x] 使用授權的唯讀 review session（完成；parent task）
  - [x] 原樣執行 canonical SQL，不移除 READ ONLY／ROLLBACK 或擴大 filter（完成；parent task）
  - [x] 將原始輸出保存到受限 evidence vault，不提交 Git（完成；parent task）
  - [x] 從相同 target 匯出當日 Security Advisor findings（完成；parent task）
  - [x] 記錄 Auth leaked-password protection 狀態（完成；parent task）
  - [x] 將 live findings 映射到 SRA-001 至 SRA-010（完成；parent task）
  - [x] 只回報完整性、計數、hash、bounded finding ID、masked target 與 outcome（完成；parent task）
  - [x] 確認八個 canonical result sections 全部齊全且無 syntax／permission error（完成；parent task）

## 9. Web Production 設定與 release identity

指南章節：8.1　任務：`WEB-PRODUCTION-CONFIG`

執行模式：`Shared` — Human 操作 deployment provider；AI 執行 secret-free config、identity 與 remote smoke 驗證

- [ ] 任務完成（canonical 狀態：待人工完成／`pending_manual`）
  - [ ] 在受保護 deployment provider 設定 Production 變數與正確 scope（待人工完成；parent task）
  - [ ] 確認 debug、simulation、test page 與 fault injection 全部關閉（待人工完成；parent task）
  - [ ] 確認 Supabase、CORS、release metadata、法務、R2、media、quota 與 cron 狀態（待人工完成；parent task）
  - [ ] 對受保護 Production env file 執行 production config checker（待人工完成；parent task）
  - [ ] 部署選定 SHA，確認 health release identity 並執行 remote release smoke（待人工完成；parent task）

## 10. Web 最終 security headers 與 anti-frame 證據

指南章節：8.1　任務：`WEB-SECURITY-HEADERS-FINAL`

執行模式：`Shared` — AI 可執行公開 header probe；Human 提供最終 release 與 unrelated-origin 瀏覽器證據

- [ ] 任務完成（canonical 狀態：待人工完成／`pending_manual`）
  - [ ] 對最終 release 重跑 security header smoke（待人工完成；parent task）
  - [ ] 以 unrelated HTTPS origin 完成 anti-frame probe（待人工完成；parent task）
  - [ ] 保存只含公開資料、release SHA、時間與結果的證據（待人工完成；parent task）

## 11. PWA 真實安裝與更新

指南章節：8.2　任務：`WEB-PWA-INSTALL`

執行模式：`Shared` — AI 執行 resource smoke；Human 在桌面與實體 Android 完成 OS 安裝、啟動及更新觀察

- [ ] 任務完成（canonical 狀態：待人工完成／`pending_manual`）
  - [ ] 對選定 SHA 執行 commit-bound resource smoke（待人工完成；parent task）
  - [ ] 在 Chromium 桌面完成 OS 安裝與 installed-icon standalone 啟動（待人工完成；parent task）
  - [ ] 在實體 Android 完成安裝與 installed-icon 啟動，確認無 overflow／遮蔽（待人工完成；parent task）
  - [ ] 驗證 owner shortcuts 可用、staff shortcuts fail closed（待人工完成；parent task）
  - [ ] 部署第二個審查 revision，驗證 service worker 更新並記錄舊／新 SHA（待人工完成；parent task）
  - [ ] 保存 install prompt、public shell 與 update 的公開資料截圖（待人工完成；parent task）

## 12. Observability provider、alerts 與 incident drill

指南章節：8.3　任務：`WEB-OBSERVABILITY`

執行模式：`Shared` — Human 核准 provider、owners 與 retention；AI 驗證 redaction、threshold、sanitized snapshot 與 checker

- [ ] 任務完成（canonical 狀態：待人工完成／`pending_manual`）
  - [ ] 核准可接收 schema-v1 events 與五分鐘 health probe 的 provider（待人工完成；parent task）
  - [ ] 確認 sink 丟棄 identifiers、raw errors、request body、R2 keys、URLs、tokens 與 secrets（待人工完成；parent task）
  - [ ] 建立 health、media 與 sync saved queries／dashboards（待人工完成；parent task）
  - [ ] 實作 canonical fixed thresholds，低流量使用絕對次數（待人工完成；parent task）
  - [ ] 指定 primary／backup／escalation 並核准 retention、access、audit 與 deletion（待人工完成；parent task）
  - [ ] 發送 dated test alert 並完成 non-Production fixture incident drill（待人工完成；parent task）
  - [ ] 取得 36 小時資料，匯出 sanitized projection 並通過 operational alerts checker（待人工完成；parent task）

## 更新方式

1. 先依指南驗證完成證據，再更新 canonical task matrix、Gate、manual item status 或 Apple／Google status-only handoff。
2. 執行 `npm.cmd run update:manual-launch-checklist` 重新產生本檔。
3. 執行 `npm.cmd run check:manual-launch-checklist` 驗證沒有漂移。
4. 不得只修改本 Checklist 來宣告 task 或 Gate 完成。

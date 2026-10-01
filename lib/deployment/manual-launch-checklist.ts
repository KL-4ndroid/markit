import type {
  LaunchExecutionPlanDocument,
  LaunchExecutionTaskStatus,
} from './launch-execution-plan';
import type {
  NativeExternalAccountCheckId,
  NativeExternalAccountCheckStatus,
  NativeExternalAccountReadinessDocument,
} from './native-external-account-readiness';
import type {
  ManualLaunchItemStatus,
  ManualLaunchItemStatusDocument,
} from './manual-launch-item-status';

export const MANUAL_LAUNCH_CHECKLIST_SOURCE_GUIDE =
  'docs/MANUAL_LAUNCH_OPERATIONS_GUIDE_2026_08_09.md' as const;
export const MANUAL_LAUNCH_CHECKLIST_OUTPUT_PATH =
  'docs/MANUAL_LAUNCH_OPERATIONS_CHECKLIST_2026_08_09.md' as const;

type ChecklistItemDefinition = Readonly<{
  id: string;
  label: string;
  externalCheckId?: NativeExternalAccountCheckId;
}>;

type ChecklistTaskDefinition = Readonly<{
  taskId: string;
  title: string;
  guideSection: string;
  executionMode: 'human' | 'shared';
  aiAssistance: string;
  items: readonly ChecklistItemDefinition[];
}>;

const item = (
  id: string,
  label: string,
  externalCheckId?: NativeExternalAccountCheckId,
): ChecklistItemDefinition => Object.freeze({ id, label, externalCheckId });

export const MANUAL_LAUNCH_CHECKLIST_TASKS: readonly ChecklistTaskDefinition[] = Object.freeze([
  {
    taskId: 'NATIVE-GATE2-EVIDENCE',
    title: 'Capacitor Gate 2：兩個 R2 受控失敗證據',
    guideSection: '2',
    executionMode: 'shared',
    aiAssistance: 'AI 執行前後檢查與證據驗證；Human 選檔、操作 Production 變數並確認安全復原',
    items: [
      item('gate2.release', '選定可回復、可檢查 R2 的部署與 exact release SHA'),
      item('gate2.fixtures', '準備隔離 owner、market、兩筆 sale 與不含個資的測試圖片'),
      item('gate2.pending', '確認 sync idle、無其他 pending writes，且兩筆 sale 各有一個 local pending payload'),
      item('gate2.safe-baseline', '確認安全部署沒有七個 fault-injection 變數'),
      item('gate2.r2-read', '確認可用唯讀方式檢查 R2 object，且不輸出 object key'),
      item('gate2.evidence-reviewer', '建立 evidence template，安排執行者與安全回復 reviewer'),
      item('gate2.probe-a', '完成 thumbnail_upload_failed Probe，驗證固定錯誤、cleanupIncomplete=false 與 payload 保留'),
      item('gate2.probe-a-cleanup', '證明 Probe A metadata 未 uploaded，image object 已刪除'),
      item('gate2.probe-a-recovery', '移除暫時變數、恢復安全部署並正常重試，確認零重複'),
      item('gate2.probe-b', '完成 metadata_finalize_failed Probe，驗證固定錯誤、cleanupIncomplete=false 與 payload 保留'),
      item('gate2.probe-b-cleanup', '證明 Probe B metadata 未 uploaded，image 與 thumbnail objects 已刪除，finalize 未接受'),
      item('gate2.probe-b-recovery', '移除暫時變數、恢復安全部署並正常重試，確認零重複'),
      item('gate2.release-smoke', '每次 Probe 後執行 API smoke 與 commit-bound release smoke'),
      item('gate2.final-evidence', '保存兩組 fault/safe release、完整 compensation、正常重試與暫時變數移除的去識別證據'),
    ],
  },
  {
    taskId: 'APPLE-ACCOUNT-READINESS',
    title: 'Apple 帳號、協議、商品與實機準備',
    guideSection: '3.1、3.3',
    executionMode: 'shared',
    aiAssistance: 'Human 操作 Apple 受保護帳號與裝置；AI 驗證 status-only handoff 與依賴',
    items: [
      item('apple.enrollment', '完成 Apple Developer Program enrollment', 'apple.developer_program_enrollment'),
      item('apple.account-holder', '確認 Account Holder access 與簽署權', 'apple.account_holder_access'),
      item('apple.compliance', '完成 Apple 身分與商務 compliance', 'apple.compliance_review'),
      item('apple.paid-agreement', '接受並啟用 Paid Apps Agreement', 'apple.paid_apps_agreement'),
      item('apple.tax', '提交並完成適用稅務資料', 'apple.tax_information'),
      item('apple.bank', '設定並驗證收款帳戶', 'apple.banking_information'),
      item('apple.bundle-id', '建立正式 Bundle ID', 'apple.bundle_id'),
      item('apple.app-record', '建立 App Store Connect app record', 'apple.app_store_connect_record'),
      item('apple.sandbox', '建立可用的 Sandbox Apple Account', 'apple.sandbox_tester'),
      item('apple.device', '準備 Mac、Xcode 與實體 iPhone', 'apple.mac_xcode_device'),
      item('apple.products', '政策核准後建立 subscription group 與 Pro／Team 商品', 'apple.subscription_group_products'),
      item('apple.server-api', '後續核准 Apple server API access', 'apple.server_api_access'),
      item('apple.notifications', '後續核准 Apple server notifications', 'apple.server_notifications'),
    ],
  },
  {
    taskId: 'GOOGLE-ACCOUNT-READINESS',
    title: 'Google Play 帳號、商品與實機準備',
    guideSection: '3.2、3.3',
    executionMode: 'shared',
    aiAssistance: 'Human 操作 Play Console 與裝置；AI 驗證 status-only handoff、適用性與依賴',
    items: [
      item('google.account-type', '選定 Personal 或 Organization account type', 'google.account_type_decision'),
      item('google.developer', '完成 Play Console developer account', 'google.developer_account'),
      item('google.identity', '完成身分與聯絡方式驗證', 'google.identity_verification'),
      item('google.merchant', '建立 merchant payments profile', 'google.merchant_payments_profile'),
      item('google.payout', '設定並驗證收款方式', 'google.payout_method_verification'),
      item('google.app-record', '建立 app record 並保留 package name', 'google.app_record_package'),
      item('google.device-verification', '完成裝置驗證，或以證據標示不適用', 'google.device_verification_requirement'),
      item('google.closed-test', '完成封閉測試門檻，或以證據標示不適用', 'google.closed_test_requirement'),
      item('google.license-tester', '設定 license tester', 'google.license_tester'),
      item('google.device', '準備支援 Play Store 的實體 Android 裝置', 'google.android_device'),
      item('google.products', '政策核准後建立 Pro／Team subscriptions 與 base plans', 'google.subscription_base_plans'),
      item('google.server-api', '後續核准 Google Play Developer API access', 'google.play_developer_api_access'),
      item('google.rtdn', '後續核准 Google RTDN', 'google.rtdn'),
    ],
  },
  {
    taskId: 'COMMERCIAL-POLICY',
    title: 'Pro／Team、試用、寬限期與 Founder 政策核准',
    guideSection: '4',
    executionMode: 'human',
    aiAssistance: 'AI 可整理選項與檢查完整性；價格、優惠與 Founder 規則必須由負責人核准',
    items: [
      item('commercial.record', '建立包含日期與核准人的商業決策紀錄'),
      item('commercial.pro', '核准 Pro 月繳／年繳公開價、含稅呈現與首發地區'),
      item('commercial.team', '核准 Team 月繳／年繳公開價、含稅呈現與首發地區'),
      item('commercial.launch-promo', '核准首發優惠碼的折扣、適用資格、不中斷續訂價格與失效規則'),
      item('commercial.launch-promo-operations', '核准首發優惠碼的活動起訖、總兌換上限與公開代碼'),
      item('commercial.launch-promo-continuity', '在 Apple／Google sandbox 證明首發價格 cohort、連續續訂、失效與不合格阻擋'),
      item('commercial.trial', '核准試用方案、週期、天數與使用次數規則'),
      item('commercial.trial-sandbox', '在 Apple／Google sandbox 證明 14 天試用、FERIA50 疊加、取消不扣款與重複試用阻擋'),
      item('commercial.apple-grace', '核准 Apple grace period 與 entitlement／通知規則'),
      item('commercial.apple-grace-support', '由 support_owner 核准 Apple 付款異常文案、管理入口、升級與值班責任'),
      item('commercial.google-grace', '核准 Google grace／account hold 與降級規則'),
      item('commercial.google-grace-support', '由 support_owner 核准 Google 付款異常／account hold 文案、管理入口、升級與值班責任'),
      item('commercial.upgrade', '核准 Pro 到 Team 的生效、價差、FERIA50、試用與失敗回復規則'),
      item('commercial.downgrade', '核准 Team 到 Pro 的生效、FERIA50、試用、staff／seat 與失敗回復規則'),
      item('commercial.downgrade-support', '由 support_owner 核准降級通知、staff 存取說明、升級與恢復處理'),
      item('commercial.cancel-expiry', '核准取消／到期的降級、價格、資料與團隊規則'),
      item('commercial.cancel-expiry-support', '由 support_owner 核准取消／到期／退款通知、申訴與誤判恢復流程'),
      item('commercial.price-change', '核准漲價、既有訂戶、同意／拒絕與失敗處理'),
      item('commercial.founder-price', '確認 Founder 65% 使用固定 store price point，不由 client 計算'),
      item('commercial.founder-eligibility', '定義 server-owned Founder eligibility timestamp'),
      item('commercial.founder-continuity', '定義 retry、grace、hold、refund、chargeback 與重訂的連續性'),
      item('commercial.founder-transition', '定義升降級與跨平台 restore 的 Founder 規則'),
      item('commercial.founder-mechanism', '選定可由 Apple／Google 支援的 Founder 實作機制或延後方案'),
      item('commercial.founder-sandbox', '在 Apple 與 Google sandbox 證明 Founder 機制不會被未符合資格者取得'),
    ],
  },
  {
    taskId: 'ACCOUNT-DELETION-POLICY',
    title: '帳號刪除、資料保留與有效訂閱政策',
    guideSection: '5',
    executionMode: 'human',
    aiAssistance: 'AI 可檢查資料類別與矛盾；法律依據、保留期、訂閱與客服政策必須人工核准',
    items: [
      item('deletion.timing', '核准立即刪除或有限等待期與撤回期限'),
      item('deletion.timing-legal', '由 legal_privacy_owner 核准立即刪除、有效商店訂閱告知與必要保留例外'),
      item('deletion.retention', '核准一般營運資料的刪除／匿名化、物件、裝置 cache 與 backup purge 工程上限'),
      item('deletion.retention-regulated', '核准 audit／security、support、subscription、store evidence 與會計帳證的工程分類與上限'),
      item('deletion.retention-legal', '由 legal_privacy_owner 核准法律依據、精確保留期、legal hold、processor 與完整 retention table'),
      item('deletion.retention-security', '由 security_owner 核准 audit scope、pseudonymization、存取、事件延長與 purge 證據'),
      item('deletion.staff-history', '核准員工刪除後 owner 營運歷史的不可逆匿名化方式'),
      item('deletion.billing-identity', '核准付費 identity 與 profiles.id 的解耦方式'),
      item('deletion.billing-identity-legal', '由 legal_privacy_owner 核准 billing subject 法律基礎、最小化與 erasure boundary'),
      item('deletion.billing-identity-review', '由 security_owner 核准 billing subject key、存取、加密、audit 與不可重新識別'),
      item('deletion.active-store', '核准有效 Apple／Google 訂閱下刪除 Féria 帳號的行為與告知'),
      item('deletion.third-party-data', '核准 owner workspace 中員工／第三方資料的保留、匯出、匿名化或刪除'),
      item('deletion.staff-third-party-legal', '由 legal_privacy_owner 核准第三方權利、controller 邊界、shared object 與 appeal'),
      item('deletion.staff-third-party-review', '由 security_owner 核准匿名化欄位／演算法、linkage resistance 與 evidence'),
      item('deletion.support', '核准客服 SLA、身分升級、申訴、證據與自動清理失敗處理'),
      item('deletion.active-store-support-legal', '由 legal_privacy_owner 核准 active billing、restore boundary、appeal 與 disclosure'),
      item('deletion.active-store-support-review', '由 security_owner 核准 prior binding、single-owner、anti-replay／race 與 fraud recovery'),
      item('deletion.retention-table', '完成並核准涵蓋指南所列全部資料類別的 retention table'),
      item('deletion.dated-approval', '保存產品、法律／隱私、安全、客服與會計的 dated approval'),
    ],
  },
  {
    taskId: 'ACCOUNT-DELETION-RUNTIME',
    title: '帳號刪除 AI 實作與發布證據',
    guideSection: '5',
    executionMode: 'shared',
    aiAssistance: 'AI 實作與執行 synthetic／non-Production 驗證；Human 核准 destructive scope、外部帳號與 Production go/no-go',
    items: [
      item('deletion-runtime.ad0', 'AD0 完成 repository-only schema、FK、RLS、R2 與既有刪除路徑盤點'),
      item('deletion-runtime.ad1', 'AD1 完成 threat model、共享 contracts、review-only migration／RLS 草案與 synthetic tests'),
      item('deletion-runtime.ad2', 'AD2 完成預設關閉的 server route、recent reauth、leased saga、pending-write preflight 與 legacy UI cutover foundation'),
      item('deletion-runtime.ad3a-code', 'AD3A 完成 reviewed numbered migration、concrete RPC repository、local-target fail-closed guard 與 synthetic guardrails'),
      item('deletion-runtime.ad3', 'AD3 在指定 non-Production target 套用 reviewed migration/repository，完成 disposable lifecycle、R2 purge 與 restore tests'),
      item('deletion-runtime.ad4-prep', 'AD4 preparation 完成 release-candidate blocker inventory、store/device evidence matrix 與 fail-closed readiness checker'),
      item('deletion-runtime.ad4', 'AD4 完成實機 store lifecycle、公開政策、客服與 release-candidate 對齊'),
      item('deletion-runtime.ad5', 'AD5 取得 exact Production go/no-go、發布與 release-bound evidence'),
    ],
  },
  {
    taskId: 'LEGAL-SUPPORT-APPROVAL',
    title: '正式法務、隱私、退款、取消、客服與 retention',
    guideSection: '6',
    executionMode: 'human',
    aiAssistance: 'AI 可做版本與必填欄位檢查；法律、公開內容、信箱責任與跨職能簽核必須人工完成',
    items: [
      item('legal.operator', '核准法律營運者、代表人、公開地址、管轄與法院文字'),
      item('legal.privacy', '核准隱私告知的目的、資料類別、期間、地區、對象、方式與權利'),
      item('legal.subprocessors', '核准 Supabase、Vercel、Cloudflare 與 observability provider 的跨境／DPA／retention 行為'),
      item('legal.deletion', '核准帳號刪除、offline pending write、證據、申訴與 backup purge 說明'),
      item('legal.subscription', '核准 Apple／Google 價格、試用、續訂、取消、退款、稅務與爭議文字'),
      item('legal.withdrawal-right', '完成通訊交易解除權與數位服務例外的法律審查'),
      item('legal.security', '核准安全事件分級、通知、證據保存、客服升級與演練方式'),
      item('support.mailbox', '建立公開客服信箱並指定 primary／backup responder'),
      item('support.sla', '定義一般、帳務、隱私／刪除與安全事件 SLA'),
      item('support.case-drill', '以無客戶資料案例完成 received 到 replied 到 closed 測試'),
      item('support.incident-drill', '完成一次 non-Production fixture incident escalation drill'),
      item('support.approvals', '保存 dated 跨職能簽核並綁定文件版本、公開 URL 與 release SHA'),
      item('legal.published-smoke', '對正式發布 release 執行 published-mode legal support smoke'),
    ],
  },
  {
    taskId: 'SEC-SRA000-EXECUTION',
    title: 'SRA-000 Supabase 唯讀安全盤點',
    guideSection: '7',
    executionMode: 'shared',
    aiAssistance: 'Human 提供授權 read-only session；AI 驗證 canonical sections、計數、hash 與 finding mapping',
    items: [
      item('sra.target', '選定 target，記錄 masked target 與時間'),
      item('sra.session', '使用授權的唯讀 review session'),
      item('sra.sql', '原樣執行 canonical SQL，不移除 READ ONLY／ROLLBACK 或擴大 filter'),
      item('sra.raw-output', '將原始輸出保存到受限 evidence vault，不提交 Git'),
      item('sra.advisor', '從相同 target 匯出當日 Security Advisor findings'),
      item('sra.auth', '記錄 Auth leaked-password protection 狀態'),
      item('sra.mapping', '將 live findings 映射到 SRA-001 至 SRA-010'),
      item('sra.sanitized-report', '只回報完整性、計數、hash、bounded finding ID、masked target 與 outcome'),
      item('sra.sections', '確認八個 canonical result sections 全部齊全且無 syntax／permission error'),
    ],
  },
  {
    taskId: 'WEB-PRODUCTION-CONFIG',
    title: 'Web Production 設定與 release identity',
    guideSection: '8.1',
    executionMode: 'shared',
    aiAssistance: 'Human 操作 deployment provider；AI 執行 secret-free config、identity 與 remote smoke 驗證',
    items: [
      item('web-prod.variables', '在受保護 deployment provider 設定 Production 變數與正確 scope'),
      item('web-prod.disabled', '確認 debug、simulation、test page 與 fault injection 全部關閉'),
      item('web-prod.boundaries', '確認 Supabase、CORS、release metadata、法務、R2、media、quota 與 cron 狀態'),
      item('web-prod.local-check', '對受保護 Production env file 執行 production config checker'),
      item('web-prod.deploy', '部署選定 SHA，確認 health release identity 並執行 remote release smoke'),
    ],
  },
  {
    taskId: 'WEB-SECURITY-HEADERS-FINAL',
    title: 'Web 最終 security headers 與 anti-frame 證據',
    guideSection: '8.1',
    executionMode: 'shared',
    aiAssistance: 'AI 可執行公開 header probe；Human 提供最終 release 與 unrelated-origin 瀏覽器證據',
    items: [
      item('web-headers.final-smoke', '對最終 release 重跑 security header smoke'),
      item('web-headers.anti-frame', '以 unrelated HTTPS origin 完成 anti-frame probe'),
      item('web-headers.evidence', '保存只含公開資料、release SHA、時間與結果的證據'),
    ],
  },
  {
    taskId: 'WEB-PWA-INSTALL',
    title: 'PWA 真實安裝與更新',
    guideSection: '8.2',
    executionMode: 'shared',
    aiAssistance: 'AI 執行 resource smoke；Human 在桌面與實體 Android 完成 OS 安裝、啟動及更新觀察',
    items: [
      item('pwa.resource-smoke', '對選定 SHA 執行 commit-bound resource smoke'),
      item('pwa.desktop', '在 Chromium 桌面完成 OS 安裝與 installed-icon standalone 啟動'),
      item('pwa.android', '在實體 Android 完成安裝與 installed-icon 啟動，確認無 overflow／遮蔽'),
      item('pwa.shortcuts', '驗證 owner shortcuts 可用、staff shortcuts fail closed'),
      item('pwa.update', '部署第二個審查 revision，驗證 service worker 更新並記錄舊／新 SHA'),
      item('pwa.evidence', '保存 install prompt、public shell 與 update 的公開資料截圖'),
    ],
  },
  {
    taskId: 'WEB-OBSERVABILITY',
    title: 'Observability provider、alerts 與 incident drill',
    guideSection: '8.3',
    executionMode: 'shared',
    aiAssistance: 'Human 核准 provider、owners 與 retention；AI 驗證 redaction、threshold、sanitized snapshot 與 checker',
    items: [
      item('obs.provider', '核准可接收 schema-v1 events 與五分鐘 health probe 的 provider'),
      item('obs.redaction', '確認 sink 丟棄 identifiers、raw errors、request body、R2 keys、URLs、tokens 與 secrets'),
      item('obs.dashboard', '建立 health、media 與 sync saved queries／dashboards'),
      item('obs.thresholds', '實作 canonical fixed thresholds，低流量使用絕對次數'),
      item('obs.owners', '指定 primary／backup／escalation 並核准 retention、access、audit 與 deletion'),
      item('obs.drill', '發送 dated test alert 並完成 non-Production fixture incident drill'),
      item('obs.snapshot', '取得 36 小時資料，匯出 sanitized projection 並通過 operational alerts checker'),
    ],
  },
]);

const TASK_STATUS_LABELS: Readonly<Record<LaunchExecutionTaskStatus, string>> = Object.freeze({
  complete: '完成',
  ready_agent: '可由 agent 執行',
  pending_manual: '待人工完成',
  pending_approval: '待核准',
  blocked_dependency: '等待依賴',
  deferred: '延後',
});

const EXTERNAL_STATUS_LABELS: Readonly<Record<NativeExternalAccountCheckStatus, string>> = Object.freeze({
  complete: '完成',
  pending_manual: '待人工完成',
  blocked_dependency: '等待依賴',
  not_applicable: '不適用（已結案）',
});

const ITEM_STATUS_LABELS: Readonly<Record<ManualLaunchItemStatus, string>> = Object.freeze({
  proposed_ai: 'AI 草案待核准',
  pending_human: '待人工完成',
  approved: '已核准',
  rejected: '未核准',
  not_applicable: '不適用（已有證據）',
});

const EXECUTION_MODE_LABELS = Object.freeze({
  human: 'Human',
  shared: 'Shared',
} as const);

export type ManualLaunchChecklistSummary = Readonly<{
  taskCount: number;
  completedTaskCount: number;
  itemCount: number;
  completedItemCount: number;
}>;

type ResolvedItem = Readonly<{
  complete: boolean;
  statusLabel: string;
  source: string;
}>;

function resolveItem(
  definition: ChecklistItemDefinition,
  taskStatus: LaunchExecutionTaskStatus,
  externalChecks: ReadonlyMap<NativeExternalAccountCheckId, NativeExternalAccountCheckStatus>,
  itemStatuses: ReadonlyMap<string, ManualLaunchItemStatus>,
): ResolvedItem {
  if (definition.externalCheckId) {
    const status = externalChecks.get(definition.externalCheckId);
    if (!status) throw new Error(`manual_checklist_external_check_missing:${definition.externalCheckId}`);
    return Object.freeze({
      complete: status === 'complete' || status === 'not_applicable',
      statusLabel: EXTERNAL_STATUS_LABELS[status],
      source: `external:${definition.externalCheckId}`,
    });
  }
  const itemStatus = itemStatuses.get(definition.id);
  if (itemStatus) {
    return Object.freeze({
      complete: itemStatus === 'approved' || itemStatus === 'not_applicable',
      statusLabel: ITEM_STATUS_LABELS[itemStatus],
      source: `item-status:${definition.id}`,
    });
  }
  return Object.freeze({
    complete: taskStatus === 'complete',
    statusLabel: TASK_STATUS_LABELS[taskStatus],
    source: 'parent task',
  });
}

function sourceUpdatedAt(
  plan: LaunchExecutionPlanDocument,
  external: NativeExternalAccountReadinessDocument,
  itemStatus: ManualLaunchItemStatusDocument,
): string {
  return [plan.updatedAt, external.updatedAt, itemStatus.updatedAt].sort().at(-1)!;
}

export function summarizeManualLaunchChecklist(
  plan: LaunchExecutionPlanDocument,
  external: NativeExternalAccountReadinessDocument,
  itemStatus: ManualLaunchItemStatusDocument,
): ManualLaunchChecklistSummary {
  const tasks = new Map(plan.tasks.map(task => [task.id, task] as const));
  const externalChecks = new Map(external.checks.map(check => [check.id, check.status] as const));
  const itemStatuses = new Map(itemStatus.items.map(entry => [entry.id, entry.status] as const));
  let completedTaskCount = 0;
  let itemCount = 0;
  let completedItemCount = 0;
  for (const definition of MANUAL_LAUNCH_CHECKLIST_TASKS) {
    const task = tasks.get(definition.taskId);
    if (!task) throw new Error(`manual_checklist_task_missing:${definition.taskId}`);
    if (task.status === 'complete') completedTaskCount += 1;
    for (const checklistItem of definition.items) {
      itemCount += 1;
      if (resolveItem(checklistItem, task.status, externalChecks, itemStatuses).complete) {
        completedItemCount += 1;
      }
    }
  }
  return Object.freeze({
    taskCount: MANUAL_LAUNCH_CHECKLIST_TASKS.length,
    completedTaskCount,
    itemCount,
    completedItemCount,
  });
}

export function renderManualLaunchChecklist(
  plan: LaunchExecutionPlanDocument,
  external: NativeExternalAccountReadinessDocument,
  itemStatus: ManualLaunchItemStatusDocument,
): string {
  const tasks = new Map(plan.tasks.map(task => [task.id, task] as const));
  const externalChecks = new Map(external.checks.map(check => [check.id, check.status] as const));
  const itemStatuses = new Map(itemStatus.items.map(entry => [entry.id, entry.status] as const));
  const summary = summarizeManualLaunchChecklist(plan, external, itemStatus);
  const lines: string[] = [
    '# Feria 人工上架工作 Checklist',
    '',
    `狀態來源更新日：${sourceUpdatedAt(plan, external, itemStatus)}`,
    '',
    '> 此檔案由 `npm.cmd run update:manual-launch-checklist` 產生，請勿直接手動勾選。',
    `> 操作步驟與停止條件以 \`${MANUAL_LAUNCH_CHECKLIST_SOURCE_GUIDE}\` 為準。`,
    '> 只有 canonical task、Apple／Google status-only check，或 manual item status 具有完整核准證據時才會自動勾選。`proposed_ai` 只是草案，不算完成。',
    '',
    '## 自動化摘要',
    '',
    `- 人工 tasks：${summary.completedTaskCount}/${summary.taskCount} 完成`,
    `- Checklist items：${summary.completedItemCount}/${summary.itemCount} 自動勾選`,
    `- 整體 launch 狀態：\`${plan.overallStatus}\``,
    '',
  ];

  MANUAL_LAUNCH_CHECKLIST_TASKS.forEach((definition, index) => {
    const task = tasks.get(definition.taskId);
    if (!task) throw new Error(`manual_checklist_task_missing:${definition.taskId}`);
    const taskChecked = task.status === 'complete' ? 'x' : ' ';
    lines.push(`## ${index + 1}. ${definition.title}`);
    lines.push('');
    lines.push(`指南章節：${definition.guideSection}　任務：\`${definition.taskId}\``);
    lines.push('');
    lines.push(`執行模式：\`${EXECUTION_MODE_LABELS[definition.executionMode]}\` — ${definition.aiAssistance}`);
    lines.push('');
    lines.push(`- [${taskChecked}] 任務完成（canonical 狀態：${TASK_STATUS_LABELS[task.status]}／\`${task.status}\`）`);
    for (const checklistItem of definition.items) {
      const resolved = resolveItem(checklistItem, task.status, externalChecks, itemStatuses);
      lines.push(
        `  - [${resolved.complete ? 'x' : ' '}] ${checklistItem.label}（${resolved.statusLabel}；${resolved.source}）`,
      );
    }
    lines.push('');
  });

  lines.push('## 更新方式');
  lines.push('');
  lines.push('1. 先依指南驗證完成證據，再更新 canonical task matrix、Gate、manual item status 或 Apple／Google status-only handoff。');
  lines.push('2. 執行 `npm.cmd run update:manual-launch-checklist` 重新產生本檔。');
  lines.push('3. 執行 `npm.cmd run check:manual-launch-checklist` 驗證沒有漂移。');
  lines.push('4. 不得只修改本 Checklist 來宣告 task 或 Gate 完成。');
  return `${lines.join('\n')}\n`;
}

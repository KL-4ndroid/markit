import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  MANUAL_LAUNCH_CHECKLIST_OUTPUT_PATH,
  MANUAL_LAUNCH_CHECKLIST_SOURCE_GUIDE,
  MANUAL_LAUNCH_CHECKLIST_TASKS,
  renderManualLaunchChecklist,
  summarizeManualLaunchChecklist,
} from '../lib/deployment/manual-launch-checklist';
import { parseLaunchExecutionPlan } from '../lib/deployment/launch-execution-plan';
import {
  MANUAL_LAUNCH_ITEM_STATUS_PATH,
  parseManualLaunchItemStatusDocument,
} from '../lib/deployment/manual-launch-item-status';
import { parseNativeExternalAccountReadiness } from '../lib/deployment/native-external-account-readiness';
import { parseNativeLaunchGateDocument } from '../lib/deployment/native-launch-gate';
import { parseWebLaunchGateDocument } from '../lib/deployment/web-launch-gate';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const readJson = (path: string): unknown => JSON.parse(read(path)) as unknown;
const web = parseWebLaunchGateDocument(readJson('docs/WEB_LAUNCH_GATES_2026_08_01.json'));
const native = parseNativeLaunchGateDocument(
  readJson('docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json'),
);
const plan = parseLaunchExecutionPlan(
  readJson('docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json'),
  web,
  native,
);
const external = parseNativeExternalAccountReadiness(
  readJson('docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json'),
);
const itemStatus = parseManualLaunchItemStatusDocument(readJson(MANUAL_LAUNCH_ITEM_STATUS_PATH));
const rendered = renderManualLaunchChecklist(plan, external, itemStatus);
const summary = summarizeManualLaunchChecklist(plan, external, itemStatus);

assert.equal(rendered, read(MANUAL_LAUNCH_CHECKLIST_OUTPUT_PATH));
assert.equal(summary.taskCount, 12);
assert.equal(summary.itemCount, 134);
assert.equal(
  summary.completedTaskCount,
  MANUAL_LAUNCH_CHECKLIST_TASKS.filter(definition => (
    plan.tasks.find(task => task.id === definition.taskId)?.status === 'complete'
  )).length,
);
assert.equal(
  (rendered.match(/- \[x\]/g) ?? []).length,
  summary.completedTaskCount + summary.completedItemCount,
);

const guide = read(MANUAL_LAUNCH_CHECKLIST_SOURCE_GUIDE);
for (const definition of MANUAL_LAUNCH_CHECKLIST_TASKS) {
  assert.match(guide, new RegExp(`\\b${definition.taskId}\\b`));
  assert.match(rendered, new RegExp(`\\b${definition.taskId}\\b`));
  assert.match(
    rendered,
    new RegExp('執行模式：`' + (definition.executionMode === 'human' ? 'Human' : 'Shared') + '`'),
  );
  assert.ok(definition.aiAssistance.length > 0, `${definition.taskId}:aiAssistance`);
  assert.ok(definition.items.length > 0, definition.taskId);
}

for (const check of external.checks) {
  assert.match(rendered, new RegExp(check.id.replaceAll('.', '\\.')));
}

assert.match(rendered, /請勿直接手動勾選/);
assert.match(rendered, /不得只修改本 Checklist/);
assert.match(rendered, /整體 launch 狀態：`not_ready`/);
assert.match(guide, /Session 0：AI 本機基準命令/);
assert.match(guide, /canonical 狀態沒有改變，Checklist 保持未勾選是正確結果/);

const completedRaw = JSON.parse(JSON.stringify(plan)) as {
  tasks: Array<{ id: string; status: string }>;
};
completedRaw.tasks.find(task => task.id === 'NATIVE-GATE2-EVIDENCE')!.status = 'complete';
const completedPlan = {
  ...plan,
  tasks: completedRaw.tasks as typeof plan.tasks,
};
const completedChecklist = renderManualLaunchChecklist(completedPlan, external, itemStatus);
assert.match(
  completedChecklist,
  /- \[x\] 任務完成（canonical 狀態：完成／`complete`）[\s\S]*- \[x\] 選定可回復、可檢查 R2/,
);

const externalWithOneComplete = {
  ...external,
  checks: external.checks.map(check => (
    check.id === 'apple.developer_program_enrollment'
      ? { ...check, status: 'complete' as const }
      : check
  )),
};
assert.match(
  renderManualLaunchChecklist(plan, externalWithOneComplete, itemStatus),
  /- \[x\] 完成 Apple Developer Program enrollment（完成；external:apple\.developer_program_enrollment）/,
);

assert.match(
  rendered,
  /核准 Pro 月繳／年繳公開價[^\n]+（已核准；item-status:commercial\.pro）/,
);
assert.match(
  rendered,
  /選定可回復、可檢查 R2 的部署.*（已核准；item-status:gate2\.release）/,
);
assert.match(
  rendered,
  /準備隔離 owner、market、兩筆 sale.*（已核准；item-status:gate2\.fixtures）/,
);
assert.match(
  rendered,
  /確認 sync idle、無其他 pending writes.*（已核准；item-status:gate2\.pending）/,
);
assert.match(
  rendered,
  /確認安全部署沒有七個 fault-injection 變數.*（已核准；item-status:gate2\.safe-baseline）/,
);
assert.match(
  rendered,
  /確認可用唯讀方式檢查 R2 object.*（已核准；item-status:gate2\.r2-read）/,
);
assert.match(
  rendered,
  /建立 evidence template，安排執行者與安全回復 reviewer.*（已核准；item-status:gate2\.evidence-reviewer）/,
);
assert.match(
  rendered,
  /核准首發優惠碼的折扣[^\n]+（已核准；item-status:commercial\.launch-promo）/,
);
assert.match(
  rendered,
  /核准首發優惠碼的活動起訖[^\n]+（已核准；item-status:commercial\.launch-promo-operations）/,
);
assert.match(
  rendered,
  /在 Apple／Google sandbox 證明首發價格[^\n]+（待人工完成；item-status:commercial\.launch-promo-continuity）/,
);
assert.match(
  rendered,
  /核准試用方案[^\n]+（已核准；item-status:commercial\.trial）/,
);
assert.match(
  rendered,
  /在 Apple／Google sandbox 證明 14 天試用[^\n]+（待人工完成；item-status:commercial\.trial-sandbox）/,
);
assert.match(
  rendered,
  /核准 Apple grace period[^\n]+（已核准；item-status:commercial\.apple-grace）/,
);
assert.match(
  rendered,
  /由 support_owner 核准 Apple[^\n]+（已核准；item-status:commercial\.apple-grace-support）/,
);
assert.match(
  rendered,
  /核准 Google grace／account hold[^\n]+（已核准；item-status:commercial\.google-grace）/,
);
assert.match(
  rendered,
  /由 support_owner 核准 Google[^\n]+（已核准；item-status:commercial\.google-grace-support）/,
);
assert.match(
  rendered,
  /核准 Pro 到 Team[^\n]+（已核准；item-status:commercial\.upgrade）/,
);
assert.match(
  rendered,
  /核准 Team 到 Pro[^\n]+（已核准；item-status:commercial\.downgrade）/,
);
assert.match(
  rendered,
  /由 support_owner 核准降級通知[^\n]+（已核准；item-status:commercial\.downgrade-support）/,
);
assert.match(
  rendered,
  /核准取消／到期[^\n]+（已核准；item-status:commercial\.cancel-expiry）/,
);
assert.match(
  rendered,
  /由 support_owner 核准取消／到期／退款[^\n]+（已核准；item-status:commercial\.cancel-expiry-support）/,
);
assert.match(
  rendered,
  /核准漲價、既有訂戶[^\n]+（已核准；item-status:commercial\.price-change）/,
);
assert.match(
  rendered,
  /核准立即刪除[^\n]+（已核准；item-status:deletion\.timing）/,
);
assert.match(
  rendered,
  /由 legal_privacy_owner 核准立即刪除[^\n]+（已核准；item-status:deletion\.timing-legal）/,
);
assert.match(
  rendered,
  /核准一般營運資料[^\n]+（已核准；item-status:deletion\.retention）/,
);
assert.match(
  rendered,
  /由 legal_privacy_owner 核准法律依據[^\n]+（已核准；item-status:deletion\.retention-legal）/,
);
assert.match(
  rendered,
  /核准 audit／security[^\n]+（已核准；item-status:deletion\.retention-regulated）/,
);
assert.match(
  rendered,
  /由 security_owner 核准 audit scope[^\n]+（已核准；item-status:deletion\.retention-security）/,
);
assert.match(
  rendered,
  /核准付費 identity[^\n]+（已核准；item-status:deletion\.billing-identity）/,
);
assert.match(
  rendered,
  /由 legal_privacy_owner 核准 billing subject[^\n]+（已核准；item-status:deletion\.billing-identity-legal）/,
);
assert.match(
  rendered,
  /由 security_owner 核准 billing subject[^\n]+（已核准；item-status:deletion\.billing-identity-review）/,
);
assert.match(
  rendered,
  /核准員工刪除後[^\n]+（已核准；item-status:deletion\.staff-history）/,
);
assert.match(
  rendered,
  /核准 owner workspace 中員工／第三方資料[^\n]+（已核准；item-status:deletion\.third-party-data）/,
);
assert.match(
  rendered,
  /由 legal_privacy_owner 核准第三方權利[^\n]+（已核准；item-status:deletion\.staff-third-party-legal）/,
);
assert.match(
  rendered,
  /由 security_owner 核准匿名化欄位[^\n]+（已核准；item-status:deletion\.staff-third-party-review）/,
);
assert.match(
  rendered,
  /核准有效 Apple／Google 訂閱下刪除[^\n]+（已核准；item-status:deletion\.active-store）/,
);
assert.match(
  rendered,
  /核准客服 SLA[^\n]+（已核准；item-status:deletion\.support）/,
);
assert.match(
  rendered,
  /由 legal_privacy_owner 核准 active billing[^\n]+（已核准；item-status:deletion\.active-store-support-legal）/,
);
assert.match(
  rendered,
  /由 security_owner 核准 prior binding[^\n]+（已核准；item-status:deletion\.active-store-support-review）/,
);
assert.match(
  rendered,
  /完成並核准涵蓋指南[^\n]+（已核准；item-status:deletion\.retention-table）/,
);
assert.match(
  rendered,
  /AD0 完成 repository-only[^\n]+（已核准；item-status:deletion-runtime\.ad0）/,
);
assert.match(
  rendered,
  /AD1 完成 threat model[^\n]+（已核准；item-status:deletion-runtime\.ad1）/,
);
assert.match(
  rendered,
  /AD2 完成預設關閉的 server route[^\n]+（已核准；item-status:deletion-runtime\.ad2）/,
);
assert.match(
  rendered,
  /AD3A 完成 reviewed numbered migration[^\n]+（已核准；item-status:deletion-runtime\.ad3a-code）/,
);
assert.match(
  rendered,
  /AD3 在指定 non-Production target[^\n]+（已核准；item-status:deletion-runtime\.ad3）/,
);
assert.match(
  rendered,
  /AD4 preparation 完成 release-candidate blocker inventory[^\n]+（已核准；item-status:deletion-runtime\.ad4-prep）/,
);
assert.match(
  rendered,
  /AD4 完成實機 store lifecycle[^\n]+（待人工完成；item-status:deletion-runtime\.ad4）/,
);

const itemStatusWithOneApproval = parseManualLaunchItemStatusDocument({
  ...itemStatus,
  items: itemStatus.items.map(entry => (
    entry.id === 'commercial.pro'
      ? {
          ...entry,
          status: 'approved',
          approvedAt: '2026-08-17',
          approvedByRole: 'product_owner',
          evidence: ['docs/SESSION1_POLICY_DECISION_WORKSHEET_2026_08_17.md'],
        }
      : entry
  )),
});
assert.match(
  renderManualLaunchChecklist(plan, external, itemStatusWithOneApproval),
  /- \[x\] 核准 Pro 月繳／年繳公開價[^\n]+（已核准；item-status:commercial\.pro）/,
);

console.log('PASS manual launch checklist is generated conservatively from canonical statuses');

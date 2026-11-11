import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const guidePath = 'docs/MANUAL_LAUNCH_OPERATIONS_GUIDE_2026_08_09.md';
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const guide = read(guidePath);
const matrix = JSON.parse(read('docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json')) as {
  overallStatus: string;
  tasks: Array<{
    id: string;
    status: string;
    evidence: string[];
  }>;
};

assert.equal(matrix.overallStatus, 'not_ready');

const pendingManual = matrix.tasks.filter(task => task.status === 'pending_manual');
assert.equal(pendingManual.length, 11);
for (const task of pendingManual) {
  assert.ok(task.evidence.includes(guidePath), `${task.id} must reference the manual guide`);
  assert.match(guide, new RegExp(`\\b${task.id}\\b`), `${task.id} must be covered`);
}

for (const heading of [
  'Capacitor Gate 2',
  'Apple／Google 帳號與實機準備',
  'Pro／Team、試用、寬限期與 Founder 政策核准',
  '帳號刪除、資料保留與有效訂閱政策',
  '正式法務、隱私、退款、取消、客服與 retention',
  'SRA-000 Supabase 唯讀安全盤點',
  'Web Production、PWA 與 Observability',
]) {
  assert.match(guide, new RegExp(heading));
}

for (const canonicalPath of [
  'docs/IOS_PHASE2_GATE2_COMPENSATION_RUNBOOK.md',
  'docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json',
  'docs/subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md',
  'docs/subscription/ACCOUNT_DELETION_IMPLEMENTATION_PROPOSAL_2026_08_06.md',
  'docs/WEB_LEGAL_SUPPORT_LAUNCH_REVIEW.md',
  'docs/security/SUPABASE_SECURITY_ADVISOR_INVENTORY_RUNBOOK_2026_08_09.md',
  'docs/WEB_PRODUCTION_CONFIG_CHECK.md',
  'docs/WEB_PWA_RELEASE_SMOKE.md',
  'docs/WEB_OPERATIONAL_OBSERVABILITY.md',
]) {
  assert.match(guide, new RegExp(canonicalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(guide, /Web 綠界定期定額維持延後/);
assert.match(guide, /overallStatus` 仍應保持 `not_ready`/);
assert.match(guide, /evidenceStoredExternally: true \| false/);
assert.match(guide, /不得從單一 PASS 推導整組 Gate 已完成/);

assert.doesNotMatch(guide, /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/, 'guide must not contain an email');
assert.doesNotMatch(
  guide,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  'guide must not contain a UUID',
);
assert.doesNotMatch(guide, /\beyJ[A-Za-z0-9_-]{20,}\b/, 'guide must not contain a JWT');

console.log('PASS manual launch operations guide covers every pending human task safely');

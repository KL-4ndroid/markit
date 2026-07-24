import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    failures.push(name);
    failed++;
  }
}

const cardSource = readFileSync(
  join(__dirname, '..', 'components/staff/StaffPermissionCard.tsx'),
  'utf-8'
);
const bannerSource = readFileSync(
  join(__dirname, '..', 'components/auth/RoleStatusBanner.tsx'),
  'utf-8'
);
const authGuardSource = readFileSync(
  join(__dirname, '..', 'components/auth/AuthGuard.tsx'),
  'utf-8'
);
const monitorSource = readFileSync(
  join(__dirname, '..', 'hooks/useStaffStatusMonitor.ts'),
  'utf-8'
);
const debugPageSource = readFileSync(
  join(__dirname, '..', 'app/debug/staff-role-test/page.tsx'),
  'utf-8'
);
const settingsSource = readFileSync(
  join(__dirname, '..', 'app/settings/team/page.tsx'),
  'utf-8'
);
const recoverySource = readFileSync(
  join(__dirname, '..', 'app/recovery/page.tsx'),
  'utf-8'
);

console.log('\n=== P5-4e / P5-7 role UI ===');

runTest('StaffPermissionCard is role-aware and capability-driven', () => {
  assert.match(cardSource, /deriveRoleCapabilities/);
  assert.match(cardSource, /canRecordInteraction/);
  assert.match(cardSource, /canEditMarketBasic/);
  assert.match(cardSource, /canEditProductBasic/);
  assert.match(cardSource, /canManageChecklist/);
  assert.match(cardSource, /canCreateFieldNote/);
  assert.match(cardSource, /canManageFieldNotes/);
  assert.match(cardSource, /canToggleChecklistItem/);
  assert.doesNotMatch(cardSource, /permissions\?:\s*\{/);
});

runTest('settings page passes staff role into StaffPermissionCard', () => {
  assert.match(settingsSource, /<StaffPermissionCard[\s\S]*staffRole=\{userRole\.staffRole\}/);
  assert.match(settingsSource, /ownerEmail=\{userRole\.ownerEmail\}/);
  assert.doesNotMatch(settingsSource, /permissions=\{userRole\.permissions\}/);
});

runTest('RoleStatusBanner listens for role status events', () => {
  assert.match(bannerSource, /ROLE_STATUS_EVENT/);
  assert.match(bannerSource, /權限確認中/);
  assert.match(bannerSource, /權限狀態已更新/);
});

runTest('AuthGuard renders RoleStatusBanner for authenticated app', () => {
  assert.match(authGuardSource, /import \{ RoleStatusBanner \}/);
  assert.match(authGuardSource, /<OfflineBanner \/>\s*<RoleStatusBanner \/>/);
});

runTest('useStaffStatusMonitor dispatches status events on downgrade and cleanup', () => {
  assert.match(monitorSource, /dispatchRoleStatusEvent/);
  assert.match(monitorSource, /kind:\s*'downgraded'/);
  assert.match(monitorSource, /kind:\s*'projection-cleanup-complete'/);
  assert.match(monitorSource, /kind:\s*'projection-cleanup-failed'/);
  assert.match(monitorSource, /kind:\s*'revoked'/);
});

runTest('debug staff role test page is mock-only', () => {
  assert.match(debugPageSource, /Staff Role 測試頁/);
  assert.match(debugPageSource, /不連 Supabase、不寫 IndexedDB/);
  assert.match(debugPageSource, /deriveRoleCapabilities/);
  assert.match(debugPageSource, /dispatchRoleStatusEvent/);
  assert.match(debugPageSource, /記錄成交 \/ 收入/);
  assert.match(debugPageSource, /編輯成交紀錄/);
  assert.match(debugPageSource, /allowed:\s*\(\)\s*=>\s*false/);
  assert.match(debugPageSource, /刪除別人同日紀錄/);
  assert.match(debugPageSource, /role === 'manager' && capabilities\.canDeleteOwnSameDayRecord/);
  assert.match(debugPageSource, /使用修復工具/);
  assert.match(debugPageSource, /capabilities\.canUseRepairTools/);
  assert.doesNotMatch(debugPageSource, /recordEvent\(/);
  assert.doesNotMatch(debugPageSource, /supabase/);
  assert.doesNotMatch(debugPageSource, /db\./);
});

runTest('recovery route keeps repair tools owner-only', () => {
  assert.match(recoverySource, /deriveRoleCapabilities/);
  assert.match(recoverySource, /hasCapability\(roleCapabilities,\s*['"]canUseRepairTools['"]\)/);
  assert.match(recoverySource, /if \(!canUseRepairTools\)/);
  assert.match(recoverySource, /修復工具僅限 owner 使用/);
  assert.match(recoverySource, /<DatabaseRecoveryPanel \/>/);
  assert.match(recoverySource, /<OwnerRevenueGapRepairPanel \/>/);
  assert.match(recoverySource, /<LocalProjectionRepairPanel \/>/);
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}

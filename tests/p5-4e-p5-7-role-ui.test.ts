import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/components/staff/StaffPermissionCard.tsx',
  'utf-8'
);
const bannerSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/components/auth/RoleStatusBanner.tsx',
  'utf-8'
);
const authGuardSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/components/auth/AuthGuard.tsx',
  'utf-8'
);
const monitorSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/hooks/useStaffStatusMonitor.ts',
  'utf-8'
);
const debugPageSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/app/debug/staff-role-test/page.tsx',
  'utf-8'
);
const settingsSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/app/settings/page.tsx',
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
  assert.doesNotMatch(debugPageSource, /recordEvent\(/);
  assert.doesNotMatch(debugPageSource, /supabase/);
  assert.doesNotMatch(debugPageSource, /db\./);
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}

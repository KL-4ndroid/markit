import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const roleContextSource = readProjectFile('lib/role-context.tsx');
const layoutSource = readProjectFile('app/layout.tsx');
const roleGuardSource = readProjectFile('components/auth/RoleGuard.tsx');
const syncContextSource = readProjectFile('lib/sync-context.tsx');
const topNavigationSource = readProjectFile('components/TopNavigation.tsx');
const bottomNavigationSource = readProjectFile('components/BottomNavigation.tsx');
const staffModeNoticeSource = readProjectFile('components/staff/StaffModeNotice.tsx');
const roleStatusBannerSource = readProjectFile('components/auth/RoleStatusBanner.tsx');
const initialSyncDialogSource = readProjectFile('components/sync/InitialSyncDialog.tsx');
const accountSwitcherSource = readProjectFile('components/account/AccountSwitcher.tsx');
const databaseRecoveryPanelSource = readProjectFile('components/common/DatabaseRecoveryPanel.tsx');
const staffStatusMonitorSource = readProjectFile('hooks/useStaffStatusMonitor.ts');
const settlementReportPageSource = readProjectFile('app/reports/settlement/page.tsx');
const homePageSource = readProjectFile('app/page.tsx');
const marketsPageSource = readProjectFile('app/markets/page.tsx');
const productsPageSource = readProjectFile('app/products/page.tsx');
const analyticsPageSource = readProjectFile('app/analytics/page.tsx');
const settingsPageSource = readProjectFile('app/settings/page.tsx');
const recoveryPageSource = readProjectFile('app/recovery/page.tsx');

console.log('\n=== RoleProvider R1/R2/R3/R4 guardrails ===');

runTest('RoleProvider owns the shared role refresh state without direct data access', () => {
  assert.match(roleContextSource, /'use client'/);
  assert.match(roleContextSource, /import \{ useUserRole, type UserRole \}/);
  assert.match(roleContextSource, /import \{ useAuth \}/);
  assert.match(roleContextSource, /deriveRoleRefreshState/);
  assert.match(roleContextSource, /const roleState = useUserRole\(\)/);
  assert.match(roleContextSource, /hasUsablePreviousRoleRef/);
  assert.match(roleContextSource, /trackedUserIdRef\.current !== userId/);
  assert.match(roleContextSource, /userRole: userId \? roleState\.userRole : null/);
  assert.match(roleContextSource, /<RoleContext\.Provider value=\{contextValue\}>/);
  assert.doesNotMatch(roleContextSource, /\.from\(|staff_relationships|localStorage|sessionStorage|indexedDB|Dexie|db\./i);
});

runTest('layout places RoleProvider between AuthProvider and SyncProvider', () => {
  const authIndex = layoutSource.indexOf('<AuthProvider>');
  const roleIndex = layoutSource.indexOf('<RoleProvider>');
  const syncIndex = layoutSource.indexOf('<SyncProvider>');
  const appChromeIndex = layoutSource.indexOf('<AppChrome>{children}</AppChrome>');

  assert.ok(authIndex > 0, 'AuthProvider must exist');
  assert.ok(roleIndex > authIndex, 'RoleProvider must be under AuthProvider');
  assert.ok(syncIndex > roleIndex, 'SyncProvider must be under RoleProvider');
  assert.ok(appChromeIndex > syncIndex, 'AppChrome must remain under SyncProvider');
});

runTest('R2 and R3 replace RoleGuard and SyncProvider consumers', () => {
  assert.match(roleGuardSource, /useRoleContext\(\)/);
  assert.match(roleGuardSource, /roleRefreshState\.shouldShowBlockingFallback/);
  assert.doesNotMatch(roleGuardSource, /useUserRole\(\)/);
  assert.match(syncContextSource, /useRoleContext\(\)/);
  assert.match(syncContextSource, /roleRefreshState\.syncInfoLevel/);
  assert.match(syncContextSource, /roleRefreshState\.stage === ['"]ready['"]/);
  assert.doesNotMatch(syncContextSource, /useUserRole\(\)/);
});

runTest('R4a replaces display and navigation consumers only', () => {
  for (const source of [
    topNavigationSource,
    bottomNavigationSource,
    staffModeNoticeSource,
    roleStatusBannerSource,
  ]) {
    assert.match(source, /useRoleContext\(\)/);
    assert.doesNotMatch(source, /useUserRole\(\)/);
  }

  assert.match(bottomNavigationSource, /roleRefreshState\.stage !== ['"]ready['"]/);
  assert.match(databaseRecoveryPanelSource, /useUserRole\(\)/);
});

runTest('R4b aligns initial sync with shared role readiness and keeps sensitive monitors local', () => {
  assert.match(initialSyncDialogSource, /useRoleContext\(\)/);
  assert.match(initialSyncDialogSource, /const isRoleReady = roleRefreshState\.stage === ['"]ready['"]/);
  assert.match(initialSyncDialogSource, /resolveRoleMode\(userRole\)/);
  assert.match(initialSyncDialogSource, /if \(!user \|\| !isConfigured \|\| !isRoleReady\)/);
  assert.doesNotMatch(initialSyncDialogSource, /useUserRole\(\)/);

  assert.doesNotMatch(accountSwitcherSource, /useUserRole\(\)/);
  assert.doesNotMatch(accountSwitcherSource, /getCurrentDatabaseInfo/);
  assert.match(staffStatusMonitorSource, /useUserRole\(\)/);
  assert.match(databaseRecoveryPanelSource, /useUserRole\(\)/);
});

runTest('R4c migrates settlement report only and leaves data-loading pages local', () => {
  assert.match(settlementReportPageSource, /useRoleContext\(\)/);
  assert.match(settlementReportPageSource, /const isRoleReady = roleRefreshState\.stage === ['"]ready['"]/);
  assert.match(settlementReportPageSource, /isOwner:\s*isRoleReady && roleRefreshState\.permissions\.isOwner/);
  assert.match(settlementReportPageSource, /const canPreview =\s*isRoleReady &&/);
  assert.match(settlementReportPageSource, /if \(!isRoleReady\)/);
  assert.doesNotMatch(settlementReportPageSource, /useUserRole\(\)/);

  for (const source of [
    homePageSource,
    marketsPageSource,
    productsPageSource,
    analyticsPageSource,
    settingsPageSource,
    recoveryPageSource,
  ]) {
    assert.match(source, /useUserRole\(\)/);
  }
  assert.match(marketsPageSource, /initializeDatabaseSafely\(\{\s*profile:\s*isStaff \? ['"]staff_scoped['"] : ['"]owner_full['"]/);
  assert.match(productsPageSource, /initializeDatabaseSafely\(\{\s*profile:\s*isStaff \? ['"]staff_scoped['"] : ['"]owner_full['"]/);
});

function main(): void {
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} RoleProvider R1/R2/R3/R4 tests failed`);
  }
}

main();

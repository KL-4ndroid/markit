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
const userRoleHookSource = readProjectFile('hooks/useUserRole.ts');
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
const roleRefreshPlanSource = readProjectFile('docs/FORM_DRAFT_AND_ROLE_REFRESH_STABILITY_PLAN_2026_07_03.md');

console.log('\n=== RoleProvider R1/R2/R3/R4 guardrails ===');

runTest('RoleProvider owns the shared role refresh state without direct data access', () => {
  assert.match(roleContextSource, /'use client'/);
  assert.match(roleContextSource, /import \{ useUserRole, type UserRole \}/);
  assert.match(roleContextSource, /import \{ useAuth \}/);
  assert.match(roleContextSource, /deriveRoleRefreshState/);
  assert.match(roleContextSource, /const roleState = useUserRole\(\)/);
  assert.match(roleContextSource, /hasUsablePreviousRoleRef/);
  assert.match(roleContextSource, /trackedUserIdRef\.current !== userId/);
  assert.match(roleContextSource, /roleState\.resolvedUserId === userId/);
  assert.match(roleContextSource, /!isResolvedForCurrentUser/);
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

runTest('R4c migrates settlement report and list pages with fail-closed data scope', () => {
  assert.match(settlementReportPageSource, /useRoleContext\(\)/);
  assert.match(settlementReportPageSource, /const isRoleReady = roleRefreshState\.stage === ['"]ready['"]/);
  assert.match(settlementReportPageSource, /isOwner:\s*isRoleReady && roleRefreshState\.permissions\.isOwner/);
  assert.match(settlementReportPageSource, /const canPreview =\s*isRoleReady &&/);
  assert.match(settlementReportPageSource, /if \(!isRoleReady\)/);
  assert.doesNotMatch(settlementReportPageSource, /useUserRole\(\)/);

  for (const source of [marketsPageSource, productsPageSource]) {
    assert.match(source, /useRoleContext\(\)/);
    assert.match(source, /const isRoleReady = roleRefreshState\.stage === ['"]ready['"]/);
    assert.match(source, /const ROLE_NOT_READY_OWNER_ID = ['"]__role_not_ready__['"]/);
    assert.match(source, /ownerId:\s*scopedOwnerId/);
    assert.match(source, /if \(!canLoadScopedData \|\| dbStatus === null\)/);
    assert.doesNotMatch(source, /useUserRole\(\)/);
  }

  assert.match(marketsPageSource, /const currentOwnerId = isRoleReady \? \(isStaffMode \? userRole\.ownerId : user\?\.id\) : undefined/);
  assert.match(marketsPageSource, /if \(!isRoleReady \|\| !currentOwnerId\)/);
  assert.match(marketsPageSource, /initializeDatabaseSafely\(\{\s*profile:\s*isStaffMode \? ['"]staff_scoped['"] : ['"]owner_full['"]/);

  assert.match(productsPageSource, /const effectiveOwnerId = isRoleReady \? \(isStaffMode \? userRole\.ownerId : user\?\.id\) : undefined/);
  assert.match(productsPageSource, /if \(!isRoleReady \|\| !effectiveOwnerId\)/);
  assert.match(productsPageSource, /isOwner:\s*isRoleReady && roleRefreshState\.permissions\.isOwner/);
  assert.match(productsPageSource, /initializeDatabaseSafely\(\{\s*profile:\s*isStaffMode \? ['"]staff_scoped['"] : ['"]owner_full['"]/);

  for (const source of [
    homePageSource,
    analyticsPageSource,
    settingsPageSource,
    recoveryPageSource,
  ]) {
    assert.match(source, /useUserRole\(\)/);
  }
});

runTest('R4c-3A dashboard migration keeps role scope fail-closed', () => {
  assert.match(roleRefreshPlanSource, /### Slice R4c-3A: Dashboard Inventory and Static Guardrails/);
  assert.match(roleRefreshPlanSource, /Status: implemented through documentation and static guardrails/);
  assert.match(roleRefreshPlanSource, /Dashboard data dependency map:/);
  assert.match(roleRefreshPlanSource, /useMarkets\(\{ orderBy: 'startDate', order: 'asc', ownerId: currentOwnerId \}\)/);
  assert.match(roleRefreshPlanSource, /useMonthlyStats\(currentOwnerId\)/);
  assert.match(roleRefreshPlanSource, /unresolved owner id can become a broad local read/);
  assert.match(roleRefreshPlanSource, /unresolved owner id can aggregate all active local markets/);
  assert.match(roleRefreshPlanSource, /handleSignOut\(\)/);
  assert.match(roleRefreshPlanSource, /signOut\(\)/);
  assert.match(roleRefreshPlanSource, /confirmDiscardLocalChangesForSignOut\(error\)/);

  assert.match(homePageSource, /useUserRole\(\)/);
  assert.match(homePageSource, /const currentOwnerId = isStaff \? userRole\.ownerId : user\?\.id/);
  assert.match(homePageSource, /DASHBOARD_ROLE_NOT_READY_OWNER_ID/);
  assert.match(homePageSource, /ownerId:\s*scopedOwnerId/);
  assert.match(homePageSource, /buildTodayViewModel\(allMarkets, now\)/);
  assert.doesNotMatch(homePageSource, /useMonthlyStats\(/);
  assert.match(homePageSource, /useSyncContext\(\)/);
  assert.doesNotMatch(homePageSource, /\bsignOut\s*\(/);
  assert.doesNotMatch(homePageSource, /useRoleContext\(\)/);
});

runTest('role snapshots are bound to the authenticated user before protected UI mounts', () => {
  assert.match(userRoleHookSource, /const \[resolvedUserId, setResolvedUserId\]/);
  assert.match(userRoleHookSource, /setResolvedUserId\(requestUser\.id\)/);
  assert.match(userRoleHookSource, /setResolvedUserId\(null\)/);
  assert.match(userRoleHookSource, /resolvedUserId,/);
  assert.match(
    roleContextSource,
    /isLoading: roleState\.isLoading \|\| \(userId !== null && !isResolvedForCurrentUser\)/,
  );
});

runTest('R4c-3A blocks unsafe future dashboard shared-context migration', () => {
  const dashboardUsesSharedContext = /useRoleContext\(\)/.test(homePageSource);

  if (!dashboardUsesSharedContext) {
    assert.match(homePageSource, /useUserRole\(\)/);
    return;
  }

  assert.match(homePageSource, /const isRoleReady = roleRefreshState\.stage === ['"]ready['"]/);
  assert.match(homePageSource, /const .*OwnerId = isRoleReady \?/);
  assert.match(homePageSource, /ROLE_NOT_READY_OWNER_ID|DASHBOARD_ROLE_NOT_READY_OWNER_ID|canLoadScopedData/);
  assert.match(homePageSource, /ownerId:\s*scopedOwnerId|ownerId:\s*dashboardOwnerId/);
  assert.doesNotMatch(homePageSource, /ownerId:\s*currentOwnerId/);
  assert.doesNotMatch(homePageSource, /useMonthlyStats\(currentOwnerId\)/);
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

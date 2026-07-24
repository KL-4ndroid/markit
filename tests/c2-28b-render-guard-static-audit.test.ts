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

const roleFailClosedSource = readProjectFile('lib/permissions/role-fail-closed.ts');
const useUserRoleSource = readProjectFile('hooks/useUserRole.ts');
const roleGuardSource = readProjectFile('components/auth/RoleGuard.tsx');
const bottomNavigationSource = readProjectFile('components/BottomNavigation.tsx');
const appNavigationSource = readProjectFile('lib/navigation/app-navigation.ts');
const syncContextSource = readProjectFile('lib/sync-context.tsx');
const marketFallbackSource = readProjectFile('lib/markets/detail-fallback.ts');
const recoveryPageSource = readProjectFile('app/recovery/page.tsx');
const diagnosticsPanelSource = readProjectFile('components/common/OwnerPendingOperationDiagnosticsPanel.tsx');
const revenueRepairPanelSource = readProjectFile('components/common/OwnerRevenueGapRepairPanel.tsx');
const projectionRepairPanelSource = readProjectFile('components/common/LocalProjectionRepairPanel.tsx');

console.log('\n=== C2.28B render guard static audit ===');

runTest('role permission derivation remains fail-closed for loading error and unresolved roles', () => {
  assert.match(
    roleFailClosedSource,
    /const isResolved = !snapshot\.isLoading && !snapshot\.roleError && snapshot\.userRole != null/
  );
  assert.match(roleFailClosedSource, /const isOwner = isResolved && !isStaff/);
  assert.match(roleFailClosedSource, /canEdit:\s*isOwner/);
  assert.match(roleFailClosedSource, /canViewSensitiveData:\s*isOwner/);
  assert.match(
    roleFailClosedSource,
    /if \(snapshot\.isLoading \|\| snapshot\.roleError \|\| snapshot\.userRole == null\)[\s\S]*return 0/
  );
});

runTest('useUserRole exposes derived permissions and does not commit stale async role loads', () => {
  assert.match(useUserRoleSource, /import \{ deriveRolePermissions \}/);
  assert.match(useUserRoleSource, /const shouldCommitRoleLoad = useCallback\(\(requestId: number, requestUserId: string \| null\)/);
  assert.match(useUserRoleSource, /mountedRef\.current &&[\s\S]*roleRequestIdRef\.current === requestId[\s\S]*currentUserIdRef\.current === requestUserId/);
  assert.match(useUserRoleSource, /setRoleError\(error instanceof Error \? error : new Error\(String\(error\)\)\)/);
  assert.match(
    useUserRoleSource,
    /setUserRole\(\{\s*isStaff:\s*true,\s*staffRole:\s*null,\s*permissions:\s*\{\s*can_view:\s*false,\s*can_edit:\s*false\s*\}\s*\}\)/
  );
  assert.match(useUserRoleSource, /isOwner:\s*permissions\.isOwner/);
  assert.match(useUserRoleSource, /canEdit:\s*permissions\.canEdit/);
  assert.match(useUserRoleSource, /canViewSensitiveData:\s*permissions\.canViewSensitiveData/);
});

runTest('RoleGuard blocks protected routes through shared role refresh state', () => {
  assert.match(roleGuardSource, /const PUBLIC_ROUTES = \[[^\]]*['"]\/demo['"]/);
  assert.match(roleGuardSource, /const \{ roleRefreshState \} = useRoleContext\(\)/);
  assert.match(roleGuardSource, /if \(roleRefreshState\.shouldShowBlockingFallback\)[\s\S]*return <RoleLoadingFallback \/>/);
  assert.doesNotMatch(roleGuardSource, /useUserRole\(\)/);
  assert.match(roleGuardSource, /return <ProtectedRoleGuard>\{children\}<\/ProtectedRoleGuard>/);
});

runTest('BottomNavigation uses fail-closed role-aware navigation without disabled owner entries', () => {
  assert.match(bottomNavigationSource, /const \{ isStaff, roleRefreshState \} = useRoleContext\(\)/);
  assert.match(bottomNavigationSource, /const isRoleUnresolved = !roleRefreshState\.shouldMountProtectedChildren/);
  assert.match(bottomNavigationSource, /getAppNavigationItems\(\{[\s\S]*isStaff,[\s\S]*roleReady:\s*!isRoleUnresolved/);
  assert.match(appNavigationSource, /const STAFF_NAVIGATION_IDS[\s\S]*'today'[\s\S]*'markets'[\s\S]*'products'[\s\S]*'more'/);
  assert.doesNotMatch(appNavigationSource.match(/const STAFF_NAVIGATION_IDS[\s\S]*?\];/)?.[0] ?? '', /'analytics'/);
  assert.doesNotMatch(bottomNavigationSource, /isDisabled|僅供老闆/);
  assert.doesNotMatch(bottomNavigationSource, /useUserRole\(\)/);
});

runTest('SyncProvider uses shared role refresh state and pauses sync until ready', () => {
  assert.match(syncContextSource, /import \{ useRoleContext \}/);
  assert.match(syncContextSource, /const \{ roleRefreshState \} = useRoleContext\(\)/);
  assert.match(syncContextSource, /const safeInfoLevel = roleRefreshState\.syncInfoLevel/);
  assert.match(syncContextSource, /const isSyncRoleReady = roleRefreshState\.stage === ['"]ready['"]/);
  assert.match(syncContextSource, /enabled:\s*!!user && isConfigured && isSyncRoleReady/);
  assert.match(syncContextSource, /roleInfoLevel:\s*safeInfoLevel/);
  assert.match(syncContextSource, /const isDataSanitized = safeInfoLevel < 3/);
  assert.match(syncContextSource, /const contextValue = useMemo<SyncContextType>/);
  assert.doesNotMatch(syncContextSource, /useUserRole\(\)/);
  assert.doesNotMatch(syncContextSource, /deriveSafeInfoLevel\(\{/);
});

runTest('market detail Supabase fallback is blocked for staff and unresolved staff status', () => {
  assert.match(marketFallbackSource, /if \(ctx\.isStaff === undefined\)[\s\S]*staff_status_pending/);
  assert.match(marketFallbackSource, /if \(ctx\.isStaff\)[\s\S]*staff_mode_active/);
  assert.match(marketFallbackSource, /if \(!ctx\.isAuthenticated\)[\s\S]*user_not_authenticated/);
});

runTest('RecoveryPage gates all repair panels behind owner-only capability', () => {
  assert.match(recoveryPageSource, /deriveRoleCapabilities\(\{\s*isOwner,\s*staffRole:\s*userRole\.staffRole,\s*\}\)/);
  assert.match(
    recoveryPageSource,
    /const canUseRepairTools =\s*!isRoleLoading && hasCapability\(roleCapabilities,\s*['"]canUseRepairTools['"]\)/
  );

  const blockedIndex = recoveryPageSource.indexOf('if (!canUseRepairTools)');
  assert.ok(blockedIndex > 0, 'RecoveryPage must block before rendering tools');

  for (const marker of [
    '<DatabaseRecoveryPanel />',
    '<OwnerPendingOperationDiagnosticsPanel />',
    '<OwnerRevenueGapRepairPanel />',
    '<LocalProjectionRepairPanel />',
  ]) {
    const index = recoveryPageSource.indexOf(marker);
    assert.ok(index > blockedIndex, `${marker} must render after owner-only guard`);
  }
});

runTest('owner diagnostics and repair panels keep local staff/loading handler guards', () => {
  assert.match(diagnosticsPanelSource, /const isBlocked = !user \|\| isRoleLoading \|\| isStaff/);
  assert.match(diagnosticsPanelSource, /if \(isRoleLoading\)[\s\S]*<BlockedPanel/);
  assert.match(diagnosticsPanelSource, /if \(isStaff\)[\s\S]*<BlockedPanel/);
  assert.match(diagnosticsPanelSource, /if \(!user \|\| isRoleLoading \|\| isStaff \|\| !isStaleProcessing\(row\)\)/);
  assert.match(diagnosticsPanelSource, /if \(!user \|\| isRoleLoading \|\| isStaff \|\| !isRetryDrainCandidate\(row, user\.id\)\)/);

  assert.match(revenueRepairPanelSource, /const isBlocked = !isLoggedIn \|\| isRoleLoading \|\| isStaff/);
  assert.match(revenueRepairPanelSource, /if \(isRoleLoading\)[\s\S]*return/);
  assert.match(revenueRepairPanelSource, /if \(isStaff\)[\s\S]*return/);

  assert.match(projectionRepairPanelSource, /const assertOwnerCanRun = \(\): boolean => \{/);
  assert.match(projectionRepairPanelSource, /if \(isRoleLoading\)[\s\S]*return false/);
  assert.match(projectionRepairPanelSource, /if \(isStaff\)[\s\S]*return false/);
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
    throw new Error(`${failed} C2.28B render guard static audit tests failed`);
  }
}

main();

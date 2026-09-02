import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const authContext = read('lib/supabase/auth-context.tsx');
const userRoleHook = read('hooks/useUserRole.ts');
const roleContext = read('lib/role-context.tsx');
const roleState = read('lib/permissions/role-refresh-state.ts');
const roleGuard = read('components/auth/RoleGuard.tsx');
const roleBanner = read('components/auth/RoleStatusBanner.tsx');
const staffMonitor = read('hooks/useStaffStatusMonitor.ts');
const decision = read('docs/ROLE_REFRESH_CONTINUITY_IMPLEMENTATION_2026_07_23.md');
const manifest = read('scripts/test-files.txt');

const sharedRoleConsumers = [
  'app/page.tsx',
  'app/analytics/page.tsx',
  'app/recovery/page.tsx',
  'app/settings/page.tsx',
  'app/settings/account/page.tsx',
  'app/settings/app/page.tsx',
  'app/settings/data/page.tsx',
  'app/settings/sales/page.tsx',
  'app/settings/team/page.tsx',
  'components/markets/MarketCard.tsx',
  'components/markets/MarketDetailScreen.tsx',
  'components/markets/StaffMarketDetailView.tsx',
  'components/products/ProductDetailScreen.tsx',
  'components/settings/AccountSyncPanel.tsx',
  'hooks/useStaffStatusMonitor.ts',
];

console.log('\n=== Auth focus and role refresh continuity ===');

assert.doesNotMatch(authContext, /window\.location\.reload\(\)/);
assert.doesNotMatch(authContext, /postMessage\(\{\s*type:\s*['"]SIGNED_IN['"]/);
assert.match(authContext, /SIGNED_IN can also fire when an existing session is reconfirmed/);
assert.match(authContext, /currentUser\.id === nextUser\?\.id/);
assert.match(authContext, /event !== ['"]USER_UPDATED['"]/);

assert.match(userRoleHook, /const userId = user\?\.id \?\? null/);
assert.match(userRoleHook, /\[loadUserRole, userId\]/);
assert.doesNotMatch(userRoleHook, /\}, \[user\]\)/);
assert.match(userRoleHook, /revalidate\('role_invalidated'\)/);

assert.match(roleContext, /getLifecyclePort\(\)\.subscribe/);
assert.match(roleContext, /lifecycleState !== ['"]active['"]/);
assert.match(roleContext, /revalidateRole\(['"]app_resumed['"]\)/);
assert.match(roleContext, /FOREGROUND_ROLE_REVALIDATION_THROTTLE_MS/);

assert.match(roleState, /background_refresh_failed/);
assert.match(roleState, /isAuthorizationFresh:\s*false/);
assert.match(roleState, /shouldMountProtectedChildren:\s*true/);
assert.match(roleState, /syncInfoLevel:\s*0/);
assert.match(roleGuard, /inert=\{!roleRefreshState\.isAuthorizationFresh/);
assert.match(roleBanner, /setTimeout\(\(\) => setShowRefreshNotice\(true\), 400\)/);
assert.match(roleBanner, /onClick=\{refreshRole\}/);

assert.match(staffMonitor, /postgres_changes/);
assert.match(staffMonitor, /table:\s*['"]staff_relationships['"]/);
assert.match(staffMonitor, /void checkStaffStatus\(true\)/);
assert.match(staffMonitor, /setInterval/);

for (const path of sharedRoleConsumers) {
  const source = read(path);
  assert.match(source, /useRoleContext\(\)/, `${path} must use RoleContext`);
  assert.doesNotMatch(source, /useUserRole\(\)/, `${path} must not create a role query`);
}

assert.match(decision, /Normal focus and app resume do not call `window\.location\.reload\(\)`/);
assert.match(manifest, /tsx tests\/auth-focus-continuity\.test\.ts/);

console.log('PASS focus resume stays mounted and role changes remain fail closed');

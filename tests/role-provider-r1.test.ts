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

console.log('\n=== RoleProvider R1/R2 guardrails ===');

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

runTest('R2 replaces RoleGuard only and keeps SyncProvider on existing hook', () => {
  assert.match(roleGuardSource, /useRoleContext\(\)/);
  assert.match(roleGuardSource, /roleRefreshState\.shouldShowBlockingFallback/);
  assert.doesNotMatch(roleGuardSource, /useUserRole\(\)/);
  assert.match(syncContextSource, /useUserRole\(\)/);
  assert.doesNotMatch(syncContextSource, /useRoleContext\(\)/);
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
    throw new Error(`${failed} RoleProvider R1/R2 tests failed`);
  }
}

main();

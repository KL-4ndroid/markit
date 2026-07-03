import assert from 'node:assert/strict';
import { deriveRoleRefreshState } from '@/lib/permissions/role-refresh-state';
import type { UserRole } from '@/hooks/useUserRole';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const ownerRole: UserRole = {
  isStaff: false,
  staffRole: null,
};

const staffRole: UserRole = {
  isStaff: true,
  staffRole: 'operator',
  permissions: {
    can_view: true,
    can_edit: false,
    infoLevel: 2,
  } as UserRole['permissions'] & { infoLevel: 2 },
};

console.log('\n=== Role refresh state model ===');

runTest('initial unknown role blocks protected children and fails closed', () => {
  const state = deriveRoleRefreshState({
    userRole: null,
    isLoading: true,
    roleError: null,
  });

  assert.equal(state.stage, 'initial_loading');
  assert.equal(state.shouldMountProtectedChildren, false);
  assert.equal(state.shouldShowBlockingFallback, true);
  assert.equal(state.isRefreshing, false);
  assert.equal(state.permissions.isOwner, false);
  assert.equal(state.permissions.canEdit, false);
  assert.equal(state.permissions.canViewSensitiveData, false);
  assert.equal(state.syncInfoLevel, 0);
});

runTest('background refresh keeps children mounted but disables privileged behavior', () => {
  const state = deriveRoleRefreshState(
    {
      userRole: ownerRole,
      isLoading: true,
      roleError: null,
    },
    { hasUsablePreviousRole: true },
  );

  assert.equal(state.stage, 'background_refreshing');
  assert.equal(state.shouldMountProtectedChildren, true);
  assert.equal(state.shouldShowBlockingFallback, false);
  assert.equal(state.isRefreshing, true);
  assert.equal(state.permissions.isOwner, false);
  assert.equal(state.permissions.canEdit, false);
  assert.equal(state.permissions.canViewSensitiveData, false);
  assert.equal(state.syncInfoLevel, 0);
});

runTest('ready owner restores owner permissions and owner sync info level', () => {
  const state = deriveRoleRefreshState({
    userRole: ownerRole,
    isLoading: false,
    roleError: null,
  });

  assert.equal(state.stage, 'ready');
  assert.equal(state.shouldMountProtectedChildren, true);
  assert.equal(state.shouldShowBlockingFallback, false);
  assert.equal(state.isRefreshing, false);
  assert.equal(state.permissions.isOwner, true);
  assert.equal(state.permissions.canEdit, true);
  assert.equal(state.permissions.canViewSensitiveData, true);
  assert.equal(state.syncInfoLevel, 3);
});

runTest('ready staff remains staff-scoped and sanitized', () => {
  const state = deriveRoleRefreshState({
    userRole: staffRole,
    isLoading: false,
    roleError: null,
  });

  assert.equal(state.stage, 'ready');
  assert.equal(state.shouldMountProtectedChildren, true);
  assert.equal(state.permissions.isOwner, false);
  assert.equal(state.permissions.canEdit, false);
  assert.equal(state.permissions.canViewSensitiveData, false);
  assert.equal(state.syncInfoLevel, 2);
});

runTest('refresh error blocks protected children and fails closed', () => {
  const state = deriveRoleRefreshState(
    {
      userRole: ownerRole,
      isLoading: false,
      roleError: new Error('role refresh failed'),
    },
    { hasUsablePreviousRole: true },
  );

  assert.equal(state.stage, 'blocked');
  assert.equal(state.shouldMountProtectedChildren, false);
  assert.equal(state.shouldShowBlockingFallback, true);
  assert.equal(state.permissions.isOwner, false);
  assert.equal(state.permissions.canEdit, false);
  assert.equal(state.permissions.canViewSensitiveData, false);
  assert.equal(state.syncInfoLevel, 0);
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
    throw new Error(`${failed} role refresh state tests failed`);
  }
}

main();

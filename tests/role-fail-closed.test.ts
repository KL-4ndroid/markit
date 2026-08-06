/**
 * Role Fail-Closed 純函式測試（C2.28）
 *
 * 目標：驗證 deriveRolePermissions / deriveSafeInfoLevel 在 loading / error /
 *      未登入 / staff / owner 五種情境下都符合 fail-closed 原則
 */

import assert from 'node:assert/strict';
import {
  deriveRolePermissions,
  deriveSafeInfoLevel,
  isRoleInFailOpenState,
  type RoleSnapshot,
} from '../lib/permissions/role-fail-closed';

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

const ownerRole = { isStaff: false } as const;
const staffRole = {
  isStaff: true,
  ownerId: 'owner-uuid',
  ownerEmail: 'boss@test.com',
  permissions: { can_view: true, can_edit: true },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// deriveRolePermissions
// ─────────────────────────────────────────────────────────────────────────────

runTest('owner 已載入 → isOwner/canEdit/canViewSensitiveData 全 true', () => {
  const result = deriveRolePermissions({
    userRole: ownerRole,
    isLoading: false,
    roleError: null,
  });
  assert.equal(result.isOwner, true);
  assert.equal(result.canEdit, true);
  assert.equal(result.canViewSensitiveData, true);
  assert.equal(result.isStaff, false);
});

runTest('staff 已載入 → 全部 false，isStaff 為 true', () => {
  const result = deriveRolePermissions({
    userRole: staffRole,
    isLoading: false,
    roleError: null,
  });
  assert.equal(result.isOwner, false, '員工不可為 owner');
  assert.equal(result.canEdit, false, '員工不可編輯');
  assert.equal(result.canViewSensitiveData, false, '員工不可看敏感資料');
  assert.equal(result.isStaff, true, 'isStaff 仍為 true（相容輸出）');
});

runTest('role loading 期間 → 全部 false（fail-closed）', () => {
  const result = deriveRolePermissions({
    userRole: { isStaff: false },
    isLoading: true,
    roleError: null,
  });
  assert.equal(result.isOwner, false, 'loading 期間不可為 owner');
  assert.equal(result.canEdit, false, 'loading 期間不可編輯');
  assert.equal(result.canViewSensitiveData, false, 'loading 期間不可看敏感資料');
  assert.equal(result.isStaff, false, 'isStaff 維持初始值（相容）');
});

runTest('role 查詢錯誤 → 全部 false（fail-closed）', () => {
  const result = deriveRolePermissions({
    userRole: { isStaff: false },
    isLoading: false,
    roleError: new Error('Supabase timeout'),
  });
  assert.equal(result.canEdit, false, '錯誤時不可編輯');
  assert.equal(result.canViewSensitiveData, false, '錯誤時不可看敏感資料');
  assert.equal(result.isOwner, false, '錯誤時不可為 owner');
});

runTest('userRole 為 null → 全部 false', () => {
  const result = deriveRolePermissions({
    userRole: null,
    isLoading: false,
    roleError: null,
  });
  assert.equal(result.isOwner, false);
  assert.equal(result.canEdit, false);
  assert.equal(result.canViewSensitiveData, false);
});

runTest('userRole 為 undefined → 全部 false', () => {
  const result = deriveRolePermissions({
    userRole: undefined,
    isLoading: false,
    roleError: null,
  });
  assert.equal(result.isOwner, false);
  assert.equal(result.canEdit, false);
  assert.equal(result.canViewSensitiveData, false);
});

runTest('loading + error 同時 → 全部 false（不雙重 flip）', () => {
  const result = deriveRolePermissions({
    userRole: { isStaff: false },
    isLoading: true,
    roleError: new Error('boom'),
  });
  assert.equal(result.isOwner, false);
  assert.equal(result.canEdit, false);
  assert.equal(result.canViewSensitiveData, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// deriveSafeInfoLevel
// ─────────────────────────────────────────────────────────────────────────────

runTest('owner 已載入 → infoLevel 3', () => {
  const level = deriveSafeInfoLevel({
    userRole: ownerRole,
    isLoading: false,
    roleError: null,
  });
  assert.equal(level, 3);
});

runTest('staff 已載入無 infoLevel → infoLevel 2（預設）', () => {
  const level = deriveSafeInfoLevel({
    userRole: staffRole,
    isLoading: false,
    roleError: null,
  });
  assert.equal(level, 2);
});

runTest('staff with permissions.infoLevel=1 → infoLevel 1', () => {
  const level = deriveSafeInfoLevel({
    userRole: {
      isStaff: true,
      ownerId: 'x',
      permissions: { can_view: true, can_edit: false, infoLevel: 1 } as never,
    },
    isLoading: false,
    roleError: null,
  });
  assert.equal(level, 1);
});

runTest('role loading → infoLevel 0（fail-closed 最嚴格）', () => {
  const level = deriveSafeInfoLevel({
    userRole: { isStaff: false },
    isLoading: true,
    roleError: null,
  });
  assert.equal(level, 0, 'loading 期間必須是 0，不可被當作 owner (3)');
});

runTest('role error → infoLevel 0（fail-closed）', () => {
  const level = deriveSafeInfoLevel({
    userRole: { isStaff: false },
    isLoading: false,
    roleError: new Error('network'),
  });
  assert.equal(level, 0, '錯誤時必須是 0');
});

runTest('userRole null → infoLevel 0', () => {
  const level = deriveSafeInfoLevel({
    userRole: null,
    isLoading: false,
    roleError: null,
  });
  assert.equal(level, 0);
});

runTest('loading + error → infoLevel 0', () => {
  const level = deriveSafeInfoLevel({
    userRole: null,
    isLoading: true,
    roleError: new Error('x'),
  });
  assert.equal(level, 0);
});

// ─────────────────────────────────────────────────────────────────────────────
// isRoleInFailOpenState（監控用）
// ─────────────────────────────────────────────────────────────────────────────

runTest('isRoleInFailOpenState: loading=true → true', () => {
  const snap: RoleSnapshot = { userRole: null, isLoading: true, roleError: null };
  assert.equal(isRoleInFailOpenState(snap), true);
});

runTest('isRoleInFailOpenState: roleError != null → true', () => {
  const snap: RoleSnapshot = { userRole: null, isLoading: false, roleError: new Error('x') };
  assert.equal(isRoleInFailOpenState(snap), true);
});

runTest('isRoleInFailOpenState: userRole=null → true', () => {
  const snap: RoleSnapshot = { userRole: null, isLoading: false, roleError: null };
  assert.equal(isRoleInFailOpenState(snap), true);
});

runTest('isRoleInFailOpenState: 全部確認後 → false', () => {
  const snap: RoleSnapshot = {
    userRole: { isStaff: false },
    isLoading: false,
    roleError: null,
  };
  assert.equal(isRoleInFailOpenState(snap), false);
});

// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n失敗測試：${failures.join(', ')}`);
  process.exit(1);
}

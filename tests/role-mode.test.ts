/**
 * role-mode.test.ts
 *
 * 測試角色模式解析器的行為。
 */

import assert from 'node:assert/strict';
import { resolveRoleMode, type RoleMode } from '../lib/auth/role-mode';
import type { UserRole } from '../hooks/useUserRole';

function makeRole(overrides: Partial<UserRole> = {}): UserRole {
  return {
    isStaff: false,
    ...overrides,
  };
}

function roleMode(label: string, actual: RoleMode, expected: RoleMode): void {
  assert.equal(actual, expected, `[resolveRoleMode] ${label}: expected '${expected}', got '${actual}'`);
}

// null/undefined 輸入應安全處理（回傳 owner 而非拋錯）
roleMode('null', resolveRoleMode(null as unknown as UserRole), 'owner');
roleMode('undefined', resolveRoleMode(undefined as unknown as UserRole), 'owner');

// owner：無 staff 標記
roleMode('isStaff=false, 無 ownerId', resolveRoleMode(makeRole({ isStaff: false })), 'owner');
roleMode('isStaff=false, ownerId=undefined', resolveRoleMode(makeRole({ isStaff: false, ownerId: undefined })), 'owner');
roleMode('isStaff=false, ownerId=空字串', resolveRoleMode(makeRole({ isStaff: false, ownerId: '' })), 'owner');

// owner：isStaff=true 但無 ownerId（邊界保護）
roleMode('isStaff=true, ownerId=undefined', resolveRoleMode(makeRole({ isStaff: true, ownerId: undefined })), 'owner');
roleMode('isStaff=true, ownerId=空字串', resolveRoleMode(makeRole({ isStaff: true, ownerId: '' })), 'owner');

// staff：isStaff=true 且有 ownerId
roleMode('isStaff=true, ownerId=有效值', resolveRoleMode(makeRole({ isStaff: true, ownerId: 'owner-123' })), 'staff');
roleMode('isStaff=true, ownerId=有效值, 其他欄位', resolveRoleMode(makeRole({ isStaff: true, ownerId: 'abc', ownerEmail: 'boss@example.com' })), 'staff');

// 邊界：ownerId 為 falsy 值
roleMode('isStaff=true, ownerId=0', resolveRoleMode(makeRole({ isStaff: true, ownerId: 0 as unknown as string })), 'owner');
roleMode('isStaff=true, ownerId=false', resolveRoleMode(makeRole({ isStaff: true, ownerId: false as unknown as string })), 'owner');

console.log('✅ role-mode tests passed');

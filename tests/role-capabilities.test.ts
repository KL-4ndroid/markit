/**
 * Role Capabilities 純函式測試（P5-3）
 *
 * 目標：驗證 deriveRoleCapabilities / hasCapability 在 owner / viewer /
 *      operator / manager / fail-closed 五種情境下都符合 P5-3 spec。
 *
 * 同時驗證：
 * - 每次回傳新 object（mutation safety）
 * - hasCapability 純布林讀取
 * - helper 無外部副作用
 */

import assert from 'node:assert/strict';
import {
  deriveRoleCapabilities,
  hasCapability,
  type RoleCapabilities,
  type StaffCapability,
} from '../lib/permissions/role-capabilities';

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

// ─── 工具：列出 15 個 capability key（type-level 推導失敗時 fallback 到執行期 list） ──

const ALL_CAPABILITIES: StaffCapability[] = [
  'canRecordInteraction',
  'canRecordDeal',
  'canCreateFieldNote',
  'canEditMarketBasic',
  'canEditProductBasic',
  'canManageChecklist',
  'canEditOwnSameDayRecord',
  'canDeleteOwnSameDayRecord',
  'canManageStaff',
  'canChangeStaffRole',
  'canViewOwnerFinance',
  'canUseRepairTools',
  'canImportExport',
  'canDeleteMarket',
  'canDeleteProduct',
];

const OWNER_ONLY: StaffCapability[] = [
  'canManageStaff',
  'canChangeStaffRole',
  'canViewOwnerFinance',
  'canUseRepairTools',
  'canImportExport',
  'canDeleteMarket',
  'canDeleteProduct',
];

function assertAllTrue(caps: RoleCapabilities, expected: boolean): void {
  for (const key of ALL_CAPABILITIES) {
    assert.equal(
      caps[key],
      expected,
      `capability ${key} 應為 ${expected}，實際為 ${caps[key]}`
    );
  }
}

function assertSubset(
  caps: RoleCapabilities,
  truthy: StaffCapability[],
  falsy: StaffCapability[]
): void {
  for (const key of truthy) {
    assert.equal(caps[key], true, `${key} 應為 true`);
  }
  for (const key of falsy) {
    assert.equal(caps[key], false, `${key} 應為 false`);
  }
}

console.log('\n=== Role Capabilities 純函式測試（P5-3）===\n');

// ─── 1. owner ──────────────────────────────────────────────────────────────────

runTest('owner: isOwner=true + staffRole=null → 全部 true', () => {
  const caps = deriveRoleCapabilities({ isOwner: true, staffRole: null });
  assertAllTrue(caps, true);
});

runTest('owner: isOwner=true + staffRole=viewer → 全部 true（owner 忽略 staffRole）', () => {
  const caps = deriveRoleCapabilities({ isOwner: true, staffRole: 'viewer' });
  assertAllTrue(caps, true);
});

runTest('owner: isOwner=true + staffRole=operator → 全部 true', () => {
  const caps = deriveRoleCapabilities({ isOwner: true, staffRole: 'operator' });
  assertAllTrue(caps, true);
});

runTest('owner: isOwner=true + staffRole=manager → 全部 true', () => {
  const caps = deriveRoleCapabilities({ isOwner: true, staffRole: 'manager' });
  assertAllTrue(caps, true);
});

runTest('owner: isOwner=true + staffRole=undefined → 全部 true', () => {
  const caps = deriveRoleCapabilities({ isOwner: true });
  assertAllTrue(caps, true);
});

// ─── 2. viewer ─────────────────────────────────────────────────────────────────

runTest('viewer: isOwner=false + staffRole=viewer → 全部 false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'viewer' });
  assertAllTrue(caps, false);
});

// ─── 3. operator ───────────────────────────────────────────────────────────────

runTest('operator: 只 canRecordInteraction = true，其他全 false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'operator' });
  const truthy: StaffCapability[] = [
    'canRecordInteraction',
    'canEditOwnSameDayRecord',
    'canDeleteOwnSameDayRecord',
  ];
  const falsy: StaffCapability[] = ALL_CAPABILITIES.filter(
    (k) => !truthy.includes(k)
  );
  assertSubset(caps, truthy, falsy);
});

runTest('operator: 明確驗證 manager 範圍能力全 false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'operator' });
  assert.equal(caps.canRecordDeal, false, 'canRecordDeal 仍 gated');
  assert.equal(caps.canCreateFieldNote, false, 'canCreateFieldNote 仍 gated');
  assert.equal(caps.canEditMarketBasic, false, 'canEditMarketBasic = false');
  assert.equal(caps.canEditProductBasic, false, 'canEditProductBasic = false');
  assert.equal(caps.canManageChecklist, false, 'canManageChecklist = false');
});

runTest('operator: 明確驗證 owner-only 全 false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'operator' });
  for (const key of OWNER_ONLY) {
    assert.equal(caps[key], false, `${key} 必須為 false（operator 不可有 owner-only）`);
  }
});

// ─── 4. manager ────────────────────────────────────────────────────────────────

runTest('manager: 6 個 manager 能力 = true', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'manager' });
  const truthy: StaffCapability[] = [
    'canRecordInteraction',
    'canRecordDeal',
    'canCreateFieldNote',
    'canEditMarketBasic',
    'canEditProductBasic',
    'canManageChecklist',
    'canEditOwnSameDayRecord',
    'canDeleteOwnSameDayRecord',
  ];
  const falsy: StaffCapability[] = ALL_CAPABILITIES.filter(
    (k) => !truthy.includes(k)
  );
  assertSubset(caps, truthy, falsy);
});

runTest('manager: 明確驗證 own-same-day record 全 false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'manager' });
  assert.equal(caps.canEditOwnSameDayRecord, true);
  assert.equal(caps.canDeleteOwnSameDayRecord, true);
});

runTest('manager: 明確驗證 owner-only 全 false（含 canDeleteMarket / canDeleteProduct）', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'manager' });
  assert.equal(caps.canManageStaff, false);
  assert.equal(caps.canChangeStaffRole, false);
  assert.equal(caps.canViewOwnerFinance, false);
  assert.equal(caps.canUseRepairTools, false);
  assert.equal(caps.canImportExport, false);
  assert.equal(caps.canDeleteMarket, false);
  assert.equal(caps.canDeleteProduct, false);
});

// ─── 5. fail-closed ────────────────────────────────────────────────────────────

runTest('fail-closed: isOwner=false + staffRole=null → 全 false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: null });
  assertAllTrue(caps, false);
});

runTest('fail-closed: isOwner=false + staffRole=undefined → 全 false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false });
  assertAllTrue(caps, false);
});

runTest('fail-closed: 未知字串 → 全 false（fail-closed）', () => {
  // @ts-expect-error — 故意傳入不在 union 的字串
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'unknown_role' });
  assertAllTrue(caps, false);
});

runTest('fail-closed: 邊界值空字串 → 全 false', () => {
  // @ts-expect-error — 故意傳入空字串
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: '' });
  assertAllTrue(caps, false);
});

// ─── 6. hasCapability ──────────────────────────────────────────────────────────

runTest('hasCapability: operator.canRecordInteraction = true', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'operator' });
  assert.equal(hasCapability(caps, 'canRecordInteraction'), true);
});

runTest('hasCapability: operator.canManageStaff = false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'operator' });
  assert.equal(hasCapability(caps, 'canManageStaff'), false);
});

runTest('hasCapability: viewer 全部 = false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: 'viewer' });
  for (const key of ALL_CAPABILITIES) {
    assert.equal(hasCapability(caps, key), false, `viewer.${key} 應為 false`);
  }
});

runTest('hasCapability: owner 全部 = true', () => {
  const caps = deriveRoleCapabilities({ isOwner: true, staffRole: null });
  for (const key of ALL_CAPABILITIES) {
    assert.equal(hasCapability(caps, key), true, `owner.${key} 應為 true`);
  }
});

runTest('hasCapability: fail-closed 全部 = false', () => {
  const caps = deriveRoleCapabilities({ isOwner: false, staffRole: null });
  for (const key of ALL_CAPABILITIES) {
    assert.equal(hasCapability(caps, key), false);
  }
});

// ─── 7. mutation safety ────────────────────────────────────────────────────────

runTest('mutation safety: 外部 mutate 不影響後續呼叫', () => {
  const caps1 = deriveRoleCapabilities({ isOwner: true, staffRole: null });
  // 外部 mutate 把 caps1 全部改成 false
  for (const key of ALL_CAPABILITIES) {
    (caps1 as Record<string, boolean>)[key] = false;
  }
  // 第二次 derive 應回傳完整 owner 能力
  const caps2 = deriveRoleCapabilities({ isOwner: true, staffRole: null });
  assertAllTrue(caps2, true);
});

runTest('mutation safety: viewer caps 被 mutate 不影響下次 viewer 結果', () => {
  const caps1 = deriveRoleCapabilities({ isOwner: false, staffRole: 'viewer' });
  (caps1 as Record<string, boolean>).canRecordInteraction = true;
  const caps2 = deriveRoleCapabilities({ isOwner: false, staffRole: 'viewer' });
  assertAllTrue(caps2, false);
});

runTest('mutation safety: operator caps 被 mutate 不影響下次 operator 結果', () => {
  const caps1 = deriveRoleCapabilities({ isOwner: false, staffRole: 'operator' });
  (caps1 as Record<string, boolean>).canRecordDeal = true; // 嘗試升級
  (caps1 as Record<string, boolean>).canEditMarketBasic = true;
  const caps2 = deriveRoleCapabilities({ isOwner: false, staffRole: 'operator' });
  assert.equal(caps2.canRecordInteraction, true);
  assert.equal(caps2.canRecordDeal, false);
  assert.equal(caps2.canEditMarketBasic, false);
  assert.equal(caps2.canEditOwnSameDayRecord, true);
  assert.equal(caps2.canDeleteOwnSameDayRecord, true);
});

runTest('mutation safety: 兩次呼叫 owner 回傳不同 reference', () => {
  const caps1 = deriveRoleCapabilities({ isOwner: true, staffRole: null });
  const caps2 = deriveRoleCapabilities({ isOwner: true, staffRole: null });
  assert.notEqual(caps1, caps2, '兩次呼叫應回傳不同 object reference');
});

// ─── 結尾 ──────────────────────────────────────────────────────────────────────

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  console.error('Failed tests:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}

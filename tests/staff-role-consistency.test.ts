import assert from 'node:assert/strict';
import { staffRolePermissionsMatch } from '../lib/permissions/staff-role-consistency';
import { staffAccessPresentation } from '../lib/permissions/staff-access-presentation';
import { deriveSafeInfoLevel } from '../lib/permissions/role-fail-closed';
import { sanitizeWithLevel, sanitizeEventsWithLevel } from '../lib/permissions/PermissionGate';
import { productAccessRowToLocal } from '../lib/data-mappers';
import { assertFreshStaffCapability } from '../lib/permissions/role-freshness';

const permissions = { can_view: true, can_edit: false, infoLevel: 0 } as const;
const before = JSON.stringify(permissions);
const snapshot = { isLoading: false, roleError: null, userRole: { isStaff: true, staffRole: 'operator' as const, permissions } };
assert.equal(staffRolePermissionsMatch('operator', permissions), false);
assert.equal(deriveSafeInfoLevel(snapshot), 0, 'diagnostic must preserve explicit L0');
const now = 1_800_000_000_000;
const cachedRole = (staffRole: 'operator' | 'viewer') => JSON.stringify({ userId: 'staff-test', timestamp: now, role: { isStaff: true, staffRole, permissions } });
assert.doesNotThrow(() => assertFreshStaffCapability({ userId: 'staff-test', eventType: 'deal_closed', now, rawCache: cachedRole('operator') }), 'characterizes role-based write gate: legacy JSON is not the capability decision');
assert.throws(() => assertFreshStaffCapability({ userId: 'staff-test', eventType: 'deal_closed', now, rawCache: cachedRole('viewer') }), /cannot canRecordDeal/);

const product = { id: 'product-test', owner_id: 'owner-test', relationship_owner_id: 'owner-test', access_type: 'staff', name: 'test', price: 120, stock: 2, cost: 50 };
const restricted = productAccessRowToLocal(sanitizeWithLevel(product, 'product', deriveSafeInfoLevel(snapshot)));
assert.equal(restricted.price, 0, 'characterizes existing mapper fallback for redacted price');
assert.equal(restricted.stock, undefined);
assert.equal(restricted.stock ?? 0, 0, 'characterizes existing UI fallback for redacted stock');
assert.equal(restricted.cost, undefined);

const deals = [1, 2, 3].map(id => ({ id: String(id), type: 'deal_closed', payload: { price: 120, quantity: 1 } }));
assert.equal(sanitizeEventsWithLevel(deals, 0).length, 0, 'L0 filters all three deals before replay');
assert.equal(sanitizeEventsWithLevel(deals, 2).length, 3);
const allowed = productAccessRowToLocal(sanitizeWithLevel(product, 'product', 2));
assert.equal(allowed.price, 120);
assert.equal(allowed.stock, 2);
assert.equal(allowed.cost, undefined, 'L2 still hides owner cost');

for (const role of ['viewer', 'operator', 'manager'] as const) {
  assert.equal(staffRolePermissionsMatch(role, { can_view: true, can_edit: role !== 'viewer', infoLevel: role === 'viewer' ? 0 : 2 }), true);
}
for (const value of [null, [], {}, { can_view: true, can_edit: true, infoLevel: '2' }, { can_view: true, can_edit: true, infoLevel: 3 }]) {
  assert.equal(staffRolePermissionsMatch('operator', value), false);
}
const active = { role: 'operator' as const, status: 'active' as const, canView: true, teamAllowed: true, permissions };
assert.equal(staffAccessPresentation(active).title, '角色與資料權限不一致');
assert.equal(staffAccessPresentation({ ...active, status: 'suspended_by_plan' }).title, '存取已暫停');
assert.equal(staffAccessPresentation({ ...active, simulationActive: true }).title, '目前為模擬顯示');
assert.equal(staffAccessPresentation({ ...active, teamAllowed: false }).title, '存取資格尚未確認');
assert.equal(JSON.stringify(permissions), before, 'diagnostic must not mutate permissions');
assert.equal(deriveSafeInfoLevel(snapshot), 0);
console.log('Staff role consistency diagnosis and redaction characterization passed.');

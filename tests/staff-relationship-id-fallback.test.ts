import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  hydrateMissingStaffRelationshipIds,
  type StaffRelationshipIdentityRow,
} from '../lib/supabase/staff';
import type { StaffRelationship } from '../types/staff';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const staffServiceSource = readFileSync(join(projectRoot, 'lib/supabase/staff.ts'), 'utf8');
const staffManagementSource = readFileSync(join(projectRoot, 'components/settings/StaffManagement.tsx'), 'utf8');
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function relationship(overrides: Partial<StaffRelationship> = {}): StaffRelationship {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    owner_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    staff_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    staff_email: 'staff@example.test',
    status: 'active',
    permissions: { can_view: true, can_edit: false },
    role: 'viewer',
    created_at: '2026-07-15T00:00:00.000Z',
    updated_at: '2026-07-15T00:00:00.000Z',
    ...overrides,
  };
}

console.log('\n=== Staff relationship id fallback ===');

runTest('preserves relationship ids returned by the RPC', () => {
  const staff = { ...relationship(), relationship_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' };
  const result = hydrateMissingStaffRelationshipIds([staff], [{
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    staff_id: staff.staff_id,
    status: staff.status,
  }]);

  assert.equal(result[0].relationship_id, staff.relationship_id);
});

runTest('hydrates a missing id from the same staff and relationship status', () => {
  const staff = relationship();
  const identity: StaffRelationshipIdentityRow = {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    staff_id: staff.staff_id,
    status: 'active',
  };

  const result = hydrateMissingStaffRelationshipIds([staff], [identity]);
  assert.equal(result[0].relationship_id, identity.id);
});

runTest('does not hydrate from a stale relationship status', () => {
  const staff = relationship({ status: 'active' });
  const result = hydrateMissingStaffRelationshipIds([staff], [{
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    staff_id: staff.staff_id,
    status: 'revoked',
  }]);

  assert.equal(result[0].relationship_id, undefined);
});

runTest('fallback query is owner-scoped and only runs for missing ids', () => {
  assert.match(staffServiceSource, /filter\(staff => !staff\.relationship_id\)/);
  assert.match(staffServiceSource, /\.from\('staff_relationships'\)/);
  assert.match(staffServiceSource, /\.eq\('owner_id', authData\.user\.id\)/);
  assert.match(staffServiceSource, /\.in\('staff_id', missingRelationshipStaffIds\)/);
  assert.match(staffServiceSource, /hydrateMissingStaffRelationshipIds/);
});

runTest('staff role button still requires a resolved relationship id', () => {
  assert.match(staffManagementSource, /disabled=\{staff\.status !== 'active' \|\| !staff\.relationship_id\}/);
  assert.match(staffManagementSource, /updateStaffRole\(editingStaff\.relationship_id, selectedRole\)/);
});

runTest('full test suite includes the compatibility fallback guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/staff-relationship-id-fallback\.test\.ts/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} staff relationship id fallback tests failed`);
  }
}

main();

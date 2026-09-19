import assert from 'node:assert/strict';

import { getSettingsDestinationGroups } from '../lib/settings/settings-navigation';

const ownerGroups = getSettingsDestinationGroups(false);
assert.deepEqual(
  ownerGroups.flatMap((group) => group.items.map((item) => item.id)),
  ['account', 'team', 'sales', 'data', 'app'],
);
assert.equal(ownerGroups[0].label, '營運設定');

const staffGroups = getSettingsDestinationGroups(true);
assert.deepEqual(
  staffGroups.flatMap((group) => group.items.map((item) => item.id)),
  ['account', 'team', 'app'],
);
assert.equal(staffGroups[0].label, '你的工作空間');
assert.equal(
  staffGroups.some((group) => group.items.some((item) => item.id === 'sales' || item.id === 'data')),
  false,
);

for (const group of ownerGroups) {
  for (const item of group.items) {
    assert.match(item.href, /^\/settings\//);
    assert.ok(item.description.length > 0);
  }
}

console.log('PASS role-aware settings destinations');

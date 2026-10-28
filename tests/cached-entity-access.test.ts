import assert from 'node:assert/strict';
import { canReadCachedEntity } from '../lib/permissions/cached-entity-access';

const foreign = Object.freeze({ owner_id: 'brand-owner' });
const owner = { isStaff: false };
const staff = { isStaff: true, ownerId: 'brand-owner', permissions: { can_view: true, can_edit: false } };
assert.equal(canReadCachedEntity(foreign, 'brand-owner', owner), true);
assert.equal(canReadCachedEntity(foreign, 'test-staff', staff), true);
// Natural expiry/restoration and role removal return this account to its own workspace.
// The retained foreign record must never inherit that new owner identity.
assert.equal(canReadCachedEntity(foreign, 'test-staff', owner), false);
assert.equal(canReadCachedEntity(foreign, 'other-staff', { ...staff, ownerId: 'different-brand' }), false);
assert.equal(canReadCachedEntity(foreign, 'test-staff', { ...staff, permissions: { can_view: false, can_edit: false } }), false);
assert.equal(canReadCachedEntity(foreign, 'test-staff', { isStaff: true, ownerId: 'brand-owner' }), false);
assert.equal(canReadCachedEntity(foreign, null, owner), false);
assert.equal(canReadCachedEntity({}, 'brand-owner', owner), false);
assert.deepEqual(foreign, { owner_id: 'brand-owner' });
console.log('PASS retained foreign market/product cache never becomes owner access after staff revocation');

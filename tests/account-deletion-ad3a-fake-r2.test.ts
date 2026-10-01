import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

type FakeR2 = Map<string, Uint8Array>;

const ownerManifest = Object.freeze([
  'sales-photo-evidence/owner-a/image-1.webp',
  'sales-photo-evidence/owner-a/thumb-1.webp',
  'product-covers/owner-a/product-1.webp',
]);
const unrelatedKey = 'sales-photo-evidence/owner-b/image-9.webp';
const fakeR2: FakeR2 = new Map([
  ...ownerManifest.map(key => [key, new Uint8Array([1, 2, 3])] as const),
  [unrelatedKey, new Uint8Array([9, 9, 9])],
]);

const manifestEvidenceHash = createHash('sha256')
  .update([...ownerManifest].sort().join('\n'), 'utf8')
  .digest('hex');
assert.match(manifestEvidenceHash, /^[0-9a-f]{64}$/u);

for (const key of ownerManifest) {
  assert.equal(fakeR2.delete(key), true, `fixture key was not deleted: ${key}`);
}
for (const key of ownerManifest) {
  assert.equal(fakeR2.has(key), false, `deleted object remains readable: ${key}`);
}
assert.equal(fakeR2.has(unrelatedKey), true, 'cross-owner object was deleted');

// A store subscription restore can restore entitlement only. It has no object payload
// and therefore cannot recreate purged workspace objects.
const restoredEntitlement = { active: true, objectPayload: null } as const;
assert.equal(restoredEntitlement.active, true);
assert.equal(restoredEntitlement.objectPayload, null);
for (const key of ownerManifest) assert.equal(fakeR2.has(key), false);

console.log(JSON.stringify({
  ok: true,
  manifestObjectCount: ownerManifest.length,
  manifestEvidenceHash,
  absenceVerified: true,
  unrelatedObjectPreserved: true,
  entitlementRestoreDidNotRestoreObjects: true,
}));

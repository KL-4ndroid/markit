import assert from 'node:assert/strict';
import { MARKET_REGIONS, isMarketRegionCode, marketRegionCodeForLabel, marketRegionLabel, readMarketRegion, marketRegionFieldsToLocal } from '../lib/markets/market-region';
import { assertMarketRegionWriteReady } from '../lib/markets/market-region-rollout';
import { marketCreatedPayloadToCloud, marketRowToLocal, marketUpdatesToCamel, marketUpdatesToSnake, normalizeEventPayloadForLocal, venueRowToLocal } from '../lib/data-mappers';
import { validateMarketCoreForm } from '../lib/markets/market-form';
import { assertFreshStaffCapability } from '../lib/permissions/role-freshness';

assert.equal(MARKET_REGIONS.length, 22);
assert.equal(new Set(MARKET_REGIONS.map(region => region.code)).size, 22);
assert.equal(marketRegionCodeForLabel(' 台南市 '), 'tw-tainan-city');
assert.equal(marketRegionCodeForLabel('臺南市'), 'tw-tainan-city');
for (const ambiguous of ['新竹', '嘉義', '台南南紡', '台北松山捷運旁']) {
  assert.equal(marketRegionCodeForLabel(ambiguous), undefined, 'free text must not auto-classify a market');
}
assert.equal(isMarketRegionCode('臺南市'), false);
assert.equal(marketRegionLabel(null), '未分類');
assert.equal(marketRegionLabel(undefined), '未分類');
assert.equal(marketRegionLabel('tw-tainan-city'), '臺南市');
assert.deepEqual(marketRegionFieldsToLocal({ region_code: null, notes: undefined }), { regionCode: null, notes: undefined }, 'adding region normalization must preserve unrelated local field semantics');
assert.throws(() => readMarketRegion({ regionCode: '', region_code: 'tw-tainan-city' }));
assert.throws(() => readMarketRegion({ regionCode: null, region_code: 'tw-tainan-city' }));
assert.throws(() => marketUpdatesToSnake({ regionCode: 'unknown' }));
assert.throws(() => marketUpdatesToCamel({ region_code: 10 }));
assert.deepEqual(marketUpdatesToSnake({ regionCode: null, notes: 'unchanged address' }), { region_code: null, notes: 'unchanged address' });
assert.deepEqual(marketUpdatesToCamel({ region_code: null }), { regionCode: null });
assert.deepEqual(marketUpdatesToSnake({ notes: 'old client' }), { notes: 'old client' });
assert.deepEqual(marketUpdatesToSnake({ regionCode: undefined }), {});
assert.deepEqual(normalizeEventPayloadForLocal({ venueId: 'v', region_code: 'tw-tainan-city' }), {
  venueId: 'v', region_code: 'tw-tainan-city', regionCode: 'tw-tainan-city',
});
const payload = { name: '南紡', location: '自由地點', startDate: '2026-10-24', endDate: '2026-10-24', registrationFee: 0, boothCost: 0, regionCode: 'tw-tainan-city' } as const;
const cloud = marketCreatedPayloadToCloud(payload);
assert.equal(cloud.region_code, 'tw-tainan-city');
assert.equal((normalizeEventPayloadForLocal(cloud) as typeof payload).regionCode, payload.regionCode);
assert.equal(marketCreatedPayloadToCloud({ ...payload, regionCode: null }).region_code, null);
const hydrated = marketRowToLocal({ ...payload, regionCode: undefined, region_code: 'tw-tainan-city' });
assert.equal(hydrated.regionCode, 'tw-tainan-city');
assert.equal('region_code' in hydrated, false, 'local snapshots must not retain a stale wire alias');
assert.equal(marketRowToLocal({ ...hydrated, regionCode: null }).regionCode, null);
assert.equal(marketRowToLocal({ name: 'legacy', location: '台南南紡' }).regionCode, undefined);
assert.equal(venueRowToLocal({ region_code: 'tw-tainan-city' }).regionCode, 'tw-tainan-city');
assert.deepEqual(validateMarketCoreForm({ ...payload, dates: ['2026-10-24'], regionCode: null }), {});
assert.ok(validateMarketCoreForm({ ...payload, dates: ['2026-10-24'], regionCode: 'unknown' }).regionCode);

const originalFlag = process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED;
try {
  delete process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED;
  assert.doesNotThrow(() => assertMarketRegionWriteReady('market_created', { ...payload, regionCode: undefined }));
  assert.doesNotThrow(() => assertMarketRegionWriteReady('market_updated', { updates: { notes: 'legacy' } }));
  assert.throws(() => assertMarketRegionWriteReady('market_created', payload), /尚未開放/);
  assert.throws(() => assertMarketRegionWriteReady('market_updated', { updates: { regionCode: null } }), /尚未開放/);
  process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED = 'true';
  assert.doesNotThrow(() => assertMarketRegionWriteReady('market_updated', { updates: { regionCode: null } }));
  assert.throws(() => assertMarketRegionWriteReady('venue_created', { regionCode: 'invalid' }), /有效/);
} finally {
  if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED;
  else process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED = originalFlag;
}
for (const staffRole of ['viewer', 'operator', 'manager']) {
  for (const key of ['regionCode', 'region_code']) {
    assert.throws(() => assertFreshStaffCapability({ userId: 'staff', eventType: 'market_updated',
      payload: { market_id: 'm', updates: { [key]: 'tw-tainan-city' } }, now: 100,
      rawCache: JSON.stringify({ userId: 'staff', role: { isStaff: true, staffRole }, timestamp: 100 }),
    }), /Staff write blocked/);
  }
}
console.log('PASS region catalog, rollout, wire round trips, legacy compatibility and staff boundaries');

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateNativeStoreAssets,
  NativeStoreImageMetadata,
} from '../lib/deployment/native-store-asset-preflight';

function image(overrides: Partial<NativeStoreImageMetadata> = {}): NativeStoreImageMetadata {
  return {
    format: 'png',
    width: 1024,
    height: 1024,
    hasAlpha: false,
    channels: 3,
    sizeBytes: 100_000,
    ...overrides,
  };
}

const valid = evaluateNativeStoreAssets({
  iosAppIcon: image(),
  googlePlayIcon: image({ width: 512, height: 512, hasAlpha: true, channels: 4 }),
  googleFeatureGraphic: image({ width: 1024, height: 500 }),
  iosPhoneScreenshots: [image({ width: 1260, height: 2736 })],
  googlePhoneScreenshots: Array.from({ length: 4 }, () => (
    image({ width: 1080, height: 1920 })
  )),
});

assert.equal(valid.ready, true);
assert.equal(valid.totalCount, 5);
assert.equal(valid.passedCount, 5);
assert.equal(valid.blockerCount, 0);

const missing = evaluateNativeStoreAssets({
  iosAppIcon: null,
  googlePlayIcon: null,
  googleFeatureGraphic: null,
  iosPhoneScreenshots: [],
  googlePhoneScreenshots: [],
});
assert.equal(missing.ready, false);
assert.equal(missing.blockerCount, 5);
assert.ok(missing.checks.every(check => check.code === 'missing'));

const invalid = evaluateNativeStoreAssets({
  iosAppIcon: image({ format: 'jpeg' }),
  googlePlayIcon: image({ width: 512, height: 512 }),
  googleFeatureGraphic: image({ width: 1024, height: 500, hasAlpha: true, channels: 4 }),
  iosPhoneScreenshots: Array.from({ length: 11 }, () => image({ width: 1260, height: 2736 })),
  googlePhoneScreenshots: Array.from({ length: 4 }, () => image({ width: 1080, height: 1800 })),
});
assert.deepEqual(invalid.checks.map(check => check.code), [
  'format_invalid',
  'alpha_invalid',
  'alpha_invalid',
  'count_invalid',
  'dimensions_invalid',
]);
assert.doesNotMatch(
  JSON.stringify(invalid),
  /file-path|customer|account|token|credential|provider-reference/,
);

const root = process.cwd();
const baseline = readFileSync(join(
  root,
  'docs/subscription/NATIVE_STORE_LISTING_ASSET_BASELINE_2026_08_06.md',
), 'utf8');
const gates = JSON.parse(readFileSync(join(
  root,
  'docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json',
), 'utf8')) as { gates: Array<{ id: string; status: string }> };

assert.match(baseline, /developer\.apple\.com\/design\/human-interface-guidelines\/app-icons/);
assert.match(baseline, /support\.google\.com\/googleplay\/android-developer\/answer\/9866151/);
assert.match(baseline, /store-assets\/ios\/app-icon-1024\.png/);
assert.match(baseline, /Do not upscale the 406 x 406 source/);
assert.match(baseline, /final store assets pending manual production/);
assert.ok(gates.gates.some(gate => (
  gate.id === 'STORE-LISTING-ASSETS' && gate.status === 'pending_manual'
)));

console.log('PASS Native store asset structural preflight and manual boundary');

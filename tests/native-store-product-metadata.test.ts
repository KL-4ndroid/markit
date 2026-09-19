import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateNativeStoreProductMetadata,
  NativeStoreProductMetadataValidationError,
  parseNativeStoreProductMetadata,
} from '../lib/subscription/native-store-product-metadata';
import { getSubscriptionPlanFeatureStatus } from '../lib/subscription/subscription-plans';

type MutableAppleProduct = {
  priceVersionId: string;
  planCode: 'pro' | 'team';
  disposition: string;
  displayName: string;
  description: string;
  capabilityCodes: string[];
};
type MutableGoogleSubscription = {
  planCode: 'pro' | 'team';
  disposition: string;
  name: string;
  benefits: string[];
  capabilityCodes: string[];
};
type MutableDocument = Record<string, unknown> & {
  apple: { subscriptionGroupDisplayName: string; products: MutableAppleProduct[] };
  google: { subscriptions: MutableGoogleSubscription[] };
};

const root = process.cwd();
const jsonPath = join(
  root,
  'docs/subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json',
);
const source = readFileSync(jsonPath, 'utf8');
const canonical = JSON.parse(source) as MutableDocument;
const document = parseNativeStoreProductMetadata(canonical);
const report = evaluateNativeStoreProductMetadata(document);

assert.equal(report.readyForConsoleEntry, false);
assert.equal(report.appleProductCount, 5);
assert.equal(report.googleSubscriptionCount, 2);
assert.equal(report.founderDisposition, 'deferred_pending_mechanism');
assert.equal(report.checkCount, 6);
assert.equal(report.passedCount, 0);
assert.equal(report.blockerCount, 6);
assert.equal(document.apple.subscriptionGroupDisplayName, 'Feria 方案');
assert.ok(document.apple.products.every(product => Array.from(product.displayName).length <= 30));
assert.ok(document.apple.products.every(product => Array.from(product.description).length <= 45));
assert.ok(document.google.subscriptions.every(subscription => (
  Array.from(subscription.name).length <= 55
  && subscription.benefits.length <= 4
  && subscription.benefits.every(benefit => Array.from(benefit).length <= 40)
)));
for (const product of document.apple.products) {
  for (const capability of product.capabilityCodes) {
    assert.equal(getSubscriptionPlanFeatureStatus(product.planCode, capability), 'included');
  }
}
for (const subscription of document.google.subscriptions) {
  for (const capability of subscription.capabilityCodes) {
    assert.equal(getSubscriptionPlanFeatureStatus(subscription.planCode, capability), 'included');
  }
}
assert.doesNotMatch(source, /NT\$|\d+\s*%|免費|試用|折扣|優惠|終身|永久|無限|席次|Excel/iu);
assert.doesNotMatch(source, /"(?:productId|basePlanId|offerId|offerToken|credential|secret)"\s*:/iu);

function clone(): MutableDocument {
  return structuredClone(canonical);
}

const ready = clone();
for (const key of [
  'brandReviewStatus',
  'productTruthReviewStatus',
  'storePolicyReviewStatus',
  'legalReviewStatus',
  'finalBinaryReviewStatus',
  'founderPolicyDecisionStatus',
]) ready[key] = 'complete';
assert.equal(
  evaluateNativeStoreProductMetadata(parseNativeStoreProductMetadata(ready))
    .readyForConsoleEntry,
  true,
);

function expectInvalid(
  mutate: (input: MutableDocument) => void,
  code: NativeStoreProductMetadataValidationError['code'],
): void {
  const input = clone();
  mutate(input);
  assert.throws(
    () => parseNativeStoreProductMetadata(input),
    (error: unknown) => error instanceof NativeStoreProductMetadataValidationError
      && error.code === code,
  );
}

expectInvalid(input => { input.activationStatus = 'enabled'; }, 'activation_status_invalid');
expectInvalid(input => { input.submissionStatus = 'enabled'; }, 'submission_status_invalid');
expectInvalid(input => { input.brandReviewStatus = 'approved'; }, 'review_status_invalid');
expectInvalid(input => { input.apple.products[0].displayName = 'A'.repeat(31); }, 'apple_metadata_invalid');
expectInvalid(input => { input.apple.products[0].description = '市'.repeat(46); }, 'apple_metadata_invalid');
expectInvalid(input => { input.apple.products[0].description += ' 65% 優惠'; }, 'apple_metadata_invalid');
expectInvalid(input => { input.google.subscriptions[0].name = 'A'.repeat(56); }, 'google_metadata_invalid');
expectInvalid(input => { input.google.subscriptions[0].benefits.push('第五項'); }, 'google_metadata_invalid');
expectInvalid(input => { input.google.subscriptions[0].benefits[0] = '免費試用'; }, 'google_metadata_invalid');
expectInvalid(input => { input.apple.products[0].capabilityCodes.pop(); }, 'capability_mismatch');
expectInvalid(input => {
  input.apple.products[0].capabilityCodes[0] = 'report.excel';
}, 'capability_mismatch');
expectInvalid(input => {
  input.apple.products[0].disposition = 'deferred_pending_mechanism';
}, 'founder_disposition_invalid');
expectInvalid(input => {
  input.apple.products[2].disposition = 'candidate_requires_manual_review';
}, 'founder_disposition_invalid');
expectInvalid(input => { input.price = 'not-allowed'; }, 'document_invalid');

const documentation = readFileSync(join(
  root,
  'docs/subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.md',
), 'utf8');
const topology = readFileSync(join(
  root,
  'docs/subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md',
), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
assert.match(documentation, /Free remains a useful account plan but is not a store subscription product/);
assert.match(documentation, /deferred_pending_mechanism/);
assert.match(topology, /NATIVE_STORE_PRODUCT_METADATA_2026_08_06\.json/);
assert.ok(manifest.includes('tsx tests/native-store-product-metadata.test.ts'));
assert.ok(manifest.includes('tsx tests/native-store-product-metadata-cli.test.ts'));
assert.ok(packageJson.includes('"check:native-store-product-metadata"'));

console.log('PASS Native store product copy matches included capabilities and stays disabled');

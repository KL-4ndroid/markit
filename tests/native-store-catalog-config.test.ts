import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateNativeStoreCatalogConfig,
  parseNativeStoreCatalogConfig,
} from '../lib/subscription/native-store-catalog-config';

const root = process.cwd();
const configPath = join(
  root,
  'docs/subscription/NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json',
);
const source = readFileSync(configPath, 'utf8');
const raw = JSON.parse(source) as {
  schemaVersion: number;
  sourceDocument: string;
  updatedAt: string;
  environment: string;
  activationStatus: string;
  mappings: Array<{
    store: string;
    priceVersionId: string;
    productId: string | null;
    basePlanId: string | null;
    offerId: string | null;
    status: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

const canonical = parseNativeStoreCatalogConfig(raw);
const current = evaluateNativeStoreCatalogConfig(canonical);
assert.equal(current.readyForSandboxQuery, false);
assert.equal(current.totalMappingCount, 10);
assert.equal(current.candidateCount, 0);
assert.equal(current.deferredCount, 0);
assert.equal(current.unconfiguredCount, 10);
assert.equal(current.checkCount, 12);
assert.equal(current.blockerCount, 12);

function mutableConfig(): typeof raw {
  return JSON.parse(JSON.stringify(raw)) as typeof raw;
}

const ready = mutableConfig();
for (const mapping of ready.mappings) mapping.status = 'deferred';
const appleAnnual = ready.mappings.find(mapping => (
  mapping.store === 'apple_app_store'
  && mapping.priceVersionId === 'pro_annual_twd_launch_v1'
))!;
Object.assign(appleAnnual, {
  status: 'candidate',
  productId: 'test.feria.pro.annual',
});
const googleAnnual = ready.mappings.find(mapping => (
  mapping.store === 'google_play'
  && mapping.priceVersionId === 'pro_annual_twd_launch_v1'
))!;
Object.assign(googleAnnual, {
  status: 'candidate',
  productId: 'test.feria.pro',
  basePlanId: 'annual',
});
const readyReport = evaluateNativeStoreCatalogConfig(parseNativeStoreCatalogConfig(ready));
assert.equal(readyReport.readyForSandboxQuery, true);
assert.equal(readyReport.candidateCount, 2);
assert.equal(readyReport.deferredCount, 8);
assert.equal(readyReport.blockerCount, 0);

const active = mutableConfig();
active.mappings[0].status = 'active';
assert.throws(() => parseNativeStoreCatalogConfig(active), /mapping_invalid/);

const deferredWithIdentifier = mutableConfig();
deferredWithIdentifier.mappings[0].status = 'deferred';
deferredWithIdentifier.mappings[0].productId = 'must-not-remain';
assert.throws(() => parseNativeStoreCatalogConfig(deferredWithIdentifier), /mapping_invalid/);

const googleWithoutBasePlan = mutableConfig();
Object.assign(googleWithoutBasePlan.mappings[5], {
  status: 'candidate',
  productId: 'test.feria.pro',
});
assert.throws(() => parseNativeStoreCatalogConfig(googleWithoutBasePlan), /mapping_invalid/);

const duplicate = mutableConfig();
duplicate.mappings[1].priceVersionId = duplicate.mappings[0].priceVersionId;
assert.throws(() => parseNativeStoreCatalogConfig(duplicate), /mapping_duplicate/);

const extraMappingField = mutableConfig();
extraMappingField.mappings[0].purchaseOptionId = 'must-never-be-configured';
assert.throws(() => parseNativeStoreCatalogConfig(extraMappingField), /mapping_invalid/);

const production = mutableConfig();
production.environment = 'production';
assert.throws(() => parseNativeStoreCatalogConfig(production), /environment_invalid/);

const enabled = mutableConfig();
enabled.activationStatus = 'enabled';
assert.throws(() => parseNativeStoreCatalogConfig(enabled), /activation_status_invalid/);

const extraRootField = mutableConfig();
extraRootField.providerCredential = 'must-not-be-accepted';
assert.throws(() => parseNativeStoreCatalogConfig(extraRootField), /document_invalid/);

assert.doesNotMatch(source, /purchaseOptionId|offerToken|credential|secret|token/i);
assert.doesNotMatch(
  source,
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
);

const topology = readFileSync(
  join(root, 'docs/subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md'),
  'utf8',
);
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
assert.match(topology, /NATIVE_STORE_CATALOG_CONFIG_2026_08_06\.json/);
assert.match(topology, /check:native-store-catalog/);
assert.ok(manifest.includes('tsx tests/native-store-catalog-config.test.ts'));
assert.ok(manifest.includes('tsx tests/native-store-catalog-config-cli.test.ts'));
assert.ok(packageJson.includes('"check:native-store-catalog"'));

console.log('PASS Native store catalog config is strict, complete, and activation-disabled');

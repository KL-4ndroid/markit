import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateNativeStoreListingMetadata,
  NativeStoreListingMetadataValidationError,
  parseNativeStoreListingMetadata,
} from '../lib/deployment/native-store-listing-metadata';

const root = process.cwd();
const canonicalPath = join(
  root,
  'docs/subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.json',
);
const canonicalRaw = readFileSync(canonicalPath, 'utf8');
const canonicalInput = JSON.parse(canonicalRaw) as Record<string, any>;
const current = parseNativeStoreListingMetadata(canonicalInput);
const currentReport = evaluateNativeStoreListingMetadata(current);

assert.equal(currentReport.readyForConsoleEntry, false);
assert.equal(currentReport.checkCount, 11);
assert.equal(currentReport.passedCount, 0);
assert.equal(currentReport.blockerCount, 11);
assert.equal(current.apple.appName, 'Féria - 出攤筆記');
assert.equal(current.google.appName, 'Féria - 出攤筆記');
assert.ok(Buffer.byteLength(current.apple.keywords, 'utf8') <= 100);
assert.doesNotMatch(canonicalRaw, /@|password\s*[:=]|token\s*[:=]|secret\s*[:=]/i);
assert.doesNotMatch(
  `${current.apple.description}\n${current.google.fullDescription}`,
  /65%|Founder|席次|照片上傳|無限|PDF|付費分析|訂閱已開放/iu,
);

function clone(): Record<string, any> {
  return structuredClone(canonicalInput);
}

function expectInvalid(
  mutate: (input: Record<string, any>) => void,
  code: NativeStoreListingMetadataValidationError['code'],
): void {
  const input = clone();
  mutate(input);
  assert.throws(
    () => parseNativeStoreListingMetadata(input),
    (error: unknown) => error instanceof NativeStoreListingMetadataValidationError
      && error.code === code,
  );
}

const readyInput = clone();
readyInput.publicOrigin = 'https://feria.example.test';
readyInput.accountDeletionUrl = 'https://feria.example.test/account-deletion';
readyInput.reviewContactStatus = 'configured_external';
readyInput.reviewAccountStatus = 'configured_external';
readyInput.googleContactEmailStatus = 'configured_external';
readyInput.legalReviewStatus = 'complete';
readyInput.finalBinaryReviewStatus = 'complete';
readyInput.apple.supportUrl = 'https://feria.example.test/support';
readyInput.apple.privacyPolicyUrl = 'https://feria.example.test/privacy';
readyInput.google.supportWebsiteUrl = 'https://feria.example.test/support';
readyInput.google.privacyPolicyUrl = 'https://feria.example.test/privacy';
const readyReport = evaluateNativeStoreListingMetadata(
  parseNativeStoreListingMetadata(readyInput),
);
assert.equal(readyReport.readyForConsoleEntry, true);
assert.equal(readyReport.blockerCount, 0);

expectInvalid(input => { input.apple.appName = 'A'.repeat(31); }, 'apple_metadata_invalid');
expectInvalid(input => { input.apple.keywords = '品牌經營,'.repeat(20); }, 'apple_metadata_invalid');
expectInvalid(input => { input.apple.keywords = '市集,品牌經營'; }, 'apple_metadata_invalid');
expectInvalid(input => { input.apple.keywords = 'Féria工具,品牌經營'; }, 'apple_metadata_invalid');
expectInvalid(input => { input.google.shortDescription = '市'.repeat(81); }, 'google_metadata_invalid');
expectInvalid(input => { input.google.fullDescription += '\n限時優惠 65%'; }, 'google_metadata_invalid');
expectInvalid(input => { input.apple.supportUrl = 'http://example.test'; }, 'apple_metadata_invalid');
expectInvalid(input => {
  input.google.supportWebsiteUrl = 'https://user:pass@example.test/support';
}, 'google_metadata_invalid');
expectInvalid(input => { input.submissionStatus = 'enabled'; }, 'submission_status_invalid');
expectInvalid(input => { input.reviewPassword = 'not-allowed'; }, 'document_invalid');
expectInvalid(input => {
  input.apple.reviewNotesDraft = 'password=test-value';
}, 'apple_metadata_invalid');

const appMetadata = readFileSync(join(root, 'lib/app-metadata.ts'), 'utf8');
const documentation = readFileSync(join(
  root,
  'docs/subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.md',
), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
assert.match(appMetadata, /displayName: 'Féria - 出攤筆記'/);
assert.match(documentation, /STORE-COMPLIANCE.*pending_manual/);
assert.match(documentation, /reviewer credentials/);
assert.ok(manifest.includes('tsx tests/native-store-listing-metadata.test.ts'));
assert.ok(manifest.includes('tsx tests/native-store-listing-metadata-cli.test.ts'));
assert.ok(packageJson.includes('"check:native-store-metadata"'));

console.log('PASS Native store listing metadata is strict and submission-disabled');

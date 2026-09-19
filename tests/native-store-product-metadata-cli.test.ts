import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

type MutableDocument = Record<string, unknown>;

const root = process.cwd();
const cliPath = resolve('scripts/check-native-store-product-metadata.ts');
const canonicalPath = resolve(
  'docs/subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json',
);
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'boothbook-product-metadata-'));

function runCli(inputPath?: string) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', cliPath, ...(inputPath ? [`--input=${inputPath}`] : [])],
    { cwd: root, encoding: 'utf8', windowsHide: true },
  );
}

try {
  const current = runCli();
  assert.equal(current.status, 1, current.stderr);
  const currentOutput = JSON.parse(current.stdout);
  assert.equal(currentOutput.report.readyForConsoleEntry, false);
  assert.equal(currentOutput.report.blockerCount, 6);
  assert.equal(currentOutput.report.founderDisposition, 'deferred_pending_mechanism');
  assert.doesNotMatch(current.stdout, /Féria|priceVersion|capability|description|benefit/iu);

  const ready = JSON.parse(readFileSync(canonicalPath, 'utf8')) as MutableDocument;
  for (const key of [
    'brandReviewStatus',
    'productTruthReviewStatus',
    'storePolicyReviewStatus',
    'legalReviewStatus',
    'finalBinaryReviewStatus',
    'founderPolicyDecisionStatus',
  ]) ready[key] = 'complete';
  const readyPath = join(temporaryDirectory, 'ready.json');
  writeFileSync(readyPath, JSON.stringify(ready), { encoding: 'utf8', mode: 0o600 });
  const readyResult = runCli(readyPath);
  assert.equal(readyResult.status, 0, readyResult.stderr);
  assert.equal(JSON.parse(readyResult.stdout).report.readyForConsoleEntry, true);

  const invalidPath = join(temporaryDirectory, 'invalid.json');
  writeFileSync(invalidPath, '{"schemaVersion":2}', { encoding: 'utf8', mode: 0o600 });
  const invalid = runCli(invalidPath);
  assert.equal(invalid.status, 64);
  assert.deepEqual(JSON.parse(invalid.stderr), { ok: false, code: 'document_invalid' });

  const invalidArguments = spawnSync(
    process.execPath,
    ['--import', 'tsx', cliPath, '--unknown'],
    { cwd: root, encoding: 'utf8', windowsHide: true },
  );
  assert.equal(invalidArguments.status, 64);
  assert.deepEqual(JSON.parse(invalidArguments.stderr), {
    ok: false,
    code: 'argument_invalid',
  });
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}

console.log('PASS Native store product metadata CLI exits');

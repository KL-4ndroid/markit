import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const cliPath = resolve('scripts/check-native-store-catalog-config.ts');
const canonicalPath = resolve(
  'docs/subscription/NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json',
);
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'boothbook-store-catalog-'));

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
  assert.equal(currentOutput.report.readyForSandboxQuery, false);
  assert.equal(currentOutput.report.blockerCount, 12);

  const ready = JSON.parse(readFileSync(canonicalPath, 'utf8')) as {
    mappings: Array<{
      store: string;
      priceVersionId: string;
      productId: string | null;
      basePlanId: string | null;
      offerId: string | null;
      status: string;
    }>;
  };
  for (const mapping of ready.mappings) mapping.status = 'deferred';
  Object.assign(ready.mappings.find(mapping => (
    mapping.store === 'apple_app_store'
    && mapping.priceVersionId === 'pro_annual_twd_launch_v1'
  ))!, {
    status: 'candidate',
    productId: 'test.feria.pro.annual',
  });
  Object.assign(ready.mappings.find(mapping => (
    mapping.store === 'google_play'
    && mapping.priceVersionId === 'pro_annual_twd_launch_v1'
  ))!, {
    status: 'candidate',
    productId: 'test.feria.pro',
    basePlanId: 'annual',
  });
  const readyPath = join(temporaryDirectory, 'ready.json');
  writeFileSync(readyPath, JSON.stringify(ready), { encoding: 'utf8', mode: 0o600 });
  const readyResult = runCli(readyPath);
  assert.equal(readyResult.status, 0, readyResult.stderr);
  assert.equal(JSON.parse(readyResult.stdout).report.readyForSandboxQuery, true);

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

console.log('PASS Native store catalog config CLI exits');

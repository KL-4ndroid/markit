import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const cliPath = resolve('scripts/check-web-launch-readiness.ts');
const canonicalPath = resolve('docs/WEB_LAUNCH_GATES_2026_08_01.json');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'boothbook-launch-gates-'));

function runCli(inputPath?: string) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', cliPath, ...(inputPath ? [`--input=${inputPath}`] : [])],
    { cwd: root, encoding: 'utf8', windowsHide: true },
  );
}

try {
  const noGo = runCli();
  assert.equal(noGo.status, 1, noGo.stderr);
  const noGoOutput = JSON.parse(noGo.stdout);
  assert.equal(noGoOutput.report.ready, false);
  assert.equal(noGoOutput.report.blockerCount, 12);

  const canonical = JSON.parse(readFileSync(canonicalPath, 'utf8')) as {
    overallStatus: string;
    gates: Array<{ id: string; status: string }>;
  };
  const readyPath = join(temporaryDirectory, 'ready.json');
  writeFileSync(readyPath, JSON.stringify({
    ...canonical,
    overallStatus: 'ready',
    gates: canonical.gates.map(gate => ({ ...gate, status: 'complete' })),
  }), { encoding: 'utf8', mode: 0o600 });
  const ready = runCli(readyPath);
  assert.equal(ready.status, 0, ready.stderr);
  assert.equal(JSON.parse(ready.stdout).report.ready, true);

  const invalidPath = join(temporaryDirectory, 'invalid.json');
  writeFileSync(invalidPath, '{"schemaVersion":2}', { encoding: 'utf8', mode: 0o600 });
  const invalid = runCli(invalidPath);
  assert.equal(invalid.status, 64);
  assert.equal(invalid.stdout, '');
  assert.deepEqual(JSON.parse(invalid.stderr), { ok: false, code: 'document_invalid' });

  const invalidArguments = spawnSync(
    process.execPath,
    ['--import', 'tsx', cliPath, '--unknown'],
    { cwd: root, encoding: 'utf8', windowsHide: true },
  );
  assert.equal(invalidArguments.status, 64);
  assert.deepEqual(JSON.parse(invalidArguments.stderr), { ok: false, code: 'argument_invalid' });
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}

console.log('PASS Web launch gate CLI exits');

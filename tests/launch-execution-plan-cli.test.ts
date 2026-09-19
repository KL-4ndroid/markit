import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = process.cwd();
const cliPath = resolve('scripts/check-launch-execution-plan.ts');
const canonicalPath = resolve('docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'feria-launch-execution-'));

function runCli(inputPath?: string) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', cliPath, ...(inputPath ? [`--input=${inputPath}`] : [])],
    { cwd: root, encoding: 'utf8', windowsHide: true },
  );
}

try {
  const valid = runCli();
  assert.equal(valid.status, 0, valid.stderr);
  const output = JSON.parse(valid.stdout) as {
    ok: boolean;
    report: { launchReady: boolean; totalTaskCount: number; agentReadyIds: string[] };
  };
  assert.equal(output.ok, true);
  assert.equal(output.report.launchReady, false);
  assert.equal(output.report.totalTaskCount, 31);
  assert.deepEqual(output.report.agentReadyIds, []);

  const missingEvidencePlan = JSON.parse(readFileSync(canonicalPath, 'utf8')) as {
    tasks: Array<{ id: string; evidence: string[] }>;
  };
  const control = missingEvidencePlan.tasks.find(task => task.id === 'CONTROL-MASTER-PLAN');
  if (!control) throw new Error('missing control task');
  control.evidence = ['docs/DOES_NOT_EXIST.md'];
  const missingEvidencePath = join(temporaryDirectory, 'missing-evidence.json');
  writeFileSync(missingEvidencePath, JSON.stringify(missingEvidencePlan), {
    encoding: 'utf8',
    mode: 0o600,
  });
  const missingEvidence = runCli(missingEvidencePath);
  assert.equal(missingEvidence.status, 64);
  assert.deepEqual(JSON.parse(missingEvidence.stderr), {
    ok: false,
    code: 'evidence_file_missing',
  });

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

console.log('PASS launch execution plan CLI is deterministic and fail closed');

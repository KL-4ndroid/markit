import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const cliPath = resolve('scripts/run-web-release-smoke.ts');

const missing = spawnSync(process.execPath, ['--import', 'tsx', cliPath], {
  encoding: 'utf8',
  windowsHide: true,
});
assert.equal(missing.status, 64);
assert.equal(missing.stdout, '');
assert.deepEqual(JSON.parse(missing.stderr), { ok: false, code: 'argument_invalid' });

const credentialed = spawnSync(process.execPath, [
  '--import',
  'tsx',
  cliPath,
  '--base-url=https://user:pass@app.example.invalid',
  '--expected-commit=abcdef1',
  '--legal-mode=draft',
], {
  encoding: 'utf8',
  windowsHide: true,
});
assert.equal(credentialed.status, 64);
assert.equal(credentialed.stdout, '');
assert.deepEqual(JSON.parse(credentialed.stderr), { ok: false, code: 'argument_invalid' });
assert.doesNotMatch(credentialed.stderr, /user|pass|example/);

console.log('PASS Web release smoke CLI rejects unsafe input without echo');

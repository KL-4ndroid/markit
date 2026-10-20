import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildWebReleaseSmokeChecks,
  createWebReleaseSmokeReport,
  parseWebReleaseSmokeOptions,
  WebReleaseSmokeValidationError,
  type WebReleaseSmokeResult,
} from '../lib/deployment/web-release-smoke';

const CHILD_TIMEOUT_MS = 4 * 60 * 1_000;
const CHILD_MAX_BUFFER_BYTES = 1024 * 1024;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

try {
  const options = parseWebReleaseSmokeOptions(process.argv.slice(2));
  const checks = buildWebReleaseSmokeChecks(options);
  const results: WebReleaseSmokeResult[] = checks.map(check => ({
    id: check.id,
    status: 'not_run',
  }));

  for (const [index, check] of checks.entries()) {
    const child = spawnSync(process.execPath, [resolve(repositoryRoot, check.scriptPath)], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, ...check.environment },
      killSignal: 'SIGTERM',
      maxBuffer: CHILD_MAX_BUFFER_BYTES,
      timeout: CHILD_TIMEOUT_MS,
      windowsHide: true,
    });
    results[index] = {
      id: check.id,
      status: child.status === 0 && child.signal === null && !child.error
        ? 'passed'
        : 'failed',
    };
    if (results[index].status === 'failed') break;
  }

  const report = createWebReleaseSmokeReport(options, new Date().toISOString(), results);
  process.stdout.write(`${JSON.stringify({ ok: true, report })}\n`);
  process.exitCode = report.ready ? 0 : 1;
} catch (error) {
  const code = error instanceof WebReleaseSmokeValidationError
    ? error.code
    : 'release_smoke_failed';
  process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
  process.exitCode = 64;
}

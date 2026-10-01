import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const nextBin = join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const includeRuntimeSmoke = process.argv.includes('--runtime-smoke');
const requireApiBase = process.argv.includes('--require-api-base');

function hasValidHttpsApiBase(value) {
  if (!value?.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:'
      && parsed.username.length === 0
      && parsed.password.length === 0
      && parsed.search.length === 0
      && parsed.hash.length === 0;
  } catch {
    return false;
  }
}

if (requireApiBase && !hasValidHttpsApiBase(process.env.NEXT_PUBLIC_API_BASE_URL)) {
  console.error('NEXT_PUBLIC_API_BASE_URL must be a stable absolute HTTPS URL for an API-enabled mobile build.');
  process.exit(1);
}

const result = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    APP_BUILD_TARGET: 'mobile',
    APP_RUNTIME_SMOKE: includeRuntimeSmoke ? '1' : '0',
  },
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

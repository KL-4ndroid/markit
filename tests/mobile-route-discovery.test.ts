import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { discoverRoutes } = require('next/dist/build/route-discovery') as {
  discoverRoutes(options: Record<string, unknown>): Promise<{ mappedAppPages: unknown }>;
};

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(projectRoot, 'app');

async function discover(pageExtensions: string[]) {
  return discoverRoutes({
    appDir,
    pagesDir: undefined,
    pageExtensions,
    isDev: false,
    baseDir: projectRoot,
    isSrcDir: false,
    appDirOnly: true,
  });
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

async function main() {
  const mobileRoutes = JSON.stringify((await discover(['tsx'])).mappedAppPages);
  assert.match(mobileRoutes, /markets\/detail/);
  assert.match(mobileRoutes, /products\/detail/);
  assert.doesNotMatch(mobileRoutes, /markets\/\[id\]/);
  assert.doesNotMatch(mobileRoutes, /products\/\[id\]/);
  assert.doesNotMatch(mobileRoutes, /\/api\//);
  assert.doesNotMatch(mobileRoutes, /debug\/sales-photo-evidence/);
  assert.doesNotMatch(mobileRoutes, /mobile-runtime-smoke/);

  const mobileRuntimeSmokeRoutes = JSON.stringify(
    (await discover(['smoke.tsx', 'tsx'])).mappedAppPages,
  );
  assert.match(mobileRuntimeSmokeRoutes, /mobile-runtime-smoke/);
  assert.doesNotMatch(mobileRuntimeSmokeRoutes, /\/api\//);

  const webRoutes = JSON.stringify(
    (await discover(['web.tsx', 'tsx', 'ts', 'jsx', 'js'])).mappedAppPages,
  );
  assert.match(webRoutes, /markets\/\[id\]/);
  assert.match(webRoutes, /products\/\[id\]/);
  assert.match(webRoutes, /api\/sales-photo-evidence/);
  assert.match(webRoutes, /api\/health/);
  assert.match(webRoutes, /debug\/sales-photo-evidence/);
  assert.doesNotMatch(webRoutes, /mobile-runtime-smoke/);

  const appFiles = listFiles(appDir).map(path => path.replaceAll('\\', '/'));
  assert.equal(
    appFiles.some(path => /\/page\.ts$/.test(path)),
    false,
    'Mobile UI routes must use page.tsx so the mobile extension allowlist includes them.',
  );
  assert.equal(
    appFiles.some(path => /\/route\.tsx$/.test(path)),
    false,
    'Server route handlers must stay route.ts so the mobile extension allowlist excludes them.',
  );

  const configSource = readFileSync(join(projectRoot, 'next.config.mjs'), 'utf8');
  assert.match(configSource, /output:\s*['"]export['"]/);
  assert.match(configSource, /trailingSlash:\s*true/);
  assert.match(configSource, /tsconfigPath:\s*['"]tsconfig\.mobile\.json['"]/);
  assert.match(configSource, /APP_RUNTIME_SMOKE/);
  assert.match(configSource, /source:\s*['"]\/markets\/:id/);
  assert.match(configSource, /destination:\s*['"]\/markets\/detail\?id=:id['"]/);
  assert.match(configSource, /source:\s*['"]\/products\/:id/);
  assert.match(configSource, /destination:\s*['"]\/products\/detail\?id=:id['"]/);
  assert.doesNotMatch(configSource, /ignoreBuildErrors:\s*true/);

  console.log('PASS mobile/web route discovery boundaries');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

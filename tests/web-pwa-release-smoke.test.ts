import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isEntityCreateDeepLink } from '../lib/navigation/entity-create-deep-link';
import {
  assertServiceWorkerContract,
  assertWebAppManifestContract,
  readPngDimensions,
} from '../scripts/web-pwa-release-contract.mjs';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

console.log('\n=== Web PWA release smoke contract ===');

const manifest = JSON.parse(read('public/manifest.json')) as Record<string, unknown>;
const assets = assertWebAppManifestContract(manifest);
assert.ok(assets.length >= 9, 'manifest must expose the reviewed icon and screenshot assets');

for (const asset of assets) {
  const bytes = readFileSync(join(root, 'public', asset.src.replace(/^\//, '')));
  const dimensions = readPngDimensions(bytes);
  assert.ok(
    asset.sizes.some(size => size.width === dimensions.width && size.height === dimensions.height),
    `${asset.src} dimensions must match the manifest`,
  );
}

const screenshot = assets.find(asset => asset.src === '/screenshots/home.png');
assert.ok(screenshot, 'the narrow install screenshot must exist');
assert.deepEqual(readPngDimensions(readFileSync(join(root, 'public/screenshots/home.png'))), {
  width: 540,
  height: 720,
});
console.log('PASS manifest image assets exist and match their declared PNG dimensions');

assertServiceWorkerContract(read('public/sw.js'));
assert.throws(() => assertServiceWorkerContract("self.addEventListener('fetch', () => undefined);"));
console.log('PASS service worker remains versioned without an unreviewed fetch cache');

assert.equal(isEntityCreateDeepLink('https://app.example.test/markets?action=add', '/markets'), true);
assert.equal(isEntityCreateDeepLink('feria://app/products?action=add', '/products'), true);
assert.equal(isEntityCreateDeepLink('https://app.example.test/markets?action=view', '/markets'), false);
assert.equal(isEntityCreateDeepLink('https://evil.example/products?action=add', '/markets'), false);
assert.equal(isEntityCreateDeepLink('not a url', '/products'), false);

const marketPage = read('app/markets/page.tsx');
const productPage = read('app/products/page.tsx');
for (const page of [marketPage, productPage]) {
  assert.match(page, /getDeepLinkPort\(\)\.getInitialUrl\(\)/);
  assert.match(page, /isStaffMode \|\| !canLoadScopedData \|\| dbStatus\.ok === false/);
  assert.match(page, /shortcutHandledRef/);
  assert.doesNotMatch(page, /window\.location\.search/);
}
assert.match(marketPage, /isEntityCreateDeepLink\(url, '\/markets'\)/);
assert.match(productPage, /isEntityCreateDeepLink\(url, '\/products'\)/);
console.log('PASS create shortcuts use the portable deep-link port and fail closed for staff');

const registerServiceWorker = read('app/register-sw.tsx');
const appChrome = read('components/AppChrome.tsx');
assert.match(registerServiceWorker, /document\.readyState === 'complete'/);
assert.match(registerServiceWorker, /addEventListener\('load', handleLoad, \{ once: true \}\)/);
assert.match(registerServiceWorker, /removeEventListener\('load', handleLoad\)/);
assert.match(registerServiceWorker, /registrationPromise \?\?= registerServiceWorker\(\)/);
assert.equal((appChrome.match(/<RegisterServiceWorker \/>/g) ?? []).length, 3);
assert.match(appChrome, /isStandalonePublicRoute[\s\S]*<RegisterServiceWorker \/>/);
assert.match(appChrome, /isAuthFlowPublicRoute[\s\S]*<RegisterServiceWorker \/>/);
console.log('PASS service worker registration covers public and protected shells without a load-event race');

const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
assert.equal(packageJson.scripts?.['smoke:web:pwa'], 'node scripts/smoke-web-pwa-resources.mjs');
assert.match(read('scripts/smoke-web-pwa-resources.mjs'), /assertHealthReleaseIdentity/);
assert.match(read('scripts/smoke-web-pwa-resources.mjs'), /assertWebSecurityHeaders/);
assert.match(read('docs/WEB_PWA_RELEASE_SMOKE.md'), /remote install evidence pending/);
assert.match(read('docs/WEB_LAUNCH_READINESS_2026_07_30.md'), /`PWA-WEB`/);
assert.match(read('scripts/test-files.txt'), /tsx tests\/web-pwa-release-smoke\.test\.ts/);
console.log('PASS commit-bound PWA smoke is registered in the complete test manifest');

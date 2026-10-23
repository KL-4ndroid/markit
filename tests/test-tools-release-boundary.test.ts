import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';
import { resolveTestToolsBuild } from '../scripts/lib/test-tools-build-policy.mjs';
import { excludeTestToolsFromExport } from '../scripts/lib/test-tools-export.mjs';
import RecoveryLayout from '../app/recovery/layout';
import TestDataToolsLayout from '../app/settings/data/layout';

assert.equal(resolveTestToolsBuild(), false);
assert.equal(resolveTestToolsBuild({ nodeEnv: 'production' }), false);
assert.equal(resolveTestToolsBuild({ nodeEnv: 'development' }), true);
assert.equal(resolveTestToolsBuild({ nodeEnv: 'production', releaseChannel: 'test' }), true);
assert.equal(resolveTestToolsBuild({ nodeEnv: 'production', releaseChannel: 'preview' }), false);
for (const nodeEnv of ['development', 'production', 'test', undefined]) {
  assert.equal(resolveTestToolsBuild({ nodeEnv, releaseChannel: 'production' }), false);
  assert.equal(resolveTestToolsBuild({ nodeEnv, releaseChannel: 'unknown' }), false);
}

// Standalone tests have no explicit test build marker. Server layouts must stop
// direct navigation before the child test tools can render.
for (const Layout of [RecoveryLayout, TestDataToolsLayout]) {
  assert.throws(() => Layout({ children: 'test tool must not render' }), /NEXT_HTTP_ERROR_FALLBACK;404/);
}
for (const path of ['/recovery', '/recovery/', '/settings/data', '/settings/data/history']) {
  const response = proxy(new NextRequest(`http://localhost${path}`));
  assert.equal(response.status, 404, path);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
}
const output = mkdtempSync(join(tmpdir(), 'feria-test-tools-export-'));
try {
  for (const path of ['recovery', 'settings/data', 'settings/account', 'markets']) {
    mkdirSync(join(output, path), { recursive: true });
    writeFileSync(join(output, path, 'index.html'), path);
  }
  excludeTestToolsFromExport(output);
  assert.equal(existsSync(join(output, 'recovery')), false);
  assert.equal(existsSync(join(output, 'settings/data')), false);
  assert.equal(readFileSync(join(output, 'settings/account/index.html'), 'utf8'), 'settings/account');
  assert.equal(readFileSync(join(output, 'markets/index.html'), 'utf8'), 'markets');
  symlinkSync(join(output, 'markets'), join(output, 'recovery'), 'junction');
  assert.throws(() => excludeTestToolsFromExport(output), /test_tools_export_symlink_forbidden/);
  assert.equal(readFileSync(join(output, 'markets/index.html'), 'utf8'), 'markets');
  unlinkSync(join(output, 'recovery'));
} finally { rmSync(output, { recursive: true, force: true }); }
const root = join(__dirname, '..');
for (const file of ['app/markets/page.tsx', 'app/products/page.tsx', 'components/markets/MarketDetailScreen.tsx', 'components/products/ProductDetailScreen.tsx']) {
  const source = readFileSync(join(root, file), 'utf8');
  assert.doesNotMatch(source, /['"]\/recovery['"]|前往資料修復/);
  assert.match(source, /['"]\/support['"]/);
}
console.log('PASS formal build blocks test tools and removes dangling recovery links');

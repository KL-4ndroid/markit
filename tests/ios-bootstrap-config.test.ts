import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createIosBootstrapConfig } from '../scripts/lib/ios-bootstrap-config.cjs';

const fixture = { IOS_APP_ID: 'dev.fixture.feria', NEXT_PUBLIC_API_BASE_URL: 'https://mobile-api.invalid' };
const config = createIosBootstrapConfig(fixture);
assert.equal(config.webDir, 'out');
assert.equal(config.loggingBehavior, 'none', 'native bridge logging must not expose auth payloads');
assert.equal(config.server?.url, undefined);
assert.equal(config.server?.cleartext, false);
assert.equal(config.server?.iosScheme, 'capacitor');
for (const value of ['', 'com.example.feria', 'app', 'one.two', 'with spaces.app.test']) {
  assert.throws(() => createIosBootstrapConfig({ ...fixture, IOS_APP_ID: value }), /ios_app_id_(missing|invalid)/);
}
for (const value of ['', 'http://api.invalid', '/api', 'https://a:b@api.invalid',
  'https://api.invalid?token=secret', 'https://api.invalid#fragment', 'https://localhost']) {
  assert.throws(() => createIosBootstrapConfig({ ...fixture, NEXT_PUBLIC_API_BASE_URL: value }), /ios_api_base_invalid/);
}
assert.throws(() => createIosBootstrapConfig({ ...fixture, CAPACITOR_SERVER_URL: 'https://remote.invalid' }),
  /ios_remote_server_forbidden/);

const cli = 'scripts/prepare-ios-project.mjs';
const env = { ...process.env, ...fixture, CAPACITOR_SERVER_URL: '' };
// Exercise the real CLI config loader, which transpiles TS config to CommonJS.
const loaded = spawnSync(process.execPath, ['-e', `
  require('./node_modules/@capacitor/cli/dist/config.js').loadConfig().then(config => {
    if (config.app.webDir !== 'out' || config.app.extConfig.server?.url) process.exit(1);
    console.log('config_loaded');
  }).catch(() => process.exit(1));
`], { encoding: 'utf8', env, windowsHide: true });
assert.equal(loaded.status, 0, 'Capacitor must load the actual configuration');
assert.match(loaded.stdout, /config_loaded/);
const checked = spawnSync(process.execPath, [cli, '--check'], { encoding: 'utf8', env, windowsHide: true });
const report = JSON.parse(checked.stdout);
assert.equal(checked.status, report.readyForGeneration ? 0 : 1, checked.stderr);
assert.equal(report.sourceReady, true);
assert.ok(report.blockers.includes('fixture_configuration_forbidden'));
if (process.platform !== 'darwin') assert.equal(report.readyForGeneration, false);
assert.ok(!checked.stdout.includes(fixture.IOS_APP_ID));
assert.ok(!checked.stdout.includes(fixture.NEXT_PUBLIC_API_BASE_URL));

const before = existsSync('ios');
if (process.platform !== 'darwin') {
  const refused = spawnSync(process.execPath, [cli, '--generate'], { encoding: 'utf8', env, windowsHide: true });
  assert.equal(refused.status, 1);
  assert.deepEqual(JSON.parse(refused.stderr), { ok: false, code: 'macos_required' });
  assert.equal(existsSync('ios'), before);
}
const missingIdentity = spawnSync(process.execPath, [cli, '--check'], {
  encoding: 'utf8', env: { ...env, IOS_APP_ID: '' }, windowsHide: true,
});
assert.equal(missingIdentity.status, 1);
assert.ok(JSON.parse(missingIdentity.stdout).blockers.includes('ios_app_id_missing'));
const invalid = spawnSync(process.execPath, [cli, '--upload'], { encoding: 'utf8', env, windowsHide: true });
assert.equal(invalid.status, 64);
const script = readFileSync(cli, 'utf8');
assert.doesNotMatch(script, /codesign|Transporter|altool|--upload|--release/);
console.log('PASS bundled iOS bootstrap rejects unsafe config and refuses native generation off macOS');

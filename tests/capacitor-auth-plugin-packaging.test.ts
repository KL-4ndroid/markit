import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const before = existsSync('ios');
const result = spawnSync(process.execPath, ['-e', `
  (async () => {
    const config = await require('./node_modules/@capacitor/cli/dist/config').loadConfig();
    const plugins = await require('./node_modules/@capacitor/cli/dist/plugin').getPlugins(config, 'ios');
    const ios = await require('./node_modules/@capacitor/cli/dist/ios/common').getIOSPlugins(plugins);
    const plugin = ios.find(plugin => plugin.id === '@feria/capacitor-auth-storage');
    if (!plugin) throw new Error('local_plugin_not_discovered');
    const discovery = require('./node_modules/@capacitor/cli/dist/util/iosplugin');
    const classes = await discovery.findPluginClasses(await discovery.getPluginFiles([plugin]));
    console.log(JSON.stringify({ name: plugin.ios.name, version: plugin.version, path: plugin.ios.path, classes }));
  })().catch(() => { process.exitCode = 1; });
`], { encoding: 'utf8', windowsHide: true, env: {
  ...process.env, IOS_APP_ID: 'dev.fixture.feria', NEXT_PUBLIC_API_BASE_URL: 'https://mobile-api.invalid', CAPACITOR_SERVER_URL: '',
} });
assert.equal(result.status, 0, result.stderr);
const plugin = JSON.parse(result.stdout);
assert.equal(plugin.name, 'FeriaCapacitorAuthStorage');
assert.equal(plugin.version, '0.1.0');
assert.equal(plugin.path, 'ios');
assert.deepEqual(plugin.classes, ['FeriaAuthStoragePlugin'], 'native bridge class must be auto-discovered');
const swift = readFileSync('plugins/feria-auth-storage/Package.swift', 'utf8');
assert.ok(swift.includes(`.library(name: "${plugin.name}"`), 'CLI and Swift package product names must agree');
assert.match(swift, /exact: "8\.5\.3"/);
const pkg = JSON.parse(readFileSync('plugins/feria-auth-storage/package.json', 'utf8'));
assert.equal(pkg.dependencies, undefined);
assert.equal(pkg.capacitor.android, undefined);
assert.equal(existsSync('ios'), before, 'plugin discovery must not generate a native application');
console.log('PASS actual Capacitor CLI discovers the local iOS-only auth plugin and matching Swift product');

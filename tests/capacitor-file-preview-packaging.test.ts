import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const before = existsSync('ios');
const result = spawnSync(process.execPath, ['-e', `
  (async () => {
    const config = await require('./node_modules/@capacitor/cli/dist/config').loadConfig();
    const plugins = await require('./node_modules/@capacitor/cli/dist/plugin').getPlugins(config, 'ios');
    const ios = await require('./node_modules/@capacitor/cli/dist/ios/common').getIOSPlugins(plugins);
    const ids = ios.map(plugin => plugin.id);
    const plugin = ios.find(plugin => plugin.id === '@feria/capacitor-file-preview');
    if (!plugin) throw new Error('preview_plugin_missing');
    const discovery = require('./node_modules/@capacitor/cli/dist/util/iosplugin');
    const classes = await discovery.findPluginClasses(await discovery.getPluginFiles([plugin]));
    console.log(JSON.stringify({ name: plugin.ios.name, version: plugin.version, classes, ids }));
  })().catch(() => { process.exitCode = 1; });
`], { encoding: 'utf8', windowsHide: true, env: {
  ...process.env, IOS_APP_ID: 'dev.fixture.feria', NEXT_PUBLIC_API_BASE_URL: 'https://mobile-api.invalid', CAPACITOR_SERVER_URL: '',
} });
assert.equal(result.status, 0, result.stderr);
const discovered = JSON.parse(result.stdout);
assert.equal(discovered.name, 'FeriaCapacitorFilePreview');
assert.equal(discovered.version, '0.1.0');
assert.deepEqual(discovered.classes, ['FeriaFilePreviewPlugin']);
assert.ok(discovered.ids.includes('@capacitor/share'));
const swift = readFileSync('plugins/feria-file-preview/Package.swift', 'utf8');
assert.ok(swift.includes(`.library(name: "${discovered.name}"`));
assert.match(swift, /exact: "8\.5\.3"/);
const source = readFileSync('plugins/feria-file-preview/ios/Sources/FeriaFilePreviewPlugin/FeriaFilePreviewPlugin.swift', 'utf8');
assert.match(source, /previewControllerDidDismiss/);
assert.match(source, /feria-exports/);
assert.doesNotMatch(source, /URLSession|print\(|NSLog|removeItem/);
assert.equal(existsSync('ios'), before);
console.log('PASS actual CLI discovers local QuickLook bridge and official Share without generating native app');

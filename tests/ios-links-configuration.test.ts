import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url); const plist = require('plist');
async function main() {
  const { planIosMediaConfiguration } = await import('../scripts/configure-ios-media.mjs');
  const before = existsSync('ios');
  const read = (path: string) => execFileSync('tar', ['-xOf', 'node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz', path], { encoding: 'utf8', windowsHide: true });
  const input = { info: read('App/App/Info.plist'), project: read('App/App.xcodeproj/project.pbxproj'), privacy: null, linkScheme: 'dev.fixture.feria' };
  const scene = read('App/App/SceneDelegate.swift');
  assert.match(scene, /SceneDelegateProxy\.shared\.scene\(scene, willConnectTo: session, options: connectionOptions\)/);
  assert.match(scene, /SceneDelegateProxy\.shared\.scene\(scene, openURLContexts: URLContexts\)/);
  assert.match(scene, /SceneDelegateProxy\.shared\.scene\(scene, continue: userActivity\)/);
  const output = planIosMediaConfiguration(input); const info = plist.parse(output.info);
  assert.deepEqual(info.CFBundleURLTypes, [{ CFBundleTypeRole: 'Editor', CFBundleURLName: 'feria.app-links', CFBundleURLSchemes: ['dev.fixture.feria'] }]);
  assert.deepEqual(planIosMediaConfiguration({ ...output, linkScheme: input.linkScheme }), output);
  const custom = { ...info, CFBundleURLTypes: [{ CFBundleURLName: 'existing', CFBundleURLSchemes: ['other.app.scheme'] }] };
  const merged = planIosMediaConfiguration({ ...input, info: plist.build(custom) });
  assert.deepEqual(plist.parse(merged.info).CFBundleURLTypes[0], custom.CFBundleURLTypes[0]);
  assert.equal(plist.parse(merged.info).CFBundleURLTypes.length, 2);
  for (const bad of ['feria', 'https://bad.invalid', 'dev.fixture.feria\n']) assert.throws(() => planIosMediaConfiguration({ ...input, linkScheme: bad }));
  assert.throws(() => planIosMediaConfiguration({ ...input, info: plist.build({ CFBundleURLTypes: false }) }));
  const result = spawnSync(process.execPath, ['-e', `
    (async () => {
      const config = await require('./node_modules/@capacitor/cli/dist/config').loadConfig();
      const all = await require('./node_modules/@capacitor/cli/dist/plugin').getPlugins(config, 'ios');
      const plugins = (await require('./node_modules/@capacitor/cli/dist/ios/common').getIOSPlugins(all))
        .filter(p => ['@capacitor/clipboard','@capacitor/app-launcher'].includes(p.id));
      const discovery = require('./node_modules/@capacitor/cli/dist/util/iosplugin');
      console.log(JSON.stringify({ ids: plugins.map(p => p.id).sort(), classes: await discovery.findPluginClasses(await discovery.getPluginFiles(plugins)) }));
    })().catch(() => process.exitCode = 1);
  `], { encoding: 'utf8', windowsHide: true, env: { ...process.env, IOS_APP_ID: 'dev.fixture.feria', NEXT_PUBLIC_API_BASE_URL: 'https://mobile-api.invalid', CAPACITOR_SERVER_URL: '' } });
  assert.equal(result.status, 0, result.stderr); const discovered = JSON.parse(result.stdout);
  assert.deepEqual(discovered.ids, ['@capacitor/app-launcher', '@capacitor/clipboard']);
  assert.ok(discovered.classes.includes('ClipboardPlugin') && discovered.classes.includes('AppLauncherPlugin'));
  assert.equal(existsSync('ios'), before);
  console.log('PASS Bundle-ID scheme merge and actual interaction plugin discovery without native generation');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

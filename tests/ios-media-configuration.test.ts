import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const plist = require('plist');
async function main() {
  const { planIosMediaConfiguration } = await import('../scripts/configure-ios-media.mjs');
  const readTemplate = (path: string) => execFileSync('tar', ['-xOf', 'node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz', path],
    { encoding: 'utf8', windowsHide: true });
  const input = { info: readTemplate('App/App/Info.plist'), project: readTemplate('App/App.xcodeproj/project.pbxproj'), privacy: null };
  const before = existsSync('ios');
  const output = planIosMediaConfiguration(input);
  const info = plist.parse(output.info);
  for (const key of ['NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSPhotoLibraryAddUsageDescription']) {
    assert.ok(typeof info[key] === 'string' && info[key].length > 4);
  }
  assert.equal(info.CFBundleIdentifier, plist.parse(input.info).CFBundleIdentifier);
  const privacy = plist.parse(output.privacy);
  assert.deepEqual(privacy.NSPrivacyAccessedAPITypes, [{ NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
    NSPrivacyAccessedAPITypeReasons: ['C617.1'] }]);
  assert.match(output.project, /PrivacyInfo\.xcprivacy in Resources/);
  assert.deepEqual(planIosMediaConfiguration(output), output, 'repeat configuration must not duplicate entries or project resources');
  const custom = { ...info, NSCameraUsageDescription: 'Keep the reviewed custom purpose.' };
  const customPrivacy = { NSPrivacyTracking: false, NSPrivacyAccessedAPITypes: [
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
    { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['0A2A.1'] },
  ] };
  const merged = planIosMediaConfiguration({ ...output, info: plist.build(custom), privacy: plist.build(customPrivacy) });
  assert.equal(plist.parse(merged.info).NSCameraUsageDescription, custom.NSCameraUsageDescription);
  assert.deepEqual(plist.parse(merged.privacy).NSPrivacyAccessedAPITypes[0], customPrivacy.NSPrivacyAccessedAPITypes[0]);
  assert.deepEqual(plist.parse(merged.privacy).NSPrivacyAccessedAPITypes[1].NSPrivacyAccessedAPITypeReasons, ['0A2A.1', 'C617.1']);
  for (const invalid of [{ ...input, info: 'not a plist' }, { ...input, privacy: plist.build({ NSPrivacyAccessedAPITypes: 'wrong' }) },
    { ...input, project: 'not a project' }, { ...input, info: plist.build({ NSCameraUsageDescription: false }) }]) {
    assert.throws(() => planIosMediaConfiguration(invalid), /ios_media_configuration_review_required/);
  }
  const detected = spawnSync(process.execPath, ['-e', `
    (async () => {
      const config = await require('./node_modules/@capacitor/cli/dist/config').loadConfig();
      const all = await require('./node_modules/@capacitor/cli/dist/plugin').getPlugins(config, 'ios');
      const ios = await require('./node_modules/@capacitor/cli/dist/ios/common').getIOSPlugins(all);
      const chosen = ios.filter(p => ['@capacitor/camera', '@capacitor/filesystem'].includes(p.id));
      const helpers = require('./node_modules/@capacitor/cli/dist/util/iosplugin');
      console.log(JSON.stringify({ plugins: chosen.map(p => p.id).sort(),
        classes: await helpers.findPluginClasses(await helpers.getPluginFiles(chosen)) }));
    })().catch(() => process.exitCode = 1);
  `], { encoding: 'utf8', windowsHide: true, env: { ...process.env, IOS_APP_ID: 'dev.fixture.feria',
    NEXT_PUBLIC_API_BASE_URL: 'https://mobile-api.invalid', CAPACITOR_SERVER_URL: '' } });
  assert.equal(detected.status, 0, detected.stderr);
  assert.deepEqual(JSON.parse(detected.stdout).plugins, ['@capacitor/camera', '@capacitor/filesystem']);
  assert.ok(JSON.parse(detected.stdout).classes.includes('CAPCameraPlugin'));
  assert.ok(JSON.parse(detected.stdout).classes.includes('FilesystemPlugin'));
  if (process.platform !== 'darwin') {
    const refused = spawnSync(process.execPath, ['scripts/configure-ios-media.mjs', '--apply'], { encoding: 'utf8', windowsHide: true });
    assert.equal(refused.status, 1); assert.equal(JSON.parse(refused.stderr).code, 'macos_required');
  }
  assert.equal(existsSync('ios'), before);
  assert.match(readFileSync('scripts/prepare-ios-project.mjs', 'utf8'), /configure-ios-media\.mjs/);
  console.log('PASS CLI media discovery and template-based permission/privacy resource setup are conservative, idempotent and macOS-gated');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

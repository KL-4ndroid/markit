import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

async function main() {
  const { planIosNavigation } = await import('../scripts/configure-ios-navigation.mjs');
  const { planIosMediaConfiguration } = await import('../scripts/configure-ios-media.mjs');
  const template = (path: string) => execFileSync('tar', ['-xOf', 'node_modules/@capacitor/cli/assets/ios-spm-template.tar.gz', path], { encoding: 'utf8', windowsHide: true });
  const media = planIosMediaConfiguration({ info: template('App/App/Info.plist'), privacy: null,
    project: template('App/App.xcodeproj/project.pbxproj'), linkScheme: 'dev.fixture.feria' });
  const input = { storyboard: template('App/App/Base.lproj/Main.storyboard'), project: media.project, controller: null };
  const output = planIosNavigation(input);
  assert.match(output.storyboard, /customClass="FeriaBridgeViewController" customModule="App"/);
  assert.deepEqual(planIosNavigation(output), output, 'source setup must be idempotent');
  assert.match(output.project, /PrivacyInfo\.xcprivacy in Resources/, 'navigation preserves the preceding media/privacy setup');
  assert.equal(planIosMediaConfiguration({ ...media, project: output.project, linkScheme: 'dev.fixture.feria' }).project, output.project,
    'reapplying media configuration preserves navigation source registration');
  const cliRequire = createRequire(createRequire(import.meta.url).resolve('@capacitor/cli/package.json'));
  const project = cliRequire('xcode/lib/parser/pbxproj').parse(output.project).project.objects;
  const sourceFiles = Object.values(project.PBXBuildFile).filter((entry: any) => entry?.isa === 'PBXBuildFile' && project.PBXFileReference[entry.fileRef]?.path?.replace(/"/g, '') === 'FeriaBridgeViewController.swift');
  assert.equal(sourceFiles.length, 1, 'one compiled source entry, rather than an unreferenced Swift file');
  for (const changes of [{ controller: '// user custom controller' }, { storyboard: input.storyboard.replace('CAPBridgeViewController', 'UserViewController') }, { project: 'invalid' }]) {
    assert.throws(() => planIosNavigation({ ...input, ...changes }), /review_required/);
  }
  const native = readFileSync('node_modules/@capacitor/ios/Capacitor/Capacitor/CAPBridgeViewController.swift', 'utf8');
  assert.match(native, /WebViewAssetHandler\(router: router\(\)\)/);
  assert.match(native, /open func router\(\) -> Router/);
  const before = existsSync('ios');
  if (process.platform !== 'darwin') {
    const result = spawnSync(process.execPath, ['scripts/configure-ios-navigation.mjs', '--apply'], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 1); assert.equal(JSON.parse(result.stderr).code, 'macos_required');
  }
  assert.equal(existsSync('ios'), before);
  console.log('PASS real Capacitor storyboard/source registration, custom-source protection and Windows refusal; Swift execution remains unverified');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

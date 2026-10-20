import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

async function main() {
  const { checkIosUnsignedEnvironment, iosUnsignedBuildCommands } = await import('../scripts/build-ios-unsigned.mjs');
  const publicKey = 'header.' + Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url') + '.fixture';
  const env = { IOS_APP_ID: 'app.feria.release', NEXT_PUBLIC_API_BASE_URL: 'https://api.feria.app',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey };
  const runCalls: string[][] = [];
  const input = { env, platform: 'darwin', nodeVersion: '24.10.0', hasFile: () => true,
    readJson: (path: string) => path === 'package.json' ? { dependencies: { '@capacitor/core': '8.5.3', '@capacitor/ios': '8.5.3' }, devDependencies: { '@capacitor/cli': '8.5.3' } }
      : path.startsWith('ios/') ? { appId: env.IOS_APP_ID, server: { hostname: 'localhost', iosScheme: 'capacitor', cleartext: false } } : { version: '8.5.3' },
    runTool: (args: string[]) => { runCalls.push(args); return { status: 0, stdout: args[0] === '-version' ? 'Xcode 26.1\nBuild version 17B1' : '-sdk iphonesimulator26.1' }; } };
  assert.equal(checkIosUnsignedEnvironment(input).readyForUnsignedBuild, true);
  assert.deepEqual(runCalls, [['-version'], ['-showsdks']]);
  for (const [changes, expected] of [
    [{ nodeVersion: '22.11.0' }, 'node_24_required'],
    [{ platform: 'win32' }, 'macos_required'],
    [{ hasFile: () => false }, 'ios_project_missing'],
    [{ env: { ...env, IOS_APP_ID: 'app.other.identity' } }, 'native_bundled_configuration_mismatch'],
    [{ runTool: () => ({ status: 0, stdout: 'Xcode 25.1' }) }, 'xcode_26_required'],
    [{ env: { ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_secret_private' } }, 'explicit_public_supabase_configuration_required'],
    [{ env: { ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'header.' + Buffer.from('{"role":"service_role"}').toString('base64url') + '.sig' } }, 'explicit_public_supabase_configuration_required'],
    [{ env: { ...env, NEXT_PUBLIC_API_BASE_URL: 'https://mobile-api.invalid' } }, 'fixture_configuration_forbidden'],
  ] as const) {
    const report = checkIosUnsignedEnvironment({ ...input, ...changes });
    assert.equal(report.ok, false); assert.ok(report.blockers.includes(expected));
    assert.ok(!JSON.stringify(report).includes('sb_secret_private'));
    assert.ok(!JSON.stringify(report).includes('project.supabase.co'));
  }
  const commands = iosUnsignedBuildCommands('/workspace with spaces', '/node with spaces/node');
  assert.equal(commands[0].command, '/node with spaces/node');
  assert.equal(commands[0].args[0], join('/workspace with spaces', 'scripts/build-mobile.mjs'));
  const build = commands.at(-1)!;
  assert.equal(build.command, 'xcodebuild');
  assert.ok(build.args.includes('CODE_SIGNING_ALLOWED=NO'));
  assert.ok(build.args.includes('generic/platform=iOS Simulator'));
  assert.equal(build.args.at(-1), 'build');
  assert.ok(!commands.some(command => command.args.some(arg => ['archive', '-allowProvisioningUpdates', '--upload'].includes(arg))));
  if (process.platform !== 'darwin') {
    const before = existsSync('ios');
    const refused = spawnSync(process.execPath, ['scripts/build-ios-unsigned.mjs', '--build'], { encoding: 'utf8', windowsHide: true });
    assert.equal(refused.status, 1); assert.equal(JSON.parse(refused.stderr).code, 'macos_required'); assert.equal(existsSync('ios'), before);
  }
  console.log('PASS unsigned build plan, preflight blockers, no privileged key acceptance, no signing/upload and Windows refusal');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

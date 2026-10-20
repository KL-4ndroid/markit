import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createIosBootstrapConfig, IOS_CAPACITOR_VERSION } from './lib/ios-bootstrap-config.cjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const configErrors = new Set(['ios_app_id_missing', 'ios_app_id_invalid', 'ios_api_base_invalid',
  'ios_remote_server_forbidden', 'ios_web_origin_invalid']);
const fixtureHost = host => /\.(invalid|test|example|local)$/.test(host) || /^(?:.*\.)?example\.(com|net|org)$/.test(host);

// Status-only preflight: never emits identities, endpoints, credentials or tool output.
export function checkIosUnsignedEnvironment({ env, platform, nodeVersion, hasFile, readJson, runTool }) {
  const blockers = [];
  if (platform !== 'darwin') blockers.push('macos_required');
  if (Number(nodeVersion.split('.')[0]) !== 24) blockers.push('node_24_required');
  try {
    createIosBootstrapConfig(env);
    if (/^dev\.fixture\./i.test(env.IOS_APP_ID) || [env.NEXT_PUBLIC_API_BASE_URL, env.NEXT_PUBLIC_APP_WEB_ORIGIN]
      .filter(Boolean).some(value => fixtureHost(new URL(value).hostname))) blockers.push('fixture_configuration_forbidden');
  } catch (error) { blockers.push(configErrors.has(error.message) ? error.message : 'configuration_invalid'); }
  // Explicit public values prevent accidental reuse of another machine's .env.local.
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? '');
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const jwt = key.split('.');
    const publicKey = key.startsWith('sb_publishable_') && key.length > 30 || jwt.length === 3
      && JSON.parse(Buffer.from(jwt[1], 'base64url').toString()).role === 'anon';
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash
      || !url.hostname.includes('.') || fixtureHost(url.hostname) || !publicKey) throw new Error();
  } catch { blockers.push('explicit_public_supabase_configuration_required'); }
  try {
    const declared = readJson('package.json');
    for (const name of ['@capacitor/core', '@capacitor/cli', '@capacitor/ios']) {
      if ((declared.dependencies?.[name] ?? declared.devDependencies?.[name]) !== IOS_CAPACITOR_VERSION
        || readJson(`node_modules/${name}/package.json`).version !== IOS_CAPACITOR_VERSION) throw new Error();
    }
  } catch { blockers.push('reviewed_dependencies_missing'); }
  const nativeProjectPresent = hasFile('ios/App/App.xcodeproj/project.pbxproj');
  if (!nativeProjectPresent) blockers.push('ios_project_missing');
  else {
    try {
      const native = readJson('ios/App/App/capacitor.config.json');
      if (native.appId !== env.IOS_APP_ID?.trim() || native.server?.url || native.server?.cleartext !== false
        || native.server?.iosScheme !== 'capacitor' || native.server?.hostname !== 'localhost') throw new Error();
    } catch { blockers.push('native_bundled_configuration_mismatch'); }
  }
  if (platform === 'darwin') {
    const version = runTool(['-version']);
    const major = Number(version.stdout?.match(/Xcode (\d+)\./)?.[1] ?? 0);
    if (version.status !== 0 || major < 26) blockers.push('xcode_26_required');
    const sdks = runTool(['-showsdks']);
    if (sdks.status !== 0 || !/\biphonesimulator\d/.test(sdks.stdout ?? '')) blockers.push('ios_simulator_sdk_required');
  }
  return { ok: blockers.length === 0, readyForUnsignedBuild: blockers.length === 0, nativeProjectPresent,
    signed: false, deviceVerified: false, blockers };
}

export function iosUnsignedBuildCommands(projectRoot, node) {
  const script = (...args) => ({ command: node, args: args.map((arg, index) => index === 0 ? join(projectRoot, arg) : arg) });
  return [
    script('scripts/build-mobile.mjs', '--require-api-base'),
    script('scripts/verify-mobile-static-output.mjs'),
    script('node_modules/@capacitor/cli/bin/capacitor', 'sync', 'ios'),
    script('scripts/configure-ios-media.mjs', '--apply'),
    script('scripts/configure-ios-navigation.mjs', '--apply'),
    { command: 'xcodebuild', args: ['-quiet', '-project', join(projectRoot, 'ios/App/App.xcodeproj'),
      '-scheme', 'App', '-configuration', 'Debug', '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator',
      '-derivedDataPath', join(projectRoot, '.codex-artifacts/ios-derived-data'),
      'CODE_SIGNING_ALLOWED=NO', 'CODE_SIGNING_REQUIRED=NO', 'build'] },
  ];
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--check', '--build'].includes(args[0])) {
    console.error(JSON.stringify({ ok: false, code: 'argument_invalid' })); process.exitCode = 64; return;
  }
  const build = args[0] === '--build';
  if (build && process.platform !== 'darwin') {
    console.error(JSON.stringify({ ok: false, code: 'macos_required' })); process.exitCode = 1; return;
  }
  const report = checkIosUnsignedEnvironment({ env: process.env, platform: process.platform,
    nodeVersion: process.versions.node, hasFile: path => existsSync(join(root, path)),
    readJson: path => JSON.parse(readFileSync(join(root, path), 'utf8')),
    runTool: args => spawnSync('xcodebuild', args, { encoding: 'utf8', timeout: 30_000 }) });
  if (!build || !report.ok) { console.log(JSON.stringify(report)); process.exitCode = report.ok ? 0 : 1; return; }
  for (const [index, command] of iosUnsignedBuildCommands(root, process.execPath).entries()) {
    const result = spawnSync(command.command, command.args, { cwd: root, stdio: 'inherit', shell: false });
    if (result.error || result.status !== 0) {
      console.error(JSON.stringify({ ok: false, code: 'ios_unsigned_step_failed', step: index + 1 })); process.exitCode = 1; return;
    }
  }
  console.log(JSON.stringify({ ok: true, unsignedSimulatorBuild: true, signed: false, deviceVerified: false }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();

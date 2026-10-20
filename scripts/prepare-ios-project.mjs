import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createIosBootstrapConfig, IOS_CAPACITOR_VERSION } from './lib/ios-bootstrap-config.cjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allowedErrors = new Set([
  'ios_app_id_missing', 'ios_app_id_invalid', 'ios_api_base_invalid', 'ios_remote_server_forbidden',
]);

function dependencyReady(name) {
  try {
    const installed = JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'));
    const declared = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    return installed.version === IOS_CAPACITOR_VERSION
      && (declared.dependencies?.[name] ?? declared.devDependencies?.[name]) === IOS_CAPACITOR_VERSION;
  } catch { return false; }
}

const args = process.argv.slice(2);
if (args.length !== 1 || !['--check', '--generate'].includes(args[0])) {
  process.stderr.write(`${JSON.stringify({ ok: false, code: 'argument_invalid' })}\n`);
  process.exit(64);
}
const generate = args[0] === '--generate';
// Refuse Windows/Linux before any native files or build outputs can be changed.
if (generate && process.platform !== 'darwin') {
  process.stderr.write(`${JSON.stringify({ ok: false, code: 'macos_required' })}\n`);
  process.exit(1);
}
const blockers = [];
const sourceReady = ['@capacitor/core', '@capacitor/ios', '@capacitor/cli'].every(dependencyReady)
  && existsSync(join(root, 'capacitor.config.ts'));
if (!sourceReady) blockers.push('reviewed_dependencies_missing');
try { createIosBootstrapConfig(process.env); } catch (error) {
  blockers.push(allowedErrors.has(error.message) ? error.message : 'configuration_invalid');
}
if (process.platform !== 'darwin') blockers.push('macos_required');
if (process.platform === 'darwin') {
  const xcode = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8', windowsHide: true });
  if (xcode.error || xcode.status !== 0 || !/Xcode (?:2[6-9]|[3-9]\d)\./.test(xcode.stdout)) {
    blockers.push('xcode_26_required');
  }
}
if (!blockers.some(code => allowedErrors.has(code))) {
  const apiHost = new URL(process.env.NEXT_PUBLIC_API_BASE_URL).hostname;
  if (/\.(invalid|test|example|local)$/.test(apiHost) || /^(?:.*\.)?example\.(com|net|org)$/.test(apiHost)
    || /^dev\.fixture\./i.test(process.env.IOS_APP_ID ?? '')) blockers.push('fixture_configuration_forbidden');
}
const nativeProjectPresent = existsSync(join(root, 'ios'));
if (nativeProjectPresent) blockers.push('ios_project_exists');
if (!generate) {
  process.stdout.write(`${JSON.stringify({
    ok: true, sourceReady, readyForGeneration: blockers.length === 0,
    nativeProjectPresent, blockers,
  })}\n`);
  process.exit(blockers.length === 0 ? 0 : 1);
}
if (blockers.length) {
  process.stderr.write(`${JSON.stringify({
    ok: false, code: blockers[0],
  })}\n`);
  process.exit(1);
}
// Rebuild with the selected API origin so a previous offline CI fixture cannot ship.
for (const command of [
  [join(root, 'scripts/build-mobile.mjs'), '--require-api-base'],
  [join(root, 'scripts/verify-mobile-static-output.mjs')],
  [join(root, 'node_modules/@capacitor/cli/bin/capacitor'), 'add', 'ios', '--packagemanager', 'SPM'],
  [join(root, 'scripts/configure-ios-media.mjs'), '--apply'],
]) {
  const result = spawnSync(process.execPath, command, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
process.stdout.write(`${JSON.stringify({ ok: true, nativeProjectGenerated: true, signed: false })}\n`);

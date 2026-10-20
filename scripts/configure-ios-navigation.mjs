import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const cliRequire = createRequire(require.resolve('@capacitor/cli/package.json'));
const xcode = cliRequire('xcode');
const parser = cliRequire('xcode/lib/parser/pbxproj');
const controller = readFileSync(new URL('./templates/ios/FeriaBridgeViewController.swift', import.meta.url), 'utf8');
const original = 'customClass="CAPBridgeViewController" customModule="Capacitor"';
const configured = 'customClass="FeriaBridgeViewController" customModule="App" customModuleProvider="target"';

export function planIosNavigation(input) {
  try {
    if (input.controller !== null && input.controller !== controller) throw new Error();
    const matches = input.storyboard.match(/<viewController\b[^>]*>/g) ?? [];
    if (matches.length !== 1 || ![original, configured].some(value => matches[0].includes(value))) throw new Error();
    const storyboard = input.storyboard.replace(original, configured);
    const project = xcode.project('navigation-source.pbxproj'); project.hash = parser.parse(input.project);
    const target = project.getFirstTarget(); const group = project.findPBXGroupKey({ path: 'App' });
    if (!target || target.firstTarget.name.replace(/"/g, '') !== 'App' || !group) throw new Error();
    if (!project.hasFile('FeriaBridgeViewController.swift')) project.addSourceFile('FeriaBridgeViewController.swift', { target: target.uuid }, group);
    const objects = project.hash.project.objects;
    const sources = project.pbxSourcesBuildPhaseObj(target.uuid);
    if (!sources?.files?.some(entry => {
      const build = objects.PBXBuildFile[entry.value];
      return objects.PBXFileReference[build?.fileRef]?.path?.replace(/"/g, '') === 'FeriaBridgeViewController.swift';
    })) throw new Error();
    return { controller, storyboard, project: project.writeSync() };
  } catch { throw new Error('ios_navigation_review_required'); }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--check', '--apply'].includes(args[0])) throw new Error('argument_invalid');
  const apply = args[0] === '--apply';
  if (apply && process.platform !== 'darwin') throw new Error('macos_required');
  const folder = fileURLToPath(new URL('../ios/App', import.meta.url));
  const paths = { controller: join(folder, 'App/FeriaBridgeViewController.swift'),
    storyboard: join(folder, 'App/Base.lproj/Main.storyboard'), project: join(folder, 'App.xcodeproj/project.pbxproj') };
  if (!existsSync(paths.storyboard) || !existsSync(paths.project)) throw new Error('ios_project_missing');
  const before = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, existsSync(path) ? readFileSync(path, 'utf8') : null]));
  const planned = planIosNavigation(before);
  if (!apply && Object.keys(paths).some(key => before[key] !== planned[key])) throw new Error('ios_navigation_configuration_pending');
  if (apply) for (const [key, path] of Object.entries(paths)) if (before[key] !== planned[key]) writeFileSync(path, planned[key]);
  console.log(JSON.stringify({ ok: true, mode: apply ? 'apply' : 'check', nativeBuildVerified: false }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) {
    console.error(JSON.stringify({ ok: false, code: error instanceof Error ? error.message : 'ios_navigation_failed' })); process.exitCode = 1;
  }
}

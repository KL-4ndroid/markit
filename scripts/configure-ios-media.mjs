import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const cliRequire = createRequire(require.resolve('@capacitor/cli/package.json'));
const plist = cliRequire('plist');
const xcode = cliRequire('xcode');
const parser = cliRequire('xcode/lib/parser/pbxproj');
const PbxFile = cliRequire('xcode/lib/pbxFile');
const purposeStrings = {
  NSCameraUsageDescription: '拍攝商品封面或成交紀錄照片。',
  NSPhotoLibraryUsageDescription: '選取照片作為商品封面或成交紀錄。',
  NSPhotoLibraryAddUsageDescription: '如你選擇保存照片，將照片加入裝置相簿。',
};
function dictionary(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('ios_media_plist_invalid');
  return value;
}

/** Pure source transformation, also used with bundled CLI template fixtures on Windows. */
export function planIosMediaConfiguration(input) {
  try {
    const info = dictionary(plist.parse(input.info));
    for (const [key, description] of Object.entries(purposeStrings)) {
      if (info[key] !== undefined && typeof info[key] !== 'string') throw new Error();
      if (!info[key]?.trim()) info[key] = description;
    }
    if (input.linkScheme !== undefined) {
      const scheme = input.linkScheme;
      if (typeof scheme !== 'string' || scheme.length > 255
        || !/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*){2,}$/.test(scheme)) throw new Error();
      const entries = info.CFBundleURLTypes ?? [];
      if (!Array.isArray(entries)) throw new Error();
      for (const entry of entries) {
        dictionary(entry);
        if (!Array.isArray(entry.CFBundleURLSchemes) || !entry.CFBundleURLSchemes.every(value => typeof value === 'string')) throw new Error();
      }
      if (!entries.some(entry => entry.CFBundleURLSchemes.includes(scheme))) {
        const owned = entries.filter(entry => entry.CFBundleURLName === 'feria.app-links');
        if (owned.length > 1) throw new Error();
        if (owned.length === 1) owned[0].CFBundleURLSchemes.push(scheme);
        else entries.push({ CFBundleTypeRole: 'Editor', CFBundleURLName: 'feria.app-links', CFBundleURLSchemes: [scheme] });
      }
      info.CFBundleURLTypes = entries;
    }
    const privacy = input.privacy === null ? {} : dictionary(plist.parse(input.privacy));
    const entries = privacy.NSPrivacyAccessedAPITypes ?? [];
    if (!Array.isArray(entries)) throw new Error();
    for (const entry of entries) {
      dictionary(entry);
      if (typeof entry.NSPrivacyAccessedAPIType !== 'string' || !Array.isArray(entry.NSPrivacyAccessedAPITypeReasons)
        || !entry.NSPrivacyAccessedAPITypeReasons.every(reason => typeof reason === 'string')) throw new Error();
    }
    const matching = entries.filter(entry => entry.NSPrivacyAccessedAPIType === 'NSPrivacyAccessedAPICategoryFileTimestamp');
    if (matching.length > 1) throw new Error();
    if (matching.length === 0) entries.push({
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'],
    });
    else if (!matching[0].NSPrivacyAccessedAPITypeReasons.includes('C617.1')) matching[0].NSPrivacyAccessedAPITypeReasons.push('C617.1');
    privacy.NSPrivacyAccessedAPITypes = entries;

    const project = xcode.project('source-fixture.pbxproj');
    project.hash = parser.parse(input.project);
    const target = project.getFirstTarget();
    const group = project.findPBXGroupKey({ path: 'App' });
    if (!target || target.firstTarget.name.replace(/"/g, '') !== 'App' || !group) throw new Error();
    if (!project.hasFile('PrivacyInfo.xcprivacy')) {
      // The template has an App group, not the legacy Resources group required by
      // xcode.addResourceFile's path helper. Add the same typed references directly.
      const file = new PbxFile('PrivacyInfo.xcprivacy', { lastKnownFileType: 'text.xml' });
      file.uuid = project.generateUuid();
      file.fileRef = project.generateUuid();
      file.target = target.uuid;
      project.addToPbxBuildFileSection(file);
      project.addToPbxResourcesBuildPhase(file);
      project.addToPbxFileReferenceSection(file);
      project.addToPbxGroup(file, group);
    }
    const projectText = project.writeSync();
    const objects = project.hash.project.objects;
    const resources = project.pbxResourcesBuildPhaseObj(target.uuid);
    const included = resources?.files?.some(entry => {
      const buildFile = objects.PBXBuildFile[entry.value];
      const reference = buildFile && objects.PBXFileReference[buildFile.fileRef];
      return reference?.path?.replace(/"/g, '') === 'PrivacyInfo.xcprivacy';
    });
    if (!included) throw new Error();
    return { info: plist.build(info) + '\n', privacy: plist.build(privacy) + '\n', project: projectText };
  } catch { throw new Error('ios_media_configuration_review_required'); }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--apply', '--check'].includes(args[0])) throw new Error('argument_invalid');
  const apply = args[0] === '--apply';
  if (apply && process.platform !== 'darwin') throw new Error('macos_required');
  const folder = fileURLToPath(new URL('../ios/App', import.meta.url));
  const paths = { info: join(folder, 'App/Info.plist'), privacy: join(folder, 'App/PrivacyInfo.xcprivacy'),
    project: join(folder, 'App.xcodeproj/project.pbxproj') };
  if (!existsSync(paths.info) || !existsSync(paths.project)) throw new Error('ios_project_missing');
  const before = { info: readFileSync(paths.info, 'utf8'), project: readFileSync(paths.project, 'utf8'),
    privacy: existsSync(paths.privacy) ? readFileSync(paths.privacy, 'utf8') : null };
  const linkScheme = process.env.IOS_APP_ID?.trim().toLowerCase();
  if (!linkScheme) throw new Error('ios_link_scheme_missing');
  const planned = planIosMediaConfiguration({ ...before, linkScheme });
  if (!apply && Object.keys(paths).some(key => before[key] !== planned[key])) throw new Error('ios_media_configuration_pending');
  if (apply) for (const key of Object.keys(paths)) {
    if (before[key] !== planned[key]) writeFileSync(paths[key], planned[key], 'utf8');
  }
  console.log(JSON.stringify({ ok: true, mode: apply ? 'apply' : 'check', nativeBuildVerified: false }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) {
    console.error(JSON.stringify({ ok: false, code: error instanceof Error ? error.message : 'ios_media_configuration_failed' }));
    process.exitCode = 1;
  }
}

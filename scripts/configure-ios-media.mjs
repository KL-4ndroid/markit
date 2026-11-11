import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const cliRequire = createRequire(require.resolve('@capacitor/cli/package.json'));
const plist = cliRequire('plist');
const xcode = cliRequire('xcode');
const parser = cliRequire('xcode/lib/parser/pbxproj');
const PbxFile = cliRequire('xcode/lib/pbxFile');
const sharp = require('sharp');
const brand = require('../lib/app-brand.json');
const localizationFile = 'InfoPlist.strings';
const purposeStrings = {
  NSCameraUsageDescription: '拍攝商品封面或成交紀錄照片。',
  NSPhotoLibraryUsageDescription: '選取照片作為商品封面或成交紀錄。',
  NSPhotoLibraryAddUsageDescription: '如你選擇保存照片，將照片加入裝置相簿。',
};
const englishPurposeStrings = {
  NSCameraUsageDescription: 'Take a product cover photo or attach a photo to a sale.',
  NSPhotoLibraryUsageDescription: 'Choose a product cover photo or a photo for a sale.',
  NSPhotoLibraryAddUsageDescription: 'Save a photo to your library when you choose to keep it.',
};

function localizedPlist(name, purposes) {
  return Object.entries({ CFBundleDisplayName: name, ...purposes })
    .map(([key, value]) => `${JSON.stringify(key)} = ${JSON.stringify(value)};`)
    .join('\n') + '\n';
}

function includeBrandLocalizations(project, target, group) {
  let variant = project.findPBXVariantGroupKey({ name: localizationFile });
  if (!variant) {
    variant = project.pbxCreateVariantGroup(localizationFile);
    const resource = { fileRef: variant, basename: localizationFile, group: 'Resources', uuid: project.generateUuid(), target: target.uuid };
    project.addToPbxGroup(variant, group);
    project.addToPbxBuildFileSection(resource);
    project.addToPbxResourcesBuildPhase(resource);
  }
  for (const locale of ['en', 'zh-Hant']) {
    const path = `${locale}.lproj/${localizationFile}`;
    const child = project.addFile(path, variant, { lastKnownFileType: 'text.plist.strings' });
    const objects = project.hash.project.objects;
    const localizations = objects.PBXVariantGroup[variant].children;
    const entry = localizations.find(entry => objects.PBXFileReference[entry.value]?.path?.replace(/"/g, '') === path);
    if (!entry) throw new Error();
    if (child) {
      objects.PBXFileReference[entry.value].name = `"${locale}"`;
      entry.comment = locale;
    }
    project.addKnownRegion(locale === 'en' ? locale : `"${locale}"`);
  }
  const resources = project.pbxResourcesBuildPhaseObj(target.uuid);
  if (!resources?.files?.some(entry => project.hash.project.objects.PBXBuildFile[entry.value]?.fileRef === variant)) throw new Error();
}
function dictionary(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('ios_media_plist_invalid');
  return value;
}

/** Pure source transformation, also used with bundled CLI template fixtures on Windows. */
export function planIosMediaConfiguration(input) {
  try {
    const info = dictionary(plist.parse(input.info));
    info.CFBundleDisplayName = brand.name;
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
    includeBrandLocalizations(project, target, group);
    const projectText = project.writeSync();
    const objects = project.hash.project.objects;
    const resources = project.pbxResourcesBuildPhaseObj(target.uuid);
    const included = resources?.files?.some(entry => {
      const buildFile = objects.PBXBuildFile[entry.value];
      const reference = buildFile && objects.PBXFileReference[buildFile.fileRef];
      return reference?.path?.replace(/"/g, '') === 'PrivacyInfo.xcprivacy';
    });
    if (!included) throw new Error();
    return {
      info: plist.build(info) + '\n', privacy: plist.build(privacy) + '\n', project: projectText,
      englishBrand: localizedPlist(brand.englishName, englishPurposeStrings),
      chineseBrand: localizedPlist(brand.name, Object.fromEntries(Object.keys(purposeStrings).map(key => [key, info[key]]))),
    };
  } catch { throw new Error('ios_media_configuration_review_required'); }
}

export async function createIosBrandAssets() {
  const icon = readFileSync(new URL('../store-assets/ios/app-icon-1024.png', import.meta.url));
  const { format, width, height, hasAlpha } = await sharp(icon).metadata();
  if (format !== 'png' || width !== 1024 || height !== 1024 || hasAlpha) {
    throw new Error('ios_brand_icon_invalid');
  }
  const logo = await sharp(fileURLToPath(new URL('../public/logo.png', import.meta.url)))
    .resize(360, 360, { fit: 'inside' }).png().toBuffer();
  const splash = await sharp({ create: { width: 2732, height: 2732, channels: 3, background: '#FAFAF8' } })
    .composite([{ input: logo, gravity: 'centre' }]).removeAlpha().png().toBuffer();
  return { icon, splash };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--apply', '--check'].includes(args[0])) throw new Error('argument_invalid');
  const apply = args[0] === '--apply';
  if (apply && process.platform !== 'darwin') throw new Error('macos_required');
  const folder = fileURLToPath(new URL('../ios/App', import.meta.url));
  const paths = { info: join(folder, 'App/Info.plist'), privacy: join(folder, 'App/PrivacyInfo.xcprivacy'),
    project: join(folder, 'App.xcodeproj/project.pbxproj'),
    englishBrand: join(folder, 'App/en.lproj', localizationFile),
    chineseBrand: join(folder, 'App/zh-Hant.lproj', localizationFile) };
  if (!existsSync(paths.info) || !existsSync(paths.project)) throw new Error('ios_project_missing');
  const before = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, existsSync(path) ? readFileSync(path, 'utf8') : null]));
  const linkScheme = process.env.IOS_APP_ID?.trim().toLowerCase();
  if (!linkScheme) throw new Error('ios_link_scheme_missing');
  const planned = planIosMediaConfiguration({ ...before, linkScheme });
  const { icon, splash } = await createIosBrandAssets();
  const assetRoot = join(folder, 'App/Assets.xcassets');
  const assetSets = [
    { directory: 'AppIcon.appiconset', names: ['AppIcon-512@2x.png'], bytes: icon },
    { directory: 'Splash.imageset', names: ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'], bytes: splash },
  ];
  const assets = assetSets.flatMap(({ directory, names, bytes }) => {
    const assetFolder = join(assetRoot, directory);
    const { images } = JSON.parse(readFileSync(join(assetFolder, 'Contents.json'), 'utf8'));
    if (!Array.isArray(images) || images.length !== names.length
      || !names.every(name => images.some(image => image?.filename === name))) {
      throw new Error('ios_brand_asset_catalog_review_required');
    }
    return names.map(name => ({ path: join(assetFolder, name), bytes }));
  });
  const pendingAssets = assets.filter(({ path, bytes }) => !existsSync(path) || !readFileSync(path).equals(bytes));
  if (!apply && (Object.keys(paths).some(key => before[key] !== planned[key]) || pendingAssets.length)) {
    throw new Error('ios_media_configuration_pending');
  }
  if (apply) for (const key of Object.keys(paths)) {
    if (before[key] !== planned[key]) {
      mkdirSync(dirname(paths[key]), { recursive: true });
      writeFileSync(paths[key], planned[key], 'utf8');
    }
  }
  if (apply) for (const { path, bytes } of pendingAssets) writeFileSync(path, bytes);
  console.log(JSON.stringify({ ok: true, mode: apply ? 'apply' : 'check', nativeBuildVerified: false }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  void main().catch(error => {
    console.error(JSON.stringify({ ok: false, code: error instanceof Error ? error.message : 'ios_media_configuration_failed' }));
    process.exitCode = 1;
  });
}

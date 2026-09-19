export const NATIVE_STORE_ASSET_CHECK_IDS = [
  'ios_app_icon',
  'google_play_icon',
  'google_feature_graphic',
  'ios_phone_screenshots',
  'google_phone_screenshots',
] as const;

export type NativeStoreAssetCheckId = typeof NATIVE_STORE_ASSET_CHECK_IDS[number];
export type NativeStoreAssetFormat = 'png' | 'jpeg' | 'other';

export type NativeStoreImageMetadata = Readonly<{
  format: NativeStoreAssetFormat;
  width: number;
  height: number;
  hasAlpha: boolean;
  channels: number;
  sizeBytes: number;
}>;

export type NativeStoreAssetInventory = Readonly<{
  iosAppIcon: NativeStoreImageMetadata | null;
  googlePlayIcon: NativeStoreImageMetadata | null;
  googleFeatureGraphic: NativeStoreImageMetadata | null;
  iosPhoneScreenshots: readonly NativeStoreImageMetadata[];
  googlePhoneScreenshots: readonly NativeStoreImageMetadata[];
}>;

export type NativeStoreAssetCheckCode =
  | 'pass'
  | 'missing'
  | 'count_invalid'
  | 'format_invalid'
  | 'dimensions_invalid'
  | 'alpha_invalid'
  | 'file_size_invalid';

export type NativeStoreAssetCheck = Readonly<{
  id: NativeStoreAssetCheckId;
  ok: boolean;
  code: NativeStoreAssetCheckCode;
}>;

export type NativeStoreAssetPreflightReport = Readonly<{
  ready: boolean;
  totalCount: number;
  passedCount: number;
  blockerCount: number;
  checks: readonly NativeStoreAssetCheck[];
}>;

const GOOGLE_PLAY_ICON_MAX_BYTES = 1024 * 1024;
const IOS_PHONE_SCREENSHOT_SIZES = new Set([
  '1260x2736',
  '2736x1260',
  '1290x2796',
  '2796x1290',
  '1320x2868',
  '2868x1320',
]);

function result(
  id: NativeStoreAssetCheckId,
  code: NativeStoreAssetCheckCode,
): NativeStoreAssetCheck {
  return Object.freeze({ id, ok: code === 'pass', code });
}

function isValidMetadata(image: NativeStoreImageMetadata): boolean {
  return Number.isSafeInteger(image.width)
    && image.width > 0
    && Number.isSafeInteger(image.height)
    && image.height > 0
    && Number.isSafeInteger(image.channels)
    && image.channels > 0
    && Number.isSafeInteger(image.sizeBytes)
    && image.sizeBytes > 0;
}

function isStoreImageFormat(image: NativeStoreImageMetadata): boolean {
  return image.format === 'png' || image.format === 'jpeg';
}

function checkIosAppIcon(image: NativeStoreImageMetadata | null): NativeStoreAssetCheck {
  if (!image) return result('ios_app_icon', 'missing');
  if (!isValidMetadata(image) || image.format !== 'png') {
    return result('ios_app_icon', 'format_invalid');
  }
  if (image.width !== 1024 || image.height !== 1024) {
    return result('ios_app_icon', 'dimensions_invalid');
  }
  return result('ios_app_icon', 'pass');
}

function checkGooglePlayIcon(image: NativeStoreImageMetadata | null): NativeStoreAssetCheck {
  if (!image) return result('google_play_icon', 'missing');
  if (!isValidMetadata(image) || image.format !== 'png') {
    return result('google_play_icon', 'format_invalid');
  }
  if (image.width !== 512 || image.height !== 512) {
    return result('google_play_icon', 'dimensions_invalid');
  }
  if (!image.hasAlpha || image.channels !== 4) {
    return result('google_play_icon', 'alpha_invalid');
  }
  if (image.sizeBytes > GOOGLE_PLAY_ICON_MAX_BYTES) {
    return result('google_play_icon', 'file_size_invalid');
  }
  return result('google_play_icon', 'pass');
}

function checkGoogleFeatureGraphic(
  image: NativeStoreImageMetadata | null,
): NativeStoreAssetCheck {
  if (!image) return result('google_feature_graphic', 'missing');
  if (!isValidMetadata(image) || !isStoreImageFormat(image)) {
    return result('google_feature_graphic', 'format_invalid');
  }
  if (image.width !== 1024 || image.height !== 500) {
    return result('google_feature_graphic', 'dimensions_invalid');
  }
  if (image.hasAlpha) return result('google_feature_graphic', 'alpha_invalid');
  return result('google_feature_graphic', 'pass');
}

function checkIosPhoneScreenshots(
  images: readonly NativeStoreImageMetadata[],
): NativeStoreAssetCheck {
  if (images.length === 0) return result('ios_phone_screenshots', 'missing');
  if (images.length > 10) return result('ios_phone_screenshots', 'count_invalid');
  if (images.some(image => !isValidMetadata(image) || !isStoreImageFormat(image))) {
    return result('ios_phone_screenshots', 'format_invalid');
  }
  if (images.some(image => image.hasAlpha)) {
    return result('ios_phone_screenshots', 'alpha_invalid');
  }
  if (images.some(image => !IOS_PHONE_SCREENSHOT_SIZES.has(`${image.width}x${image.height}`))) {
    return result('ios_phone_screenshots', 'dimensions_invalid');
  }
  return result('ios_phone_screenshots', 'pass');
}

function isGooglePhoneScreenshotSize(image: NativeStoreImageMetadata): boolean {
  const shortSide = Math.min(image.width, image.height);
  const longSide = Math.max(image.width, image.height);
  return shortSide >= 1080
    && longSide <= 3840
    && longSide <= shortSide * 2
    && longSide * 9 === shortSide * 16;
}

function checkGooglePhoneScreenshots(
  images: readonly NativeStoreImageMetadata[],
): NativeStoreAssetCheck {
  if (images.length === 0) return result('google_phone_screenshots', 'missing');
  if (images.length < 4 || images.length > 8) {
    return result('google_phone_screenshots', 'count_invalid');
  }
  if (images.some(image => !isValidMetadata(image) || !isStoreImageFormat(image))) {
    return result('google_phone_screenshots', 'format_invalid');
  }
  if (images.some(image => image.hasAlpha)) {
    return result('google_phone_screenshots', 'alpha_invalid');
  }
  if (images.some(image => !isGooglePhoneScreenshotSize(image))) {
    return result('google_phone_screenshots', 'dimensions_invalid');
  }
  return result('google_phone_screenshots', 'pass');
}

export function evaluateNativeStoreAssets(
  inventory: NativeStoreAssetInventory,
): NativeStoreAssetPreflightReport {
  const checks = Object.freeze([
    checkIosAppIcon(inventory.iosAppIcon),
    checkGooglePlayIcon(inventory.googlePlayIcon),
    checkGoogleFeatureGraphic(inventory.googleFeatureGraphic),
    checkIosPhoneScreenshots(inventory.iosPhoneScreenshots),
    checkGooglePhoneScreenshots(inventory.googlePhoneScreenshots),
  ]);
  const passedCount = checks.filter(check => check.ok).length;

  return Object.freeze({
    ready: passedCount === checks.length,
    totalCount: checks.length,
    passedCount,
    blockerCount: checks.length - passedCount,
    checks,
  });
}

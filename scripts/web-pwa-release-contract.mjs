const SAFE_APP_PATH_PATTERN = /^\/[a-zA-Z0-9/_?=&.-]*$/;
const INSTALLABLE_DISPLAY_MODES = new Set([
  'fullscreen',
  'minimal-ui',
  'standalone',
  'window-controls-overlay',
]);

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function requireNonEmptyString(value, label, maximumLength = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximumLength) {
    throw new Error(`${label} must be a bounded non-empty string`);
  }
  return value;
}

function requireAppPath(value, label) {
  const path = requireNonEmptyString(value, label, 200);
  if (
    !SAFE_APP_PATH_PATTERN.test(path)
    || path.startsWith('//')
    || path.includes('..')
    || path.includes('#')
  ) {
    throw new Error(`${label} must be an app-relative path`);
  }
  return path;
}

function parseDeclaredSizes(value, label) {
  const sizes = requireNonEmptyString(value, label, 100)
    .split(/\s+/)
    .map(size => {
      const match = /^(\d{1,4})x(\d{1,4})$/.exec(size);
      if (!match) throw new Error(`${label} contains an invalid size`);
      return { width: Number(match[1]), height: Number(match[2]) };
    });
  if (sizes.some(size => size.width <= 0 || size.height <= 0)) {
    throw new Error(`${label} contains a non-positive size`);
  }
  return sizes;
}

function addAsset(assets, candidate, label) {
  const item = requireObject(candidate, label);
  const src = requireAppPath(item.src, `${label}.src`);
  const type = requireNonEmptyString(item.type, `${label}.type`, 100);
  if (type !== 'image/png') throw new Error(`${label}.type must be image/png`);
  const sizes = parseDeclaredSizes(item.sizes, `${label}.sizes`);
  const existing = assets.get(src);
  if (existing && existing.type !== type) {
    throw new Error(`${label} conflicts with another asset declaration`);
  }
  assets.set(src, { src, type, sizes });
  return { item, src, sizes };
}

export function assertWebAppManifestContract(value) {
  const manifest = requireObject(value, 'manifest');
  requireNonEmptyString(manifest.name, 'manifest.name', 80);
  requireNonEmptyString(manifest.short_name, 'manifest.short_name', 30);
  requireNonEmptyString(manifest.description, 'manifest.description', 300);
  requireAppPath(manifest.id, 'manifest.id');
  requireAppPath(manifest.start_url, 'manifest.start_url');
  requireAppPath(manifest.scope, 'manifest.scope');
  if (!INSTALLABLE_DISPLAY_MODES.has(manifest.display)) {
    throw new Error('manifest.display is not installable');
  }
  if (manifest.prefer_related_applications !== false) {
    throw new Error('manifest.prefer_related_applications must be false');
  }

  const assets = new Map();
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    throw new Error('manifest.icons must not be empty');
  }
  const iconSizes = [];
  manifest.icons.forEach((icon, index) => {
    const parsed = addAsset(assets, icon, `manifest.icons[${index}]`);
    iconSizes.push(...parsed.sizes.map(size => size.width === size.height ? size.width : 0));
    const purpose = requireNonEmptyString(parsed.item.purpose, `manifest.icons[${index}].purpose`, 50);
    if (!purpose.split(/\s+/).includes('any') || !purpose.split(/\s+/).includes('maskable')) {
      throw new Error(`manifest.icons[${index}].purpose must include any and maskable`);
    }
  });
  if (!iconSizes.includes(192) || !iconSizes.includes(512)) {
    throw new Error('manifest icons must include 192x192 and 512x512');
  }

  if (!Array.isArray(manifest.screenshots) || manifest.screenshots.length === 0) {
    throw new Error('manifest.screenshots must not be empty');
  }
  manifest.screenshots.forEach((screenshot, index) => {
    const parsed = addAsset(assets, screenshot, `manifest.screenshots[${index}]`);
    requireNonEmptyString(parsed.item.label, `manifest.screenshots[${index}].label`, 120);
    if (parsed.item.form_factor !== 'narrow' && parsed.item.form_factor !== 'wide') {
      throw new Error(`manifest.screenshots[${index}].form_factor is invalid`);
    }
  });

  if (!Array.isArray(manifest.shortcuts) || manifest.shortcuts.length === 0) {
    throw new Error('manifest.shortcuts must not be empty');
  }
  manifest.shortcuts.forEach((shortcut, index) => {
    const item = requireObject(shortcut, `manifest.shortcuts[${index}]`);
    requireNonEmptyString(item.name, `manifest.shortcuts[${index}].name`, 80);
    requireNonEmptyString(item.short_name, `manifest.shortcuts[${index}].short_name`, 30);
    requireNonEmptyString(item.description, `manifest.shortcuts[${index}].description`, 160);
    requireAppPath(item.url, `manifest.shortcuts[${index}].url`);
    if (!Array.isArray(item.icons) || item.icons.length === 0) {
      throw new Error(`manifest.shortcuts[${index}].icons must not be empty`);
    }
    item.icons.forEach((icon, iconIndex) => {
      addAsset(assets, { ...icon, type: icon.type ?? 'image/png' }, `manifest.shortcuts[${index}].icons[${iconIndex}]`);
    });
  });

  return Object.freeze([...assets.values()]);
}

export function assertServiceWorkerContract(source) {
  if (typeof source !== 'string' || source.length < 200 || source.length > 200_000) {
    throw new Error('service worker source is missing or unbounded');
  }
  if (!/const SW_VERSION = '[0-9]+\.[0-9]+\.[0-9]+';/.test(source)) {
    throw new Error('service worker version is missing');
  }
  for (const eventName of ['install', 'activate', 'message']) {
    if (!source.includes(`addEventListener('${eventName}'`)) {
      throw new Error(`service worker ${eventName} handler is missing`);
    }
  }
  if (source.includes("addEventListener('fetch'")) {
    throw new Error('service worker must not introduce an unreviewed fetch cache');
  }
}

export function readPngDimensions(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 24) {
    throw new Error('PNG asset is too small');
  }
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((value, index) => bytes[index] !== value)) {
    throw new Error('asset is not a PNG');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Object.freeze({
    width: view.getUint32(16),
    height: view.getUint32(20),
  });
}

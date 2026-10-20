import { CameraSelectionError, type CameraPort } from '../contracts/camera';
import type { SalesPhotoEvidenceBrowserCapabilitySnapshot } from '@/lib/sales/photo-evidence-browser-adapter-contract';
import { SALES_PHOTO_EVIDENCE_MAX_SOURCE_FILE_SIZE_BYTES } from '@/lib/sales/photo-evidence-capture-compression';
import { PRODUCT_COVER_PHOTO_POLICY } from '@/lib/products/product-cover-photo-model';

export type NativeCameraDependencies = {
  takePhoto(): Promise<unknown>;
  chooseFromGallery(): Promise<unknown>;
  stat(path: string): Promise<{ type: string; size: number }>;
  read(path: string): Promise<unknown>;
  remove(path: string): Promise<void>;
};
type Schedule = (callback: () => void, milliseconds: number) => () => void;
const scheduleTimer: Schedule = (callback, milliseconds) => {
  const timer = setTimeout(callback, milliseconds);
  return () => clearTimeout(timer);
};

function filePath(raw: unknown): string {
  if (typeof raw !== 'string' || /[\u0000-\u001f\u007f\\]|%2e|%2f|%5c|\/\.\.?(?:\/|$)/i.test(raw)) throw new Error();
  const url = new URL(raw);
  if (url.protocol !== 'file:' || url.host || url.search || url.hash) throw new Error();
  const path = decodeURIComponent(url.pathname);
  if (path.includes('%')) throw new Error();
  return path.replace(/^\/private\/var\//, '/var/');
}

/** The trusted native Cache root identifies this app's sibling temporary folder. */
export function iosPhotoTemporaryDirectory(cacheUri: string): string {
  try {
    const path = filePath(cacheUri).replace(/\/$/, '');
    if (!path.endsWith('/Library/Caches') || path === '/Library/Caches') throw new Error();
    return path.slice(0, -'/Library/Caches'.length) + '/tmp/';
  } catch { throw new CameraSelectionError('adapter_unavailable'); }
}

export function createNativeCamera(
  dependencies: NativeCameraDependencies,
  options: {
    cacheUri: string;
    imageProcessingAvailable: boolean;
    maxBytes?: number;
    ioTimeoutMs?: number;
    scheduleDeadline?: Schedule;
  },
): { camera: CameraPort; dispose(): void } {
  const temporaryDirectory = iosPhotoTemporaryDirectory(options.cacheUri);
  const sourceLimit = Math.min(SALES_PHOTO_EVIDENCE_MAX_SOURCE_FILE_SIZE_BYTES, PRODUCT_COVER_PHOTO_POLICY.maxSourceBytes);
  const maxBytes = options.maxBytes ?? sourceLimit;
  const timeoutMs = options.ioTimeoutMs ?? 10_000;
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > sourceLimit
    || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new Error('native_camera_options_invalid');
  const schedule = options.scheduleDeadline ?? scheduleTimer;
  let busy = false;
  let disposed = false;
  let cleanupFailed = false;
  const snapshot = (): SalesPhotoEvidenceBrowserCapabilitySnapshot => ({
    secureContext: true,
    mediaCaptureAvailable: !disposed && !cleanupFailed,
    imageProcessingAvailable: options.imageProcessingAvailable,
  });
  function ownedUri(raw: unknown): string | null {
    try {
      const path = filePath(raw);
      if (!path.startsWith(temporaryDirectory)) return null;
      const filename = path.slice(temporaryDirectory.length);
      return /^image_[0-9]{10,17}\.(?:jpeg|jpg|png)$/i.test(filename) ? raw as string : null;
    } catch { return null; }
  }
  async function io<T>(action: () => Promise<T>): Promise<T> {
    let cancel = () => {};
    try {
      return await Promise.race([
        Promise.resolve().then(action),
        new Promise<never>((_, reject) => {
          cancel = schedule(() => reject(new Error('native_camera_io_timeout')), timeoutMs);
        }),
      ]);
    } finally { cancel(); }
  }
  async function readImage(uri: string): Promise<File> {
    const stat = await io(() => dependencies.stat(uri));
    if (stat.type !== 'file' || !Number.isInteger(stat.size) || stat.size < 1 || stat.size > maxBytes) throw new Error();
    const raw = await io(() => dependencies.read(uri));
    if (typeof raw !== 'string' || raw.length > Math.ceil(stat.size / 3) * 4
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(raw)) throw new Error();
    const decoded = atob(raw);
    if (decoded.length !== stat.size) throw new Error();
    const buffer = new ArrayBuffer(decoded.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value);
    if (!jpeg && !png) throw new Error();
    return new File([buffer], jpeg ? 'selected-photo.jpg' : 'selected-photo.png', { type: jpeg ? 'image/jpeg' : 'image/png' });
  }
  return {
    dispose() { disposed = true; },
    camera: Object.freeze({
      getCapabilitySnapshot: snapshot,
      async selectImage(source: 'camera' | 'library') {
        if (disposed || cleanupFailed || busy || !options.imageProcessingAvailable
          || !['camera', 'library'].includes(source)) throw new CameraSelectionError('adapter_unavailable');
        busy = true;
        const owned = new Set<string>();
        const acquire = async (): Promise<File | null> => { try {
          // No UI timeout: the native plugin owns the picker until it resolves/cancels.
          const result = source === 'camera' ? await dependencies.takePhoto() : await dependencies.chooseFromGallery();
          const results = source === 'camera' ? [result] : (result as { results?: unknown[] } | null)?.results;
          if (!Array.isArray(results)) throw new Error();
          for (const item of results) {
            const uri = ownedUri((item as { uri?: unknown } | null)?.uri);
            if (uri) owned.add(uri);
          }
          if (results.length === 0) return null;
          if (results.length !== 1 || owned.size !== 1
            || (results[0] as { type?: unknown } | null)?.type !== 0) throw new Error();
          if (disposed) return null;
          const file = await readImage([...owned][0]);
          return disposed ? null : file;
        } catch (error) {
          const code = (error as { code?: unknown } | null)?.code;
          if (code === 'OS-PLUG-CAMR-0006' || code === 'OS-PLUG-CAMR-0020') return null;
          if (code === 'OS-PLUG-CAMR-0003' || code === 'OS-PLUG-CAMR-0005') throw new CameraSelectionError('permission_denied');
          if (code === 'OS-PLUG-CAMR-0007') throw new CameraSelectionError('camera_not_found');
          throw new CameraSelectionError('source_decode_failed');
        } };
        let selected: File | null = null;
        let failure: unknown;
        try { selected = await acquire(); } catch (error) { failure = error; } finally {
          for (const uri of owned) {
            try { await io(() => dependencies.remove(uri)); } catch { cleanupFailed = true; }
          }
          busy = false;
        }
        if (cleanupFailed) throw new CameraSelectionError('source_decode_failed');
        if (failure) throw failure;
        return disposed ? null : selected;
      },
    }),
  };
}

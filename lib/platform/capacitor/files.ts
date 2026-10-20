import { FileOperationError, type FilePort, type PlatformFile } from '../contracts/files';

export type NativeFileDependencies = {
  createDirectory(path: string): Promise<void>;
  write(path: string, base64: string): Promise<void>;
  getUri(path: string): Promise<string>;
  removeFile(path: string): Promise<void>;
  removeDirectory(path: string): Promise<void>;
  share(uri: string): Promise<void>;
  preview(uri: string): Promise<void>;
  createId(): string;
};

const MAX_BYTES = 25 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validFile(file: PlatformFile, preview: boolean): boolean {
  if (!file || typeof file.filename !== 'string' || !(file.data instanceof Blob) || file.data.size < 1 || file.data.size > MAX_BYTES
    || !file.filename || new TextEncoder().encode(file.filename).length > 180
    || /[\u0000-\u001f\u007f/\\:%]|^\.|[. ]$/.test(file.filename)) return false;
  const extension = file.filename.split('.').pop()?.toLowerCase();
  const mime = file.data.type.split(';')[0].trim().toLowerCase();
  return extension === 'pdf' && mime === 'application/pdf'
    || !preview && (extension === 'csv' && mime === 'text/csv' || extension === 'json' && mime === 'application/json');
}

function ownedUri(uri: string, cacheUri: string, path: string): boolean {
  try {
    const parse = (value: string) => {
      if (/[\u0000-\u001f\u007f\\]|%2e|%2f|%5c|\/\.\.?(?:\/|$)/i.test(value)) throw new Error();
      const url = new URL(value);
      if (url.protocol !== 'file:' || url.host || url.search || url.hash) throw new Error();
      const decoded = decodeURIComponent(url.pathname);
      if (decoded.includes('%')) throw new Error();
      return decoded.replace(/^\/private\/var\//, '/var/').replace(/\/$/, '');
    };
    const root = parse(cacheUri);
    return root.endsWith('/Library/Caches') && root !== '/Library/Caches' && parse(uri) === `${root}/${path}`;
  } catch { return false; }
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32_768));
  }
  return btoa(binary);
}

/** Each presentation owns one file; only definitive UI completion permits cleanup. */
export function createNativeFiles(dependencies: NativeFileDependencies, options: {
  cacheUri: string;
  scheduleDeadline?: (callback: () => void, milliseconds: number) => () => void;
}) {
  let busy = false;
  let disabled = false;
  let disposed = false;
  const schedule = options.scheduleDeadline ?? ((callback, milliseconds) => {
    const timer = setTimeout(callback, milliseconds);
    return () => clearTimeout(timer);
  });
  async function io<T>(action: () => Promise<T>): Promise<T> {
    let cancel = () => {};
    try {
      return await Promise.race([
        Promise.resolve().then(action),
        new Promise<never>((_, reject) => {
          cancel = schedule(() => { disabled = true; reject(new FileOperationError('unavailable')); }, 10_000);
        }),
      ]);
    } finally { cancel(); }
  }
  const ensureActive = () => { if (disposed || disabled) throw new FileOperationError('unavailable'); };
  async function operate(file: PlatformFile, preview: boolean): Promise<void> {
    ensureActive();
    if (busy) throw new FileOperationError('busy');
    if (!validFile(file, preview)) throw new FileOperationError('invalid_file');
    busy = true;
    let directory: string | undefined;
    let path: string | undefined;
    let writeStarted = false;
    let outcomeError: FileOperationError | undefined;
    try {
      const id = dependencies.createId();
      if (!UUID.test(id)) throw new FileOperationError('unavailable');
      const candidate = `feria-exports/${id}`;
      const candidatePath = `${candidate}/${file.filename}`;
      // Validate the trusted root before any write (getUri does not create files).
      const uri = await io(() => dependencies.getUri(candidatePath));
      ensureActive();
      if (!ownedUri(uri, options.cacheUri, candidatePath)) throw new FileOperationError('unavailable');
      const base64 = toBase64(await io(() => file.data.arrayBuffer()));
      ensureActive();
      await io(() => dependencies.createDirectory(candidate));
      directory = candidate;
      ensureActive();
      path = candidatePath;
      writeStarted = true;
      await io(() => dependencies.write(candidatePath, base64));
      ensureActive();
      // UI completion has no artificial deadline. The file remains available while open.
      await (preview ? dependencies.preview(uri) : dependencies.share(uri));
      ensureActive();
    } catch (error) {
      outcomeError = error instanceof FileOperationError ? error
        : !preview && error instanceof Object && 'message' in error && error.message === 'Share canceled'
          ? new FileOperationError('cancelled') : new FileOperationError('failed');
    } finally {
      // A timed-out native write may still finish: no deletion or new operation races it.
      if (!disabled && directory) {
        try {
          if (path && writeStarted) await io(() => dependencies.removeFile(path!));
          await io(() => dependencies.removeDirectory(directory!));
        } catch { disabled = true; outcomeError = new FileOperationError('cleanup_failed'); }
      }
      busy = false;
    }
    if (outcomeError) throw outcomeError;
    ensureActive();
  }
  const files: FilePort = {
    saveFile: file => operate(file, false),
    async previewFile(file) { await operate(file, true); return { opened: true }; },
  };
  return { files, dispose() { disposed = true; } };
}

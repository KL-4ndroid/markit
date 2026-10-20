import { Capacitor, registerPlugin } from '@capacitor/core';
import { FileOperationError } from '../contracts/files';
import { createNativeFiles } from './files';

export async function loadIosFiles() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios'
    || !['Filesystem', 'Share', 'FeriaFilePreview'].every(name => Capacitor.isPluginAvailable(name))
    || typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function' || typeof btoa !== 'function') {
    throw new FileOperationError('unavailable');
  }
  try {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'), import('@capacitor/share'),
    ]);
    const preview = registerPlugin<{ preview(options: { uri: string }): Promise<void> }>('FeriaFilePreview');
    const { uri: cacheUri } = await Filesystem.getUri({ directory: Directory.Cache, path: '' });
    const ignoreMissing = async (action: () => Promise<unknown>) => {
      try { await action(); } catch (error) {
        if (!(error instanceof Object && 'code' in error && error.code === 'OS-PLUG-FILE-0008')) throw error;
      }
    };
    return createNativeFiles({
      createDirectory: async path => { await Filesystem.mkdir({ directory: Directory.Cache, path, recursive: true }); },
      write: async (path, data) => { await Filesystem.writeFile({ directory: Directory.Cache, path, data }); },
      getUri: async path => (await Filesystem.getUri({ directory: Directory.Cache, path })).uri,
      removeFile: path => ignoreMissing(() => Filesystem.deleteFile({ directory: Directory.Cache, path })),
      removeDirectory: path => ignoreMissing(() => Filesystem.rmdir({ directory: Directory.Cache, path, recursive: false })),
      share: async uri => { await Share.share({ files: [uri] }); },
      preview: uri => preview.preview({ uri }),
      createId: () => crypto.randomUUID(),
    }, { cacheUri });
  } catch { throw new FileOperationError('unavailable'); }
}

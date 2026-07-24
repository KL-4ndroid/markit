import type { FilePort, FilePreviewResult, PlatformFile } from '@/lib/platform/contracts/files';

const PREVIEW_URL_LIFETIME_MS = 60_000;

function createDownload(file: PlatformFile): void {
  const url = URL.createObjectURL(file.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const webFiles: FilePort = Object.freeze({
  async saveFile(file: PlatformFile): Promise<void> {
    createDownload(file);
  },

  async previewFile(file: PlatformFile): Promise<FilePreviewResult> {
    if (typeof window === 'undefined' || typeof URL === 'undefined') {
      return { opened: false, reason: 'unsupported' };
    }

    const url = URL.createObjectURL(file.data);
    const openedWindow = window.open(url, '_blank');
    if (!openedWindow) {
      URL.revokeObjectURL(url);
      return { opened: false, reason: 'blocked' };
    }

    openedWindow.opener = null;
    try {
      openedWindow.document.title = file.filename;
    } catch {
      // Some browser PDF viewers do not expose the blob document immediately.
    }
    window.setTimeout(() => URL.revokeObjectURL(url), PREVIEW_URL_LIFETIME_MS);
    return { opened: true };
  },
});

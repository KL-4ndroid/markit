import type { ClipboardPort } from '@/lib/platform/contracts/clipboard';

export const webClipboard: ClipboardPort = Object.freeze({
  async writeText(value: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('Clipboard is unavailable');
    }
    await navigator.clipboard.writeText(value);
  },
});

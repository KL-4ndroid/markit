import type { ExternalLinkPort } from '@/lib/platform/contracts/external-link';

export const webExternalLinks: ExternalLinkPort = Object.freeze({
  async open(url: string) {
    if (typeof window === 'undefined') return false;
    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (openedWindow) openedWindow.opener = null;
    return !!openedWindow;
  },
});

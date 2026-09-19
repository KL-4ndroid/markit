import type { DeepLinkPort } from '@/lib/platform/contracts/deep-link';

function currentUrl(): string | null {
  return typeof window === 'undefined' ? null : window.location.href;
}

export const webDeepLinks: DeepLinkPort = Object.freeze({
  createAppUrl(path: string) {
    if (!path.startsWith('/')) throw new Error('App URL path must start with /');
    const origin = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;
    return new URL(path, origin).toString();
  },
  async getInitialUrl() {
    return currentUrl();
  },
  subscribe(listener: (url: string) => void) {
    if (typeof window === 'undefined') return () => undefined;
    const handleUrlChange = () => {
      const url = currentUrl();
      if (url) listener(url);
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  },
});

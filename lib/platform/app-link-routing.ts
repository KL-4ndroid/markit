import type { DeepLinkPort } from './contracts/deep-link';
import { appLinkPath } from './app-link-policy';

/** Navigation only: invitation acceptance and permissions stay in existing pages. */
export function startAppLinkRouting(port: DeepLinkPort, navigate: (path: string) => void): () => void {
  let disposed = false;
  let revision = 0;
  const deliver = async (url: string | null, expected: number) => {
    if (disposed || !url) return;
    const path = appLinkPath(url);
    if (!path) return;
    const current = await port.getCurrentUrl();
    if (disposed || revision !== expected || current && appLinkPath(current) === path) return;
    navigate(path);
  };
  const unsubscribe = port.subscribe(url => { revision++; void deliver(url, revision).catch(() => {}); });
  const expected = revision;
  void port.getInitialUrl().then(url => { if (revision === expected) return deliver(url, expected); }).catch(() => {});
  return () => { disposed = true; unsubscribe(); };
}

import type { ClipboardPort } from '../contracts/clipboard';
import type { ExternalLinkPort } from '../contracts/external-link';
import type { DeepLinkPort } from '../contracts/deep-link';
import type { ShareInput, SharePort } from '../contracts/share';
import { appLinkPath, externalLinkUrl, nativeLinkScheme, normalizeAppLink, publicWebOrigin } from '../app-link-policy';

type Handle = { remove(): Promise<void> };
export type InteractionDependencies = {
  writeText(value: string): Promise<void>;
  openUrl(url: string): Promise<unknown>;
  share(input: ShareInput): Promise<void>;
  getLaunchUrl(): Promise<unknown>;
  addUrlListener(listener: (event: unknown) => void): Promise<Handle>;
  currentUrl(): string | null;
};

export function createNativeInteractions(dependencies: InteractionDependencies, options: {
  origin: string; scheme: string;
  scheduleDeadline?: (callback: () => void, milliseconds: number) => () => void;
}) {
  const config = { origin: publicWebOrigin(options.origin), scheme: nativeLinkScheme(options.scheme) };
  let disposed = false;
  let revision = 0;
  let latest: string | null = null;
  let handle: Handle | undefined;
  let clipboardBusy = false;
  let clipboardDisabled = false;
  let shareBusy = false;
  let openerBusy = false;
  let openerDisabled = false;
  const listeners = new Set<(url: string) => void>();
  const schedule = options.scheduleDeadline ?? ((callback, ms) => {
    const timer = setTimeout(callback, ms); return () => clearTimeout(timer);
  });
  async function bounded<T>(action: () => Promise<T>, onTimeout: () => void = () => {}): Promise<T> {
    let cancel = () => {};
    try {
      return await Promise.race([Promise.resolve().then(action), new Promise<never>((_, reject) => {
        cancel = schedule(() => { onTimeout(); reject(new Error('native_interaction_unavailable')); }, 5_000);
      })]);
    } finally { cancel(); }
  }
  const remove = async (value: Handle) => { await bounded(() => value.remove()); };
  const dispose = async () => {
    disposed = true; listeners.clear();
    const owned = handle; handle = undefined;
    if (owned) await remove(owned);
  };
  const eventUrl = (event: unknown) => event && typeof event === 'object' ? (event as { url?: unknown }).url : undefined;
  const ready = bounded(async () => {
    const expected = revision;
    const owned = await dependencies.addUrlListener(event => {
      if (disposed) return;
      const url = normalizeAppLink(eventUrl(event), config);
      if (!url) return;
      revision++;
      latest = url;
      for (const listener of [...listeners]) { try { listener(url); } catch { /* Observer owns errors. */ } }
    });
    if (disposed) { await remove(owned); return; }
    handle = owned;
    const launch = await dependencies.getLaunchUrl();
    if (!disposed && revision === expected) latest = normalizeAppLink(eventUrl(launch), config);
  }, () => { void dispose().catch(() => {}); }).catch(async () => {
    void dispose().catch(() => {});
    throw new Error('native_interaction_unavailable');
  });

  const clipboard: ClipboardPort = {
    async writeText(value) {
      if (disposed || clipboardDisabled || clipboardBusy || typeof value !== 'string'
        || new TextEncoder().encode(value).length > 65_536) throw new Error('目前無法複製連結，請稍後再試。');
      clipboardBusy = true;
      try { await bounded(() => dependencies.writeText(value), () => { clipboardDisabled = true; });
        if (disposed) throw new Error();
      } catch { throw new Error('目前無法複製連結，請稍後再試。'); }
      finally { clipboardBusy = false; }
    },
  };
  const externalLinks: ExternalLinkPort = {
    async open(value) {
      const url = externalLinkUrl(value);
      if (disposed || openerBusy || openerDisabled || !url) return false;
      openerBusy = true;
      try {
        const result = await bounded(() => dependencies.openUrl(url), () => { openerDisabled = true; });
        return !disposed && !!result && typeof result === 'object' && (result as { completed?: unknown }).completed === true;
      } catch { return false; }
      finally { openerBusy = false; }
    },
  };
  const share: SharePort = {
    async share(input) {
      if (disposed || shareBusy || !input || (!input.text && !input.url)
        || [input.title, input.text].some(value => value !== undefined && (typeof value !== 'string' || value.length > 16_384))
        || input.url !== undefined && (!externalLinkUrl(input.url) || !input.url.startsWith('https://'))) return 'unsupported';
      shareBusy = true;
      try { await dependencies.share({ title: input.title, text: input.text, url: input.url }); return disposed ? 'unsupported' : 'shared'; }
      catch (error) { return error && typeof error === 'object' && (error as { message?: unknown }).message === 'Share canceled' ? 'cancelled' : 'unsupported'; }
      finally { shareBusy = false; }
    },
  };
  const deepLinks: DeepLinkPort = {
    createAppUrl(path) {
      const validPath = appLinkPath(config.origin + path);
      if (disposed || !path.startsWith('/') || path.startsWith('//') || !validPath) throw new Error('native_app_link_invalid');
      return config.origin + validPath;
    },
    async getInitialUrl() {
      if (disposed) return null;
      await ready;
      if (disposed) return null;
      return latest ?? normalizeAppLink(dependencies.currentUrl(), config, true);
    },
    async getCurrentUrl() {
      return disposed ? null : normalizeAppLink(dependencies.currentUrl(), config, true);
    },
    subscribe(listener) { if (disposed) return () => {}; listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  return { clipboard, externalLinks, share, deepLinks, ready, dispose };
}

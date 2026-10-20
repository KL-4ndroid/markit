export const DEFAULT_PUBLIC_WEB_ORIGIN = 'https://markit-app-mocha.vercel.app';

export function publicWebOrigin(value: string): string {
  try {
    const url = new URL(value);
    if (value !== value.trim() || url.protocol !== 'https:' || url.username || url.password
      || url.pathname !== '/' || url.search || url.hash || !url.hostname.includes('.')
      || /^(localhost|127\.|\[)/i.test(url.hostname)) throw new Error();
    return url.origin;
  } catch { throw new Error('native_link_configuration_invalid'); }
}

export function nativeLinkScheme(value: string): string {
  if (value.length > 255 || !/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*){2,}$/.test(value)) {
    throw new Error('native_link_configuration_invalid');
  }
  return value;
}

/** Route shape only. Existing pages retain authentication/permission/token checks. */
export function appLinkPath(value: string): string | null {
  try {
    if (typeof value !== 'string' || value.length > 4096 || /[\u0000-\u0020\u007f\\]|%0[ad]/i.test(value)
      || /%2f|%5c|%2e|\/\.\.?(?:\/|$)/i.test(value.split(/[?#]/, 1)[0])) return null;
    const url = new URL(value);
    if (url.username || url.password || url.hash) return null;
    const keys = [...url.searchParams.keys()];
    if (url.pathname === '/join' && keys.length === 1 && keys[0] === 'token') {
      const token = url.searchParams.get('token')!;
      if (!token || token.length > 512 || /[\u0000-\u001f\u007f]/.test(token)) return null;
      return `/join?token=${encodeURIComponent(token)}`;
    }
    if (['/markets', '/products'].includes(url.pathname)) {
      if (keys.length === 0) return url.pathname;
      if (keys.length === 1 && keys[0] === 'action' && url.searchParams.get('action') === 'add') return `${url.pathname}?action=add`;
    }
    return null;
  } catch { return null; }
}

export function normalizeAppLink(value: unknown, config: { origin: string; scheme: string }, bundled = false): string | null {
  if (typeof value !== 'string') return null;
  const path = appLinkPath(value);
  if (!path) return null;
  try {
    const url = new URL(value);
    const trusted = url.origin === config.origin && url.protocol === 'https:'
      || url.protocol === `${config.scheme}:` && url.hostname === 'app' && !url.port
      || bundled && url.protocol === 'capacitor:' && url.hostname === 'localhost' && !url.port;
    return trusted ? config.origin + path : null;
  } catch { return null; }
}

export function externalLinkUrl(value: unknown): string | null {
  try {
    if (typeof value !== 'string' || !value || value.length > 4096
      || /[\u0000-\u0020\u007f\\]|%0[ad]/i.test(value)) return null;
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol === 'https:' && url.hostname) return url.toString();
    if (url.protocol === 'mailto:' && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(url.pathname)
      && !url.hash && [...url.searchParams.keys()].every(key => key === 'subject')
      && url.searchParams.getAll('subject').length <= 1 && (url.searchParams.get('subject')?.length ?? 0) <= 200) return url.toString();
    return null;
  } catch { return null; }
}

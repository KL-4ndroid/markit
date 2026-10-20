import type { ExternalLinkPort } from '../contracts/external-link';

/** Native WebView DOM access stays behind the device boundary. */
export function interceptNativeExternalLinks(port: ExternalLinkPort, onFailure: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  let active = true;
  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof Element)) return;
    const anchor = event.target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) return;
    const raw = anchor.getAttribute('href');
    if (!raw || raw.startsWith('#')) return;
    try {
      const url = new URL(anchor.href);
      const current = new URL(window.location.href);
      if (url.protocol === current.protocol && url.host === current.host) return;
    } catch { /* Block malformed external navigation. */ }
    event.preventDefault();
    void port.open(anchor.href).then(opened => { if (active && !opened) onFailure(); }, () => { if (active) onFailure(); });
  };
  document.addEventListener('click', click);
  return () => { active = false; document.removeEventListener('click', click); };
}

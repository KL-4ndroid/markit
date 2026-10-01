import type { ClipboardPort } from '@/lib/platform/contracts/clipboard';
import type { DeepLinkPort } from '@/lib/platform/contracts/deep-link';
import type { ExternalLinkPort } from '@/lib/platform/contracts/external-link';
import type { SharePort } from '@/lib/platform/contracts/share';
import { webClipboard } from '@/lib/platform/web/clipboard';
import { webDeepLinks } from '@/lib/platform/web/deep-links';
import { webExternalLinks } from '@/lib/platform/web/external-links';
import { webShare } from '@/lib/platform/web/share';

let clipboard: ClipboardPort = webClipboard;
let share: SharePort = webShare;
let externalLinks: ExternalLinkPort = webExternalLinks;
let deepLinks: DeepLinkPort = webDeepLinks;

export const getClipboardPort = () => clipboard;
export const getSharePort = () => share;
export const getExternalLinkPort = () => externalLinks;
export const getDeepLinkPort = () => deepLinks;

export function installInteractionPorts(ports: {
  clipboard: ClipboardPort;
  share: SharePort;
  externalLinks: ExternalLinkPort;
  deepLinks: DeepLinkPort;
}): () => void {
  const previous = { clipboard, share, externalLinks, deepLinks };
  clipboard = ports.clipboard;
  share = ports.share;
  externalLinks = ports.externalLinks;
  deepLinks = ports.deepLinks;
  return () => {
    if (clipboard === ports.clipboard) clipboard = previous.clipboard;
    if (share === ports.share) share = previous.share;
    if (externalLinks === ports.externalLinks) externalLinks = previous.externalLinks;
    if (deepLinks === ports.deepLinks) deepLinks = previous.deepLinks;
  };
}

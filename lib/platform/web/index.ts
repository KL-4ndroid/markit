import type { AppPlatform } from '@/lib/platform/contracts';
import { webCamera } from '@/lib/platform/web/camera';
import { webFiles } from '@/lib/platform/web/files';
import { webNetwork } from '@/lib/platform/web/network';
import { webLifecycle } from '@/lib/platform/web/lifecycle';
import { webSecureStorage } from '@/lib/platform/web/secure-storage';
import { webClipboard } from '@/lib/platform/web/clipboard';
import { webShare } from '@/lib/platform/web/share';
import { webExternalLinks } from '@/lib/platform/web/external-links';
import { webDeepLinks } from '@/lib/platform/web/deep-links';

export const webPlatform: AppPlatform = Object.freeze({
  kind: 'web',
  camera: webCamera,
  files: webFiles,
  network: webNetwork,
  lifecycle: webLifecycle,
  secureStorage: webSecureStorage,
  clipboard: webClipboard,
  share: webShare,
  externalLinks: webExternalLinks,
  deepLinks: webDeepLinks,
});

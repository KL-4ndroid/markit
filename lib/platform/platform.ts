import type { AppPlatform } from '@/lib/platform/contracts';
import { webPlatform } from '@/lib/platform/web';
import { installFilePort } from '@/lib/platform/file-capability';
import { installNetworkPort } from '@/lib/platform/network-capability';
import { installLifecyclePort } from '@/lib/platform/lifecycle-capability';
import { installSecureStorage } from '@/lib/platform/secure-storage-capability';
import { installInteractionPorts } from '@/lib/platform/interaction-capabilities';

let activePlatform: AppPlatform = webPlatform;

/** Returns the process-wide platform implementation used by shared flows. */
export function getAppPlatform(): AppPlatform {
  return activePlatform;
}

/**
 * Installs a platform implementation during native bootstrap or a test.
 * The returned cleanup restores the previous implementation.
 */
export function installAppPlatform(platform: AppPlatform): () => void {
  const previousPlatform = activePlatform;
  const restoreFilePort = installFilePort(platform.files);
  const restoreNetworkPort = installNetworkPort(platform.network);
  const restoreLifecyclePort = installLifecyclePort(platform.lifecycle);
  const restoreSecureStorage = installSecureStorage(platform.secureStorage);
  const restoreInteractionPorts = installInteractionPorts(platform);
  activePlatform = platform;

  return () => {
    if (activePlatform === platform) {
      activePlatform = previousPlatform;
      restoreFilePort();
      restoreNetworkPort();
      restoreLifecyclePort();
      restoreSecureStorage();
      restoreInteractionPorts();
    }
  };
}

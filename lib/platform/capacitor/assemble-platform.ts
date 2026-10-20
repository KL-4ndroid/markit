import type { AppPlatform } from '../contracts';
import type { PlatformResource } from '../startup';

type Owned<T> = T & { dispose(): Promise<void> };
export type PlatformLoaders = {
  runtime(): Promise<Owned<Pick<AppPlatform, 'network' | 'lifecycle'>>>;
  interactions(): Promise<Owned<Pick<AppPlatform, 'clipboard' | 'share' | 'externalLinks' | 'deepLinks'>>>;
  storage(): Promise<AppPlatform['secureStorage']>;
  camera(): Promise<AppPlatform['camera']>;
  files(): Promise<AppPlatform['files']>;
  purchases: AppPlatform['inAppPurchase'];
};

/** Injection keeps initialization/cleanup behavior testable without native shims. */
export async function assembleIosPlatform(loaders: PlatformLoaders, signal: AbortSignal): Promise<PlatformResource> {
  const resources = new Set<{ dispose(): Promise<void> }>();
  let closed = signal.aborted;
  const dispose = async () => {
    closed = true;
    const owned = [...resources]; resources.clear();
    const results = await Promise.allSettled(owned.map(resource => resource.dispose()));
    if (results.some(result => result.status === 'rejected')) throw new Error('native_platform_cleanup_failed');
  };
  const acquire = async <T extends { dispose(): Promise<void> }>(promise: Promise<T>): Promise<T> => {
    const resource = await promise;
    if (closed) { await resource.dispose(); throw new Error('native_platform_unavailable'); }
    resources.add(resource); return resource;
  };
  const abort = () => { void dispose().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    if (closed) throw new Error();
    const [runtime, interaction, secureStorage, camera, files] = await Promise.all([
      acquire(loaders.runtime()), acquire(loaders.interactions()), loaders.storage(), loaders.camera(), loaders.files(),
    ]);
    if (closed) throw new Error();
    return { platform: {
      kind: 'ios', network: runtime.network, lifecycle: runtime.lifecycle,
      secureStorage, camera, files, clipboard: interaction.clipboard, share: interaction.share,
      externalLinks: interaction.externalLinks, deepLinks: interaction.deepLinks, inAppPurchase: loaders.purchases,
    }, dispose };
  } catch {
    void dispose().catch(() => {});
    throw new Error('native_platform_unavailable');
  } finally { signal.removeEventListener('abort', abort); }
}

import { Capacitor, registerPlugin } from '@capacitor/core';
import { createAuthStorageResolver, type AuthStorageRuntime } from '../auth-storage-resolver';
import { getSecureStorage } from '../secure-storage-capability';

function runtime(): AuthStorageRuntime {
  if (!Capacitor.isNativePlatform()) return 'web';
  const platform = Capacitor.getPlatform();
  return platform === 'ios' || platform === 'android' ? platform : 'unsupported';
}

/** Called by storage itself, before Supabase's eager session read can reach Web storage. */
export const resolveAuthStorage = createAuthStorageResolver({
  runtime,
  webStorage: getSecureStorage,
  async loadIosStorage() {
    if (!Capacitor.isPluginAvailable('FeriaAuthStorage')) {
      throw new Error('native_auth_storage_unavailable');
    }
    const { createNativeAuthStorage } = await import('./secure-storage');
    const bridge = registerPlugin<import('./secure-storage').NativeAuthStorageBridge>('FeriaAuthStorage');
    return createNativeAuthStorage(bridge);
  },
});

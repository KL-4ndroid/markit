import type { SecureStoragePort } from './contracts/secure-storage';

export type AuthStorageRuntime = 'web' | 'ios' | 'android' | 'unsupported';

/** Native initialization is shared; rejection is sticky and never selects Web. */
export function createAuthStorageResolver(dependencies: {
  runtime(): AuthStorageRuntime;
  webStorage(): SecureStoragePort;
  loadIosStorage(): Promise<SecureStoragePort>;
  scheduleDeadline?: (callback: () => void, milliseconds: number) => () => void;
}) {
  let nativeStorage: Promise<SecureStoragePort> | undefined;
  return async (): Promise<SecureStoragePort> => {
    const runtime = dependencies.runtime();
    if (runtime === 'web') return dependencies.webStorage();
    if (runtime !== 'ios') throw new Error('native_auth_storage_unavailable');
    nativeStorage ??= new Promise<SecureStoragePort>((resolve, reject) => {
      const schedule = dependencies.scheduleDeadline ?? ((callback, milliseconds) => {
        const timer = setTimeout(callback, milliseconds);
        return () => clearTimeout(timer);
      });
      let settled = false;
      let cancel = () => {};
      cancel = schedule(() => {
        settled = true;
        cancel();
        reject(new Error('native_auth_storage_unavailable'));
      }, 5_000);
      void Promise.resolve().then(() => dependencies.loadIosStorage()).then(storage => {
        if (settled) return;
        settled = true; cancel(); resolve(storage);
      }, () => {
        if (settled) return;
        settled = true; cancel(); reject(new Error('native_auth_storage_unavailable'));
      });
    });
    return nativeStorage;
  };
}

import type { SecureStoragePort } from '@/lib/platform/contracts/secure-storage';

const memoryFallback = new Map<string, string>();

function getWebStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const webSecureStorage: SecureStoragePort = Object.freeze({
  async getItem(key: string) {
    return getWebStorage()?.getItem(key) ?? memoryFallback.get(key) ?? null;
  },

  async setItem(key: string, value: string) {
    const storage = getWebStorage();
    if (storage) storage.setItem(key, value);
    else memoryFallback.set(key, value);
  },

  async removeItem(key: string) {
    const storage = getWebStorage();
    if (storage) storage.removeItem(key);
    memoryFallback.delete(key);
  },
});

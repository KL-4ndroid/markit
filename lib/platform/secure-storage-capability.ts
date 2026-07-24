import type { SecureStoragePort } from '@/lib/platform/contracts/secure-storage';
import { webSecureStorage } from '@/lib/platform/web/secure-storage';

let activeSecureStorage: SecureStoragePort = webSecureStorage;

export function getSecureStorage(): SecureStoragePort {
  return activeSecureStorage;
}

export function installSecureStorage(storage: SecureStoragePort): () => void {
  const previousStorage = activeSecureStorage;
  activeSecureStorage = storage;
  return () => {
    if (activeSecureStorage === storage) activeSecureStorage = previousStorage;
  };
}

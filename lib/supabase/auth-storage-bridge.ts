import { getSecureStorage } from '@/lib/platform/secure-storage-capability';

/**
 * Supabase-compatible async storage that resolves the active platform port for
 * every operation. Native bootstrap can therefore install protected storage
 * storage after module loading without recreating the auth client.
 */
export const supabaseAuthStorage = Object.freeze({
  getItem(key: string): Promise<string | null> {
    return getSecureStorage().getItem(key);
  },
  setItem(key: string, value: string): Promise<void> {
    return getSecureStorage().setItem(key, value);
  },
  removeItem(key: string): Promise<void> {
    return getSecureStorage().removeItem(key);
  },
});

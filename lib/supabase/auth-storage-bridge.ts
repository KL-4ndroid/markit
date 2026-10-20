import { resolveAuthStorage } from '@/lib/platform/capacitor/auth-storage-bootstrap';
import type { SecureStoragePort } from '@/lib/platform/contracts/secure-storage';

/**
 * Supabase-compatible storage waits for platform resolution before every access,
 * including the auth client's eager initialization read.
 */
export function createSupabaseAuthStorage(resolveStorage: () => Promise<SecureStoragePort>) {
  return Object.freeze({
    async getItem(key: string): Promise<string | null> {
      return (await resolveStorage()).getItem(key);
    },
    async setItem(key: string, value: string): Promise<void> {
      return (await resolveStorage()).setItem(key, value);
    },
    async removeItem(key: string): Promise<void> {
      return (await resolveStorage()).removeItem(key);
    },
  });
}

export const supabaseAuthStorage = createSupabaseAuthStorage(resolveAuthStorage);

import type { SessionStatePort } from '../contracts/session-state';

interface SessionStorageAccess {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createWebSessionStatePort(
  getStorage: () => SessionStorageAccess | null = () => typeof window === 'undefined' ? null : window.sessionStorage,
): SessionStatePort {
  return {
    read(key) {
      try { return getStorage()?.getItem(key) ?? null; } catch { return null; }
    },
    write(key, value) {
      try { getStorage()?.setItem(key, value); } catch { /* View restoration is optional. */ }
    },
  };
}

export const webSessionState = createWebSessionStatePort();

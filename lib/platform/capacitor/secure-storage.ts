import type { SecureStoragePort } from '../contracts/secure-storage';

export type NativeAuthStorageBridge = {
  get(options: { key: string }): Promise<{ value: unknown }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
};
export type AuthStorageDeadline = (callback: () => void, milliseconds: number) => () => void;
const defaultDeadline: AuthStorageDeadline = (callback, milliseconds) => {
  const timer = setTimeout(callback, milliseconds);
  return () => clearTimeout(timer);
};
const validKey = (key: string) => typeof key === 'string' && key.length <= 512
  && !/[^A-Za-z0-9_-]/.test(key)
  && /^sb-[A-Za-z0-9_-]+-auth-token(?:-(?:code-verifier|user))?$/.test(key);
const validValue = (value: unknown): value is string => typeof value === 'string'
  && new TextEncoder().encode(value).length <= 262_144;

/** No caching or fallback. A timed-out mutation has an unknown result until restart. */
export function createNativeAuthStorage(
  bridge: NativeAuthStorageBridge,
  options: { timeoutMs?: number; scheduleDeadline?: AuthStorageDeadline } = {},
): SecureStoragePort {
  const timeoutMs = options.timeoutMs ?? 5_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new Error('native_auth_timeout_invalid');
  }
  let tail: Promise<unknown> = Promise.resolve();
  let timedOut = false;
  const schedule = options.scheduleDeadline ?? defaultDeadline;
  function run<T>(key: string, code: string, operation: () => Promise<T>): Promise<T> {
    if (!validKey(key)) return Promise.reject(new Error('native_auth_key_invalid'));
    const result = tail.then(() => {
      if (timedOut) throw new Error('native_auth_storage_unavailable');
      return new Promise<T>((resolve, reject) => {
        let settled = false;
        let cancel = () => {};
        cancel = schedule(() => {
          settled = true;
          timedOut = true;
          cancel();
          reject(new Error('native_auth_operation_timeout'));
        }, timeoutMs);
        void Promise.resolve().then(operation).then(value => {
          if (settled) return;
          settled = true; cancel(); resolve(value);
        }, () => {
          if (settled) return;
          settled = true; cancel(); reject(new Error(code));
        });
      });
    });
    tail = result.catch(() => {});
    return result;
  }
  return Object.freeze({
    getItem: (key: string) => run(key, 'native_auth_read_failed', async () => {
      const result = await bridge.get({ key });
      if (result?.value === null) return null;
      if (!validValue(result?.value)) throw new Error('invalid_native_result');
      return result.value;
    }),
    setItem(key: string, value: string) {
      if (!validValue(value)) return Promise.reject(new Error('native_auth_value_invalid'));
      return run(key, 'native_auth_write_failed', () => bridge.set({ key, value }));
    },
    removeItem: (key: string) => run(key, 'native_auth_remove_failed', () => bridge.remove({ key })),
  });
}

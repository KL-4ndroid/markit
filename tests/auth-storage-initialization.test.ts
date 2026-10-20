import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { createAuthStorageResolver } from '../lib/platform/auth-storage-resolver';
import { createNativeAuthStorage } from '../lib/platform/capacitor/secure-storage';
import { createSupabaseAuthStorage } from '../lib/supabase/auth-storage-bridge';
import type { SecureStoragePort } from '../lib/platform/contracts/secure-storage';

const key = 'sb-fixture-auth-token';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const tick = async () => { for (let i = 0; i < 24; i += 1) await Promise.resolve(); };
const forbiddenWeb = (): SecureStoragePort => { throw new Error('Web storage must not be selected'); };
const noDeadline = () => () => {};

async function main() {
  {
    const loaded = deferred<SecureStoragePort>();
    const events: string[] = [];
    let loads = 0;
    const resolve = createAuthStorageResolver({
      runtime: () => 'ios', webStorage: forbiddenWeb,
      loadIosStorage() { loads += 1; return loaded.promise; },
    });
    const storage = createSupabaseAuthStorage(resolve);
    const session = JSON.stringify({
      access_token: 'fixture-not-a-real-token', refresh_token: 'fixture-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 86_400, expires_in: 86_400,
      token_type: 'bearer', user: { id: 'fixture-owner', aud: 'authenticated' },
    });
    let fetches = 0;
    const client = createClient('https://fixture.supabase.invalid', 'fixture-key', {
      auth: { storage, storageKey: key, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: async () => { fetches += 1; throw new Error('network forbidden'); } },
    });
    const result = client.auth.getSession();
    const parallel = storage.getItem(key + '-code-verifier');
    await tick();
    assert.equal(loads, 1, 'eager SDK initialization and concurrent calls share native setup');
    assert.deepEqual(events, [], 'SDK cannot read any credentials before native loading');
    loaded.resolve(createNativeAuthStorage({
      async get({ key: readKey }) { events.push('get'); return { value: readKey === key ? session : null }; },
      async set() { events.push('set'); }, async remove() { events.push('remove'); },
    }));
    assert.equal(await parallel, null);
    assert.equal((await result).data.session?.user.id, 'fixture-owner');
    assert.ok(events.length > 0 && events.every(event => event === 'get'));
    assert.equal(fetches, 0);
    await client.auth.stopAutoRefresh();
  }
  for (const runtime of ['android', 'unsupported'] as const) {
    const resolve = createAuthStorageResolver({ runtime: () => runtime, webStorage: forbiddenWeb,
      loadIosStorage: async () => { throw new Error('must not load'); } });
    await assert.rejects(resolve(), { message: 'native_auth_storage_unavailable' });
  }
  {
    let loads = 0;
    const resolve = createAuthStorageResolver({ runtime: () => 'ios', webStorage: forbiddenWeb,
      async loadIosStorage() { loads += 1; throw new Error('private native loader error'); } });
    const storage = createSupabaseAuthStorage(resolve);
    for (const action of [() => storage.getItem(key), () => storage.setItem(key, 'fixture'), () => storage.removeItem(key)]) {
      await assert.rejects(action(), { message: 'native_auth_storage_unavailable' });
    }
    assert.equal(loads, 1, 'failed native bootstrap is not automatically retried');
  }
  {
    const loaded = deferred<SecureStoragePort>();
    let timeout!: () => void;
    const resolve = createAuthStorageResolver({ runtime: () => 'ios', webStorage: forbiddenWeb,
      loadIosStorage: () => loaded.promise,
      scheduleDeadline(callback) { timeout = callback; return () => {}; } });
    const failure = assert.rejects(resolve(), /native_auth_storage_unavailable/);
    await tick(); timeout(); await failure;
    loaded.resolve({ getItem: async () => 'late', setItem: async () => {}, removeItem: async () => {} });
    await tick();
    await assert.rejects(resolve(), /native_auth_storage_unavailable/);
  }
  // Real SDK failure handling must not convert a Keychain access error into deletion.
  {
    let removals = 0;
    let writes = 0;
    const stored = new Map([[key, 'keep-existing-session']]);
    const native = createNativeAuthStorage({
      async get() { throw new Error('private locked keychain'); },
      async set({ key, value }) { writes += 1; stored.set(key, value); },
      async remove({ key }) { removals += 1; stored.delete(key); },
    });
    const storage = createSupabaseAuthStorage(createAuthStorageResolver({
      runtime: () => 'ios', webStorage: forbiddenWeb, loadIosStorage: async () => native,
      scheduleDeadline: noDeadline,
    }));
    const errors: unknown[] = [];
    const originalError = console.error;
    console.error = (...items) => { errors.push(...items); };
    try {
      const client = createClient('https://fixture.supabase.invalid', 'fixture-key', {
        auth: { storage, storageKey: key, autoRefreshToken: false, detectSessionInUrl: false },
        global: { fetch: async () => { throw new Error('network forbidden'); } },
      });
      const events: string[] = [];
      const subscription = client.auth.onAuthStateChange(event => { events.push(event); });
      await assert.rejects(client.auth.getSession(), /native_auth_read_failed/);
      await new Promise<void>(resolve => setImmediate(resolve));
      assert.ok(!events.includes('SIGNED_OUT'), 'storage failure must not synthesize sign-out');
      subscription.data.subscription.unsubscribe();
      await client.auth.stopAutoRefresh();
    } finally { console.error = originalError; }
    assert.equal(removals, 0); assert.equal(writes, 0);
    assert.equal(stored.get(key), 'keep-existing-session');
    assert.doesNotMatch(errors.map(String).join(' '), /private locked/);
  }
  {
    let current: SecureStoragePort = { getItem: async () => 'first', setItem: async () => {}, removeItem: async () => {} };
    const resolve = createAuthStorageResolver({ runtime: () => 'web', webStorage: () => current,
      loadIosStorage: async () => { throw new Error('must not load on Web'); } });
    assert.equal(await (await resolve()).getItem('any-web-key'), 'first');
    current = { ...current, getItem: async () => 'second' };
    assert.equal(await (await resolve()).getItem('any-web-key'), 'second');
  }
  console.log('PASS real Supabase eager initialization waits for native storage and never falls back or deletes on read failure');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNativeAuthStorage, type NativeAuthStorageBridge } from '../lib/platform/capacitor/secure-storage';

const key = 'sb-fixture-auth-token';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = async () => { for (let i = 0; i < 16; i += 1) await Promise.resolve(); };
function fixture() {
  const values = new Map<string, string>();
  const calls: string[] = [];
  const bridge: NativeAuthStorageBridge = {
    async get({ key }) { calls.push('get'); return { value: values.get(key) ?? null }; },
    async set({ key, value }) { calls.push('set'); values.set(key, value); },
    async remove({ key }) { calls.push('remove'); values.delete(key); },
  };
  const deadlines = new Set<() => void>();
  const options = {
    scheduleDeadline(callback: () => void, milliseconds: number) {
      assert.equal(milliseconds, 5_000);
      deadlines.add(callback);
      return () => { deadlines.delete(callback); };
    },
  };
  return { values, calls, bridge, options, deadlines };
}

async function main() {
  {
    const f = fixture();
    const storage = createNativeAuthStorage(f.bridge, f.options);
    assert.equal(await storage.getItem(key), null);
    const raw = '{"fixture":"登入憑證","number":123}';
    await storage.setItem(key, raw);
    assert.equal(await storage.getItem(key), raw, 'raw auth strings must round-trip without JSON wrapping');
    for (const suffix of ['-code-verifier', '-user']) {
      await storage.setItem(key + suffix, raw);
      assert.equal(await storage.getItem(key + suffix), raw);
    }
    await storage.removeItem(key);
    await storage.removeItem(key);
    assert.equal(await storage.getItem(key), null);
    assert.equal(f.values.size, 2, 'logout removes only its requested key');
    assert.equal(f.deadlines.size, 0);
    const before = f.calls.length;
    for (const invalid of ['', 'remembered_email', 'sb-fixture', key + '-other', key + '\n', 'sb-' + 'x'.repeat(600) + '-auth-token']) {
      await assert.rejects(storage.getItem(invalid), /native_auth_key_invalid/);
      await assert.rejects(storage.removeItem(invalid), /native_auth_key_invalid/);
    }
    await assert.rejects(storage.setItem(key, '中'.repeat(90_000)), /native_auth_value_invalid/);
    assert.equal(f.calls.length, before, 'invalid operations must never reach native storage');
  }
  {
    const f = fixture();
    const firstWrite = deferred<void>();
    const original = f.bridge.set;
    f.bridge.set = async input => { f.calls.push('set-start'); await firstWrite.promise; await original(input); };
    const storage = createNativeAuthStorage(f.bridge, f.options);
    const write = storage.setItem(key, 'fixture-token');
    const remove = storage.removeItem(key);
    const read = storage.getItem(key);
    await tick();
    assert.deepEqual(f.calls, ['set-start']);
    firstWrite.resolve();
    await Promise.all([write, remove]);
    assert.equal(await read, null, 'logout must follow the pending write, not race it');
    assert.deepEqual(f.calls, ['set-start', 'set', 'remove', 'get']);
  }
  {
    const f = fixture();
    f.values.set(key, 'keep-existing-session');
    f.bridge.get = async () => { throw new Error('private OSStatus, key and token'); };
    const storage = createNativeAuthStorage(f.bridge, f.options);
    await assert.rejects(storage.getItem(key), { message: 'native_auth_read_failed' });
    assert.equal(f.values.get(key), 'keep-existing-session');
    assert.deepEqual(f.calls, []);
    f.bridge.get = async () => ({ value: false });
    await assert.rejects(storage.getItem(key), { message: 'native_auth_read_failed' });
    f.bridge.set = async () => { throw new Error('private write'); };
    f.bridge.remove = async () => { throw new Error('private deletion'); };
    await assert.rejects(storage.setItem(key, 'fixture'), { message: 'native_auth_write_failed' });
    await assert.rejects(storage.removeItem(key), { message: 'native_auth_remove_failed' });
    assert.equal(f.values.get(key), 'keep-existing-session');
  }
  // An ambiguous timed-out write cannot be followed by a falsely successful logout.
  {
    const f = fixture();
    const lateWrite = deferred<void>();
    f.bridge.set = async () => { f.calls.push('set'); await lateWrite.promise; f.values.set(key, 'late'); };
    const storage = createNativeAuthStorage(f.bridge, f.options);
    const write = assert.rejects(storage.setItem(key, 'late'), { message: 'native_auth_operation_timeout' });
    const remove = assert.rejects(storage.removeItem(key), { message: 'native_auth_storage_unavailable' });
    await tick();
    assert.equal(f.deadlines.size, 1);
    [...f.deadlines][0]();
    await Promise.all([write, remove]);
    lateWrite.resolve(); await tick();
    await assert.rejects(storage.getItem(key), { message: 'native_auth_storage_unavailable' });
    assert.deepEqual(f.calls, ['set']);
  }
  for (const timeoutMs of [0, 30_001, NaN]) {
    assert.throws(() => createNativeAuthStorage(fixture().bridge, { timeoutMs }), /native_auth_timeout_invalid/);
  }
  // These are source-policy checks, never evidence that Swift compiled or Keychain ran.
  const swift = readFileSync('plugins/feria-auth-storage/ios/Sources/FeriaAuthStoragePlugin/FeriaAuthStoragePlugin.swift', 'utf8');
  assert.match(swift, /kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly/);
  assert.match(swift, /kSecAttrSynchronizable as String: false/);
  assert.match(swift, /kSecAttrService as String: service/);
  assert.match(swift, /status == errSecItemNotFound/);
  assert.match(swift, /DispatchQueue\(label: "feria.auth.keychain"\)/);
  assert.doesNotMatch(swift, /UserDefaults|print\(|NSLog|accessGroup|removeAll|synchronizable.*true/);
  console.log('PASS native auth storage preserves raw values, orders writes/logout and fails closed on errors/timeouts');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { installSecureStorage } from '../lib/platform/secure-storage-capability';
import { supabaseAuthStorage } from '../lib/supabase/auth-storage-bridge';

const projectRoot = join(__dirname, '..');
const readProjectFile = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

console.log('\n=== Platform secure storage boundary ===');

async function main(): Promise<void> {
  const values = new Map<string, string>();
  const calls: string[] = [];
  const restore = installSecureStorage({
    async getItem(key) {
      calls.push(`get:${key}`);
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      calls.push(`set:${key}`);
      values.set(key, value);
    },
    async removeItem(key) {
      calls.push(`remove:${key}`);
      values.delete(key);
    },
  });

  try {
    await supabaseAuthStorage.setItem('sb-session', 'token');
    assert.equal(await supabaseAuthStorage.getItem('sb-session'), 'token');
    await supabaseAuthStorage.removeItem('sb-session');
    assert.equal(await supabaseAuthStorage.getItem('sb-session'), null);
  } finally {
    restore();
  }

  assert.deepEqual(calls, [
    'set:sb-session',
    'get:sb-session',
    'remove:sb-session',
    'get:sb-session',
  ]);
  console.log('PASS Supabase bridge resolves the active async secure storage port');

  for (const path of ['lib/supabase/client.ts', 'lib/supabase/staff-typed-client.ts']) {
    const source = readProjectFile(path);
    assert.match(source, /storage: supabaseAuthStorage/);
    assert.match(source, /persistSession: true/);
    assert.match(source, /autoRefreshToken: true/);
  }
  console.log('PASS browser and typed Supabase clients share the platform auth bridge');

  const bridgeSource = readProjectFile('lib/supabase/auth-storage-bridge.ts');
  assert.doesNotMatch(bridgeSource, /localStorage|sessionStorage|@capacitor|Keychain/);

  const loginSource = readProjectFile('components/auth/LoginModal.tsx');
  assert.match(loginSource, /remembered_email/);
  assert.doesNotMatch(loginSource, /getSecureStorage|supabaseAuthStorage/);
  console.log('PASS preferences and ephemeral invitation state remain outside Keychain storage');
}

void main();

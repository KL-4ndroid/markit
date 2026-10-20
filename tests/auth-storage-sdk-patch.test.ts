import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

async function main() {
  const { patchInitialAuthSubscription, REVIEWED_AUTH_VERSION } = await import('../scripts/patch-supabase-auth-initial-session.mjs');
  for (const path of ['dist/main/GoTrueClient.js', 'dist/module/GoTrueClient.js']) {
    const patched = readFileSync('node_modules/@supabase/auth-js/' + path, 'utf8');
    assert.equal(patchInitialAuthSubscription(patched, REVIEWED_AUTH_VERSION), patched);
    assert.match(patched, /void this\._emitInitialSession\(id\)\.catch/);
    assert.match(patched, /initial subscription unavailable/);
    assert.throws(() => patchInitialAuthSubscription(patched, 'unreviewed-version'), /version_review_required/);
  }
  assert.throws(() => patchInitialAuthSubscription('different upstream implementation', REVIEWED_AUTH_VERSION), /source_review_required/);
  const check = spawnSync(process.execPath, ['scripts/patch-supabase-auth-initial-session.mjs', '--check'],
    { encoding: 'utf8', windowsHide: true });
  assert.equal(check.status, 0, check.stderr);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts.postinstall, 'node scripts/patch-supabase-auth-initial-session.mjs');
  console.log('PASS versioned auth subscription patch is applied to both runtime entry points and rejects unreviewed updates');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

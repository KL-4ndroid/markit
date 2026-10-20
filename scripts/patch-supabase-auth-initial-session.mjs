import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REVIEWED_AUTH_VERSION = '2.106.1';
const before = `            await this._acquireLock(this.lockAcquireTimeout, async () => {
                this._emitInitialSession(id);
            });
        })();
        return { data: { subscription } };`;
const after = `            await this._acquireLock(this.lockAcquireTimeout, async () => {
                // Feria: keep storage errors inside the initial subscription task.
                void this._emitInitialSession(id).catch(error => {
                    this._debug('#onAuthStateChange()', 'initial session unavailable', error);
                });
            });
        })().catch(error => {
            this._debug('#onAuthStateChange()', 'initial subscription unavailable', error);
        });
        return { data: { subscription } };`;

/** Versioned compatibility patch. Preserve event timing and never synthesize sign-out. */
export function patchInitialAuthSubscription(source, version) {
  if (version !== REVIEWED_AUTH_VERSION) throw new Error('auth_patch_version_review_required');
  const text = source.replace(/\r\n/g, '\n');
  if (text.split(after).length === 2 && !text.includes(before)) return text;
  if (text.split(before).length !== 2 || text.includes('Feria: keep storage errors')) {
    throw new Error('auth_patch_source_review_required');
  }
  return text.replace(before, after);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('auth_patch_argument_invalid');
  }
  const root = resolve('node_modules/@supabase/auth-js');
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  // Validate both entry points before changing either one.
  const files = ['dist/main/GoTrueClient.js', 'dist/module/GoTrueClient.js'].map(path => {
    const file = join(root, path);
    const original = readFileSync(file, 'utf8');
    return { file, original, patched: patchInitialAuthSubscription(original, version) };
  });
  if (args[0] === '--check') {
    if (files.some(file => file.original.replace(/\r\n/g, '\n') !== file.patched)) {
      throw new Error('auth_patch_not_applied');
    }
  } else {
    for (const file of files) {
      if (file.original !== file.patched) writeFileSync(file.file, file.patched, 'utf8');
    }
  }
  console.log('PASS reviewed Supabase initial-subscription error compatibility patch');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (error) {
    console.error(error instanceof Error ? error.message : 'auth_patch_failed');
    process.exitCode = 1;
  }
}

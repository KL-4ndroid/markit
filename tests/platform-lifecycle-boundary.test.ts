import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getLifecyclePort, installLifecyclePort } from '../lib/platform/lifecycle-capability';

const projectRoot = join(__dirname, '..');
const readProjectFile = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

console.log('\n=== Platform lifecycle boundary ===');

assert.equal(typeof getLifecyclePort().getCurrentState, 'function');
assert.equal(typeof getLifecyclePort().subscribe, 'function');

const restore = installLifecyclePort({
  getCurrentState: () => 'background',
  subscribe: () => () => undefined,
});
assert.equal(getLifecyclePort().getCurrentState(), 'background');
restore();
console.log('PASS lifecycle implementations can be installed and restored');

const syncSource = readProjectFile('hooks/useSync.ts');
assert.match(syncSource, /getLifecyclePort\(\)\.getCurrentState\(\) !== 'active'/);
assert.match(syncSource, /getLifecyclePort\(\)\.subscribe/);
assert.match(syncSource, /lifecycleState === 'active'[\s\S]*throttledSyncFnRef/);
assert.doesNotMatch(syncSource, /visibilityState|visibilitychange/);
console.log('PASS sync pauses new work in background and retries after foreground');

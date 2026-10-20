import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getNetworkPort, installNetworkPort } from '../lib/platform/network-capability';
import type { NetworkStatus } from '../lib/platform/contracts/network';

const projectRoot = join(__dirname, '..');
const readProjectFile = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

console.log('\n=== Platform network boundary ===');

assert.equal(typeof getNetworkPort().getCurrentStatus, 'function');
assert.equal(typeof getNetworkPort().subscribe, 'function');
console.log('PASS Web provides current network state and change subscription');

let listener: ((status: NetworkStatus) => void) | null = null;
let unsubscribed = false;
const restore = installNetworkPort({
  getCurrentStatus: () => ({ connected: false, connectionType: 'none' }),
  subscribe(nextListener) {
    listener = nextListener;
    return () => {
      unsubscribed = true;
    };
  },
});

assert.equal(getNetworkPort().getCurrentStatus().connected, false);
const unsubscribe = getNetworkPort().subscribe(() => undefined);
assert.equal(typeof listener, 'function');
unsubscribe();
assert.equal(unsubscribed, true);
restore();
console.log('PASS native and test network implementations can be installed and restored');

const syncSource = readProjectFile('hooks/useSync.ts');
const migratedSources = [
  syncSource,
  readProjectFile('components/auth/OfflineBanner.tsx'),
  readProjectFile('components/auth/AuthGuard.tsx'),
  readProjectFile('app/join/page.tsx'),
  readProjectFile('lib/sync/local-pending-write-report.ts'),
];
for (const source of migratedSources) {
  assert.match(source, /getNetworkPort/);
  assert.doesNotMatch(source, /navigator\.onLine|addEventListener\('online'|addEventListener\('offline'/);
}
assert.match(syncSource, /network\.subscribe/);
assert.match(syncSource, /status\.connected[\s\S]*throttledSyncFnRef/);
console.log('PASS sync core and offline UI consume NetworkPort instead of browser events');

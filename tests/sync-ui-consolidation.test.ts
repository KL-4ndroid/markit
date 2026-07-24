import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const appChrome = read('components/AppChrome.tsx');
const overlayHost = read('components/global-overlays/GlobalOverlayHost.tsx');
const indicator = read('components/common/SyncStatusIndicator.tsx');
const syncContext = read('lib/sync-context.tsx');

assert.match(appChrome, /<GlobalOverlayHost \/>/);
assert.match(overlayHost, /InitialSyncDialog/);
assert.doesNotMatch(appChrome, /SyncProgressManager/);
assert.doesNotMatch(indicator, /showLargeDialog|fixed inset-0|SyncProgressDialog/);
assert.doesNotMatch(indicator, /console\.(log|debug|info)/);
assert.match(indicator, /資料已先保存在這台裝置/);
assert.match(indicator, /h-11 w-11/);
assert.match(syncContext, /const contextValue = useMemo<SyncContextType>/);
assert.match(syncContext, /\[infoLevel, isDataSanitized, syncState\]/);

console.log('PASS consolidated non-blocking sync UI');

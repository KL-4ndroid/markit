import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  MARKET_DETAIL_TRANSITION_TTL_MS,
  beginMarketDetailTransition,
  clearMarketDetailTransition,
  completeMarketDetailTransition,
  readLastMarketDetailTransitionMeasurement,
  readMarketDetailTransition,
} from '../lib/navigation/market-detail-transition';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

clearMarketDetailTransition();
const snapshot = beginMarketDetailTransition({
  marketId: 'market-1',
  actorId: 'user-1',
  name: 'Weekend Market',
  dateRangeLabel: '2026/8/10~12',
  location: 'Taipei',
}, 1_000);

assert.ok(snapshot);
assert.equal(readMarketDetailTransition('market-1', 'user-1', 1_200)?.name, 'Weekend Market');
assert.equal(readMarketDetailTransition('market-1', 'different-user', 1_200), null);

beginMarketDetailTransition({
  marketId: 'market-1',
  actorId: 'user-1',
  name: 'Weekend Market',
  dateRangeLabel: '2026/8/10~12',
  location: 'Taipei',
}, 2_000);
assert.equal(
  readMarketDetailTransition('market-1', 'user-1', 2_000 + MARKET_DETAIL_TRANSITION_TTL_MS),
  null,
  'expired display snapshots must fail closed',
);

beginMarketDetailTransition({
  marketId: 'market-1',
  actorId: 'user-1',
  name: 'Weekend Market',
  dateRangeLabel: '2026/8/10~12',
  location: 'Taipei',
}, 4_000);
assert.deepEqual(completeMarketDetailTransition('market-1', 'user-1', 5_550), {
  marketId: 'market-1',
  durationMs: 1_550,
});
assert.deepEqual(readLastMarketDetailTransitionMeasurement(), {
  marketId: 'market-1',
  durationMs: 1_550,
});
assert.equal(readMarketDetailTransition('market-1', 'user-1', 5_600), null);
assert.equal(beginMarketDetailTransition({
  marketId: '', actorId: 'user-1', name: 'Invalid', dateRangeLabel: '', location: '',
}), null);

const marketsPage = read('app/markets/page.tsx');
const detailPage = read('app/markets/detail/page.tsx');
const detailLoading = read('app/markets/detail/loading.tsx');
const detailScreen = read('components/markets/MarketDetailScreen.tsx');
const loadingShell = read('components/markets/MarketDetailLoadingShell.tsx');
const roleLoadingFallback = read('components/auth/RoleLoadingFallback.tsx');

assert.match(marketsPage, /beginMarketDetailTransition/);
assert.match(marketsPage, /flushSync\(\(\) => \{/);
assert.match(marketsPage, /<MarketDetailLoadingShell snapshot=\{openingMarketSnapshot\}/);
assert.match(detailPage, /fallback=\{<MarketDetailLoadingShell \/>\}/);
assert.match(detailLoading, /<MarketDetailLoadingShell \/>/);
assert.match(detailScreen, /readMarketDetailTransition\(marketId, user\?\.id \?\? ''\)/);
assert.match(detailScreen, /completeMarketDetailTransition\(marketId, user\.id\)/);
assert.match(detailScreen, /if \(!isMounted \|\| isDetailLoading\)/);
assert.match(loadingShell, /aria-label="正在開啟市集"/);
assert.match(roleLoadingFallback, /pathname\?\.startsWith\('\/markets\/detail'\)/);
assert.match(roleLoadingFallback, /return <MarketDetailLoadingShell \/>/);
assert.doesNotMatch(read('lib/navigation/market-detail-transition.ts'), /window|document|localStorage|sessionStorage|indexedDB|@capacitor/i);

console.log('PASS market detail transition continuity contracts');

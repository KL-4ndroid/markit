import assert from 'node:assert/strict';
import {
  selectMarketDetailSource,
  shouldShowMarketDetailLoading,
} from '../lib/markets/detail-loading';

const localMarket = { id: 'local-market', name: 'Local Market' };
const supabaseMarket = { id: 'remote-market', name: 'Remote Market' };

assert.equal(
  selectMarketDetailSource(supabaseMarket, localMarket),
  supabaseMarket,
  'Supabase market should win when both sources are available'
);

assert.equal(
  selectMarketDetailSource(null, localMarket),
  localMarket,
  'Local market should be used when Supabase has no matching market'
);

assert.equal(
  shouldShowMarketDetailLoading({
    isInitialized: true,
    localLookupComplete: true,
    hasUser: true,
    hasMarket: true,
    hasTriedSupabaseFallback: false,
    isLoadingSupabase: false,
  }),
  false,
  'A locally available market must not be blocked by pending Supabase fallback state'
);

assert.equal(
  shouldShowMarketDetailLoading({
    isInitialized: true,
    localLookupComplete: false,
    hasUser: false,
    hasMarket: false,
    hasTriedSupabaseFallback: false,
    isLoadingSupabase: false,
  }),
  true,
  'Detail page should wait until the direct local lookup completes before showing not-found'
);

assert.equal(
  shouldShowMarketDetailLoading({
    isInitialized: true,
    localLookupComplete: true,
    hasUser: true,
    hasMarket: false,
    hasTriedSupabaseFallback: false,
    isLoadingSupabase: false,
  }),
  true,
  'Authenticated users should get a remote fallback attempt before not-found'
);

assert.equal(
  shouldShowMarketDetailLoading({
    isInitialized: true,
    localLookupComplete: true,
    hasUser: true,
    hasMarket: false,
    hasTriedSupabaseFallback: true,
    isLoadingSupabase: false,
  }),
  false,
  'After local and remote lookup have both failed, the page may show not-found'
);

console.log('PASS market detail loading fallback regression');

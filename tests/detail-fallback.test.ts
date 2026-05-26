import assert from 'node:assert/strict';
import {
  shouldTrySupabaseFallback,
  selectMarketDetailRecord,
  isBlankMarketId,
  resolveMarketDetailFoundState,
  type MarketFallbackContext,
} from '../lib/markets/detail-fallback';
import type { Market } from '../types/db';

const LOCAL_MARKET = {
  id: 'local-1',
  name: 'Local Market',
  startDate: '2025-01-01',
  endDate: '2025-01-02',
  status: 'ongoing' as const,
  location: 'venue-a',
  createdAt: 0,
  updatedAt: 0,
};

const REMOTE_MARKET = {
  id: 'remote-1',
  name: 'Remote Market',
  startDate: '2025-02-01',
  endDate: '2025-02-02',
  status: 'completed' as const,
  location: 'venue-b',
  createdAt: 0,
  updatedAt: 0,
};

function makeCtx(overrides: Partial<MarketFallbackContext> = {}): MarketFallbackContext {
  return {
    hasLocalRecord: false,
    hasSupabaseRecord: false,
    isAuthenticated: false,
    isStaff: undefined,
    fallbackAttempted: false,
    hasTriedSupabaseFallback: false,
    ...overrides,
  };
}

// ─── shouldTrySupabaseFallback ────────────────────────────────────────────────

// Scenario 1: local record exists → do NOT block on Supabase fallback
assert.equal(
  shouldTrySupabaseFallback(makeCtx({ hasLocalRecord: true })).shouldTrySupabaseFallback,
  false,
  'local record: must not trigger fallback'
);
assert.equal(
  shouldTrySupabaseFallback(makeCtx({ hasLocalRecord: true })).reason,
  'local_record_exists',
  'local record: reason must be local_record_exists'
);

// Scenario 1 (variant): authenticated + local record still present → no fallback
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ hasLocalRecord: true, isAuthenticated: true, isStaff: false })
  ).shouldTrySupabaseFallback,
  false,
  'local record with authenticated user: must not trigger fallback'
);

// Scenario 2: no local record + authenticated + fallback not tried → should wait
// (i.e. shouldTrySupabaseFallback → true)
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: false })
  ).shouldTrySupabaseFallback,
  true,
  'no local record + authenticated non-staff: should trigger fallback'
);
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: false })
  ).reason,
  'fallback_conditions_met',
  'fallback_conditions_met must be the reason when conditions are met'
);

// Scenario 2 (variant): authenticated + staff → staff mode uses Supabase directly, no fallback needed
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: true })
  ).shouldTrySupabaseFallback,
  false,
  'staff with no local record: staff mode is active, no fallback needed'
);
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: true })
  ).reason,
  'staff_mode_active',
  'staff mode must return staff_mode_active'
);

// Scenario 3: fallback already attempted → no more fallback
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: false, fallbackAttempted: true })
  ).shouldTrySupabaseFallback,
  false,
  'fallback already attempted: must not trigger again'
);
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: false, fallbackAttempted: true })
  ).reason,
  'fallback_already_attempted'
);

assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: false, hasTriedSupabaseFallback: true })
  ).shouldTrySupabaseFallback,
  false,
  'hasTriedSupabaseFallback flag set: must not trigger again'
);
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: false, hasTriedSupabaseFallback: true })
  ).reason,
  'supabase_fallback_already_tried'
);

// Scenario 3: fallback tried and no market → allow not-found
// This is exercised via resolveMarketDetailFoundState
assert.equal(
  resolveMarketDetailFoundState({
    isInitialized: true,
    localLookupComplete: true,
    hasUser: true,
    hasMarket: false,
    hasTriedSupabaseFallback: true,
    isLoadingSupabase: false,
  }),
  'not_found',
  'after fallback tried and no market found: must allow not_found state'
);

// Scenario 4: blank market id → should not trigger fallback
// (no local record, unauthenticated → fallback should be false)
assert.equal(
  shouldTrySupabaseFallback(makeCtx()).shouldTrySupabaseFallback,
  false,
  'unauthenticated: must not trigger fallback regardless of market id'
);
assert.equal(
  shouldTrySupabaseFallback(makeCtx()).reason,
  'user_not_authenticated'
);

// Scenario 4 (explicit): blank ID context → staff status pending
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: undefined })
  ).shouldTrySupabaseFallback,
  false,
  'isStaff undefined: staff status pending, no fallback'
);
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: undefined })
  ).reason,
  'staff_status_pending'
);

// Scenario 4: supabase record already exists → no fallback needed
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ hasSupabaseRecord: true })
  ).shouldTrySupabaseFallback,
  false,
  'hasSupabaseRecord: no fallback needed'
);
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ hasSupabaseRecord: true })
  ).reason,
  'supabase_record_exists'
);

// ─── selectMarketDetailRecord ─────────────────────────────────────────────────

// Scenario 5: supabaseMarket takes priority over localMarket
assert.deepEqual(
  selectMarketDetailRecord(REMOTE_MARKET as Market, LOCAL_MARKET as Market),
  REMOTE_MARKET,
  'supabaseMarket must win over localMarket'
);

// Scenario 5 (variant): only supabase
assert.deepEqual(
  selectMarketDetailRecord(REMOTE_MARKET as Market, null),
  REMOTE_MARKET,
  'supabase-only: must return supabase record'
);
assert.deepEqual(
  selectMarketDetailRecord(REMOTE_MARKET as Market, undefined),
  REMOTE_MARKET,
  'supabase-only (undefined local): must return supabase record'
);

// Scenario 5 (variant): only local (supabase is null)
assert.deepEqual(
  selectMarketDetailRecord(null, LOCAL_MARKET as Market),
  LOCAL_MARKET,
  'local-only: must return local record when supabase is null'
);
assert.deepEqual(
  selectMarketDetailRecord(undefined, LOCAL_MARKET as Market),
  LOCAL_MARKET,
  'local-only (undefined supabase): must return local record'
);

// Scenario 5 (variant): both null/undefined
assert.equal(
  selectMarketDetailRecord(null, null),
  undefined,
  'both null: must return undefined'
);
assert.equal(
  selectMarketDetailRecord(undefined, undefined),
  undefined,
  'both undefined: must return undefined'
);

// ─── resolveMarketDetailFoundState ────────────────────────────────────────────

// Full happy path: market found → found
assert.equal(
  resolveMarketDetailFoundState({
    isInitialized: true,
    localLookupComplete: true,
    hasUser: false,
    hasMarket: true,
    hasTriedSupabaseFallback: false,
    isLoadingSupabase: false,
  }),
  'found',
  'market found: must be found'
);

// DB not initialized → loading
assert.equal(
  resolveMarketDetailFoundState({
    isInitialized: false,
    localLookupComplete: true,
    hasUser: false,
    hasMarket: false,
    hasTriedSupabaseFallback: false,
    isLoadingSupabase: false,
  }),
  'loading',
  'not initialized: must be loading'
);

// Local lookup not complete → loading
assert.equal(
  resolveMarketDetailFoundState({
    isInitialized: true,
    localLookupComplete: false,
    hasUser: false,
    hasMarket: false,
    hasTriedSupabaseFallback: false,
    isLoadingSupabase: false,
  }),
  'loading',
  'local lookup incomplete: must be loading'
);

// No market + unauthenticated → not_found immediately
assert.equal(
  resolveMarketDetailFoundState({
    isInitialized: true,
    localLookupComplete: true,
    hasUser: false,
    hasMarket: false,
    hasTriedSupabaseFallback: false,
    isLoadingSupabase: false,
  }),
  'not_found',
  'unauthenticated + no market + lookup complete: must be not_found'
);

// Supabase loading → loading (when no local market yet)
assert.equal(
  resolveMarketDetailFoundState({
    isInitialized: true,
    localLookupComplete: true,
    hasUser: false,
    hasMarket: false,
    hasTriedSupabaseFallback: false,
    isLoadingSupabase: true,
  }),
  'loading',
  'isLoadingSupabase with no market: must be loading'
);

// Supabase loading + market found → found (local market available, show immediately)
assert.equal(
  resolveMarketDetailFoundState({
    isInitialized: true,
    localLookupComplete: true,
    hasUser: false,
    hasMarket: true,
    hasTriedSupabaseFallback: false,
    isLoadingSupabase: true,
  }),
  'found',
  'market found while supabase loading: must be found'
);

// ─── isBlankMarketId ──────────────────────────────────────────────────────────

assert.equal(isBlankMarketId(null), true, 'null is blank');
assert.equal(isBlankMarketId(undefined), true, 'undefined is blank');
assert.equal(isBlankMarketId(''), true, 'empty string is blank');
assert.equal(isBlankMarketId('   '), true, 'whitespace is blank');
assert.equal(isBlankMarketId('  \n\t  '), true, 'whitespace with tabs/newlines is blank');
assert.equal(isBlankMarketId('market-123'), false, 'valid UUID-like id is not blank');
assert.equal(isBlankMarketId('0'), false, 'single digit 0 is not blank');

// ─── isDatabaseHealthy guard ───────────────────────────────────────────────────

// DB 不健康 → 不觸發 fallback（最優先檢查）
assert.equal(
  shouldTrySupabaseFallback(makeCtx({ isDatabaseHealthy: false })).shouldTrySupabaseFallback,
  false,
  'database unhealthy: must not trigger fallback'
);
assert.equal(
  shouldTrySupabaseFallback(makeCtx({ isDatabaseHealthy: false })).reason,
  'database_unhealthy',
  'database unhealthy: reason must be database_unhealthy'
);

// DB 不健康 + 已登入 + 無 local record → 仍然不觸發
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: false, isDatabaseHealthy: false })
  ).shouldTrySupabaseFallback,
  false,
  'database unhealthy + authenticated + no local record: must not trigger fallback'
);
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: false, isDatabaseHealthy: false })
  ).reason,
  'database_unhealthy',
  'reason must be database_unhealthy regardless of auth state'
);

// DB 健康（未傳 isDatabaseHealthy，預設）→ 行為不變
assert.equal(
  shouldTrySupabaseFallback(makeCtx()).shouldTrySupabaseFallback,
  false,
  'default (no isDatabaseHealthy): unauthenticated → no fallback'
);
assert.equal(
  shouldTrySupabaseFallback(
    makeCtx({ isAuthenticated: true, isStaff: false })
  ).shouldTrySupabaseFallback,
  true,
  'default (no isDatabaseHealthy): authenticated non-staff → should fallback'
);

console.log('PASS market detail fallback decisions');

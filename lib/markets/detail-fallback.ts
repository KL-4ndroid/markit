import type { Market } from '@/types/db';

export interface MarketFallbackContext {
  hasLocalRecord: boolean;
  hasSupabaseRecord: boolean;
  isAuthenticated: boolean;
  isStaff: boolean | undefined;
  fallbackAttempted: boolean;
  hasTriedSupabaseFallback: boolean;
  /** 若為 false，則不執行 Supabase fallback（DB 不健康時傳入） */
  isDatabaseHealthy?: boolean;
}

export interface MarketFallbackDecision {
  shouldTrySupabaseFallback: boolean;
  reason: string;
}

export function shouldTrySupabaseFallback(ctx: MarketFallbackContext): MarketFallbackDecision {
  if (ctx.isDatabaseHealthy === false) {
    return { shouldTrySupabaseFallback: false, reason: 'database_unhealthy' };
  }
  if (ctx.hasLocalRecord) {
    return { shouldTrySupabaseFallback: false, reason: 'local_record_exists' };
  }
  if (ctx.hasSupabaseRecord) {
    return { shouldTrySupabaseFallback: false, reason: 'supabase_record_exists' };
  }
  if (ctx.fallbackAttempted) {
    return { shouldTrySupabaseFallback: false, reason: 'fallback_already_attempted' };
  }
  if (ctx.hasTriedSupabaseFallback) {
    return { shouldTrySupabaseFallback: false, reason: 'supabase_fallback_already_tried' };
  }
  if (!ctx.isAuthenticated) {
    return { shouldTrySupabaseFallback: false, reason: 'user_not_authenticated' };
  }
  if (ctx.isStaff === undefined) {
    return { shouldTrySupabaseFallback: false, reason: 'staff_status_pending' };
  }
  if (ctx.isStaff) {
    return { shouldTrySupabaseFallback: false, reason: 'staff_mode_active' };
  }
  return { shouldTrySupabaseFallback: true, reason: 'fallback_conditions_met' };
}

export function selectMarketDetailRecord<TMarket extends Market>(
  supabaseMarket: TMarket | null | undefined,
  localMarket: TMarket | null | undefined
): TMarket | undefined {
  return supabaseMarket ?? localMarket ?? undefined;
}

export type MarketDetailFoundState = 'loading' | 'not_found' | 'found';

export interface MarketDetailLoadingInput {
  isInitialized: boolean;
  localLookupComplete: boolean;
  hasUser: boolean;
  hasMarket: boolean;
  hasTriedSupabaseFallback: boolean;
  isLoadingSupabase: boolean;
}

export function resolveMarketDetailFoundState(
  input: MarketDetailLoadingInput
): MarketDetailFoundState {
  const shouldWaitForRemoteFallback =
    input.hasUser &&
    !input.hasMarket &&
    input.localLookupComplete &&
    !input.hasTriedSupabaseFallback;

  const isLoading =
    !input.isInitialized ||
    !input.localLookupComplete ||
    shouldWaitForRemoteFallback ||
    (input.isLoadingSupabase && !input.hasMarket);

  if (isLoading) {
    return 'loading';
  }

  if (!input.hasMarket) {
    return 'not_found';
  }

  return 'found';
}

export function isBlankMarketId(marketId: string | null | undefined): boolean {
  if (marketId === null || marketId === undefined) return true;
  const trimmed = String(marketId).trim();
  return trimmed.length === 0;
}

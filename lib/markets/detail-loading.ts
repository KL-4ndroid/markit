export interface MarketDetailLoadingState {
  isInitialized: boolean;
  localLookupComplete: boolean;
  hasUser: boolean;
  hasMarket: boolean;
  hasTriedSupabaseFallback: boolean;
  isLoadingSupabase: boolean;
}

export type MarketRouteParam = string | string[] | null | undefined;

export function normalizeMarketRouteId(value: MarketRouteParam): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (typeof rawValue !== 'string') return undefined;

  const trimmedValue = rawValue.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

export function selectMarketDetailSource<TMarket>(
  supabaseMarket: TMarket | null | undefined,
  localMarket: TMarket | null | undefined
): TMarket | undefined {
  return supabaseMarket ?? localMarket ?? undefined;
}

export function shouldShowMarketDetailLoading(state: MarketDetailLoadingState): boolean {
  const shouldWaitForRemoteFallback =
    state.hasUser &&
    !state.hasMarket &&
    state.localLookupComplete &&
    !state.hasTriedSupabaseFallback;

  return (
    !state.isInitialized ||
    !state.localLookupComplete ||
    shouldWaitForRemoteFallback ||
    (state.isLoadingSupabase && !state.hasMarket)
  );
}

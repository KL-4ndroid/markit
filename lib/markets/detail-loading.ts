export interface MarketDetailLoadingState {
  isInitialized: boolean;
  localLookupComplete: boolean;
  hasUser: boolean;
  hasMarket: boolean;
  hasTriedSupabaseFallback: boolean;
  isLoadingSupabase: boolean;
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

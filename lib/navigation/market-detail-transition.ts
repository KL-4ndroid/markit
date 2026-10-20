export const MARKET_DETAIL_TRANSITION_TTL_MS = 15_000;

export interface MarketDetailTransitionSnapshot {
  marketId: string;
  actorId: string;
  name: string;
  dateRangeLabel: string;
  location: string;
  startedAt: number;
  expiresAt: number;
}

export interface MarketDetailTransitionMeasurement {
  marketId: string;
  durationMs: number;
}

type BeginMarketDetailTransitionInput = Omit<
  MarketDetailTransitionSnapshot,
  'startedAt' | 'expiresAt'
>;

let activeSnapshot: MarketDetailTransitionSnapshot | null = null;
let lastMeasurement: MarketDetailTransitionMeasurement | null = null;

function normalized(value: string): string {
  return value.trim();
}

export function beginMarketDetailTransition(
  input: BeginMarketDetailTransitionInput,
  now = Date.now(),
): MarketDetailTransitionSnapshot | null {
  const marketId = normalized(input.marketId);
  const actorId = normalized(input.actorId);
  const name = normalized(input.name);
  if (!marketId || !actorId || !name) {
    activeSnapshot = null;
    return null;
  }

  activeSnapshot = {
    marketId,
    actorId,
    name,
    dateRangeLabel: normalized(input.dateRangeLabel),
    location: normalized(input.location),
    startedAt: now,
    expiresAt: now + MARKET_DETAIL_TRANSITION_TTL_MS,
  };

  return { ...activeSnapshot };
}

export function readMarketDetailTransition(
  marketId: string,
  actorId: string,
  now = Date.now(),
): MarketDetailTransitionSnapshot | null {
  if (!activeSnapshot) return null;
  if (!normalized(marketId) || !normalized(actorId)) return null;

  if (
    activeSnapshot.marketId !== normalized(marketId) ||
    activeSnapshot.actorId !== normalized(actorId) ||
    activeSnapshot.expiresAt <= now
  ) {
    activeSnapshot = null;
    return null;
  }

  return { ...activeSnapshot };
}

export function completeMarketDetailTransition(
  marketId: string,
  actorId: string,
  now = Date.now(),
): MarketDetailTransitionMeasurement | null {
  const snapshot = readMarketDetailTransition(marketId, actorId, now);
  if (!snapshot) return null;

  activeSnapshot = null;
  lastMeasurement = {
    marketId: snapshot.marketId,
    durationMs: Math.max(0, now - snapshot.startedAt),
  };
  return { ...lastMeasurement };
}

export function readLastMarketDetailTransitionMeasurement(): MarketDetailTransitionMeasurement | null {
  return lastMeasurement ? { ...lastMeasurement } : null;
}

export function clearMarketDetailTransition(): void {
  activeSnapshot = null;
}

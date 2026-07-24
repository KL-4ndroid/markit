export interface MarketInteractionSummary {
  totalCount: number;
  countByType: Readonly<Record<string, number>>;
}

export function buildMarketInteractionSummary(
  interactionTypes: readonly (string | null | undefined)[]
): MarketInteractionSummary {
  const countByType: Record<string, number> = {};

  for (const interactionType of interactionTypes) {
    if (!interactionType) continue;
    countByType[interactionType] = (countByType[interactionType] ?? 0) + 1;
  }

  return {
    totalCount: Object.values(countByType).reduce((total, count) => total + count, 0),
    countByType,
  };
}

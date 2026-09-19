export type MarketDetailRouteOptions = {
  task?: string | null;
};

export function buildMarketDetailHref(
  marketId: string,
  options: MarketDetailRouteOptions = {}
): string {
  const normalizedMarketId = marketId.trim();
  if (!normalizedMarketId) {
    throw new Error('Market detail route requires a market ID.');
  }

  const searchParams = new URLSearchParams({ id: normalizedMarketId });
  const task = options.task?.trim();
  if (task) searchParams.set('task', task);

  return `/markets/detail/?${searchParams.toString()}`;
}

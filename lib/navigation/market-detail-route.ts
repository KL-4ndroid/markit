export type MarketDetailRouteOptions = {
  task?: string | null;
  returnTo?: string | null;
};

const RETURN_DESTINATIONS = {
  today: { href: '/', label: '返回今日' },
  markets: { href: '/markets', label: '返回市集' },
  journals: { href: '/markets/journals', label: '返回心得' },
  records: { href: '/analytics', label: '返回營業紀錄' },
  analytics: { href: '/analytics', label: '返回分析' },
  account: { href: '/settings/account', label: '返回帳號' },
} as const;

function returnDestinationKey(value?: string | null): keyof typeof RETURN_DESTINATIONS {
  return value && Object.prototype.hasOwnProperty.call(RETURN_DESTINATIONS, value)
    ? value as keyof typeof RETURN_DESTINATIONS : 'markets';
}

/** Internal destinations only; never navigate to an arbitrary return URL or browser history. */
export function resolveMarketDetailReturn(value?: string | null) {
  return RETURN_DESTINATIONS[returnDestinationKey(value)];
}

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
  if (options.returnTo) searchParams.set('returnTo', returnDestinationKey(options.returnTo));

  return `/markets/detail/?${searchParams.toString()}`;
}

export function buildMarketJournalsHref(marketId?: string, returnTo?: string | null): string {
  if (!marketId?.trim()) return '/markets/journals';
  const params = new URLSearchParams({ fromMarket: marketId.trim(), marketReturnTo: returnDestinationKey(returnTo) });
  return `/markets/journals?${params.toString()}`;
}

export function resolveMarketJournalsReturn(marketId?: string | null, returnTo?: string | null) {
  return marketId?.trim()
    ? { href: buildMarketDetailHref(marketId, { task: 'journal', returnTo }), label: '返回原市集心得' }
    : RETURN_DESTINATIONS.markets;
}

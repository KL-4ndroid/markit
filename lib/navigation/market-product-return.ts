import { buildMarketDetailHref, resolveMarketDetailReturn } from './market-detail-route';

export interface MarketProductOrigin { fromMarket?: string | null; marketReturnTo?: string | null }

export function marketProductOriginParams(origin: MarketProductOrigin): URLSearchParams {
  const params = new URLSearchParams();
  const id = origin.fromMarket?.trim();
  // Accept an ID, never a URL or arbitrary navigation destination.
  if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return params;
  params.set('fromMarket', id);
  const destination = resolveMarketDetailReturn(origin.marketReturnTo);
  const key = destination.href === '/' ? 'today' : destination.href === '/markets/journals' ? 'journals'
    : destination.href === '/analytics' ? (origin.marketReturnTo === 'records' ? 'records' : 'analytics') : destination.href === '/settings/account' ? 'account' : 'markets';
  params.set('marketReturnTo', key);
  return params;
}

export function buildProductManagementHref(origin: MarketProductOrigin): string {
  const params = marketProductOriginParams(origin).toString();
  return params ? `/products?${params}` : '/products';
}

export function resolveProductMarketReturn(origin: MarketProductOrigin) {
  const params = marketProductOriginParams(origin);
  const id = params.get('fromMarket');
  return id ? { label: '返回原場次銷售', href: buildMarketDetailHref(id, {
    task: 'products', returnTo: params.get('marketReturnTo'),
  }) } : null;
}

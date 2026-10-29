import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';
import { buildProductDetailHref } from '@/lib/navigation/product-detail-route';
import type { SettlementReportKind } from './settlement-report';

export type ReportPeriodSelection = { kind: SettlementReportKind; startDate: string; endDate: string };
type Search = Pick<URLSearchParams, 'get'>;
export type ReportReaderView = { markets: number; products: number; sort: 'date'|'revenue'|'daily'|'profit'; focusMarket?: string; focusProduct?: string };
export function readReportReaderView(search: Search): ReportReaderView {
  const count = (value: string|null) => value && /^\d+$/.test(value) ? Math.max(5,Math.min(100000,Number(value))) : 5;
  const sort = search.get('sort');
  const id = (value: string|null) => value && value.length <= 200 ? value : undefined;
  return {markets:count(search.get('markets')),products:count(search.get('products')),sort:sort === 'revenue'||sort === 'daily'||sort === 'profit' ? sort : 'date',focusMarket:id(search.get('focusMarket')),focusProduct:id(search.get('focusProduct'))};
}
export function presetReportPeriod(preset: 'current'|'previous', now: Date): ReportPeriodSelection {
  return defaultReportPeriod(new Date(now.getFullYear(),now.getMonth()-(preset === 'previous' ? 1 : 0),1));
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function isValidReportPeriod(period: ReportPeriodSelection): boolean {
  return ['weekly', 'monthly'].includes(period.kind) && isDate(period.startDate)
    && isDate(period.endDate) && period.startDate <= period.endDate;
}

export function defaultReportPeriod(now: Date): ReportPeriodSelection {
  const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  return { kind: 'monthly', startDate: date(new Date(now.getFullYear(),now.getMonth(),1)),
    endDate: date(new Date(now.getFullYear(),now.getMonth()+1,0)) };
}

export function readReportPeriod(search: Search, fallback: ReportPeriodSelection) {
  const period = { kind: (search.get('kind') ?? fallback.kind) as SettlementReportKind,
    startDate: search.get('start') ?? fallback.startDate, endDate: search.get('end') ?? fallback.endDate };
  return isValidReportPeriod(period) ? { period, error: null }
    : { period: fallback, error: '日期期間無效，請選擇有效日期，且結束日期不可早於開始日期。' };
}

export function buildSettlementReportHref(period: ReportPeriodSelection, view?: ReportReaderView): string {
  if (!isValidReportPeriod(period)) throw new Error('Invalid report period');
  const search = new URLSearchParams({kind:period.kind,start:period.startDate,end:period.endDate});
  if (view) {
    search.set('markets',String(Math.min(100000,Math.max(5,view.markets)))); search.set('products',String(Math.min(100000,Math.max(5,view.products))));
    if (view.sort !== 'date') search.set('sort',view.sort);
    if (view.focusMarket) search.set('focusMarket',view.focusMarket.slice(0,200));
    if (view.focusProduct) search.set('focusProduct',view.focusProduct.slice(0,200));
  }
  return `/reports/settlement?${search}`;
}

export function buildReportEntityHref(type: 'market' | 'product', id: string, period: ReportPeriodSelection, view?: ReportReaderView, task?: string, date?: string): string {
  if (!isValidReportPeriod(period)) throw new Error('Invalid report period');
  const base = type === 'market' ? buildMarketDetailHref(id,{returnTo:'analytics'}) : buildProductDetailHref(id);
  const [path, query] = base.split('?');
  const search = new URLSearchParams(query);
  search.set('fromReport','1'); search.set('reportKind',period.kind);
  search.set('reportStart',period.startDate); search.set('reportEnd',period.endDate);
  if (view) {
    const stored = new URLSearchParams(buildSettlementReportHref(period,view).split('?')[1]);
    for (const key of ['markets','products','sort']) if (stored.has(key)) search.set(`report-${key}`,stored.get(key)!);
    search.set(type === 'market' ? 'report-focusMarket' : 'report-focusProduct',id.slice(0,200));
  }
  if (task && type === 'market' && ['performance','costs','journal'].includes(task)) search.set('task',task);
  if (type === 'market' && task === 'performance' && date && isDate(date) && date >= period.startDate && date <= period.endDate) search.set('reportDate',date);
  return `${path}?${search}`;
}

/** Only a fixed internal report route can be returned to; arbitrary URLs are ignored. */
export function resolveReportEntityReturn(search: Search | null) {
  if (!search || search.get('fromReport') !== '1') return null;
  const period = { kind: search.get('reportKind') as SettlementReportKind,
    startDate: search.get('reportStart') ?? '', endDate: search.get('reportEnd') ?? '' };
  const stored = new URLSearchParams();
  for (const key of ['markets','products','sort','focusMarket','focusProduct']) if (search.get(`report-${key}`)) stored.set(key,search.get(`report-${key}`)!);
  return { label: '返回報告', href: isValidReportPeriod(period)
    ? buildSettlementReportHref(period,stored.size ? readReportReaderView(stored) : undefined) : '/reports/settlement' };
}

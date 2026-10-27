import Link from 'next/link';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';
import { resolveMarketBoothFee, type MarketBoothFeeSource } from '@/lib/markets/market-booth-fee';
import { formatCurrency } from '@/lib/utils';

export function MarketFeeConflictNotice({ market }: {market: MarketBoothFeeSource}) {
  const fee=resolveMarketBoothFee(market);
  if (!fee.conflict) return null;
  return <p role="status" className="my-3 rounded-xl border border-status-warn-border bg-status-warn-bg p-3 text-sm leading-6 text-status-warn-text">
    舊費用待確認：報名費 {formatCurrency(fee.legacyFee)}、攤位費 {formatCurrency(fee.boothCost)}。
    兩者是同一筆費用，目前先採攤位費估算，請在編輯中確認正確金額。
  </p>;
}

export function MarketFeeReviewNotice({ markets }: {markets: Array<MarketBoothFeeSource & {id?: string; name: string}>}) {
  const conflicts=markets.filter(market=>resolveMarketBoothFee(market).conflict);
  if (!conflicts.length) return null;
  return <details className="my-4 rounded-card border border-status-warn-border bg-status-warn-bg p-4 text-status-warn-text">
    <summary className="min-h-11 cursor-pointer text-sm font-semibold">{conflicts.length} 場舊費用待確認</summary>
    <p className="mb-3 text-sm leading-6">報名費與攤位費是同一筆，以下場次的舊金額不同。目前先採攤位費估算，確認後結果可能改變。</p>
    <ul className="space-y-2">{conflicts.map((market,index)=><li key={market.id ?? index}>{market.id ? <Link className="inline-flex min-h-11 items-center text-sm underline" href={buildMarketDetailHref(market.id,{returnTo:'analytics'})}>{market.name}：確認費用</Link> : <span>{market.name}</span>}</li>)}</ul>
  </details>;
}

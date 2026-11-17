import { Button } from '@/components/ui/Button';
import type { DemoMarket } from '@/lib/demo/formal-demo-data';
import { getMarketBoothFee } from '@/lib/markets/market-booth-fee';
import { formatCurrency } from '@/lib/utils';

interface DemoMarketComparisonProps {
  markets: DemoMarket[];
  onOpen: (market: DemoMarket) => void;
}

export function DemoMarketComparison({ markets, onOpen }: DemoMarketComparisonProps) {
  const designMarket = markets.find(market => market.id === 'market-urban-design');
  const communityMarket = markets.find(market => market.id === 'market-community');
  if (!designMarket || !communityMarket) return null;
  const higherRevenueAndFee = designMarket.revenue > communityMarket.revenue &&
    getMarketBoothFee(designMarket) > getMarketBoothFee(communityMarket);

  return (
    <section className="mb-5 rounded-card border border-border bg-atelier-paper p-4 sm:p-5" aria-labelledby="demo-comparison-title">
      <h2 id="demo-comparison-title" className="text-lg font-semibold">下次去哪一場比較值得？</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">想再報名時，可以一起回看收入、攤位費與當時的出攤心得。</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {[designMarket, communityMarket].map(market => (
          <article key={market.id} className="rounded-control border border-border p-3">
            <h3 className="font-semibold">{market.name}</h3>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-muted-foreground">收入</dt><dd className="mt-1 break-words font-semibold tabular-nums">{formatCurrency(market.revenue)}</dd></div>
              <div><dt className="text-muted-foreground">攤位費</dt><dd className="mt-1 break-words font-semibold tabular-nums">{formatCurrency(getMarketBoothFee(market))}</dd></div>
              <div><dt className="text-muted-foreground">成交</dt><dd className="mt-1 font-semibold tabular-nums">{market.deals} 筆</dd></div>
            </dl>
            {market.postMarketNote && <p className="mt-3 border-t border-border pt-3 text-sm leading-6"><span className="block font-medium">出攤心得</span>{market.postMarketNote}</p>}
            <Button variant="ghost" className="mt-1 px-0 text-primary" onClick={() => onOpen(market)} aria-label={`查看${market.name}回顧`}>查看場次回顧</Button>
          </article>
        ))}
      </div>
      {higherRevenueAndFee && <p className="mt-3 text-sm leading-6">{designMarket.name}的收入較高，攤位費也較高。</p>}
      <p className="mt-3 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">淨利待確認</strong>。比較兩場的淨利前，還要補齊商品、包裝與交通成本，並確認抽成。</p>
    </section>
  );
}

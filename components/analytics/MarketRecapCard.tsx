import { ClipboardList, Target } from 'lucide-react';
import type { MarketRecapReport } from '@/lib/analytics/market-recap';

interface MarketRecapCardProps {
  report: MarketRecapReport;
}

const resultLabels = {
  strong: '表現良好',
  watch: '需要觀察',
  needs_adjustment: '需要調整',
  not_enough_data: '資料不足',
} as const;

const resultStyles = {
  strong: 'bg-soft-green text-foreground',
  watch: 'bg-soft-yellow text-foreground',
  needs_adjustment: 'bg-[#FFF4E5] text-foreground',
  not_enough_data: 'bg-[#F5F5F3] text-muted-foreground',
} as const;

function TextList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-2 text-sm text-foreground leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketRecapCard({ report }: MarketRecapCardProps) {
  return (
    <section className="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-primary/10 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-medium text-primary mb-1">回顧報告</p>
          <h2 className="text-xl font-semibold text-foreground">{report.title}</h2>
        </div>
        <div className="w-10 h-10 rounded-full bg-soft-green flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-xs px-3 py-1 rounded-full ${resultStyles[report.resultLabel]}`}>
          {resultLabels[report.resultLabel]}
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-[#F5F5F3] text-foreground">
          {report.confidence === 'high' ? '信心較高' : report.confidence === 'medium' ? '信心中等' : '信心較低'}
        </span>
      </div>

      <p className="text-sm text-foreground leading-relaxed mb-5">{report.summary}</p>

      <div className="space-y-5">
        <TextList title="主要發現" items={report.highlights} />
        <TextList title="可以改善的地方" items={report.opportunities} />

        {report.nextActions.length > 0 && (
          <div className="bg-background rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-secondary" />
              <p className="text-sm font-medium text-foreground">下次可以這樣做</p>
            </div>
            <ol className="space-y-2">
              {report.nextActions.map((action, index) => (
                <li key={action} className="flex gap-2 text-sm text-foreground leading-relaxed">
                  <span className="font-semibold text-primary">{index + 1}.</span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

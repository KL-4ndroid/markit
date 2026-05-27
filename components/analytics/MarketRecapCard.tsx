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
  strong: 'bg-[#E8F3E8] text-[#3A3A3A]',
  watch: 'bg-[#FFF8E7] text-[#3A3A3A]',
  needs_adjustment: 'bg-[#FFF4E5] text-[#3A3A3A]',
  not_enough_data: 'bg-[#F5F5F3] text-[#6B6B6B]',
} as const;

function TextList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium text-[#6B6B6B] mb-2">{title}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-2 text-sm text-[#3A3A3A] leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#7B9FA6] flex-shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketRecapCard({ report }: MarketRecapCardProps) {
  return (
    <section className="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-[#7B9FA6]/10 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-medium text-[#7B9FA6] mb-1">回顧報告</p>
          <h2 className="text-xl font-semibold text-[#3A3A3A]">{report.title}</h2>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#E8F3E8] flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-[#7B9FA6]" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-xs px-3 py-1 rounded-full ${resultStyles[report.resultLabel]}`}>
          {resultLabels[report.resultLabel]}
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-[#F5F5F3] text-[#3A3A3A]">
          {report.confidence === 'high' ? '信心較高' : report.confidence === 'medium' ? '信心中等' : '信心較低'}
        </span>
      </div>

      <p className="text-sm text-[#3A3A3A] leading-relaxed mb-5">{report.summary}</p>

      <div className="space-y-5">
        <TextList title="主要發現" items={report.highlights} />
        <TextList title="可以改善的地方" items={report.opportunities} />

        {report.nextActions.length > 0 && (
          <div className="bg-[#FAFAF8] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-[#D4A574]" />
              <p className="text-sm font-medium text-[#3A3A3A]">下次可以這樣做</p>
            </div>
            <ol className="space-y-2">
              {report.nextActions.map((action, index) => (
                <li key={action} className="flex gap-2 text-sm text-[#3A3A3A] leading-relaxed">
                  <span className="font-semibold text-[#7B9FA6]">{index + 1}.</span>
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

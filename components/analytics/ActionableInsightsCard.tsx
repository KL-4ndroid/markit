import { AlertTriangle, CheckCircle2, Info, Lightbulb } from 'lucide-react';
import type { ActionableAnalyticsResult, AnalyticsActionCard } from '@/lib/analytics/actionable-insights';

interface ActionableInsightsCardProps {
  result: ActionableAnalyticsResult;
}

const levelLabels = {
  summary_only: '摘要資料',
  transaction_amount: '交易金額',
  product_detail: '商品明細',
  full_behavior: '完整行為',
} as const;

const confidenceLabels = {
  low: '信心較低',
  medium: '信心中等',
  high: '信心較高',
} as const;

function getToneStyle(tone: AnalyticsActionCard['tone']) {
  switch (tone) {
    case 'positive':
      return {
        bg: 'bg-soft-green',
        border: 'border-primary/30',
        iconBg: 'bg-primary',
        icon: CheckCircle2,
      };
    case 'warning':
      return {
        bg: 'bg-[#FFF4E5]',
        border: 'border-secondary/40',
        iconBg: 'bg-secondary',
        icon: AlertTriangle,
      };
    default:
      return {
        bg: 'bg-cream-lighter',
        border: 'border-primary/20',
        iconBg: 'bg-primary',
        icon: Info,
      };
  }
}

function InsightCard({ card, isPrimary = false }: { card: AnalyticsActionCard; isPrimary?: boolean }) {
  const toneStyle = getToneStyle(card.tone);
  const Icon = toneStyle.icon;

  return (
    <div className={`${toneStyle.bg} ${toneStyle.border} border rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <div className={`${toneStyle.iconBg} w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-1">{card.title}</p>
          <h3 className={`${isPrimary ? 'text-lg' : 'text-base'} font-semibold text-foreground leading-snug`}>
            {card.headline}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">{card.body}</p>
          <div className="mt-3 bg-white/70 rounded-lg p-3">
            <p className="text-xs font-medium text-foreground mb-1">下一步</p>
            <p className="text-sm text-foreground leading-relaxed">{card.nextAction}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActionableInsightsCard({ result }: ActionableInsightsCardProps) {
  const supportingCards = result.cards.filter((card) => card.kind !== result.topAction.kind).slice(0, 2);

  return (
    <section className="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-primary/10 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-medium text-primary mb-1">先看這裡</p>
          <h2 className="text-xl font-semibold text-foreground">行動建議</h2>
        </div>
        <div className="w-10 h-10 rounded-full bg-soft-yellow flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-secondary" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-xs px-3 py-1 rounded-full bg-soft-green text-foreground">
          資料：{levelLabels[result.dataCompleteness.level]}
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-cream-lighter text-foreground">
          信心：{confidenceLabels[result.confidence]}
        </span>
      </div>

      <InsightCard card={result.topAction} isPrimary />

      {supportingCards.length > 0 && (
        <div className="mt-3 space-y-3">
          {supportingCards.map((card) => (
            <InsightCard key={card.kind} card={card} />
          ))}
        </div>
      )}
    </section>
  );
}

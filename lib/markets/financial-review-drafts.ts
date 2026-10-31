import { dailyFinancialBasis, marketFeeBasis } from '@/lib/analytics/financial-record-quality';
import type { DailyStats, Market } from '@/types/db';
import { emptyFinancialDay, type FinancialReviewMode, type FinancialReviewSnapshot, type FinancialReviewWrite } from './financial-reviews';

export type FinancialReviewEditor = {
  base: Omit<FinancialReviewWrite, 'amount' | 'mutationId'>;
  amount: string;
};

/** Private, device-local input. Never part of the event sync queue or reports. */
export type FinancialReviewDraft = {
  id: string;
  ownerId: string;
  marketId: string;
  key: string;
  localRevision: number;
  generation: string;
  editor: FinancialReviewEditor;
  attempt: FinancialReviewWrite | null;
  updatedAt: number;
};

export const financialDraftId = (ownerId: string, marketId: string, key: string) =>
  JSON.stringify([ownerId, marketId, key]);

export function prepareFinancialEditor(
  market: Market, raw: DailyStats | undefined, snapshot: FinancialReviewSnapshot,
  key: string, mode: FinancialReviewMode, today: string,
): FinancialReviewEditor {
  if (!market.id || snapshot.marketId !== market.id || snapshot.ownerId !== market.owner_id) throw new Error('FINANCE_SCOPE');
  const prior = snapshot.reviews.find(row => row.review_key === key);
  const stat = raw ?? emptyFinancialDay(market.id, key);
  const day = snapshot.days[key];
  if (key === 'fees') {
    if (!['zero-fee', 'cleared'].includes(mode) || (mode === 'zero-fee' && snapshot.feeTotal !== 0)
      || JSON.stringify(snapshot.feeBasis) !== marketFeeBasis(market)) throw new Error('FINANCE_SOURCE');
  } else {
    if (!snapshot.dates.includes(key) || key > today) throw new Error('FINANCE_DATE');
    if (!day?.valid || day.revenue !== stat.revenue || day.deals !== stat.dealCount
      || (mode === 'cost' && !day.count) || (mode === 'zero-income' && (day.count !== 0 || !day.zeroAllowed))
      || mode === 'zero-fee') throw new Error('FINANCE_SOURCE');
  }
  return {
    base: { marketId: market.id, key, mode, observed: key === 'fees' ? snapshot.feeBasis : JSON.parse(dailyFinancialBasis(stat)),
      sourceKey: key === 'fees' ? snapshot.feeKey : day.key, revision: prior?.revision ?? 0 },
    amount: mode === 'cost' ? prior?.valid && prior.mode === 'cost' ? String(prior.amount) : stat.cost > 0 ? String(stat.cost) : '' : '',
  };
}

export function financialDraftSourceChanged(draft: FinancialReviewDraft, latest: FinancialReviewEditor): boolean {
  return draft.editor.base.revision !== latest.base.revision
    || draft.editor.base.sourceKey !== latest.base.sourceKey
    || JSON.stringify(draft.editor.base.observed) !== JSON.stringify(latest.base.observed);
}

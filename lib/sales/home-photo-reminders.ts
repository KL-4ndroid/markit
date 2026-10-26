import { recoverOwnerSalesPhotoEvidenceReminders, SalesPhotoEvidenceReminderAccessError } from './photo-evidence-reminder-recovery';

/** Reuse owner recovery: cloud metadata reads + local reminder reconstruction only.
 * No uploads, metadata claims, event writes, image deletion or retry worker. */
export async function reconcileHomePhotoReminders(input: {
  ownerId: string;
  marketIds: readonly string[];
  isCurrent: () => boolean;
}, recover = recoverOwnerSalesPhotoEvidenceReminders) {
  const ids = [...new Set(input.marketIds)].sort();
  const hiddenSaleIds = new Set<string>();
  let unknownSaleCount = 0;
  let failedMarkets = 0;
  // Bound parallel reads even when the owner has many same-day arrangements.
  for (let offset = 0; offset < ids.length && input.isCurrent(); offset += 3) {
    const results = await Promise.allSettled(ids.slice(offset, offset + 3).map(marketId =>
      recover({ ownerId: input.ownerId, marketId, isCurrent: input.isCurrent })));
    if (!input.isCurrent()) return null;
    for (const result of results) {
      if (result.status === 'rejected') {
        if (result.reason instanceof SalesPhotoEvidenceReminderAccessError) throw result.reason;
        failedMarkets++; continue;
      }
      result.value.hiddenSaleIds.forEach(id => hiddenSaleIds.add(id));
      unknownSaleCount += result.value.unknownSaleCount;
    }
  }
  return input.isCurrent() ? { hiddenSaleIds, unknownSaleCount, failedMarkets } : null;
}

/** Registration fee is the legacy name of booth cost, never an additional charge. */
export type MarketBoothFeeSource = { boothCost?: number | null; registrationFee?: number | null };

const finite = (value: number | null | undefined): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;

export function resolveMarketBoothFee(market: MarketBoothFeeSource) {
  const boothCost = finite(market.boothCost);
  const legacyFee = finite(market.registrationFee);
  return {
    amount: boothCost !== 0 ? boothCost : legacyFee,
    boothCost,
    legacyFee,
    conflict: boothCost !== 0 && legacyFee !== 0 && boothCost !== legacyFee,
  };
}

export function getMarketBoothFee(market: MarketBoothFeeSource): number {
  return resolveMarketBoothFee(market).amount;
}

/** Only use after an owner explicitly saves a reviewed fee. Never bulk-normalize history. */
export function confirmedMarketBoothFee(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('invalid_booth_fee');
  return {boothCost: amount, registrationFee: 0};
}

/** New occurrences may translate unambiguous legacy defaults; conflicts remain visible. */
export function materializedMarketBoothFee(market: MarketBoothFeeSource) {
  const fee = resolveMarketBoothFee(market);
  return fee.conflict ? {boothCost: fee.boothCost, registrationFee: fee.legacyFee}
    : {boothCost: fee.amount, registrationFee: 0};
}

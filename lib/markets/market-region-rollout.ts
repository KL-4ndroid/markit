import { readMarketRegion } from './market-region';

/** Enable only after migration 074 and cloud projection verification. */
export function isMarketRegionWriteEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED === 'true';
}

export function assertMarketRegionWriteReady(type: string, payload: Record<string, unknown>): void {
  if (!['market_created', 'market_updated', 'venue_created', 'venue_updated'].includes(type)) return;
  const updates = type.endsWith('_updated');
  const fields = updates ? payload.updates as Record<string, unknown> : payload;
  if (!fields || typeof fields !== 'object') return;
  const region = readMarketRegion(fields);
  // Unclassified creations remain compatible with an unmigrated server.
  if ((updates ? region !== undefined : region != null) && !isMarketRegionWriteEnabled()) {
    throw new Error('縣市分類尚未開放儲存，請稍後再試；其他市集資料仍可使用');
  }
}

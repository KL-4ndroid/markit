import { getEventMarketId } from '@/lib/events/event-read-model';

type EventLike = {
  type?: string;
  market_id?: string;
  payload?: Record<string, unknown>;
};

export type StaffEventPreflightSkipReason =
  | 'missing_market_id'
  | 'market_not_available'
  | 'missing_product_id'
  | 'product_not_available';

export type StaffEventPreflightDecision =
  | { shouldImport: true }
  | { shouldImport: false; reason: StaffEventPreflightSkipReason; referenceId?: string };

export interface StaffEventPreflightContext {
  hasMarket: (marketId: string) => Promise<boolean>;
  hasProduct: (productId: string) => Promise<boolean>;
}

const MARKET_SCOPED_EVENT_TYPES = new Set([
  'market_updated',
  'market_status_changed',
  'market_started',
  'market_ended',
  'market_deleted',
  'product_created',
  'interaction_recorded',
  'interaction_deleted',
  'deal_closed',
  'deal_deleted',
]);

const PRODUCT_SCOPED_EVENT_TYPES = new Set([
  'product_updated',
  'product_deleted',
]);

function getPayloadProductId(event: EventLike): string | undefined {
  const productId = event.payload?.productId ?? event.payload?.product_id;
  return typeof productId === 'string' && productId.trim().length > 0
    ? productId
    : undefined;
}

export async function preflightStaffEventImport(
  event: EventLike,
  context: StaffEventPreflightContext
): Promise<StaffEventPreflightDecision> {
  if (MARKET_SCOPED_EVENT_TYPES.has(String(event.type))) {
    const marketId = getEventMarketId(event);
    if (!marketId) {
      return { shouldImport: false, reason: 'missing_market_id' };
    }

    if (!await context.hasMarket(marketId)) {
      return { shouldImport: false, reason: 'market_not_available', referenceId: marketId };
    }
  }

  if (PRODUCT_SCOPED_EVENT_TYPES.has(String(event.type))) {
    const productId = getPayloadProductId(event);
    if (!productId) {
      return { shouldImport: false, reason: 'missing_product_id' };
    }

    if (!await context.hasProduct(productId)) {
      return { shouldImport: false, reason: 'product_not_available', referenceId: productId };
    }
  }

  return { shouldImport: true };
}

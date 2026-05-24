import type {
  DealClosedPayload,
  InteractionRecordedPayload,
  MarketCreatedPayload,
  MarketDeletedPayload,
  MarketStatusChangedPayload,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  Settings,
} from '@/types/db';
import { generateUUID } from './uuid';

type WithMarketIdAlias<T extends { marketId: string }> = Omit<T, 'marketId'> & {
  marketId?: string;
  market_id?: string;
};

/**
 * EventPayloadMap 對應每個事件類型的 payload 型別。
 *
 * 將事件類型與其對應的 payload 進行對應，可用於約束 recordEvent 的參數型別。
 */
export interface EventPayloadMap {
  market_created: MarketCreatedPayload & { market_id?: string; marketId?: string };
  market_status_changed: WithMarketIdAlias<MarketStatusChangedPayload>;
  market_started: { market_id?: string; marketId?: string };
  market_ended: { market_id?: string; marketId?: string };
  market_deleted: WithMarketIdAlias<MarketDeletedPayload>;
  product_created: ProductCreatedPayload & { productId?: string };
  product_updated: ProductUpdatedPayload;
  product_deleted: { productId: string };
  interaction_recorded: WithMarketIdAlias<InteractionRecordedPayload>;
  deal_closed: WithMarketIdAlias<DealClosedPayload>;
  settings_updated: Partial<Settings>;
}

/**
 * 對事件 payload 進行基本驗證。
 * 若 payload 結構不合法，將拋出錯誤。
 */
export function validateEventPayload<T extends keyof EventPayloadMap>(
  type: T,
  payload: EventPayloadMap[T]
): void {
  if (!payload || typeof payload !== 'object') {
    throw new Error(`Payload for event ${String(type)} is required`);
  }

  const p = payload as Record<string, unknown>;
  switch (type) {
    case 'market_created':
      if (!p.name) throw new Error('market_created payload must include name');
      if (!p.location) throw new Error('market_created payload must include location');
      if (!p.startDate) throw new Error('market_created payload must include startDate');
      if (!p.endDate) throw new Error('market_created payload must include endDate');
      break;
    case 'market_deleted':
      if (!p.marketId && !p.market_id) throw new Error('market_deleted payload must include marketId');
      break;
    case 'product_created':
      if (!p.name) throw new Error('product_created payload must include name');
      if (typeof p.price !== 'number') throw new Error('product_created payload must include numeric price');
      break;
    case 'product_deleted':
      if (!p.productId || typeof p.productId !== 'string') {
        throw new Error('product_deleted payload must include string productId');
      }
      break;
    case 'deal_closed':
      if (!p.marketId && !p.market_id) throw new Error('deal_closed payload must include marketId');
      break;
    default:
      break;
  }
}

/**
 * 正規化事件 payload 並導出 market_id。
 *
 * 過渡期支援 marketId / market_id 雙讀，但事件 row 頂層仍保留 market_id 作為 Dexie index。
 */
export function normaliseEventPayload<T extends keyof EventPayloadMap>(
  type: T,
  payload: EventPayloadMap[T]
): { payload: EventPayloadMap[T]; market_id?: string } {
  const p = { ...(payload as Record<string, unknown>) };

  if (p.marketId && p.market_id && p.marketId !== p.market_id) {
    throw new Error(`Conflicting market id fields for ${String(type)}`);
  }

  const market_id = (p.market_id || p.marketId) as string | undefined;
  if (market_id) {
    p.market_id = market_id;
    p.marketId = p.marketId || market_id;
  }

  if (type === 'market_created') {
    p.market_id = market_id || generateUUID();
    p.marketId = p.marketId || p.market_id;
  }

  if (type === 'product_created') {
    p.productId = p.productId || generateUUID();
  }

  if (type === 'product_deleted' && typeof p.productId !== 'string') {
    p.productId = String(p.productId);
  }

  return {
    payload: p as EventPayloadMap[T],
    market_id: p.market_id as string | undefined,
  };
}

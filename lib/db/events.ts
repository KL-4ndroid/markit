/**
 * Market Pulse - 事件溯源核心邏輯
 *
 * ChatGPT 修正版重點：
 * - recordEvent 先正規化／驗證 payload，再寫入事件。
 * - handler 不再回寫 events 表，維持事件紀錄不可變。
 * - product_deleted 使用 UUID string。
 * - deal_closed 阻止靜默超賣，並維護 dailyStats.productsSold。
 */

import { db, generateUUID } from './index';
import type {
  Event,
  EventType,
  EventHandler,
  Market,
  MarketCreatedPayload,
  MarketStatusChangedPayload,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  InteractionRecordedPayload,
  DealClosedPayload,
  Settings,
} from '@/types/db';
import type { EventPayloadMap } from './eventTypes';
import { normaliseEventPayload, validateEventPayload } from './eventTypes';

export const eventHandlers: Partial<Record<EventType, EventHandler>> = {};

export function registerEventHandler(type: EventType, handler: EventHandler): void {
  eventHandlers[type] = handler;
}

export async function recordEvent<T extends keyof EventPayloadMap & EventType>(
  type: T,
  payload: EventPayloadMap[T],
  eventId?: string
): Promise<string> {
  try {
    if (!db.isOpen()) {
      await db.open();
    }

    const id = eventId || generateUUID();
    validateEventPayload(type, payload);
    const { payload: normalisedPayload, market_id } = normaliseEventPayload(type, payload);

    const event: Event<EventPayloadMap[T]> = {
      id,
      type,
      payload: normalisedPayload,
      timestamp: Date.now(),
      actor_id: 'local',
      market_id,
      sync_status: 'local_only',
      metadata: { version: '1.0.0' },
    };

    await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats], async () => {
      await db.events.add(event);
      const handler = eventHandlers[type];
      if (handler) {
        await handler(event, db);
      } else {
        console.warn(`⚠️ 未找到事件類型 "${type}" 的處理器`);
      }
    });

    console.log(`✅ 事件已記錄：${type} (ID: ${id.substring(0, 8)}...)`);

    if (typeof window !== 'undefined') {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('trigger-sync', {
          detail: { eventType: type, eventId: id },
        }));
      });
    }

    return id;
  } catch (error) {
    const err = error as Error;
    console.error(`❌ 記錄事件失敗：${type}`, error);
    console.error('錯誤詳情:', { name: err.name, message: err.message, stack: err.stack });
    throw error;
  }
}

registerEventHandler('market_created', async (event: Event<MarketCreatedPayload & { market_id?: string; marketId?: string }>, db) => {
  const { payload } = event;
  const market_id = payload.market_id || payload.marketId || generateUUID();

  const market: Market = {
    id: market_id,
    name: payload.name,
    location: payload.location,
    startDate: payload.startDate,
    endDate: payload.endDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: 'registered',
    owner_id: event.actor_id || 'local',
    is_collaborative: false,
    sync_status: 'local_only',
    earlyEntryEnabled: payload.earlyEntryEnabled,
    earlyEntryTime: payload.earlyEntryTime,
    checkInTime: payload.checkInTime,
    operatingStartTime: payload.operatingStartTime,
    operatingEndTime: payload.operatingEndTime,
    registrationFee: payload.registrationFee,
    boothCost: payload.boothCost,
    deposit: payload.deposit,
    tableRental: payload.tableRental,
    chairRental: payload.chairRental,
    umbrellaRental: payload.umbrellaRental,
    tableclothRental: payload.tableclothRental,
    commissionRate: payload.commissionRate,
    tableFree: payload.tableFree,
    chairFree: payload.chairFree,
    umbrellaFree: payload.umbrellaFree,
    tableclothFree: payload.tableclothFree,
    notes: payload.notes,
    totalRevenue: 0,
    totalProfit: 0,
    totalInteractions: 0,
    totalDeals: 0,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };

  await db.markets.add(market);
  console.log(`📅 市集已建立：${market.name} (ID: ${market_id.substring(0, 8)}...)`);
});

registerEventHandler('market_status_changed', async (event: Event<MarketStatusChangedPayload & { market_id?: string }>, db) => {
  const market_id = event.payload.market_id || event.payload.marketId;
  const { newStatus } = event.payload;
  if (!market_id) throw new Error('market_status_changed payload must include market id');

  await db.markets.update(market_id, { status: newStatus, updatedAt: event.timestamp });
  console.log(`📅 市集狀態已更新：ID ${market_id} -> ${newStatus}`);
});

registerEventHandler('market_started', async (event: Event<{ market_id?: string; marketId?: string }>, db) => {
  const market_id = event.payload.market_id || event.payload.marketId;
  if (!market_id) throw new Error('market_started payload must include market id');

  await db.markets.update(market_id, {
    status: 'ongoing',
    operationPhase: 'operating',
    updatedAt: event.timestamp,
  });

  console.log(`🎪 市集開始營業：ID ${market_id}`);
});

registerEventHandler('market_ended', async (event: Event<{ market_id?: string; marketId?: string }>, db) => {
  const market_id = event.payload.market_id || event.payload.marketId;
  if (!market_id) throw new Error('market_ended payload must include market id');

  await db.markets.update(market_id, {
    status: 'completed',
    operationPhase: undefined,
    updatedAt: event.timestamp,
  });

  console.log(`✅ 市集已結束：ID ${market_id}`);
});

registerEventHandler('market_deleted', async (event: Event<{ marketId: string; reason?: string }>, db) => {
  const { marketId } = event.payload;

  await db.markets.update(marketId, { isDeleted: true, updatedAt: event.timestamp });
  console.log(`🗑️ 市集已刪除（軟刪除）：ID ${marketId.substring(0, 8)}...`);
});

registerEventHandler('product_created', async (event: Event<ProductCreatedPayload & { productId?: string }>, db) => {
  const { payload } = event;
  const productId = payload.productId || generateUUID();

  await db.products.add({
    id: productId,
    owner_id: event.actor_id || 'local',
    market_id: event.market_id,
    name: payload.name,
    category: payload.category,
    price: payload.price,
    cost: payload.cost,
    iconName: payload.iconName,
    colorCode: payload.colorCode,
    stock: payload.unlimitedStock ? 0 : (payload.stock || 0),
    unlimitedStock: payload.unlimitedStock || false,
    description: payload.description,
    isActive: true,
    isShared: payload.isShared || false,
    totalSold: 0,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  });

  console.log(`📦 商品已建立：${payload.name}${payload.unlimitedStock ? ' (不限庫存)' : ''} (ID: ${productId.substring(0, 8)}...)`);
});

registerEventHandler('product_updated', async (event: Event<ProductUpdatedPayload>, db) => {
  const { productId, updates } = event.payload;

  await db.products.update(productId, { ...updates, updatedAt: event.timestamp });
  console.log(`📦 商品已更新：ID ${productId}`);
});

registerEventHandler('product_deleted', async (event: Event<{ productId: string }>, db) => {
  const { productId } = event.payload;

  await db.products.update(productId, { isActive: false, updatedAt: event.timestamp });
  console.log(`📦 商品已停用：ID ${productId}`);
});

registerEventHandler('interaction_recorded', async (event: Event<InteractionRecordedPayload & { market_id?: string }>, db) => {
  const market_id = event.payload.market_id || event.payload.marketId;
  const { type } = event.payload;
  if (!market_id) throw new Error('interaction_recorded payload must include market id');

  const market = await db.markets.get(market_id);
  if (market) {
    await db.markets.update(market_id, {
      totalInteractions: (market.totalInteractions || 0) + 1,
      updatedAt: event.timestamp,
    });
  }

  const date = new Date(event.timestamp).toISOString().split('T')[0];
  const dailyStat = await db.dailyStats.where('[date+marketId]').equals([date, market_id]).first();

  if (dailyStat) {
    const updates: { updatedAt: number; touchCount?: number; inquiryCount?: number } = { updatedAt: event.timestamp };
    if (type === 'touch') updates.touchCount = dailyStat.touchCount + 1;
    if (type === 'inquiry') updates.inquiryCount = dailyStat.inquiryCount + 1;
    await db.dailyStats.update(dailyStat.id!, updates);
  } else {
    await db.dailyStats.add({
      date,
      marketId: market_id,
      touchCount: type === 'touch' ? 1 : 0,
      inquiryCount: type === 'inquiry' ? 1 : 0,
      dealCount: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      productsSold: [],
      updatedAt: event.timestamp,
    });
  }

  console.log(`👋 互動已記錄：${type} (市集 ID: ${market_id})`);
});

registerEventHandler('deal_closed', async (event: Event<DealClosedPayload & { market_id?: string }>, db) => {
  const market_id = event.payload.market_id || event.payload.marketId;
  const { dealDate, isBackfill, isManualEntry } = event.payload;
  if (!market_id) throw new Error('deal_closed payload must include market id');

  const transactionDate = dealDate || new Date(event.timestamp).toISOString().split('T')[0];
  let totalAmount = event.payload.totalAmount;
  let totalCost = 0;
  let dealCount = 1;

  if (isManualEntry) {
    totalAmount = event.payload.manualRevenue || 0;
    totalCost = event.payload.manualCost || 0;
    dealCount = event.payload.manualDealCount || 1;
    console.log(`📝 簡化補登：收入 NT$${totalAmount}，成本 NT$${totalCost}，成交 ${dealCount} 筆`);
  } else {
    const { items } = event.payload;

    for (const item of items) {
      const product = await db.products.get(item.productId);

      if (product) {
        item.price_at_time_of_sale = item.price || product.price;
        item.cost_at_time_of_sale = product.cost;
        item.product_name = product.name;

        if (product.cost) totalCost += product.cost * item.quantity;

        if (!isBackfill && !product.unlimitedStock && product.stock !== undefined) {
          if (product.stock < item.quantity) {
            throw new Error(`庫存不足：${product.name}`);
          }
        }

        const updates: { totalSold: number; updatedAt: number; stock?: number } = {
          totalSold: (product.totalSold || 0) + item.quantity,
          updatedAt: event.timestamp,
        };

        if (!isBackfill && !product.unlimitedStock && product.stock !== undefined) {
          updates.stock = product.stock - item.quantity;
        }

        await db.products.update(item.productId, updates);
      }
    }
  }

  const market = await db.markets.get(market_id);
  if (market) {
    const newTotalRevenue = (market.totalRevenue || 0) + totalAmount;
    const newTotalProfit = (market.totalProfit || 0) + (totalAmount - totalCost);
    const newTotalDeals = (market.totalDeals || 0) + dealCount;
    const newTotalInteractions = market.totalInteractions || 0;
    const conversionRate = newTotalInteractions > 0 ? (newTotalDeals / newTotalInteractions) * 100 : 0;
    const averageOrderValue = newTotalDeals > 0 ? newTotalRevenue / newTotalDeals : 0;

    await db.markets.update(market_id, {
      totalRevenue: newTotalRevenue,
      totalProfit: newTotalProfit,
      totalDeals: newTotalDeals,
      updatedAt: event.timestamp,
    });

    console.log(`📊 市集統計更新：轉換率 ${conversionRate.toFixed(1)}%，客單價 NT$${averageOrderValue.toFixed(0)}`);
  }

  const dailyStat = await db.dailyStats.where('[date+marketId]').equals([transactionDate, market_id]).first();
  const updatedProductsSold: { productId: string; quantity: number; revenue: number }[] = dailyStat?.productsSold
    ? [...dailyStat.productsSold]
    : [];

  if (!isManualEntry) {
    for (const item of event.payload.items) {
      const itemRevenue = (item.price_at_time_of_sale ?? item.price ?? 0) * item.quantity;
      const existing = updatedProductsSold.find((p) => p.productId === item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += itemRevenue;
      } else {
        updatedProductsSold.push({ productId: item.productId, quantity: item.quantity, revenue: itemRevenue });
      }
    }
  }

  if (dailyStat) {
    await db.dailyStats.update(dailyStat.id!, {
      dealCount: dailyStat.dealCount + dealCount,
      revenue: dailyStat.revenue + totalAmount,
      cost: dailyStat.cost + totalCost,
      profit: dailyStat.profit + (totalAmount - totalCost),
      productsSold: updatedProductsSold,
      updatedAt: event.timestamp,
    });
  } else {
    await db.dailyStats.add({
      date: transactionDate,
      marketId: market_id,
      touchCount: 0,
      inquiryCount: 0,
      dealCount,
      revenue: totalAmount,
      cost: totalCost,
      profit: totalAmount - totalCost,
      productsSold: updatedProductsSold,
      updatedAt: event.timestamp,
    });
  }

  const modeText = isManualEntry ? '簡化補登' : isBackfill ? '完整補登' : '正常交易';
  console.log(`💰 ${modeText}已記錄：NT$${totalAmount} (日期: ${transactionDate}, 市集 ID: ${market_id.substring(0, 8)}...)`);
});

registerEventHandler('settings_updated', async (event: Event<Partial<Settings>>, db) => {
  await db.settings.update(1, { ...event.payload, updatedAt: event.timestamp });
  console.log('⚙️ 設定已更新');
});

export async function queryEvents(options: {
  type?: EventType;
  startTime?: number;
  endTime?: number;
  limit?: number;
}): Promise<Event[]> {
  let query = db.events.orderBy('timestamp').reverse();

  if (options.type) query = db.events.where('type').equals(options.type).reverse();

  if (options.startTime || options.endTime) {
    query = query.filter((event) => {
      if (options.startTime && event.timestamp < options.startTime) return false;
      if (options.endTime && event.timestamp > options.endTime) return false;
      return true;
    });
  }

  if (options.limit) query = query.limit(options.limit);
  return await query.toArray();
}

export async function rebuildSnapshots(): Promise<void> {
  console.log('🔄 開始重建快照...');

  try {
    await db.transaction('rw', [db.markets, db.products, db.dailyStats], async () => {
      await db.markets.clear();
      await db.products.clear();
      await db.dailyStats.clear();

      const events = await db.events.orderBy('timestamp').toArray();
      for (const event of events) {
        const handler = eventHandlers[event.type];
        if (handler) await handler(event, db);
      }
    });

    console.log('✅ 快照重建完成');
  } catch (error) {
    console.error('❌ 重建快照失敗：', error);
    throw error;
  }
}

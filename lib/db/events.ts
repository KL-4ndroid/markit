/**
 * Market Pulse - 事件溯源核心邏輯
 * 
 * 本檔案實作事件溯源 (Event Sourcing) 的核心功能
 * 所有資料變更都透過事件記錄，確保完整的歷史追蹤
 */

import { db, generateUUID } from './index';
import {
  pickMarketId,
  productCreatedPayloadToLocal,
} from '@/lib/data-mappers';
import {
  checkBackupIntegrity,
  type BackupData,
} from './integrity';
import { timestampToLocalDateString } from '@/lib/time-utils';
import type {
  Event,
  EventType,
  EventPayloadMap,
  EventHandler,
  Market,
  MarketCreatedPayload,
  MarketStatusChangedPayload,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  InteractionRecordedPayload,
  InteractionDeletedPayload,
  DealClosedPayload,
  DealDeletedPayload,
  DailyStats,
  Settings,
} from '@/types/db';

/**
 * 事件處理器映射表
 * 將事件類型映射到對應的處理函數
 */
export const eventHandlers: Partial<Record<EventType, EventHandler>> = {};

/**
 * 註冊事件處理器
 * 用於擴充新的事件類型處理邏輯
 */
export function registerEventHandler(type: EventType, handler: EventHandler): void {
  eventHandlers[type] = handler;
}

type ProductSoldEntry = DailyStats['productsSold'][number];

type EventPayload = EventPayloadMap[EventType] | Record<string, unknown>;

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nonNegativeNumber(value: unknown, fallback = 0): number {
  return Math.max(0, finiteNumber(value, fallback));
}

function safeProductsSold(value: unknown): ProductSoldEntry[] {
  return Array.isArray(value) ? value : [];
}

function prepareEventForInsert(
  type: EventType,
  payload: EventPayload
): { payload: EventPayload; market_id?: string } {
  if (!payload || typeof payload !== 'object') {
    return { payload };
  }

  const record = payload as Record<string, unknown>;

  if (type === 'market_created') {
    const marketId = pickMarketId(record) || generateUUID();
    return {
      payload: {
        ...record,
        marketId,
      },
      market_id: marketId,
    };
  }

  if (type === 'product_created') {
    const productPayload = productCreatedPayloadToLocal(record as ProductCreatedPayload & Record<string, unknown>);
    const productId = productPayload.productId || generateUUID();
    return {
      payload: {
        ...productPayload,
        productId,
      },
      market_id: pickMarketId(productPayload),
    };
  }

  return {
    payload,
    market_id: pickMarketId(record),
  };
}

function assertRecord(payload: EventPayload, type: EventType): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Invalid ${type} payload: expected an object`);
  }

  return payload as Record<string, unknown>;
}

function assertString(value: unknown, field: string, type: EventType): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid ${type} payload: missing ${field}`);
  }
}

function assertNumber(value: unknown, field: string, type: EventType): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid ${type} payload: ${field} must be a finite number`);
  }
}

function assertMarketId(record: Record<string, unknown>, type: EventType): void {
  if (!pickMarketId(record)) {
    throw new Error(`Invalid ${type} payload: missing market_id`);
  }
}

function validateEventPayload(type: EventType, payload: EventPayload): void {
  const record = assertRecord(payload, type);

  switch (type) {
    case 'market_created':
      assertString(record.name, 'name', type);
      assertString(record.location, 'location', type);
      assertString(record.startDate ?? record.start_date, 'startDate', type);
      assertString(record.endDate ?? record.end_date, 'endDate', type);
      assertNumber(record.registrationFee ?? record.registration_fee, 'registrationFee', type);
      assertNumber(record.boothCost ?? record.booth_cost, 'boothCost', type);
      return;

    case 'market_updated':
      assertMarketId(record, type);
      if (!record.updates || typeof record.updates !== 'object' || Array.isArray(record.updates)) {
        throw new Error(`Invalid ${type} payload: updates must be an object`);
      }
      return;

    case 'market_status_changed':
      assertMarketId(record, type);
      assertString(record.oldStatus, 'oldStatus', type);
      assertString(record.newStatus, 'newStatus', type);
      return;

    case 'market_started':
    case 'market_ended':
    case 'market_deleted':
      assertMarketId(record, type);
      return;

    case 'product_created':
      assertString(record.name, 'name', type);
      assertString(record.category, 'category', type);
      assertNumber(record.price, 'price', type);
      return;

    case 'product_updated':
      assertString(record.productId, 'productId', type);
      if (!record.updates || typeof record.updates !== 'object' || Array.isArray(record.updates)) {
        throw new Error(`Invalid ${type} payload: updates must be an object`);
      }
      return;

    case 'product_deleted':
      assertString(record.productId, 'productId', type);
      return;

    case 'interaction_recorded':
      assertMarketId(record, type);
      assertString(record.type, 'type', type);
      return;

    case 'interaction_deleted':
      assertString(record.eventId, 'eventId', type);
      assertMarketId(record, type);
      return;

    case 'deal_closed':
      assertMarketId(record, type);
      assertNumber(record.totalAmount, 'totalAmount', type);
      if (record.isManualEntry === true) return;
      if (!Array.isArray(record.items)) {
        throw new Error(`Invalid ${type} payload: items must be an array`);
      }
      for (const [index, item] of record.items.entries()) {
        const saleItem = item as Record<string, unknown>;
        assertString(saleItem.productId, `items[${index}].productId`, type);
        assertNumber(saleItem.quantity, `items[${index}].quantity`, type);
        assertNumber(saleItem.price, `items[${index}].price`, type);
        if ((saleItem.quantity as number) <= 0) {
          throw new Error(`Invalid ${type} payload: items[${index}].quantity must be greater than zero`);
        }
      }
      return;

    case 'deal_deleted':
      assertString(record.eventId, 'eventId', type);
      assertMarketId(record, type);
      assertString(record.dealDate, 'dealDate', type);
      assertNumber(record.totalAmount, 'totalAmount', type);
      assertNumber(record.totalCost, 'totalCost', type);
      assertNumber(record.dealCount, 'dealCount', type);
      return;

    case 'settings_updated':
      return;
  }
}

export function mergeProductsSold(
  existing: ProductSoldEntry[] = [],
  additions: ProductSoldEntry[] = []
): ProductSoldEntry[] {
  const merged = new Map<string, ProductSoldEntry>();

  for (const item of existing) {
    merged.set(item.productId, { ...item });
  }

  for (const item of additions) {
    const current = merged.get(item.productId);
    merged.set(item.productId, {
      productId: item.productId,
      quantity: (current?.quantity || 0) + item.quantity,
      revenue: (current?.revenue || 0) + item.revenue,
    });
  }

  return [...merged.values()];
}

export function subtractProductsSold(
  existing: ProductSoldEntry[] = [],
  removals: ProductSoldEntry[] = []
): ProductSoldEntry[] {
  const merged = new Map<string, ProductSoldEntry>();

  for (const item of existing) {
    merged.set(item.productId, { ...item });
  }

  for (const item of removals) {
    const current = merged.get(item.productId);
    if (!current) continue;

    const quantity = Math.max(0, current.quantity - item.quantity);
    const revenue = Math.max(0, current.revenue - item.revenue);

    if (quantity > 0 || revenue > 0) {
      merged.set(item.productId, {
        productId: item.productId,
        quantity,
        revenue,
      });
    } else {
      merged.delete(item.productId);
    }
  }

  return [...merged.values()];
}

/**
 * 核心函數：記錄事件（UUID 版本）- 優化版本
 * 
 * 這是整個事件溯源系統的核心函數
 * 流程：
 * 1. 接收一個事件
 * 2. 生成 UUID（如果沒有提供）
 * 3. 寫入 events 表（不可變記錄）
 * 4. 根據事件類型調用對應的處理器更新快照表
 * 5. 使用 transaction 確保原子性操作
 * 
 * @param type - 事件類型
 * @param payload - 事件資料
 * @param eventId - 可選的事件 ID（用於同步）
 * @returns 事件 ID（UUID）
 */
export async function recordEvent<T extends EventType>(
  type: T,
  payload: EventPayloadMap[T],
  eventId?: string
): Promise<string>;
export async function recordEvent(
  type: EventType,
  payload: Record<string, unknown>,
  eventId?: string
): Promise<string>;
export async function recordEvent(
  type: EventType,
  payload: EventPayload,
  eventId?: string
): Promise<string> {
  try {
    // 確保資料庫已開啟
    if (!db.isOpen()) {
      await db.open();
    }

    // 生成或使用提供的 UUID
    const id = eventId || generateUUID();

    // ✅ 獲取真實的用戶 ID（用於同步）
    let actor_id = 'local'; // 預設值
    if (typeof window !== 'undefined') {
      try {
        const { supabase } = await import('@/lib/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          actor_id = user.id;
        }
      } catch (error) {
        console.warn('⚠️ 無法獲取用戶 ID，使用預設值 "local"');
      }
    }

    // ✅ 計算時間戳：只有補登交易使用指定日期的 23:59，正常交易使用當前時間
    validateEventPayload(type, payload);

    let timestamp = Date.now();
    
    if (type === 'deal_closed' && payload && typeof payload === 'object') {
      const dealPayload = payload as unknown as DealClosedPayload;
      
      // ✅ 關鍵修正：只有明確標記為補登（isBackfill = true）時才使用 23:59
      // 正常交易（快速新增收入、商品銷售）使用當前時間
      if (dealPayload.isBackfill === true && dealPayload.dealDate) {
        // 解析日期字串 (YYYY-MM-DD)
        const [year, month, day] = dealPayload.dealDate.split('-').map(Number);
        
        // 建立該日期的 23:59:59 時間戳
        const backfillDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        timestamp = backfillDate.getTime();
        
        console.log(`⏰ 補登時間設置為：${dealPayload.dealDate} 23:59:59`);
      }
      // ✅ 正常交易：使用當前時間（已在上面設置）
      else {
        console.log(`⏰ 正常交易時間：${new Date(timestamp).toLocaleString('zh-TW')}`);
      }
    }

    const preparedEvent = prepareEventForInsert(type, payload);

    // 建立事件物件
    const event: Event<EventPayload> = {
      id,
      type,
      payload: preparedEvent.payload,
      timestamp,
      actor_id, // ✅ 使用真實的用戶 ID
      sync_status: 'local_only',
      metadata: {
        version: '1.0.0',
      },
    };

    // ✅ 優化：使用 transaction 確保原子性，並減少不必要的等待
    event.market_id = preparedEvent.market_id ?? pickMarketId(preparedEvent.payload);

    await db.transaction(
      'rw',
      [db.events, db.markets, db.products, db.dailyStats],
      async () => {
        // 步驟 1：寫入事件到 events 表
        await db.events.add(event);

        // 步驟 2：查找並執行對應的事件處理器
        const handler = eventHandlers[type];
        if (handler) {
          await handler(event, db);
        } else {
          console.warn(`⚠️ 未找到事件類型 "${type}" 的處理器`);
        }
      }
    );

    console.log(`✅ 事件已記錄：${type} (ID: ${id.substring(0, 8)}...)`);
    
    // ✅ 優化：使用 queueMicrotask 非阻塞觸發同步
    if (typeof window !== 'undefined') {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('trigger-sync', {
          detail: { eventType: type, eventId: id }
        }));
      });
    }
    
    return id;
  } catch (error) {
    const err = error as Error;
    console.error(`❌ 記錄事件失敗：${type}`, error);
    console.error('錯誤詳情:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    throw error;
  }
}

// ==================== 市集相關事件處理器 ====================

/**
 * 處理「市集建立」事件（UUID 版本）
 * 
 * 當 market_created 事件發生時：
 * 1. 在 markets 表中新增一筆記錄
 * 2. 初始狀態設為 'registered'（已報名）
 * 3. ✅ 支持多選日期（dates 陣列）
 */
registerEventHandler('market_created', async (event: Event<MarketCreatedPayload>, db) => {
  const { payload } = event;
  
  // ✅ 統一使用 market_id（底線式）
  // 生成市集 UUID（如果 payload 中已有則使用，否則生成新的）
  const payloadWithId = payload as MarketCreatedPayload & { market_id?: string; marketId?: string };
  const market_id = payloadWithId.market_id || payloadWithId.marketId || generateUUID();
  
  // ✅ 處理日期：優先使用 dates 陣列，否則使用 startDate/endDate
  let dates: string[] = [];
  if (payload.dates && payload.dates.length > 0) {
    // 使用提供的日期陣列
    dates = [...payload.dates].sort();
  } else {
    // 降級：從 startDate 和 endDate 生成連續日期
    const { generateDateRange } = await import('@/lib/utils');
    dates = generateDateRange(payload.startDate, payload.endDate);
  }
  
  // ✅ 自動計算 startDate 和 endDate（取最早和最晚）
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  
  // 建立市集快照
  const market: Market = {
    id: market_id,
    name: payload.name,
    location: payload.location,
    dates,                       // ✅ 新增：日期陣列
    startDate,                   // ✅ 自動計算：最早日期
    endDate,                     // ✅ 自動計算：最晚日期
    startTime: payload.startTime,
    endTime: payload.endTime,
    status: 'registered', // 初始狀態：已報名
    
    // 多人協作欄位
    owner_id: event.actor_id || 'local',
    is_collaborative: false,
    sync_status: 'local_only',
    
    // 時間軸資訊
    earlyEntryEnabled: payload.earlyEntryEnabled,
    earlyEntryTime: payload.earlyEntryTime,
    checkInTime: payload.checkInTime,
    operatingStartTime: payload.operatingStartTime,
    operatingEndTime: payload.operatingEndTime,
    
    // 財務資訊
    registrationFee: payload.registrationFee,
    boothCost: payload.boothCost,
    deposit: payload.deposit,
    tableRental: payload.tableRental,
    chairRental: payload.chairRental,
    umbrellaRental: payload.umbrellaRental,
    tableclothRental: payload.tableclothRental,
    commissionRate: payload.commissionRate,
    
    // 免費提供標記
    tableFree: payload.tableFree,
    chairFree: payload.chairFree,
    umbrellaFree: payload.umbrellaFree,
    tableclothFree: payload.tableclothFree,
    
    notes: payload.notes,
    
    // 初始化統計資訊
    totalRevenue: 0,
    totalProfit: 0,
    totalInteractions: 0,
    totalDeals: 0,
    
    // 時間戳
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  };
  
  // 寫入 markets 表
  await db.markets.add(market);
  
  console.log(`📅 市集已建立：${market.name} (ID: ${market_id.substring(0, 8)}..., ${dates.length} 天)`);
});

/**
 * 處理「市集更新」事件
 * 
 * 當 market_updated 事件發生時：
 * 更新 markets 表中對應市集的資料
 */
registerEventHandler('market_updated', async (event: Event<{ market_id: string; updates: Partial<Market> }>, db) => {
  const { market_id, updates } = event.payload;
  
  // 更新市集資料
  await db.markets.update(market_id, {
    ...updates,
    updatedAt: event.timestamp,
  });
  
  console.log(`📅 市集已更新：ID ${market_id.substring(0, 8)}...`);
});

/**
 * 處理「市集狀態變更」事件
 * 
 * 當 market_status_changed 事件發生時：
 * 更新 markets 表中對應市集的狀態
 */
registerEventHandler('market_status_changed', async (event: Event<MarketStatusChangedPayload>, db) => {
  const market_id = pickMarketId(event.payload)!;
  const { newStatus } = event.payload;
  
  // 更新市集狀態
  const updated = await db.markets.update(market_id, {
    status: newStatus,
    updatedAt: event.timestamp,
  });
  if (updated === 0) {
    throw new Error(`Market not found for ${event.type}: ${market_id}`);
  }
  
  console.log(`📅 市集狀態已更新：ID ${market_id} -> ${newStatus}`);
});

/**
 * 處理「市集開始營業」事件
 * 
 * 當 market_started 事件發生時：
 * 1. 更新市集狀態為 'ongoing'
 * 2. 設定營業階段為 'operating'
 */
registerEventHandler('market_started', async (event: Event<{ market_id: string }>, db) => {
  const { market_id } = event.payload;
  
  const updated = await db.markets.update(market_id, {
    status: 'ongoing',
    operationPhase: 'operating',
    updatedAt: event.timestamp,
  });
  if (updated === 0) {
    throw new Error(`Market not found for ${event.type}: ${market_id}`);
  }
  
  console.log(`🎪 市集開始營業：ID ${market_id}`);
});

/**
 * 處理「市集結束營業」事件
 * 
 * 當 market_ended 事件發生時：
 * 1. 更新市集狀態為 'completed'
 * 2. 清除營業階段
 */
registerEventHandler('market_ended', async (event: Event<{ market_id: string }>, db) => {
  const { market_id } = event.payload;
  
  const updated = await db.markets.update(market_id, {
    status: 'completed',
    operationPhase: undefined,
    updatedAt: event.timestamp,
  });
  if (updated === 0) {
    throw new Error(`Market not found for ${event.type}: ${market_id}`);
  }
  
  console.log(`✅ 市集已結束：ID ${market_id}`);
});

/**
 * 處理「市集刪除」事件（軟刪除）
 * 
 * 當 market_deleted 事件發生時：
 * 1. 標記市集為已刪除（isDeleted = true）
 * 2. 不會真正刪除資料，只是不顯示在列表中
 * 
 * 注意：這與「已取消」狀態不同
 * - 已取消（cancelled）：市集狀態，仍顯示在列表中
 * - 已刪除（isDeleted）：軟刪除標記，不顯示在列表中
 */
registerEventHandler('market_deleted', async (event: Event<{ marketId?: string; market_id?: string; reason?: string }>, db) => {
  const marketId = pickMarketId(event.payload)!;
  
  const updated = await db.markets.update(marketId, {
    isDeleted: true,
    updatedAt: event.timestamp,
  });
  if (updated === 0) {
    throw new Error(`Market not found for ${event.type}: ${marketId}`);
  }
  
  console.log(`🗑️ 市集已刪除（軟刪除）：ID ${marketId.substring(0, 8)}...`);
});

// ==================== 商品相關事件處理器 ====================

/**
 * 處理「商品建立」事件（UUID 版本）
 */
registerEventHandler('product_created', async (event: Event<ProductCreatedPayload>, db) => {
  const { payload } = event;
  
  // 生成商品 UUID（如果 payload 中已有則使用，否則生成新的）
  const payloadWithId = productCreatedPayloadToLocal(payload as ProductCreatedPayload & Record<string, unknown>);
  const productId = payloadWithId.productId || generateUUID();
  
  await db.products.add({
    id: productId,
    owner_id: event.actor_id || 'local',  // ✅ 商品所有者
    market_id: event.market_id,           // ✅ 可選：首次創建的市集
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
    isShared: payloadWithId.isShared || false,  // ✅ 是否共享
    totalSold: 0,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  });
  
  console.log(`📦 商品已建立：${payload.name}${payload.unlimitedStock ? ' (不限庫存)' : ''} (ID: ${productId.substring(0, 8)}...)`);
});

/**
 * 處理「商品更新」事件
 */
registerEventHandler('product_updated', async (event: Event<ProductUpdatedPayload>, db) => {
  const { productId, updates } = event.payload;
  
  const updated = await db.products.update(productId, {
    ...updates,
    updatedAt: event.timestamp,
  });
  if (updated === 0) {
    throw new Error(`Product not found for ${event.type}: ${productId}`);
  }
  
  console.log(`📦 商品已更新：ID ${productId}`);
});

/**
 * 處理「商品刪除」事件
 * 注意：我們不真正刪除商品，只是標記為不啟用
 */
registerEventHandler('product_deleted', async (event: Event<{ productId: string }>, db) => {
  const { productId } = event.payload;
  
  const updated = await db.products.update(productId, {
    isActive: false,
    updatedAt: event.timestamp,
  });
  if (updated === 0) {
    console.warn(`[events] Product not found for ${event.type}, treating as idempotent tombstone: ${productId}`);
    return;
  }
  
  console.log(`📦 商品已停用：ID ${productId}`);
});

// ==================== 互動相關事件處理器 ====================

/**
 * 處理「互動記錄」事件
 *
 * 當記錄互動時：
 * 1. 更新市集的互動統計
 * 2. 更新每日統計（支持自定義按鈕）
 */
registerEventHandler('interaction_recorded', async (event: Event<InteractionRecordedPayload>, db) => {
  const market_id = pickMarketId(event.payload)!;
  const { type } = event.payload;

  // 更新市集統計
  const market = await db.markets.get(market_id);
  if (market) {
    await db.markets.update(market_id, {
      totalInteractions: (market.totalInteractions || 0) + 1,
      updatedAt: event.timestamp,
    });
  }

  // 更新每日統計（使用複合索引查詢）
  // ✅ 使用本地日期，避免時區問題
  const eventDate = new Date(event.timestamp);
  const date = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
  const dailyStat = await db.dailyStats
    .where('[date+marketId]')
    .equals([date, market_id])
    .first();

  if (dailyStat) {
    // ✅ 構建更新對象（支持自定義按鈕）
    const updates: { updatedAt: number; touchCount?: number; inquiryCount?: number; extraInteractions?: Record<string, number> } = { updatedAt: event.timestamp };

    // 預設類型
    if (type === 'touch') updates.touchCount = (dailyStat.touchCount || 0) + 1;
    if (type === 'inquiry') updates.inquiryCount = (dailyStat.inquiryCount || 0) + 1;

    // ✅ 自定義按鈕：使用 extraInteractions 記錄
    if (type !== 'touch' && type !== 'inquiry') {
      const currentExtra = dailyStat.extraInteractions || {};
      updates.extraInteractions = {
        ...currentExtra,
        [type]: (currentExtra[type] || 0) + 1,
      };
    }

    await db.dailyStats.update(dailyStat.id!, updates);
  } else {
    // ✅ 建立新的每日統計（支持自定義按鈕）
    const extraInteractions: Record<string, number> = {};

    // 自定義按鈕計入 extraInteractions
    if (type !== 'touch' && type !== 'inquiry') {
      extraInteractions[type] = 1;
    }

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
      extraInteractions: Object.keys(extraInteractions).length > 0 ? extraInteractions : undefined,
      updatedAt: event.timestamp,
    });
  }

  console.log(`👋 互動已記錄：${type} (市集 ID: ${market_id})`);
});

/**
 * 處理「成交」事件（UUID 版本 + 交易快照 + 每日收入記錄 + 補登支持）
 * 
 * 當成交發生時：
 * 1. 更新市集的收入和成交統計
 * 2. 更新商品的銷售統計和庫存（若為有限庫存且非補登）
 * 3. ✅ 更新每日統計（支持多天市集的每日收入記錄）
 * 4. 儲存交易時的價格快照（防止歷史數據錯誤）
 * 5. ✅ 支持簡化補登（手動輸入金額）和完整補登（選擇商品）
 */
registerEventHandler('deal_closed', async (event: Event<DealClosedPayload>, db) => {
  const market_id = pickMarketId(event.payload)!;
  const { dealDate, isBackfill, isManualEntry } = event.payload;
  
  // ✅ 使用指定的交易日期，如果沒有則使用本地日期
  let transactionDate = dealDate;
  if (!transactionDate) {
    const eventDate = new Date(event.timestamp);
    transactionDate = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
  }
  
  let totalAmount = event.payload.totalAmount;
  let totalCost = 0;
  let dealCount = 1;
  const productsSold: ProductSoldEntry[] = [];
  
  // ========== 簡化模式：手動輸入 ==========
  if (isManualEntry) {
    totalAmount = event.payload.manualRevenue || 0;
    totalCost = event.payload.manualCost || 0;
    dealCount = event.payload.manualDealCount || 1;
    
    console.log(`📝 簡化補登：收入 NT$${totalAmount}，成本 NT$${totalCost}，成交 ${dealCount} 筆`);
  }
  // ========== 完整模式：選擇商品 ==========
  else {
    const { items } = event.payload;
    
    // 計算總成本並更新商品
    for (const item of items) {
      const product = await db.products.get(item.productId);
      
      if (product) {
        // 儲存交易時的價格快照
        item.price_at_time_of_sale = item.price || product.price;
        item.cost_at_time_of_sale = product.cost;
        item.product_name = product.name;
        productsSold.push({
          productId: item.productId,
          quantity: item.quantity,
          revenue: (item.price || product.price) * item.quantity,
        });
        
        if (product.cost) {
          totalCost += product.cost * item.quantity;
        }
        
        // 更新商品銷售統計
        const updates: { totalSold: number; updatedAt: number; stock?: number } = {
          totalSold: (product.totalSold || 0) + item.quantity,
          updatedAt: event.timestamp,
        };
        
        // ✅ 正常交易不得超賣；補登不扣庫存
        if (!isBackfill && !product.unlimitedStock) {
          const currentStock = product.stock ?? 0;
          if (currentStock < item.quantity) {
            throw new Error(
              `${product.name} 庫存不足！目前庫存：${currentStock}，需要：${item.quantity}`
            );
          }

          updates.stock = currentStock - item.quantity;
        }
        
        await db.products.update(item.productId, updates);
      }
    }
  }
  
  // ========== 更新市集統計 ==========
  const market = await db.markets.get(market_id);
  if (market) {
    const newTotalRevenue = (market.totalRevenue || 0) + totalAmount;
    const newTotalProfit = (market.totalProfit || 0) + (totalAmount - totalCost);
    const newTotalDeals = (market.totalDeals || 0) + dealCount;
    const newTotalInteractions = market.totalInteractions || 0;
    
    // 計算轉換率（防呆：分母為 0 時回傳 0）
    const conversionRate = newTotalInteractions > 0 
      ? (newTotalDeals / newTotalInteractions) * 100 
      : 0;
    
    // 計算客單價（防呆：分母為 0 時回傳 0）
    const averageOrderValue = newTotalDeals > 0 
      ? newTotalRevenue / newTotalDeals 
      : 0;
    
    await db.markets.update(market_id, {
      totalRevenue: newTotalRevenue,
      totalProfit: newTotalProfit,
      totalDeals: newTotalDeals,
      updatedAt: event.timestamp,
    });
    
    console.log(`📊 市集統計更新：轉換率 ${conversionRate.toFixed(1)}%，客單價 NT$${averageOrderValue.toFixed(0)}`);
  }
  
  // ========== 更新每日統計 ==========
  // ✅ 使用複合索引查詢（而不是複合主鍵）
  const dailyStat = await db.dailyStats
    .where('[date+marketId]')
    .equals([transactionDate, market_id])
    .first();
  
  if (dailyStat) {
    const currentDealCount = nonNegativeNumber(dailyStat.dealCount);
    const currentRevenue = nonNegativeNumber(dailyStat.revenue);
    const currentCost = nonNegativeNumber(dailyStat.cost);
    const currentProfit = finiteNumber(dailyStat.profit);
    await db.dailyStats.update(dailyStat.id!, {
      dealCount: currentDealCount + dealCount,
      revenue: currentRevenue + totalAmount,
      cost: currentCost + totalCost,
      profit: currentProfit + (totalAmount - totalCost),
      productsSold: mergeProductsSold(safeProductsSold(dailyStat.productsSold), productsSold),
      updatedAt: event.timestamp,
    });
  } else {
    await db.dailyStats.add({
      date: transactionDate,
      marketId: market_id,
      touchCount: 0,
      inquiryCount: 0,
      dealCount: dealCount,
      revenue: totalAmount,
      cost: totalCost,
      profit: totalAmount - totalCost,
      productsSold,
      updatedAt: event.timestamp,
    });
  }
  
  const modeText = isManualEntry ? '簡化補登' : isBackfill ? '完整補登' : '正常交易';
  console.log(`💰 ${modeText}已記錄：NT$${totalAmount} (日期: ${transactionDate}, 市集 ID: ${market_id.substring(0, 8)}...)`);
});

/**
 * 處理「刪除互動記錄」事件
 *
 * 當刪除互動記錄時：
 * 1. 保留原始事件，由 interaction_deleted 作為 tombstone
 * 2. 更新市集統計（扣除互動次數）
 * 3. 更新每日統計（扣除互動次數，支持自定義按鈕）
 */
registerEventHandler('interaction_deleted', async (event: Event<InteractionDeletedPayload>, db) => {
  const { eventId, market_id, interactionType } = event.payload;

  // 2. 更新市集統計
  const market = await db.markets.get(market_id);
  if (market) {
    await db.markets.update(market_id, {
      totalInteractions: Math.max(0, (market.totalInteractions || 0) - 1),
      updatedAt: event.timestamp,
    });
  }

  // ✅ 更新每日統計（支持自定義按鈕）
  const eventDate = new Date(event.timestamp);
  const date = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
  const dailyStat = await db.dailyStats
    .where('[date+marketId]')
    .equals([date, market_id])
    .first();

  if (dailyStat) {
    const updates: { updatedAt: number; touchCount?: number; inquiryCount?: number; extraInteractions?: Record<string, number> } = { updatedAt: event.timestamp };

    // 預設類型
    if (interactionType === 'touch') updates.touchCount = Math.max(0, (dailyStat.touchCount || 0) - 1);
    if (interactionType === 'inquiry') updates.inquiryCount = Math.max(0, (dailyStat.inquiryCount || 0) - 1);

    // ✅ 自定義按鈕：從 extraInteractions 扣除
    if (interactionType && interactionType !== 'touch' && interactionType !== 'inquiry') {
      const currentExtra = dailyStat.extraInteractions || {};
      const currentCount = currentExtra[interactionType] || 0;
      const newExtra = { ...currentExtra };
      if (currentCount > 0) {
        newExtra[interactionType] = currentCount - 1;
        if (newExtra[interactionType] === 0) delete newExtra[interactionType];
      }
      updates.extraInteractions = newExtra;
    }

    await db.dailyStats.update(dailyStat.id!, updates);
  }

  console.log(`🗑️ 互動記錄已刪除：ID ${eventId.substring(0, 8)}...`);
});

/**
 * 處理「刪除成交記錄」事件
 *
 * 當刪除成交記錄時：
 * 1. 保留原始事件，由 deal_deleted 作為 tombstone
 * 2. ✅ 恢復商品庫存
 * 3. 更新市集統計（扣除金額）
 * 4. 更新每日統計（扣除金額）
 */
registerEventHandler('deal_deleted', async (event: Event<DealDeletedPayload>, db) => {
  const { eventId, market_id, dealDate, totalAmount, totalCost, dealCount, productsSold = [] } = event.payload;

  const totalProfit = totalAmount - totalCost;

  // ✅ 2. 恢復商品庫存
  for (const soldItem of productsSold) {
    const product = await db.products.get(soldItem.productId);
    if (product) {
      // 如果商品庫存不是無限的，則恢復庫存
      if (!product.unlimitedStock && product.stock !== undefined) {
        await db.products.update(soldItem.productId, {
          stock: product.stock + soldItem.quantity,
          updatedAt: event.timestamp,
        });
        console.log(`📦 已恢復庫存：${product.name} x${soldItem.quantity}（市集 ID: ${market_id.substring(0, 8)}...）`);
      }
    }
  }

  // 3. 更新市集統計（扣除金額）
  const market = await db.markets.get(market_id);
  if (market) {
    await db.markets.update(market_id, {
      totalRevenue: Math.max(0, (market.totalRevenue || 0) - totalAmount),
      totalProfit: (market.totalProfit || 0) - totalProfit,
      totalDeals: Math.max(0, (market.totalDeals || 0) - dealCount),
      updatedAt: event.timestamp,
    });
  }

  // 4. 更新每日統計（扣除金額）
  const dailyStat = await db.dailyStats
    .where('[date+marketId]')
    .equals([dealDate, market_id])
    .first();

  if (dailyStat) {
    const newDealCount = Math.max(0, nonNegativeNumber(dailyStat.dealCount) - dealCount);
    const newRevenue = Math.max(0, nonNegativeNumber(dailyStat.revenue) - totalAmount);
    const newCost = Math.max(0, nonNegativeNumber(dailyStat.cost) - totalCost);
    const newProfit = finiteNumber(dailyStat.profit) - totalProfit;
    const newProductsSold = subtractProductsSold(safeProductsSold(dailyStat.productsSold), productsSold);

    // 如果該日期的統計歸零，刪除記錄
    if (newDealCount === 0 && newRevenue === 0) {
      await db.dailyStats.delete(dailyStat.id!);
    } else {
      await db.dailyStats.update(dailyStat.id!, {
        dealCount: newDealCount,
        revenue: newRevenue,
        cost: newCost,
        profit: newProfit,
        productsSold: newProductsSold,
        updatedAt: event.timestamp,
      });
    }
  }

  console.log(`🗑️ 成交記錄已刪除：NT$${totalAmount} (日期: ${dealDate}, 市集 ID: ${market_id.substring(0, 8)}...)`);
});

// ==================== 設定相關事件處理器 ====================

/**
 * 處理「設定更新」事件
 */
registerEventHandler('settings_updated', async (event: Event<Partial<Settings>>, db) => {
  const updates = event.payload;
  
  // 設定表只有一筆記錄（ID = 1）
  await db.settings.update(1, {
    ...updates,
    updatedAt: event.timestamp,
  });
  
  console.log('⚙️ 設定已更新');
});

// ==================== 輔助函數 ====================

/**
 * 查詢事件歷史
 * 
 * @param options - 查詢選項
 * @returns 事件列表
 */
export async function queryEvents(options: {
  type?: EventType;
  startTime?: number;
  endTime?: number;
  limit?: number;
}): Promise<Event[]> {
  let query = db.events.orderBy('timestamp').reverse();
  
  if (options.type) {
    query = db.events.where('type').equals(options.type).reverse();
  }
  
  if (options.startTime || options.endTime) {
    query = query.filter((event) => {
      if (options.startTime && event.timestamp < options.startTime) return false;
      if (options.endTime && event.timestamp > options.endTime) return false;
      return true;
    });
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  return await query.toArray();
}

/**
 * 重建快照（從事件歷史重建所有快照表）
 * 
 * ⚠️ 這是一個高級功能，通常不需要使用
 * 只在資料不一致時才需要重建
 */
async function collectIntegritySnapshot(): Promise<BackupData> {
  return {
    version: 1,
    exportedAt: Date.now(),
    events: await db.events.toArray(),
    markets: await db.markets.toArray(),
    products: await db.products.toArray(),
    dailyStats: await db.dailyStats.toArray(),
    settings: await db.settings.toArray(),
  };
}

export async function rebuildSnapshots(): Promise<void> {
  console.log('🔄 開始重建快照...');
  
  try {
    // 清空所有快照表
    await db.transaction('rw', [db.markets, db.products, db.dailyStats], async () => {
      await db.markets.clear();
      await db.products.clear();
      await db.dailyStats.clear();
    });
    
    // 按時間順序重放所有事件
    const events = await db.events.orderBy('timestamp').toArray();
    
    for (const event of events) {
      const handler = eventHandlers[event.type];
      if (handler) {
        await handler(event, db);
      }
    }

    const integrity = checkBackupIntegrity(await collectIntegritySnapshot());
    if (!integrity.ok) {
      throw new Error(`Snapshot rebuild produced inconsistent data:\n${integrity.errors.join('\n')}`);
    }

    if (integrity.warnings.length > 0) {
      console.warn('Snapshot rebuild completed with integrity warnings:', integrity.warnings);
    }
    
    console.log(`✅ 快照重建完成：處理了 ${events.length} 個事件`);
  } catch (error) {
    console.error('❌ 重建快照失敗：', error);
    throw error;
  }
}

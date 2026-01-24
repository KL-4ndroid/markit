/**
 * Market Pulse - 事件溯源核心邏輯
 * 
 * 本檔案實作事件溯源 (Event Sourcing) 的核心功能
 * 所有資料變更都透過事件記錄，確保完整的歷史追蹤
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

/**
 * 核心函數：記錄事件（UUID 版本）
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
export async function recordEvent<T = any>(
  type: EventType,
  payload: T,
  eventId?: string
): Promise<string> {
  try {
    // 確保資料庫已開啟
    if (!db.isOpen()) {
      await db.open();
    }

    // 生成或使用提供的 UUID
    const id = eventId || generateUUID();

    // 建立事件物件
    const event: Event<T> = {
      id,
      type,
      payload,
      timestamp: Date.now(),
      actor_id: 'local', // 本地用戶標記
      sync_status: 'local_only',
      metadata: {
        version: '1.0.0',
      },
    };

    // 從 payload 中提取 market_id（如果有）
    if (payload && typeof payload === 'object') {
      // ✅ 統一使用 market_id（底線式）
      if ('market_id' in payload) {
        event.market_id = (payload as any).market_id;
      } else if ('marketId' in payload) {
        // 兼容舊的駝峰式命名
        event.market_id = (payload as any).marketId;
      }
    }

    // 使用 transaction 確保原子性
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
    
    // ✅ 立即觸發同步（如果在瀏覽器環境）
    if (typeof window !== 'undefined') {
      // 使用 setTimeout 避免阻塞，延遲 100ms 讓事件處理完成
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-sync', {
          detail: { eventType: type, eventId: id }
        }));
      }, 100);
    }
    
    return id;
  } catch (error: any) {
    console.error(`❌ 記錄事件失敗：${type}`, error);
    console.error('錯誤詳情:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
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
 */
registerEventHandler('market_created', async (event: Event<MarketCreatedPayload>, db) => {
  const { payload } = event;
  
  // ✅ 統一使用 market_id（底線式）
  // 生成市集 UUID（如果 payload 中已有則使用，否則生成新的）
  const market_id = (payload as any).market_id || (payload as any).marketId || generateUUID();
  
  // 建立市集快照
  const market: Market = {
    id: market_id,
    name: payload.name,
    location: payload.location,
    startDate: payload.startDate,
    endDate: payload.endDate,
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
  
  // ✅ 更新事件的 market_id 和 payload（統一使用 market_id 和底線式命名）
  const updates: any = { market_id };
  
  // ✅ 總是轉換 payload 為底線式命名（用於 Supabase 同步）
  // 檢查是否已經有底線式欄位，如果沒有則添加
  if (!(payload as any).start_date || !(payload as any).end_date) {
    updates.payload = {
      ...payload,
      market_id,
      start_date: payload.startDate,
      end_date: payload.endDate,
      start_time: payload.startTime,
      end_time: payload.endTime,
      early_entry_enabled: payload.earlyEntryEnabled,
      early_entry_time: payload.earlyEntryTime,
      check_in_time: payload.checkInTime,
      operating_start_time: payload.operatingStartTime,
      operating_end_time: payload.operatingEndTime,
      registration_fee: payload.registrationFee,
      booth_cost: payload.boothCost,
      deposit: payload.deposit,  // ✅ 添加 deposit
      table_rental: payload.tableRental,
      chair_rental: payload.chairRental,
      umbrella_rental: payload.umbrellaRental,
      tablecloth_rental: payload.tableclothRental,
      commission_rate: payload.commissionRate,
      table_free: payload.tableFree,
      chair_free: payload.chairFree,
      umbrella_free: payload.umbrellaFree,
      tablecloth_free: payload.tableclothFree,
      notes: payload.notes,  // ✅ 添加 notes
    };
  }
  
  await db.events.update(event.id!, updates);
  
  console.log(`📅 市集已建立：${market.name} (ID: ${market_id.substring(0, 8)}...)`);
});

/**
 * 處理「市集狀態變更」事件
 * 
 * 當 market_status_changed 事件發生時：
 * 更新 markets 表中對應市集的狀態
 */
registerEventHandler('market_status_changed', async (event: Event<MarketStatusChangedPayload>, db) => {
  const { market_id, newStatus } = event.payload as any;
  
  // 更新市集狀態
  await db.markets.update(market_id, {
    status: newStatus,
    updatedAt: event.timestamp,
  });
  
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
  const { market_id } = event.payload as any;
  
  await db.markets.update(market_id, {
    status: 'ongoing',
    operationPhase: 'operating',
    updatedAt: event.timestamp,
  });
  
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
  const { market_id } = event.payload as any;
  
  await db.markets.update(market_id, {
    status: 'completed',
    operationPhase: undefined,
    updatedAt: event.timestamp,
  });
  
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
registerEventHandler('market_deleted', async (event: Event<{ marketId: string; reason?: string }>, db) => {
  const { marketId } = event.payload;
  
  await db.markets.update(marketId, {
    isDeleted: true,
    updatedAt: event.timestamp,
  });
  
  console.log(`🗑️ 市集已刪除（軟刪除）：ID ${marketId.substring(0, 8)}...`);
});

// ==================== 商品相關事件處理器 ====================

/**
 * 處理「商品建立」事件（UUID 版本）
 */
registerEventHandler('product_created', async (event: Event<ProductCreatedPayload>, db) => {
  const { payload } = event;
  
  // 生成商品 UUID（如果 payload 中已有則使用，否則生成新的）
  const productId = (payload as any).productId || generateUUID();
  
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
    isShared: (payload as any).isShared || false,  // ✅ 是否共享
    totalSold: 0,
    createdAt: event.timestamp,
    updatedAt: event.timestamp,
  });
  
  // 將 productId 寫回 payload（用於同步）
  if (!(payload as any).productId) {
    await db.events.update(event.id!, {
      payload: { ...payload, productId } as any,
    });
  }
  
  console.log(`📦 商品已建立：${payload.name}${payload.unlimitedStock ? ' (不限庫存)' : ''} (ID: ${productId.substring(0, 8)}...)`);
});

/**
 * 處理「商品更新」事件
 */
registerEventHandler('product_updated', async (event: Event<ProductUpdatedPayload>, db) => {
  const { productId, updates } = event.payload;
  
  await db.products.update(productId, {
    ...updates,
    updatedAt: event.timestamp,
  });
  
  console.log(`📦 商品已更新：ID ${productId}`);
});

/**
 * 處理「商品刪除」事件
 * 注意：我們不真正刪除商品，只是標記為不啟用
 */
registerEventHandler('product_deleted', async (event: Event<{ productId: number }>, db) => {
  const { productId } = event.payload;
  
  await db.products.update(productId, {
    isActive: false,
    updatedAt: event.timestamp,
  });
  
  console.log(`📦 商品已停用：ID ${productId}`);
});

// ==================== 互動相關事件處理器 ====================

/**
 * 處理「互動記錄」事件
 * 
 * 當記錄互動（摸摸、詢問）時：
 * 1. 更新市集的互動統計
 * 2. 更新每日統計
 */
registerEventHandler('interaction_recorded', async (event: Event<InteractionRecordedPayload>, db) => {
  const { market_id, type } = event.payload as any;
  
  // 更新市集統計
  const market = await db.markets.get(market_id);
  if (market) {
    await db.markets.update(market_id, {
      totalInteractions: (market.totalInteractions || 0) + 1,
      updatedAt: event.timestamp,
    });
  }
  
  // 更新每日統計
  const date = new Date(event.timestamp).toISOString().split('T')[0];
  const dailyStat = await db.dailyStats.get(date);
  
  if (dailyStat) {
    // 更新現有統計
    const updates: any = { updatedAt: event.timestamp };
    if (type === 'touch') updates.touchCount = dailyStat.touchCount + 1;
    if (type === 'inquiry') updates.inquiryCount = dailyStat.inquiryCount + 1;
    
    await db.dailyStats.update(date, updates);
  } else {
    // 建立新的每日統計
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

/**
 * 處理「成交」事件（UUID 版本 + 交易快照）
 * 
 * 當成交發生時：
 * 1. 更新市集的收入和成交統計
 * 2. 更新商品的銷售統計和庫存（若為有限庫存）
 * 3. 更新每日統計
 * 4. 儲存交易時的價格快照（防止歷史數據錯誤）
 */
registerEventHandler('deal_closed', async (event: Event<DealClosedPayload>, db) => {
  const { market_id, items, totalAmount } = event.payload as any;
  
  // 計算總成本並更新商品
  let totalCost = 0;
  for (const item of items) {
    const product = await db.products.get(item.productId);
    
    // 儲存交易時的價格快照
    if (product) {
      item.price_at_time_of_sale = item.price || product.price;
      item.cost_at_time_of_sale = product.cost;
      item.product_name = product.name;
      
      if (product.cost) {
        totalCost += product.cost * item.quantity;
      }
    }
    
    // 更新商品銷售統計和庫存
    if (product) {
      const updates: any = {
        totalSold: (product.totalSold || 0) + item.quantity,
        updatedAt: event.timestamp,
      };
      
      // 只有「有限庫存」商品才扣除庫存
      if (!product.unlimitedStock && product.stock !== undefined) {
        updates.stock = Math.max(0, product.stock - item.quantity);
      }
      
      await db.products.update(item.productId, updates);
    }
  }
  
  // 更新市集統計
  const market = await db.markets.get(market_id);
  if (market) {
    const newTotalRevenue = (market.totalRevenue || 0) + totalAmount;
    const newTotalProfit = (market.totalProfit || 0) + (totalAmount - totalCost);
    const newTotalDeals = (market.totalDeals || 0) + 1;
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
  
  // 更新每日統計
  const date = new Date(event.timestamp).toISOString().split('T')[0];
  const dailyStat = await db.dailyStats.get(date);
  
  if (dailyStat) {
    await db.dailyStats.update(date, {
      dealCount: dailyStat.dealCount + 1,
      revenue: dailyStat.revenue + totalAmount,
      cost: dailyStat.cost + totalCost,
      profit: dailyStat.profit + (totalAmount - totalCost),
      updatedAt: event.timestamp,
    });
  } else {
    await db.dailyStats.add({
      date,
      marketId: market_id,
      touchCount: 0,
      inquiryCount: 0,
      dealCount: 1,
      revenue: totalAmount,
      cost: totalCost,
      profit: totalAmount - totalCost,
      productsSold: [],
      updatedAt: event.timestamp,
    });
  }
  
  console.log(`💰 成交已記錄：NT$${totalAmount} (市集 ID: ${market_id.substring(0, 8)}...)`);
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
    
    console.log(`✅ 快照重建完成：處理了 ${events.length} 個事件`);
  } catch (error) {
    console.error('❌ 重建快照失敗：', error);
    throw error;
  }
}

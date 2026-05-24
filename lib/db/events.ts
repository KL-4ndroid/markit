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
export async function recordEvent<T = Record<string, unknown>>(
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

    // 建立事件物件
    const event: Event<T> = {
      id,
      type,
      payload,
      timestamp,
      actor_id, // ✅ 使用真實的用戶 ID
      sync_status: 'local_only',
      metadata: {
        version: '1.0.0',
      },
    };

    // 從 payload 中提取 market_id（如果有）
    if (payload && typeof payload === 'object') {
      // ✅ 統一使用 market_id（底線式）
      if ('market_id' in payload) {
        event.market_id = (payload as Record<string, unknown>).market_id as string;
      } else if ('marketId' in payload) {
        // 兼容舊的駝峰式命名
        event.market_id = (payload as Record<string, unknown>).marketId as string;
      }
    }

    // ✅ 優化：使用 transaction 確保原子性，並減少不必要的等待
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
  
  // ✅ 更新事件的 market_id 和 payload（統一使用 market_id 和底線式命名）
  const updates: { market_id: string; payload?: Record<string, unknown> } = { market_id };
  
  // ✅ 總是轉換 payload 為底線式命名（用於 Supabase 同步）
  // 檢查是否已經有底線式欄位，如果沒有則添加
  const payloadWithSnakeCase = payload as MarketCreatedPayload & { start_date?: string; end_date?: string };
  if (!payloadWithSnakeCase.start_date || !payloadWithSnakeCase.end_date) {
    updates.payload = {
      ...payload,
      market_id,
      dates,                     // ✅ 添加 dates 陣列
      start_date: startDate,     // ✅ 使用計算後的最早日期
      end_date: endDate,         // ✅ 使用計算後的最晚日期
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
  
  // ✅ 轉換 payload 為底線式命名（用於 Supabase 同步）
  const snakeCaseUpdates: Record<string, unknown> = {};
  
  // 基本資訊
  if (updates.name !== undefined) snakeCaseUpdates.name = updates.name;
  if (updates.location !== undefined) snakeCaseUpdates.location = updates.location;
  if (updates.dates !== undefined) snakeCaseUpdates.dates = updates.dates;
  if (updates.startDate !== undefined) snakeCaseUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) snakeCaseUpdates.end_date = updates.endDate;
  if (updates.startTime !== undefined) snakeCaseUpdates.start_time = updates.startTime;
  if (updates.endTime !== undefined) snakeCaseUpdates.end_time = updates.endTime;
  
  // 時間軸資訊
  if (updates.earlyEntryEnabled !== undefined) snakeCaseUpdates.early_entry_enabled = updates.earlyEntryEnabled;
  if (updates.earlyEntryTime !== undefined) snakeCaseUpdates.early_entry_time = updates.earlyEntryTime;
  if (updates.checkInTime !== undefined) snakeCaseUpdates.check_in_time = updates.checkInTime;
  if (updates.operatingStartTime !== undefined) snakeCaseUpdates.operating_start_time = updates.operatingStartTime;
  if (updates.operatingEndTime !== undefined) snakeCaseUpdates.operating_end_time = updates.operatingEndTime;
  
  // 財務資訊
  if (updates.registrationFee !== undefined) snakeCaseUpdates.registration_fee = updates.registrationFee;
  if (updates.boothCost !== undefined) snakeCaseUpdates.booth_cost = updates.boothCost;
  if (updates.deposit !== undefined) snakeCaseUpdates.deposit = updates.deposit;
  if (updates.tableRental !== undefined) snakeCaseUpdates.table_rental = updates.tableRental;
  if (updates.chairRental !== undefined) snakeCaseUpdates.chair_rental = updates.chairRental;
  if (updates.umbrellaRental !== undefined) snakeCaseUpdates.umbrella_rental = updates.umbrellaRental;
  if (updates.tableclothRental !== undefined) snakeCaseUpdates.tablecloth_rental = updates.tableclothRental;
  if (updates.commissionRate !== undefined) snakeCaseUpdates.commission_rate = updates.commissionRate;
  
  // 免費提供標記
  if (updates.tableFree !== undefined) snakeCaseUpdates.table_free = updates.tableFree;
  if (updates.chairFree !== undefined) snakeCaseUpdates.chair_free = updates.chairFree;
  if (updates.umbrellaFree !== undefined) snakeCaseUpdates.umbrella_free = updates.umbrellaFree;
  if (updates.tableclothFree !== undefined) snakeCaseUpdates.tablecloth_free = updates.tableclothFree;
  
  // 備註
  if (updates.notes !== undefined) snakeCaseUpdates.notes = updates.notes;
  
  // 更新事件的 payload 為底線式命名
  await db.events.update(event.id!, {
    payload: {
      market_id,
      updates: snakeCaseUpdates,
    },
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
  const payloadWithMarketId = event.payload as MarketStatusChangedPayload & { market_id?: string };
  const market_id = payloadWithMarketId.market_id || payloadWithMarketId.marketId;
  const { newStatus } = event.payload;
  
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
  const { market_id } = event.payload;
  
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
  const { market_id } = event.payload;
  
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
  const payloadWithId = payload as ProductCreatedPayload & { productId?: string };
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
  
  // 將 productId 寫回 payload（用於同步）
  if (!payloadWithId.productId) {
    await db.events.update(event.id!, {
      payload: { ...payload, productId },
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
  const payloadWithMarketId = event.payload as InteractionRecordedPayload & { market_id?: string };
  const market_id = payloadWithMarketId.market_id || payloadWithMarketId.marketId;
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
    // 更新現有統計
    const updates: { updatedAt: number; touchCount?: number; inquiryCount?: number } = { updatedAt: event.timestamp };
    if (type === 'touch') updates.touchCount = dailyStat.touchCount + 1;
    if (type === 'inquiry') updates.inquiryCount = dailyStat.inquiryCount + 1;
    
    await db.dailyStats.update(dailyStat.id!, updates);
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
  const payloadWithMarketId = event.payload as DealClosedPayload & { market_id?: string };
  const market_id = payloadWithMarketId.market_id || payloadWithMarketId.marketId;
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
        
        if (product.cost) {
          totalCost += product.cost * item.quantity;
        }
        
        // 更新商品銷售統計
        const updates: { totalSold: number; updatedAt: number; stock?: number } = {
          totalSold: (product.totalSold || 0) + item.quantity,
          updatedAt: event.timestamp,
        };
        
        // ✅ 關鍵：補登時不扣庫存
        if (!isBackfill && !product.unlimitedStock && product.stock !== undefined) {
          updates.stock = Math.max(0, product.stock - item.quantity);
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
    await db.dailyStats.update(dailyStat.id!, {
      dealCount: dailyStat.dealCount + dealCount,
      revenue: dailyStat.revenue + totalAmount,
      cost: dailyStat.cost + totalCost,
      profit: dailyStat.profit + (totalAmount - totalCost),
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
      productsSold: [],
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
 * 1. 從 events 表中刪除原始事件
 * 2. 更新市集統計（扣除互動次數）
 * 3. 更新每日統計（扣除互動次數）
 */
registerEventHandler('interaction_deleted', async (event: Event<{ eventId: string; marketId: string }>, db) => {
  const { eventId, marketId } = event.payload;
  
  // 1. 刪除原始事件
  await db.events.delete(eventId);
  
  // 2. 更新市集統計
  const market = await db.markets.get(marketId);
  if (market) {
    await db.markets.update(marketId, {
      totalInteractions: Math.max(0, (market.totalInteractions || 0) - 1),
      updatedAt: event.timestamp,
    });
  }
  
  console.log(`🗑️ 互動記錄已刪除：ID ${eventId.substring(0, 8)}...`);
});

/**
 * 處理「刪除成交記錄」事件
 * 
 * 當刪除成交記錄時：
 * 1. 從 events 表中刪除原始事件
 * 2. 更新市集統計（扣除金額）
 * 3. 更新每日統計（扣除金額）
 */
registerEventHandler('deal_deleted', async (event: Event<{ eventId: string; marketId: string; dealDate: string; totalAmount: number; totalCost: number; dealCount: number }>, db) => {
  const { eventId, marketId, dealDate, totalAmount, totalCost, dealCount } = event.payload;
  
  const totalProfit = totalAmount - totalCost;
  
  // 1. 刪除原始事件
  await db.events.delete(eventId);
  
  // 2. 更新市集統計（扣除金額）
  const market = await db.markets.get(marketId);
  if (market) {
    await db.markets.update(marketId, {
      totalRevenue: Math.max(0, (market.totalRevenue || 0) - totalAmount),
      totalProfit: (market.totalProfit || 0) - totalProfit,
      totalDeals: Math.max(0, (market.totalDeals || 0) - dealCount),
      updatedAt: event.timestamp,
    });
  }
  
  // 3. 更新每日統計（扣除金額）
  const dailyStat = await db.dailyStats
    .where('[date+marketId]')
    .equals([dealDate, marketId])
    .first();
  
  if (dailyStat) {
    const newDealCount = Math.max(0, dailyStat.dealCount - dealCount);
    const newRevenue = Math.max(0, dailyStat.revenue - totalAmount);
    const newCost = Math.max(0, dailyStat.cost - totalCost);
    const newProfit = dailyStat.profit - totalProfit;
    
    // 如果該日期的統計歸零，刪除記錄
    if (newDealCount === 0 && newRevenue === 0) {
      await db.dailyStats.delete(dailyStat.id!);
    } else {
      await db.dailyStats.update(dailyStat.id!, {
        dealCount: newDealCount,
        revenue: newRevenue,
        cost: newCost,
        profit: newProfit,
        updatedAt: event.timestamp,
      });
    }
  }
  
  console.log(`🗑️ 成交記錄已刪除：NT$${totalAmount} (日期: ${dealDate}, 市集 ID: ${marketId.substring(0, 8)}...)`);
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

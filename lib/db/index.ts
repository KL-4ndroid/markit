/**
 * Market Pulse - Dexie 資料庫定義
 * 
 * 本檔案定義 IndexedDB 資料庫結構
 * 使用 Dexie.js 作為 IndexedDB 的封裝層
 */

import Dexie, { Table } from 'dexie';
import { generateUUID } from './uuid';
import type {
  Event,
  Market,
  Product,
  DailyStats,
  Settings,
} from '@/types/db';

/**
 * 同步佇列項目介面
 */
export interface SyncQueueItem {
  id?: string;
  event_id: string;
  market_id: string;
  status: 'pending' | 'syncing' | 'success' | 'failed';
  retry_count: number;
  error_message?: string;
  created_at: number;
  updated_at: number;
}

/**
 * MarketPulseDB 類別
 * 繼承自 Dexie，定義所有資料表
 */
export class MarketPulseDB extends Dexie {
  // 資料表定義（UUID 版本）
  events!: Table<Event, string>;
  markets!: Table<Market, string>;
  products!: Table<Product, string>;
  dailyStats!: Table<DailyStats, string>;
  settings!: Table<Settings, number>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('MarketPulseDB');
    
    // 版本 1：初始版本
    this.version(1).stores({
      events: '++id, type, timestamp',
      markets: '++id, status, name, date',
      products: '++id, category, name, isActive',
      dailyStats: 'date, marketId',
      settings: '++id',
    });

    // 版本 2：更新 markets 表索引
    this.version(2).stores({
      markets: '++id, status, name, startDate, endDate',
    }).upgrade(async (trans) => {
      const markets = await trans.table('markets').toArray();
      for (const market of markets) {
        if (market.date && !market.startDate) {
          await trans.table('markets').update(market.id, {
            startDate: market.date,
            endDate: market.date,
          });
        }
      }
    });
    
    // 版本 3：UUID 遷移 + 多人協作支援
    this.version(3).stores({
      events: 'id, type, timestamp, actor_id, market_id, sync_status',
      markets: 'id, status, name, startDate, endDate, owner_id, is_collaborative, sync_status',
      products: 'id, category, name, isActive, market_id',
      dailyStats: 'date, marketId',
      settings: '++id',
      syncQueue: 'id, status, created_at',
    }).upgrade(async (trans) => {
      console.log('🔄 開始遷移到 UUID...');
      
      const startTime = Date.now();
      
      // 1. 遷移 Markets
      console.log('📊 遷移 Markets...');
      const oldMarkets = await trans.table('markets').toArray();
      const marketIdMap = new Map<number, string>();
      
      await trans.table('markets').clear();
      
      for (const market of oldMarkets) {
        const newId = generateUUID();
        marketIdMap.set(market.id as number, newId);
        
        await trans.table('markets').add({
          ...market,
          id: newId,
          owner_id: 'local',
          is_collaborative: false,
          sync_status: 'local_only',
        });
      }
      
      console.log(`✅ Markets 遷移完成：${oldMarkets.length} 筆`);
      
      // 2. 遷移 Products
      console.log('📦 遷移 Products...');
      const oldProducts = await trans.table('products').toArray();
      await trans.table('products').clear();
      
      for (const product of oldProducts) {
        await trans.table('products').add({
          ...product,
          id: generateUUID(),
          market_id: undefined, // 舊版本沒有 market_id
        });
      }
      
      console.log(`✅ Products 遷移完成：${oldProducts.length} 筆`);
      
      // 3. 遷移 Events
      console.log('📝 遷移 Events...');
      const oldEvents = await trans.table('events').toArray();
      await trans.table('events').clear();
      
      for (const event of oldEvents) {
        // 更新 payload 中的 marketId（如果有）
        let updatedPayload = event.payload;
        if (event.payload && typeof event.payload === 'object') {
          if ('marketId' in event.payload && typeof event.payload.marketId === 'number') {
            const newMarketId = marketIdMap.get(event.payload.marketId);
            if (newMarketId) {
              updatedPayload = { ...event.payload, marketId: newMarketId };
            }
          }
        }
        
        // 確定 market_id
        let marketId: string | undefined;
        if (updatedPayload && typeof updatedPayload === 'object' && 'marketId' in updatedPayload) {
          marketId = updatedPayload.marketId as string;
        }
        
        await trans.table('events').add({
          ...event,
          id: generateUUID(),
          payload: updatedPayload,
          actor_id: 'local',
          market_id: marketId,
          sync_status: 'local_only',
        });
      }
      
      console.log(`✅ Events 遷移完成：${oldEvents.length} 筆`);
      
      // 4. 更新 DailyStats 的 marketId
      console.log('📈 遷移 DailyStats...');
      const oldStats = await trans.table('dailyStats').toArray();
      await trans.table('dailyStats').clear();
      
      for (const stat of oldStats) {
        const newMarketId = stat.marketId && typeof stat.marketId === 'number' 
          ? marketIdMap.get(stat.marketId) 
          : undefined;
        
        await trans.table('dailyStats').add({
          ...stat,
          marketId: newMarketId,
        });
      }
      
      console.log(`✅ DailyStats 遷移完成：${oldStats.length} 筆`);
      
      const duration = Date.now() - startTime;
      console.log(`✅ UUID 遷移完成！耗時：${duration}ms`);
      console.log('📊 遷移統計：', {
        markets: oldMarkets.length,
        products: oldProducts.length,
        events: oldEvents.length,
        dailyStats: oldStats.length,
      });
    });
  }
}

/**
 * 資料庫實例
 * 全域單例，供整個應用使用
 */
export const db = new MarketPulseDB();

/**
 * 生成 UUID（導出供外部使用）
 */
export { generateUUID } from './uuid';

/**
 * 初始化資料庫
 * 在應用啟動時調用，確保預設資料存在
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // 開啟資料庫連接
    await db.open();
    
    // 檢查是否已有設定記錄
    const settingsCount = await db.settings.count();
    
    if (settingsCount === 0) {
      // 建立預設設定
      try {
        await db.settings.add({
          theme: 'auto',
          language: 'zh-TW',
          defaultCurrency: 'TWD',
          enableNotifications: true,
          autoBackup: false,
          updatedAt: Date.now(),
        });
        console.log('✅ 資料庫初始化完成：已建立預設設定');
      } catch (addError: any) {
        // 如果添加失敗（可能是因為已存在），忽略錯誤
        if (addError.name !== 'ConstraintError') {
          throw addError;
        }
        console.log('ℹ️ 預設設定已存在，跳過建立');
      }
    }
    
    // 記錄資料庫統計
    const stats = {
      events: await db.events.count(),
      markets: await db.markets.count(),
      products: await db.products.count(),
      dailyStats: await db.dailyStats.count(),
    };
    
    console.log('📊 資料庫統計：', stats);
  } catch (error) {
    console.error('❌ 資料庫初始化失敗：', error);
    // 不要拋出錯誤，讓應用繼續運行
    // throw error;
  }
}

/**
 * 清空所有資料（僅供開發/測試使用）
 * ⚠️ 警告：此操作不可逆！
 */
export async function clearAllData(): Promise<void> {
  try {
    await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats], async () => {
      await db.events.clear();
      await db.markets.clear();
      await db.products.clear();
      await db.dailyStats.clear();
    });
    
    console.log('🗑️ 所有資料已清空（設定保留）');
  } catch (error) {
    console.error('❌ 清空資料失敗：', error);
    throw error;
  }
}

/**
 * 匯出資料庫資料（用於備份）
 */
export async function exportData(): Promise<string> {
  try {
    const data = {
      version: 1,
      exportedAt: Date.now(),
      events: await db.events.toArray(),
      markets: await db.markets.toArray(),
      products: await db.products.toArray(),
      dailyStats: await db.dailyStats.toArray(),
      settings: await db.settings.toArray(),
    };
    
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('❌ 匯出資料失敗：', error);
    throw error;
  }
}

/**
 * 匯入資料庫資料（用於還原備份）
 */
export async function importData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData);
    
    // 驗證資料格式
    if (!data.version || !data.events || !data.markets) {
      throw new Error('無效的備份資料格式');
    }
    
    // 清空現有資料並匯入
    await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats, db.settings], async () => {
      await db.events.clear();
      await db.markets.clear();
      await db.products.clear();
      await db.dailyStats.clear();
      await db.settings.clear();
      
      await db.events.bulkAdd(data.events);
      await db.markets.bulkAdd(data.markets);
      await db.products.bulkAdd(data.products);
      await db.dailyStats.bulkAdd(data.dailyStats);
      await db.settings.bulkAdd(data.settings);
    });
    
    console.log('✅ 資料匯入完成');
  } catch (error) {
    console.error('❌ 匯入資料失敗：', error);
    throw error;
  }
}

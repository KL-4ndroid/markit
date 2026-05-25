/**
 * Market Pulse - 資料庫模組匯出
 * 
 * 統一匯出所有資料庫相關功能
 */

// 資料庫實例與初始化
export {
  db,
  MarketPulseDB,
  initializeDatabase,
  initializeDatabaseSafely,
  checkCurrentDatabaseIntegrity,
  clearAllData,
  exportData,
  importData,
} from './index';

export {
  createRecoveryBackup,
  getDatabaseRecoveryStatus,
  repairInvalidDailyStats,
  retryDatabaseRecovery,
} from './recovery';

// 事件溯源核心
export { recordEvent, queryEvents, rebuildSnapshots, registerEventHandler } from './events';

// React Hooks
export {
  // 市集相關
  useMarkets,
  useMarket,
  useUpcomingMarkets,
  createMarket,
  updateMarketStatus,
  startMarket,
  endMarket,
  
  // 商品相關
  useProducts,
  useProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  
  // 互動與交易
  recordInteraction,
  recordDeal,
  
  // 統計相關
  useDailyStats,
  useDateRangeStats,
  useMonthlyStats,
  
  // 設定相關
  useSettings,
  updateSettings,
  
  // 事件歷史
  useRecentEvents,
  useMarketEvents,
  
  // 資料庫統計
  useDatabaseStats,
} from './hooks';

// 型別匯出
export type {
  Event,
  EventType,
  EventHandler,
  Market,
  MarketStatus,
  OperationPhase,
  MarketCreatedPayload,
  MarketStatusChangedPayload,
  Product,
  ProductCategory,
  ProductCreatedPayload,
  ProductUpdatedPayload,
  InteractionType,
  InteractionRecordedPayload,
  DealClosedPayload,
  DailyStats,
  Settings,
  QueryOptions,
} from '@/types/db';

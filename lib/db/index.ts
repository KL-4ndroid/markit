/**
 * Féria - Dexie 資料庫定義
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
import type { LocalPendingSalesPhotoEvidenceCreation } from '@/lib/sales/photo-evidence-pending-creation';
import type { LocalPendingSalesPhotoEvidencePayload } from '@/lib/sales/photo-evidence-pending-payload-storage';
import {
  checkAppIntegrity,
  checkBackupIntegrity,
  parseBackupData,
  validateBackupReplayReadiness,
  type IntegrityCheckOptions,
  type BackupData,
  type IntegrityResult,
} from './integrity';
import {
  ImportOutcomeError,
  runPhaseAwareImport,
} from './import-runner';
import { getFilePort } from '@/lib/platform/file-capability';

export type DatabaseInitResult =
  | { ok: true; integrity: IntegrityResult }
  | { ok: false; error: Error; recoverable: boolean; integrity?: IntegrityResult };

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
  dailyStats!: Table<DailyStats, number>;  // ✅ 使用 number 作為主鍵類型（++id 自動遞增）
  settings!: Table<Settings, number>;
  syncQueue!: Table<SyncQueueItem, string>;
  salesPhotoEvidencePendingCreations!: Table<LocalPendingSalesPhotoEvidenceCreation, string>;
  salesPhotoEvidencePendingPayloads!: Table<LocalPendingSalesPhotoEvidencePayload, string>;

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
      markets: 'id, status, name, startDate, endDate, owner_id, is_collaborative, sync_status, isDeleted',  // ✅ 添加 isDeleted 索引
      products: 'id, category, name, isActive, market_id, owner_id',  // ✅ 添加 owner_id 索引
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
          isDeleted: false,  // ✅ 預設為未刪除
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
    
    // ✅ 版本 4：修復 dailyStats 主鍵（使用 ++id 自動遞增 + 複合索引）
    this.version(4).stores({
      events: 'id, type, timestamp, actor_id, market_id, sync_status',
      markets: 'id, status, name, startDate, endDate, owner_id, is_collaborative, sync_status, isDeleted',
      products: 'id, category, name, isActive, market_id, owner_id',
      dailyStats: '++id, [date+marketId], date, marketId',  // ✅ 使用自動遞增 ID + 複合索引
      settings: '++id',
      syncQueue: 'id, status, created_at',
    }).upgrade(async (trans) => {
      console.log('🔄 修復 dailyStats 索引...');
      
      // 讀取所有現有數據
      const oldStats = await trans.table('dailyStats').toArray();
      
      // 清空表
      await trans.table('dailyStats').clear();
      
      // 重新插入（Dexie 會自動生成新的 ID）
      for (const stat of oldStats) {
        if (stat.marketId) {
          // 移除舊的 ID，讓 Dexie 自動生成新的
          const { id, ...statWithoutId } = stat;
          await trans.table('dailyStats').add(statWithoutId);
        }
      }
      
      console.log(`✅ dailyStats 索引修復完成：${oldStats.length} 筆`);
    });

    this.version(5).stores({
      events: 'id, type, timestamp, actor_id, market_id, sync_status',
      markets: 'id, status, name, startDate, endDate, owner_id, is_collaborative, sync_status, isDeleted',
      products: 'id, category, name, isActive, market_id, owner_id',
      dailyStats: '++id, [date+marketId], date, marketId',
      settings: '++id',
      syncQueue: 'id, status, created_at',
      salesPhotoEvidencePendingCreations: 'queueId, saleEventId, ownerId, marketId, status, updatedAt, createdAt',
    });

    this.version(6).stores({
      events: 'id, type, timestamp, actor_id, market_id, sync_status',
      markets: 'id, status, name, startDate, endDate, owner_id, is_collaborative, sync_status, isDeleted',
      products: 'id, category, name, isActive, market_id, owner_id',
      dailyStats: '++id, [date+marketId], date, marketId',
      settings: '++id',
      syncQueue: 'id, status, created_at',
      salesPhotoEvidencePendingCreations: 'queueId, saleEventId, ownerId, marketId, status, updatedAt, createdAt',
      salesPhotoEvidencePendingPayloads: 'queueId, ownerId, marketId, updatedAt, createdAt',
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
    // 設置超時保護
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('資料庫初始化超時')), 8000);
    });
    
    // 開啟資料庫連接（帶超時保護）
    await Promise.race([
      db.open(),
      timeoutPromise
    ]);
    
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
      } catch (addError) {
        // 如果添加失敗（可能是因為已存在），忽略錯誤
        if (addError instanceof Error && addError.name !== 'ConstraintError') {
          console.warn('⚠️ 建立預設設定時發生錯誤，但繼續執行:', addError);
        }
      }
    }
    
    // ✅ 自動遷移：為舊市集資料生成 dates 陣列
    await migrateDatesField();
  } catch (error) {
    console.error('❌ 資料庫初始化失敗：', error);
    
    // 如果是超時錯誤，嘗試強制關閉並重新開啟
    if (error instanceof Error && error.message.includes('超時')) {
      console.log('🔄 嘗試重新初始化資料庫...');
      try {
        db.close();
        await db.open();
        console.log('✅ 資料庫重新初始化成功');
      } catch (retryError) {
        console.error('❌ 資料庫重新初始化失敗:', retryError);
      }
    }
    
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

export async function checkCurrentDatabaseIntegrity(
  options: IntegrityCheckOptions = {}
): Promise<IntegrityResult> {
  return checkBackupIntegrity({
    version: 1,
    exportedAt: Date.now(),
    events: await db.events.toArray(),
    markets: await db.markets.toArray(),
    products: await db.products.toArray(),
    dailyStats: await db.dailyStats.toArray(),
    settings: await db.settings.toArray(),
  }, options);
}

/**
 * App 日常初始化專用的 integrity check。
 * 會 demote product reference 錯誤為 warning，讓 Owner 不因歷史刪除商品而阻斷操作。
 * 備份匯入/匯出請使用 checkCurrentDatabaseIntegrity()（不做 demotion）。
 */
export async function checkAppDatabaseIntegrity(
  options: IntegrityCheckOptions = {}
): Promise<IntegrityResult> {
  return checkAppIntegrity({
    version: 1,
    exportedAt: Date.now(),
    events: await db.events.toArray(),
    markets: await db.markets.toArray(),
    products: await db.products.toArray(),
    dailyStats: await db.dailyStats.toArray(),
    settings: await db.settings.toArray(),
  }, options);
}

export async function initializeDatabaseSafely(
  options: IntegrityCheckOptions = {}
): Promise<DatabaseInitResult> {
  try {
    await initializeDatabase();

    if (!db.isOpen()) {
      throw new Error('Database did not open after initialization');
    }

    const integrity = await checkAppDatabaseIntegrity(options);
    if (!integrity.ok) {
      return {
        ok: false,
        error: new Error(`Database integrity check failed:\n${integrity.errors.join('\n')}`),
        recoverable: true,
        integrity,
      };
    }

    return { ok: true, integrity };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
      recoverable: true,
    };
  }
}

const EMERGENCY_BACKUP_KEY = 'market_pulse_emergency_backup';
const EMERGENCY_BACKUP_METADATA_KEY = 'market_pulse_emergency_backup_metadata';

async function triggerEmergencyBackupDownload(backupJson: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await getFilePort().saveFile({
    filename: `feria-emergency-backup-${timestamp}.json`,
    data: new Blob([backupJson], { type: 'application/json' }),
  });
}

async function createEmergencyBackupBeforeImport(): Promise<void> {
  const backupJson = await exportData();

  if (typeof window === 'undefined') {
    console.warn('⚠️ 非瀏覽器環境，無法保存匯入前緊急備份');
    return;
  }

  const metadata = {
    createdAt: Date.now(),
    size: backupJson.length,
  };

  try {
    if (backupJson.length < 4_000_000) {
      localStorage.setItem(EMERGENCY_BACKUP_KEY, backupJson);
      localStorage.setItem(EMERGENCY_BACKUP_METADATA_KEY, JSON.stringify(metadata));
    } else {
      await triggerEmergencyBackupDownload(backupJson);
      localStorage.setItem(EMERGENCY_BACKUP_METADATA_KEY, JSON.stringify({
        ...metadata,
        downloaded: true,
      }));
    }
  } catch (error) {
    console.error('❌ 建立匯入前緊急備份失敗:', error);
    throw new Error('無法建立匯入前緊急備份，已取消匯入以保護現有資料');
  }
}

/**
 * 匯入資料庫資料（用於還原備份）
 */
function runPreImportIntegrityCheck(data: BackupData): IntegrityResult {
  const preImportCheck = checkBackupIntegrity(data);

  if (!preImportCheck.ok) {
    throw new Error(`備份資料完整性檢查失敗：\n${preImportCheck.errors.join('\n')}`);
  }

  return preImportCheck;
}

function runReplayReadinessCheck(data: BackupData): IntegrityResult {
  const replayReadiness = validateBackupReplayReadiness(data);

  if (!replayReadiness.ok) {
    throw new Error(`Backup events are not safe to replay before import:\n${replayReadiness.errors.join('\n')}`);
  }

  return replayReadiness;
}

async function replaceImportedData(data: BackupData): Promise<void> {
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
}

async function readPostImportData(data: BackupData): Promise<BackupData> {
  return {
    version: data.version,
    exportedAt: data.exportedAt,
    events: await db.events.toArray(),
    markets: await db.markets.toArray(),
    products: await db.products.toArray(),
    dailyStats: await db.dailyStats.toArray(),
    settings: await db.settings.toArray(),
  };
}

function runPostImportIntegrityCheck(data: BackupData): IntegrityResult {
  const postImportCheck = checkBackupIntegrity(data);
  if (!postImportCheck.ok) {
    throw new Error(`匯入後資料完整性檢查失敗：\n${postImportCheck.errors.join('\n')}`);
  }

  return postImportCheck;
}

export async function importData(jsonData: string): Promise<void> {
  try {
    await runPhaseAwareImport(jsonData, {
      parseBackupData,
      runPreImportIntegrityCheck,
      runReplayReadinessCheck,
      createEmergencyBackupBeforeImport,
      replaceImportedData,
      readPostImportData,
      runPostImportIntegrityCheck,
      onWarnings: (warnings) => {
        console.warn('⚠️ 資料匯入完成，但有非阻擋警告:', warnings);
      },
    });

    console.log('✅ 資料匯入完成，並已通過完整性檢查');
  } catch (error) {
    const originalError = error instanceof ImportOutcomeError ? error.originalError : error;
    console.error('❌ 匯入資料失敗：', originalError);
    throw originalError;
  }
}

/**
 * ✅ 自動遷移：為舊市集資料生成 dates 陣列
 * 
 * 此函數會檢查所有市集記錄，如果沒有 dates 欄位或為空，
 * 則根據 startDate 和 endDate 自動生成連續日期陣列。
 * 
 * 這是一個安全的操作：
 * - 只會添加缺失的 dates 欄位
 * - 不會修改已有 dates 的記錄
 * - 不會影響其他欄位
 */
export async function migrateDatesField(): Promise<void> {
  try {
    const markets = await db.markets.toArray();
    
    for (const market of markets) {
      // 檢查是否需要遷移
      if (!market.dates || market.dates.length === 0) {
        // 動態導入工具函數
        const { generateDateRange } = await import('@/lib/utils');
        
        // 生成連續日期陣列
        const dates = generateDateRange(market.startDate, market.endDate);
        
        // 更新市集記錄
        await db.markets.update(market.id!, { dates });
      }
    }
  } catch (error) {
    console.error('❌ 日期遷移失敗：', error);
  }
}

/**
 * ✅ 回滾機制：重新生成 dates 陣列
 * 
 * 此函數會強制重新生成所有市集的 dates 陣列，
 * 根據 startDate 和 endDate 生成連續日期。
 * 
 * ⚠️ 警告：
 * - 此操作會覆蓋現有的 dates 陣列
 * - 如果用戶手動選擇了不連續的日期，這些選擇會丟失
 * - 建議在出現問題時才使用此功能
 * 
 * 使用場景：
 * - 日期資料損壞或不一致
 * - 需要將多選日期重置為連續日期
 * - 測試或開發環境重置
 */
export async function rollbackDatesField(): Promise<void> {
  try {
    console.log('🔄 開始回滾市集日期...');
    
    const markets = await db.markets.toArray();
    let rollbackCount = 0;
    
    for (const market of markets) {
      // 動態導入工具函數
      const { generateDateRange } = await import('@/lib/utils');
      
      // 強制重新生成連續日期陣列
      const dates = generateDateRange(market.startDate, market.endDate);
      
      // 更新市集記錄
      await db.markets.update(market.id!, { dates });
      
      rollbackCount++;
      console.log(`✅ 回滾市集: ${market.name} (${dates.length} 天)`);
    }
    
    console.log(`✅ 日期回滾完成：${rollbackCount} 筆市集已重置為連續日期`);
  } catch (error) {
    console.error('❌ 日期回滾失敗：', error);
    throw error;
  }
}

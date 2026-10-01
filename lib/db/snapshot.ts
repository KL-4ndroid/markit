/**
 * 快照管理模組
 * 
 * 實現數據快照的生成、壓縮、上傳和載入功能
 * 使用 fflate 進行 JSON 壓縮，減少 60-80% 的傳輸流量
 */

import { db } from './index';
import { supabase } from '@/lib/supabase/client';
import { marketRowToLocal, productRowToLocal } from '@/lib/data-mappers';
import { strToU8, strFromU8, compressSync, decompressSync } from 'fflate';
import type { Market, Product, DailyStats, Settings } from '@/types/db';

/**
 * 快照數據結構
 */
export interface SnapshotData {
  version: number;
  snapshot_at: string;
  tables: {
    markets: Market[];
    products: Product[];
    dailyStats: DailyStats[];
    settings: Settings[];
  };
  metadata: {
    event_count: number;
    last_event_id: string;
    last_event_timestamp: number;
  };
}

/**
 * 壓縮 JSON 數據
 * 
 * @param data - 要壓縮的數據
 * @returns 壓縮後的 Base64 字符串
 */
function compressJSON(data: any): string {
  try {
    // 1. 將對象轉為 JSON 字符串
    const jsonString = JSON.stringify(data);
    
    // 2. 轉為 Uint8Array
    const uint8Array = strToU8(jsonString);
    
    // 3. 使用 fflate 壓縮（gzip 算法）
    const compressed = compressSync(uint8Array, { level: 9 });
    
    // 4. 轉為 Base64
    const base64 = btoa(String.fromCharCode(...compressed));
    
    return base64;
  } catch (error) {
    console.error('❌ JSON 壓縮失敗:', error);
    throw error;
  }
}

/**
 * 解壓縮 JSON 數據
 * 
 * @param compressed - 壓縮後的 Base64 字符串
 * @returns 解壓縮後的數據
 */
function decompressJSON(compressed: string): any {
  try {
    // 1. Base64 轉為 Uint8Array
    const binaryString = atob(compressed);
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }
    
    // 2. 使用 fflate 解壓縮
    const decompressed = decompressSync(uint8Array);
    
    // 3. 轉為 JSON 字符串
    const jsonString = strFromU8(decompressed);
    
    // 4. 解析為對象
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('❌ JSON 解壓縮失敗:', error);
    throw error;
  }
}

/**
 * 創建快照
 * 
 * 將當前數據庫狀態保存為快照並上傳到 Supabase
 * 
 * @param userId - 用戶 ID
 * @returns 快照 ID
 */
export async function createSnapshot(userId: string): Promise<string> {
  console.log('📸 開始生成快照...');
  
  const startTime = Date.now();
  
  try {
    // 步驟 1: 讀取所有快照表數據
    console.log('📊 讀取數據庫...');
    const [markets, products, dailyStats, settings] = await Promise.all([
      db.markets.toArray(),
      db.products.toArray(),
      db.dailyStats.toArray(),
      db.settings.toArray(),
    ]);
    
    // 步驟 2: 獲取事件統計
    const eventCount = await db.events.count();
    const lastEvent = await db.events.orderBy('timestamp').last();
    
    if (!lastEvent) {
      throw new Error('沒有事件記錄，無法創建快照');
    }
    
    // 步驟 3: 構建快照數據
    const snapshotData: SnapshotData = {
      version: 1,
      snapshot_at: new Date().toISOString(),
      tables: {
        markets,
        products,
        dailyStats,
        settings,
      },
      metadata: {
        event_count: eventCount,
        last_event_id: lastEvent.id || '',
        last_event_timestamp: lastEvent.timestamp,
      },
    };
    
    // 步驟 4: 計算原始大小
    const originalJson = JSON.stringify(snapshotData);
    const originalSizeBytes = new Blob([originalJson]).size;
    
    console.log(`📦 原始數據大小: ${(originalSizeBytes / 1024).toFixed(2)} KB`);
    
    // 步驟 5: 壓縮數據
    console.log('🗜️ 壓縮數據...');
    const compressedData = compressJSON(snapshotData);
    const compressedSizeBytes = new Blob([compressedData]).size;
    const compressionRatio = ((1 - compressedSizeBytes / originalSizeBytes) * 100).toFixed(1);
    
    console.log(`✅ 壓縮完成: ${(compressedSizeBytes / 1024).toFixed(2)} KB (節省 ${compressionRatio}%)`);
    
    // 步驟 6: 上傳到 Supabase
    console.log('☁️ 上傳到雲端...');
    
    // 獲取下一個版本號
    const { data: latestSnapshot } = await supabase
      .from('snapshots')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const nextVersion = (latestSnapshot?.version || 0) + 1;
    
    // 將壓縮後的字符串包裝為 JSONB 對象
    const { data, error } = await supabase
      .from('snapshots')
      .insert({
        user_id: userId,
        snapshot_at: snapshotData.snapshot_at,
        version: nextVersion,
        data: { compressed: compressedData }, // 包裝為對象
        event_count: eventCount,
        last_event_id: lastEvent.id || '',
        data_size_bytes: originalSizeBytes,
        compressed_size_bytes: compressedSizeBytes,
        compression_ratio: parseFloat(compressionRatio),
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    // 步驟 7: 清理舊快照（只保留最近 2 個）
    await cleanupOldSnapshots(userId);
    
    const duration = Date.now() - startTime;
    console.log(`✅ 快照已生成：${eventCount} 個事件，耗時 ${duration}ms`);
    console.log(`📊 統計: ${markets.length} 市集, ${products.length} 商品, ${dailyStats.length} 每日統計`);
    
    return data.id;
  } catch (error) {
    console.error('❌ 快照生成失敗:', error);
    throw error;
  }
}

/**
 * 獲取最新快照
 * 
 * @param userId - 用戶 ID
 * @returns 快照數據，如果不存在則返回 null
 */
export async function getLatestSnapshot(userId: string): Promise<SnapshotData | null> {
  try {
    console.log('🔍 查詢最新快照...');
    
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    if (!data) {
      console.log('ℹ️ 沒有找到快照');
      return null;
    }
    
    console.log(`✅ 找到快照: ${data.event_count} 個事件 (${data.snapshot_at})`);
    
    // 解壓縮數據
    const compressedData = data.data.compressed;
    const snapshotData = decompressJSON(compressedData);
    
    return snapshotData;
  } catch (error) {
    console.error('❌ 獲取快照失敗:', error);
    return null;
  }
}

/**
 * 載入快照到本地數據庫
 * 
 * @param snapshotData - 快照數據
 */
export async function loadSnapshot(snapshotData: SnapshotData): Promise<void> {
  console.log('📥 載入快照到本地數據庫...');
  
  try {
    const markets = snapshotData.tables.markets.map(market =>
      marketRowToLocal(market as unknown as Record<string, unknown>)
    );
    const products = snapshotData.tables.products.map(product =>
      productRowToLocal(product as unknown as Record<string, unknown>)
    );

    await db.transaction('rw', [db.markets, db.products, db.dailyStats, db.settings], async () => {
      // 清空現有數據
      await Promise.all([
        db.markets.clear(),
        db.products.clear(),
        db.dailyStats.clear(),
        db.settings.clear(),
      ]);
      
      // 批次寫入快照數據
      await Promise.all([
        db.markets.bulkAdd(markets),
        db.products.bulkAdd(products),
        db.dailyStats.bulkAdd(snapshotData.tables.dailyStats),
        snapshotData.tables.settings.length > 0 
          ? db.settings.bulkAdd(snapshotData.tables.settings)
          : Promise.resolve(),
      ]);
    });
    
    console.log('✅ 快照載入完成');
    console.log(`📊 已載入: ${snapshotData.tables.markets.length} 市集, ${snapshotData.tables.products.length} 商品`);
  } catch (error) {
    console.error('❌ 快照載入失敗:', error);
    throw error;
  }
}

/**
 * 獲取最後一次快照的事件數量
 * 
 * @param userId - 用戶 ID
 * @returns 事件數量，如果沒有快照則返回 0
 */
export async function getLastSnapshotEventCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('snapshots')
      .select('event_count')
      .eq('user_id', userId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data?.event_count || 0;
  } catch (error) {
    console.error('❌ 獲取快照事件數量失敗:', error);
    return 0;
  }
}

/**
 * 清理舊快照（只保留最近 2 個）
 * 
 * @param userId - 用戶 ID
 */
async function cleanupOldSnapshots(userId: string): Promise<void> {
  try {
    // 查詢所有快照
    const { data: snapshots, error: queryError } = await supabase
      .from('snapshots')
      .select('id, snapshot_at')
      .eq('user_id', userId)
      .order('snapshot_at', { ascending: false });
    
    if (queryError) throw queryError;
    if (!snapshots || snapshots.length <= 2) return;
    
    // 保留最近 2 個，刪除其他
    const snapshotsToDelete = snapshots.slice(2);
    const idsToDelete = snapshotsToDelete.map(s => s.id);
    
    const { error: deleteError } = await supabase
      .from('snapshots')
      .delete()
      .in('id', idsToDelete);
    
    if (deleteError) throw deleteError;
    
    console.log(`🗑️ 已清理 ${idsToDelete.length} 個舊快照`);
  } catch (error) {
    console.error('❌ 清理舊快照失敗:', error);
    // 不拋出錯誤，讓主流程繼續
  }
}

/**
 * 檢查是否需要生成快照（帶時間維度）
 * 條件：1000 個事件 OR 7 天，先到先生成
 * 
 * @param userId - 用戶 ID
 * @returns 是否需要生成快照
 */
export async function shouldCreateSnapshot(userId: string): Promise<boolean> {
  const SNAPSHOT_THRESHOLD = 1000; // 每 1000 個事件生成一次快照
  const SNAPSHOT_TIME_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 天
  
  try {
    // 獲取本地事件數量
    const currentEventCount = await db.events.count();

    // 獲取最新快照信息
    const { data: snapshot, error } = await supabase
      .from('snapshots')
      .select('event_count, snapshot_at')
      .eq('user_id', userId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const lastSnapshotCount = snapshot?.event_count || 0;
    const lastSnapshotTime = snapshot?.snapshot_at 
      ? new Date(snapshot.snapshot_at).getTime() 
      : 0;

    const eventDiff = currentEventCount - lastSnapshotCount;
    const timeDiff = Date.now() - lastSnapshotTime;
    const daysDiff = Math.floor(timeDiff / (24 * 60 * 60 * 1000));

    // 檢查是否滿足任一條件
    const shouldCreateByEvents = eventDiff >= SNAPSHOT_THRESHOLD;
    const shouldCreateByTime = timeDiff >= SNAPSHOT_TIME_THRESHOLD;
    const shouldCreate = shouldCreateByEvents || shouldCreateByTime;

    if (shouldCreate) {
      if (shouldCreateByEvents) {
        console.log(`ℹ️ 需要生成快照（事件數）: 當前 ${currentEventCount} 個事件，上次快照 ${lastSnapshotCount} 個事件，差異 ${eventDiff}`);
      }
      if (shouldCreateByTime) {
        console.log(`ℹ️ 需要生成快照（時間）: 距離上次快照已 ${daysDiff} 天`);
      }
    } else {
      console.log(`📊 快照檢查：事件差異 ${eventDiff}/${SNAPSHOT_THRESHOLD}，時間差異 ${daysDiff}/7 天 - 暫不需要生成`);
    }
    
    return shouldCreate;
  } catch (error) {
    console.error('❌ 檢查快照需求失敗:', error);
    return false;
  }
}

/**
 * 自動檢查並生成快照
 * 
 * @param userId - 用戶 ID
 */
export async function autoCreateSnapshot(userId: string): Promise<void> {
  try {
    const should = await shouldCreateSnapshot(userId);
    
    if (should) {
      console.log('🤖 自動生成快照...');
      await createSnapshot(userId);
    }
  } catch (error) {
    console.error('❌ 自動生成快照失敗:', error);
    // 不拋出錯誤，避免影響主流程
  }
}

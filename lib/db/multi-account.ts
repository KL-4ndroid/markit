/**
 * 多帳號數據隔離系統
 * 
 * 支援：
 * 1. 老闆模式：每個老闆有獨立資料庫
 * 2. 員工模式：每個「員工-老闆」組合有獨立資料庫
 * 3. 無縫切換：切換帳號或身份時自動切換資料庫
 */

import Dexie from 'dexie';
import type { User } from '@supabase/supabase-js';

// ==================== 資料庫命名策略 ====================

/**
 * 獲取資料庫名稱
 * @param userId - 當前用戶 ID
 * @param isStaff - 是否為員工
 * @param ownerId - 如果是員工，老闆的 ID
 */
export function getDatabaseName(
  userId: string,
  isStaff: boolean = false,
  ownerId?: string
): string {
  if (isStaff && ownerId) {
    // 員工模式：使用「員工ID + 老闆ID」組合
    return `MarketPulseDB_staff_${userId}_for_${ownerId}`;
  }
  
  // 老闆模式：使用自己的 user ID
  return `MarketPulseDB_owner_${userId}`;
}

/**
 * 解析資料庫名稱，獲取身份資訊
 */
export function parseDatabaseName(dbName: string): {
  type: 'owner' | 'staff';
  userId: string;
  ownerId?: string;
} | null {
  // 員工模式：MarketPulseDB_staff_{staffId}_for_{ownerId}
  const staffMatch = dbName.match(/^MarketPulseDB_staff_(.+)_for_(.+)$/);
  if (staffMatch) {
    return {
      type: 'staff',
      userId: staffMatch[1],
      ownerId: staffMatch[2],
    };
  }
  
  // 老闆模式：MarketPulseDB_owner_{userId}
  const ownerMatch = dbName.match(/^MarketPulseDB_owner_(.+)$/);
  if (ownerMatch) {
    return {
      type: 'owner',
      userId: ownerMatch[1],
    };
  }
  
  return null;
}

// ==================== 資料庫管理 ====================

/**
 * 當前活躍的資料庫實例
 */
let currentDatabase: Dexie | null = null;
let currentDatabaseName: string | null = null;

/**
 * 獲取或創建資料庫
 */
export async function getDatabase(
  userId: string,
  isStaff: boolean = false,
  ownerId?: string
): Promise<Dexie> {
  const dbName = getDatabaseName(userId, isStaff, ownerId);
  
  // 如果已經是當前資料庫，直接返回
  if (currentDatabase && currentDatabaseName === dbName) {
    return currentDatabase;
  }
  
  // 關閉舊資料庫
  if (currentDatabase) {
    currentDatabase.close();
  }
  
  // 創建新資料庫
  const db = new Dexie(dbName);
  
  // 定義 Schema（與現有的 db.ts 相同）
  db.version(1).stores({
    markets: '++id, name, startDate, endDate, status, owner_id, created_at, updated_at, deleted_at',
    products: '++id, name, category, price, cost, stock, isActive, owner_id, created_at, updated_at, deleted_at',
    events: '++id, type, timestamp, actor_id, payload.marketId, payload.productId, synced, sync_error',
    dailyStats: '++id, [date+marketId], date, marketId, revenue, cost, profit, dealCount, created_at, updated_at',
  });
  
  await db.open();
  
  currentDatabase = db;
  currentDatabaseName = dbName;
  
  console.log(`✅ 已切換到資料庫: ${dbName}`);
  
  return db;
}

/**
 * 列出所有本地資料庫
 */
export async function listAllDatabases(): Promise<{
  name: string;
  type: 'owner' | 'staff';
  userId: string;
  ownerId?: string;
  size?: number;
}[]> {
  const databases = await Dexie.getDatabaseNames();
  
  const result = [];
  
  for (const dbName of databases) {
    if (!dbName.startsWith('MarketPulseDB_')) continue;
    
    const info = parseDatabaseName(dbName);
    if (!info) continue;
    
    // 獲取資料庫大小（可選）
    try {
      const db = new Dexie(dbName);
      await db.open();
      const markets = await db.table('markets').count();
      const products = await db.table('products').count();
      const events = await db.table('events').count();
      db.close();
      
      result.push({
        name: dbName,
        ...info,
        size: markets + products + events,
      });
    } catch (error) {
      console.error(`無法讀取資料庫 ${dbName}:`, error);
      result.push({
        name: dbName,
        ...info,
      });
    }
  }
  
  return result;
}

/**
 * 刪除指定資料庫
 */
export async function deleteDatabase(dbName: string): Promise<void> {
  // 如果是當前資料庫，先關閉
  if (currentDatabaseName === dbName && currentDatabase) {
    currentDatabase.close();
    currentDatabase = null;
    currentDatabaseName = null;
  }
  
  await Dexie.delete(dbName);
  console.log(`🗑️ 已刪除資料庫: ${dbName}`);
}

// ==================== 身份切換 ====================

/**
 * 切換到老闆模式
 */
export async function switchToOwnerMode(userId: string): Promise<Dexie> {
  console.log(`🔄 切換到老闆模式: ${userId}`);
  return await getDatabase(userId, false);
}

/**
 * 切換到員工模式
 */
export async function switchToStaffMode(
  staffId: string,
  ownerId: string
): Promise<Dexie> {
  console.log(`🔄 切換到員工模式: 員工 ${staffId} 為老闆 ${ownerId} 工作`);
  return await getDatabase(staffId, true, ownerId);
}

/**
 * 獲取當前資料庫資訊
 */
export function getCurrentDatabaseInfo(): {
  name: string;
  type: 'owner' | 'staff';
  userId: string;
  ownerId?: string;
} | null {
  if (!currentDatabaseName) return null;
  
  const info = parseDatabaseName(currentDatabaseName);
  if (!info) return null;
  
  return {
    name: currentDatabaseName,
    ...info,
  };
}

// ==================== 員工模式特殊處理 ====================

/**
 * 員工接受邀請時的處理
 * 
 * 流程：
 * 1. 檢查員工是否有自己的老闆資料庫（owner mode）
 * 2. 如果有，保留它（不刪除）
 * 3. 創建新的員工資料庫（staff mode）
 * 4. 從雲端下載老闆的數據到員工資料庫
 */
export async function handleStaffInvitationAccepted(
  staffId: string,
  ownerId: string
): Promise<void> {
  console.log('📝 處理員工邀請接受...');
  
  // 1. 檢查員工是否有自己的老闆資料庫
  const ownerDbName = getDatabaseName(staffId, false);
  const databases = await Dexie.getDatabaseNames();
  const hasOwnerDb = databases.includes(ownerDbName);
  
  if (hasOwnerDb) {
    console.log(`✅ 保留員工的老闆資料庫: ${ownerDbName}`);
  }
  
  // 2. 創建員工資料庫
  const staffDb = await switchToStaffMode(staffId, ownerId);
  
  // 3. 清空員工資料庫（如果已存在）
  await staffDb.table('markets').clear();
  await staffDb.table('products').clear();
  await staffDb.table('events').clear();
  await staffDb.table('dailyStats').clear();
  
  console.log('✅ 員工資料庫已準備好，可以開始同步老闆的數據');
}

/**
 * 員工離開團隊時的處理
 * 
 * 流程：
 * 1. 刪除員工資料庫（staff mode）
 * 2. 切換回員工的老闆資料庫（owner mode）
 * 3. 如果沒有老闆資料庫，創建一個新的
 */
export async function handleStaffLeftTeam(
  staffId: string,
  ownerId: string
): Promise<void> {
  console.log('📝 處理員工離開團隊...');
  
  // 1. 刪除員工資料庫
  const staffDbName = getDatabaseName(staffId, true, ownerId);
  await deleteDatabase(staffDbName);
  
  // 2. 切換回老闆模式
  await switchToOwnerMode(staffId);
  
  console.log('✅ 已切換回老闆模式');
}

/**
 * 員工切換老闆時的處理
 * 
 * 流程：
 * 1. 保留舊老闆的員工資料庫（不刪除）
 * 2. 創建新老闆的員工資料庫
 * 3. 切換到新資料庫
 */
export async function handleStaffSwitchOwner(
  staffId: string,
  oldOwnerId: string,
  newOwnerId: string
): Promise<void> {
  console.log(`📝 員工切換老闆: ${oldOwnerId} → ${newOwnerId}`);
  
  // 1. 舊資料庫保留（不刪除）
  const oldDbName = getDatabaseName(staffId, true, oldOwnerId);
  console.log(`✅ 保留舊老闆的資料庫: ${oldDbName}`);
  
  // 2. 創建新資料庫
  await handleStaffInvitationAccepted(staffId, newOwnerId);
  
  console.log('✅ 已切換到新老闆');
}

// ==================== 帳號切換器 UI ====================

/**
 * 獲取可切換的帳號列表
 */
export async function getAvailableAccounts(currentUserId: string): Promise<{
  id: string;
  label: string;
  type: 'owner' | 'staff';
  dbName: string;
  dataCount: number;
  isCurrent: boolean;
}[]> {
  const databases = await listAllDatabases();
  const currentDbInfo = getCurrentDatabaseInfo();
  
  const accounts = [];
  
  for (const db of databases) {
    // 只顯示當前用戶相關的資料庫
    if (db.userId !== currentUserId) continue;
    
    let label = '';
    if (db.type === 'owner') {
      label = '老闆模式';
    } else if (db.type === 'staff' && db.ownerId) {
      // 可以從 Supabase 獲取老闆的 email
      label = `員工模式 (為老闆 ${db.ownerId.substring(0, 8)}... 工作)`;
    }
    
    const isCurrent = currentDbInfo?.name === db.name;
    
    accounts.push({
      id: db.name,
      label,
      type: db.type,
      dbName: db.name,
      dataCount: db.size || 0,
      isCurrent,
    });
  }
  
  return accounts;
}

// ==================== 使用範例 ====================

/*
// 1. 用戶登入（老闆模式）
const user = await supabase.auth.getUser();
const db = await switchToOwnerMode(user.id);

// 2. 員工接受邀請
await handleStaffInvitationAccepted(staffId, ownerId);
// 系統自動切換到員工資料庫

// 3. 員工離開團隊
await handleStaffLeftTeam(staffId, ownerId);
// 系統自動切換回老闆資料庫

// 4. 列出所有帳號
const accounts = await getAvailableAccounts(currentUserId);
console.log('可用帳號:', accounts);

// 5. 手動切換帳號
const dbInfo = parseDatabaseName(selectedDbName);
if (dbInfo.type === 'owner') {
  await switchToOwnerMode(dbInfo.userId);
} else if (dbInfo.type === 'staff' && dbInfo.ownerId) {
  await switchToStaffMode(dbInfo.userId, dbInfo.ownerId);
}
*/

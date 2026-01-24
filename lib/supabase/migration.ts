/**
 * 資料遷移安全機制
 * 
 * 處理登入時的本地資料遷移邏輯
 * 確保用戶對資料流向有完全控制權
 */

import { db } from '@/lib/db';
import { supabase } from './client';

/**
 * 檢測本地是否有匿名資料
 * 
 * @param currentUserId - 當前登入的用戶 ID
 * @returns 是否有需要遷移的資料
 */
export async function detectAnonymousData(currentUserId: string): Promise<{
  hasAnonymousData: boolean;
  marketCount: number;
  eventCount: number;
}> {
  try {
    // 檢查本地市集
    const markets = await db.markets.toArray();
    
    // 找出匿名資料（owner_id 為 'local' 或不屬於當前用戶）
    const anonymousMarkets = markets.filter(
      m => !m.owner_id || m.owner_id === 'local' || m.owner_id !== currentUserId
    );
    
    // 檢查本地事件
    const events = await db.events.toArray();
    const anonymousEvents = events.filter(
      e => !e.actor_id || e.actor_id === 'local' || e.actor_id !== currentUserId
    );
    
    return {
      hasAnonymousData: anonymousMarkets.length > 0 || anonymousEvents.length > 0,
      marketCount: anonymousMarkets.length,
      eventCount: anonymousEvents.length,
    };
  } catch (error) {
    console.error('檢測匿名資料失敗:', error);
    return {
      hasAnonymousData: false,
      marketCount: 0,
      eventCount: 0,
    };
  }
}

/**
 * 遷移選項
 */
export enum MigrationOption {
  SYNC = 'sync',           // 確認同步
  CLEAR = 'clear',         // 清除並登入
  CANCEL = 'cancel',       // 取消登入
}

/**
 * 執行資料遷移
 * 
 * @param option - 遷移選項
 * @param currentUserId - 當前登入的用戶 ID
 */
export async function executeMigration(
  option: MigrationOption,
  currentUserId: string
): Promise<void> {
  switch (option) {
    case MigrationOption.SYNC:
      await migrateLocalDataToUser(currentUserId);
      break;
      
    case MigrationOption.CLEAR:
      await clearLocalDataAndPullFromCloud(currentUserId);
      break;
      
    case MigrationOption.CANCEL:
      // 登出，保留本地資料
      await supabase.auth.signOut();
      break;
  }
}

/**
 * 選項一：將本地資料遷移到當前用戶
 * 
 * 1. 更新所有 markets 的 owner_id
 * 2. 更新所有 events 的 actor_id
 * 3. 標記為未同步（synced = false）
 * 4. 觸發背景同步
 */
async function migrateLocalDataToUser(currentUserId: string): Promise<void> {
  console.log('🔄 開始遷移本地資料到用戶:', currentUserId);
  
  try {
    await db.transaction('rw', [db.markets, db.events], async () => {
      // 1. 更新所有 markets
      const markets = await db.markets.toArray();
      for (const market of markets) {
        await db.markets.update(market.id!, {
          owner_id: currentUserId,
          is_collaborative: true,
          sync_status: 'local_only', // 標記為未同步
        });
      }
      
      // 2. 更新所有 events
      const events = await db.events.toArray();
      for (const event of events) {
        await db.events.update(event.id!, {
          actor_id: currentUserId,
          sync_status: 'pending', // 標記為待同步
        });
      }
      
      console.log(`✅ 遷移完成：${markets.length} 個市集，${events.length} 個事件`);
    });
    
    // 3. 創建用戶 profile（如果不存在）
    await ensureUserProfile(currentUserId);
    
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    throw error;
  }
}

/**
 * 選項二：清除本地資料並從雲端拉取
 * 
 * 1. 清空本地 Dexie
 * 2. 從雲端拉取該用戶的所有資料
 * 3. 重建本地快照
 */
async function clearLocalDataAndPullFromCloud(currentUserId: string): Promise<void> {
  console.log('🔄 清除本地資料並從雲端拉取:', currentUserId);
  
  try {
    // 1. 清空本地資料（保留 settings）
    await db.transaction('rw', [db.markets, db.products, db.events, db.dailyStats], async () => {
      await db.markets.clear();
      await db.products.clear();
      await db.events.clear();
      await db.dailyStats.clear();
    });
    
    console.log('✅ 本地資料已清空');
    
    // 2. 從雲端拉取資料
    await pullAllDataFromCloud(currentUserId);
    
  } catch (error) {
    console.error('❌ 清除並拉取失敗:', error);
    throw error;
  }
}

/**
 * 從雲端拉取所有資料
 */
async function pullAllDataFromCloud(currentUserId: string): Promise<void> {
  console.log('📥 從雲端拉取資料...');
  
  try {
    // 1. 拉取用戶參與的所有市集
    const { data: memberMarkets, error: memberError } = await supabase
      .from('market_members')
      .select('market_id')
      .eq('user_id', currentUserId);
    
    if (memberError) throw memberError;
    
    if (!memberMarkets || memberMarkets.length === 0) {
      console.log('ℹ️ 雲端沒有資料');
      return;
    }
    
    const marketIds = memberMarkets.map(m => m.market_id);
    
    // 2. 拉取這些市集的所有事件
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .in('market_id', marketIds)
      .order('timestamp', { ascending: true });
    
    if (eventsError) throw eventsError;
    
    if (!events || events.length === 0) {
      console.log('ℹ️ 雲端沒有事件');
      return;
    }
    
    // 3. 重放事件到本地（這會自動重建 markets 和 products 快照）
    console.log(`📝 重放 ${events.length} 個事件...`);
    
    const { recordEvent } = await import('@/lib/db/events');
    
    for (const event of events) {
      // 使用雲端的 ID 和資料
      await recordEvent(
        event.type as any,
        event.payload,
        event.id // 使用雲端的 UUID
      );
      
      // 標記為已同步
      await db.events.update(event.id, {
        sync_status: 'synced',
      });
    }
    
    console.log(`✅ 從雲端拉取完成：${events.length} 個事件`);
    
  } catch (error) {
    console.error('❌ 從雲端拉取失敗:', error);
    throw error;
  }
}

/**
 * 確保用戶 profile 存在
 */
async function ensureUserProfile(userId: string): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) return;
    
    // 檢查 profile 是否存在
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (!existingProfile) {
      // 創建 profile
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: user.user.email!,
          display_name: user.user.user_metadata?.display_name || user.user.email?.split('@')[0],
        });
      
      if (error) {
        console.error('創建 profile 失敗:', error);
      } else {
        console.log('✅ 用戶 profile 已創建');
      }
    }
  } catch (error) {
    console.error('確保用戶 profile 失敗:', error);
  }
}

import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';
import { normalizeEventForCloud, pickMarketId } from '@/lib/data-mappers';
import {
  bindEventActor,
  markEventBlocked,
  markEventLocalOnly,
  markEventSynced,
} from '@/lib/sync/event-sync-service';

/**
 * Push local pending events to Supabase with idempotency and actor safety checks.
 */
export async function pushEvents(
  userId: string,
  onProgress?: (current: number, total: number, currentItem?: string) => void
): Promise<number> {
  await ensureUserProfile(userId);

  const pendingEvents = await db.events
    .where('sync_status')
    .anyOf(['pending', 'local_only'])
    .toArray();

  const validEvents: typeof pendingEvents = [];
  const invalidEvents: typeof pendingEvents = [];

  for (const event of pendingEvents) {
    if (event.actor_id === userId) {
      validEvents.push(event);
      continue;
    }

    if (event.actor_id === 'local') {
      console.log(`📝 更新本地事件的 actor_id: ${event.type} (${event.id?.substring(0, 8)}...)`);
      await bindEventActor(event.id!, userId);
      event.actor_id = userId;
      validEvents.push(event);
      continue;
    }

    console.warn(`🚨 非法事件：${event.type} (actor_id: ${event.actor_id}, 當前用戶: ${userId})`);
    invalidEvents.push(event);
  }

  if (invalidEvents.length > 0) {
    console.warn(`🚨 安全警告：檢測到 ${invalidEvents.length} 個非法事件（actor_id 不匹配）`);

    for (const event of invalidEvents) {
      await markEventBlocked(event.id!, 'actor_id_mismatch', event.actor_id);
    }
  }

  if (validEvents.length === 0) {
    return 0;
  }

  const sortedEvents = validEvents.sort((a, b) => a.timestamp - b.timestamp);
  const total = sortedEvents.length;

  console.log(`📤 開始上傳 ${total} 個事件（強化版：等冪性 + 順序處理）...`);

  const BATCH_SIZE = 10;
  let uploadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let batchStart = 0; batchStart < sortedEvents.length; batchStart += BATCH_SIZE) {
    const batch = sortedEvents.slice(batchStart, batchStart + BATCH_SIZE);

    for (let i = 0; i < batch.length; i++) {
      const event = batch[i];
      const globalIndex = batchStart + i;

      if (onProgress) {
        onProgress(globalIndex + 1, total, `${event.type} (${event.id?.substring(0, 8)}...)`);
      }

      try {
        const cloudEvent = normalizeEventForCloud(event);

        const { data: existing, error: checkError } = await supabase
          .from('events')
          .select('id, sync_status')
          .eq('id', event.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existing) {
          console.log(`✅ 事件已存在，跳過: ${event.type} (${event.id?.substring(0, 8)}...)`);
          await markEventSynced(event.id!);
          skippedCount++;
          continue;
        }

        const { error: insertError } = await supabase
          .from('events')
          .insert({
            id: event.id,
            type: event.type,
            payload: cloudEvent.payload,
            actor_id: userId,
            market_id: cloudEvent.market_id,
            timestamp: new Date(event.timestamp).toISOString(),
            metadata: event.metadata,
          });

        if (insertError) {
          if (insertError.code === '23505') {
            console.log(`✅ 事件已存在（並發上傳），標記為已同步: ${event.id?.substring(0, 8)}...`);
            await markEventSynced(event.id!);
            skippedCount++;
            continue;
          }

          if (insertError.code === '23503' && insertError.message?.includes('events_market_id_fkey')) {
            console.warn(`⚠️ 外鍵衝突：market_id ${event.market_id} 不存在`);

            const marketCreatedEvent = sortedEvents.find(
              e => e.type === 'market_created' &&
                (e.market_id === cloudEvent.market_id || pickMarketId(e.payload) === cloudEvent.market_id)
            );

            if (marketCreatedEvent && marketCreatedEvent.id !== event.id) {
              console.log('🔄 發現 market_created 事件，保持 pending 狀態，等待下一輪同步');
              failedCount++;
              continue;
            } else {
              console.error('❌ 找不到對應的 market_created 事件，標記為 local_only');
              await markEventLocalOnly(event.id!);
              failedCount++;
              continue;
            }
          }

          if (insertError.code === '42501' && event.type === 'market_created' && cloudEvent.market_id) {
            console.log('🔄 RLS 阻止 market_created，嘗試先創建 market_members...');

            const memberCreated = await ensureMarketMember(userId, cloudEvent.market_id);

            if (memberCreated) {
              const { error: retryError } = await supabase
                .from('events')
                .insert({
                  id: event.id,
                  type: event.type,
                  payload: cloudEvent.payload,
                  actor_id: userId,
                  market_id: cloudEvent.market_id,
                  timestamp: new Date(event.timestamp).toISOString(),
                  metadata: event.metadata,
                });

              if (!retryError) {
                console.log(`✅ 重試成功: ${event.type} (${event.id?.substring(0, 8)}...)`);
                await markEventSynced(event.id!);
                uploadedCount++;
                continue;
              }
            }

            console.error(`❌ RLS 政策阻止：${event.type}`, insertError.message);
            await markEventLocalOnly(event.id!);
            failedCount++;
            continue;
          }

          if (insertError.code === 'PGRST301' || insertError.code === '42501' || insertError.message?.includes('policy')) {
            console.error(`❌ RLS 政策阻止：${event.type}`, insertError.message);
            await markEventLocalOnly(event.id!);
            failedCount++;
            continue;
          }

          console.error(`❌ 未知錯誤：${insertError.code} - ${insertError.message}`);
          await markEventLocalOnly(event.id!);
          failedCount++;
          continue;
        }

        await markEventSynced(event.id!);

        uploadedCount++;

        if (event.type === 'market_created' && event.market_id) {
          await ensureMarketMember(userId, event.market_id);
        }
      } catch (error: any) {
        console.error(`❌ 上傳事件異常: ${event.id}`, error);

        await markEventLocalOnly(event.id!);
        failedCount++;
        continue;
      }
    }
  }

  console.log(`✅ 上傳完成：成功 ${uploadedCount}，跳過 ${skippedCount}，失敗 ${failedCount}，總計 ${total}`);
  return uploadedCount;
}

async function ensureMarketMember(userId: string, marketId: string): Promise<boolean> {
  try {
    const { data: existingMember, error: checkError } = await supabase
      .from('market_members')
      .select('user_id')
      .eq('market_id', marketId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('檢查市集成員失敗:', checkError);
      return false;
    }

    if (existingMember) {
      return true;
    }

    const { error: insertError } = await supabase
      .from('market_members')
      .insert({
        market_id: marketId,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString(),
      });

    if (insertError) {
      if (insertError.code === '23505') {
        return true;
      }

      if (insertError.code === '23503') {
        console.warn(`⚠️ Market ${marketId.substring(0, 8)}... 尚未存在`);
        return false;
      }

      console.error('創建 market_members 失敗:', insertError);
      return false;
    }

    console.log('✅ market_members 記錄已創建');
    return true;
  } catch (error) {
    console.error('❌ 確保 market_members 失敗:', error);
    return false;
  }
}

async function ensureUserProfile(userId: string): Promise<void> {
  try {
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (!existingProfile) {
      console.log('👤 創建用戶 profile...');

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        console.error('❌ 無法獲取用戶資料:', userError);
        return;
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userData.user.email || `${userId}@local.app`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        if (insertError.code === '23505') {
          console.log('✅ Profile 已存在（並發創建）');
          return;
        }
        throw insertError;
      }

      console.log('✅ 用戶 profile 已創建');
    }
  } catch (error) {
    console.error('❌ 確保用戶 profile 失敗:', error);
  }
}

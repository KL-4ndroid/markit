/**
 * 員工狀態監控 Hook（C3.6 修法 v2 — 成本優化版）
 *
 * 目的：解決「老闆踢人後，員工 B 端沒有即時清理」的問題
 *
 * 問題描述（C3.6）：
 * - 老闆 A 透過 StaffManagement.removeStaff() 撤銷員工 B
 * - 雲端清理完整（staff_relationships + market_members + audit_logs）
 * - ❌ 員工 B 客戶端 5 分鐘內（ROLE_CACHE_TTL_MS）仍以為自己是員工
 * - ❌ 員工 B 客戶端的 IndexedDB 殘留 A 的市集資料
 *
 * 設計決策（2026-06-15 第二次迭代）：
 * - ❌ 拿掉 Supabase Realtime 訂閱（避免 Realtime 連線 + 訊息成本 + 邏輯複製單執行緒瓶頸）
 * - ✅ 採用 180 秒 Polling（接受最多 3 分鐘延遲，成本最低）
 * - ✅ 使用 head:true 輕量查詢（不取資料只取存在性）
 * - ✅ Polling 命中時主動 invalidateRoleCache + 觸發清理
 *
 * 成本分析（10000 在線員工）：
 * - Realtime 連線：0（拿掉）
 * - Realtime 訊息：0（拿掉）
 * - 邏輯複製：0（拿掉）
 * - API 查詢：10000 / 180 ≈ 55 查詢/秒（API 查詢在所有方案中無限）
 * - DB CPU：27.5%（走索引的極輕量查詢）
 *
 * 替代方案比較：
 * - Realtime: $10-1000+/月（取決於連線數）
 * - Polling 60s: 1.5x 查詢量
 * - Polling 180s: 1x 查詢量 ← 採用
 * - Polling 300s (=useUserRole cache TTL): 0 額外查詢，但需要 useUserRole 內加 effect
 *
 * 觸發後的清理動作：
 * 1. 呼叫 resetAuthenticatedCache('full') 清空 authenticated tables + 快取
 * 2. 刪除整個 IndexedDB 確保完全乾淨
 * 3. 強制重新載入頁面到首頁
 *
 * @see docs/C3.6_LEAVE_TEAM_CLEANUP_AUDIT.md
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { useUserRole, invalidateRoleCache } from '@/hooks/useUserRole';
import { resetAuthenticatedCache } from '@/lib/db/clear-user-data';
import { resetInitialSyncFlag } from '@/hooks/useSync';

// 員工狀態 Polling 預設間隔：180 秒（3 分鐘）
//
// 📌 為什麼是 180 秒？
// - 這是 useUserRole 5 分鐘 cache 過期（ROLE_CACHE_TTL_MS）前的安全閾值
// - 180 秒內 Polling 命中 → 立即清理
// - 180 秒內 Polling 失敗（網路斷）→ useUserRole cache 在 300 秒後過期，會自動重新查詢
// - 詳細成本分析見 docs/C3.6.1_COST_AND_BUG_AUDIT.md
//
// ⚠️ 為什麼不更短（例如 60 秒）？
// - 對現實規模（< 100 員工）：60s 和 180s 成本完全相同
// - 對 100K+ 規模：60s 需要 compute 升級（+$850/月）
// - 180s 是「未來可擴展」的保守預設值
//
// ⚠️ 為什麼不更長（例如 300 秒）？
// - 300 秒 = useUserRole cache TTL，Polling 就沒意義
// - 180s 比 cache 過期快 2 分鐘，使用者體驗明顯更好
const DEFAULT_STAFF_POLL_INTERVAL_MS = 180 * 1000;

/**
 * 員工狀態監控 Hook 選項
 */
interface StaffStatusMonitorOptions {
  /** 是否啟用監控（預設 true）。可在測試中關閉。 */
  enabled?: boolean;

  /**
   * Polling 間隔（毫秒）
   *
   * 預設 180 秒（{@link DEFAULT_STAFF_POLL_INTERVAL_MS}）
   *
   * ⚠️ 變更此值前請先閱讀 docs/C3.6.1_COST_AND_BUG_AUDIT.md
   * - 太短：DB CPU / Egress 成本上升，100K 員工規模需 compute 升級
   * - 太長：使用者體驗變差（被踢後 N 秒才反應）
   * - 建議範圍：60 秒 ~ 300 秒
   */
  pollIntervalMs?: number;
}

/**
 * 員工狀態監控 Hook
 *
 * 只在「目前用戶是某老闆的員工」時啟動。
 * 偵測到老闆撤銷員工權限（status 不再是 'active'）時，自動清空本地資料並重新整理。
 *
 * @param options - 配置選項
 * @param options.enabled - 是否啟用（預設 true）
 * @param options.pollIntervalMs - Polling 間隔（預設 {@link DEFAULT_STAFF_POLL_INTERVAL_MS}）
 */
export function useStaffStatusMonitor(options: StaffStatusMonitorOptions = {}) {
  const { enabled = true, pollIntervalMs = DEFAULT_STAFF_POLL_INTERVAL_MS } = options;
  const { user } = useAuth();
  const { isStaff, userRole } = useUserRole();

  // 防止 React Strict Mode 雙重掛載導致重複清理
  const cleanupInFlightRef = useRef(false);

  useEffect(() => {
    // 條件檢查：必須啟用、有用戶、是員工
    if (!enabled || !user || !isStaff || !userRole.ownerId) {
      return;
    }

    let isMounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * 員工被撤銷時的清理流程
     * 使用 ref 防止並發觸發
     */
    const handleRevoked = async (source: 'poll' | 'cache-expiry') => {
      if (cleanupInFlightRef.current) {
        console.log(`[StaffStatusMonitor] 清理已在進行中（${source}），跳過重複觸發`);
        return;
      }
      cleanupInFlightRef.current = true;

      console.warn(`⚠️ [StaffStatusMonitor] 偵測到員工權限被撤銷（${source}），開始清理本地資料...`);

      try {
        // 步驟 1：失效 role cache 強制 useUserRole 重新查詢
        invalidateRoleCache();

        // 步驟 2：清空所有 authenticated tables + sync cursors + role cache
        await resetAuthenticatedCache('full');

        // 步驟 3：刪除整個 IndexedDB 確保完全乾淨（跟 settings page 的 clearLocalAppData 一致）
        if (typeof window !== 'undefined') {
          const { db } = await import('@/lib/db');
          try {
            db.close();
          } catch (error) {
            console.error('[StaffStatusMonitor] 關閉本地資料庫失敗:', error);
          }

          await new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase('MarketPulseDB');
            request.onsuccess = () => resolve();
            request.onerror = () => {
              console.error('[StaffStatusMonitor] 刪除 IndexedDB 失敗:', request.error);
              resolve();
            };
            request.onblocked = () => resolve();
          });
        }

        // 步驟 4：清除 sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
        }

        // 步驟 5：重置 useSync 內部旗標
        resetInitialSyncFlag();

        console.log('✅ [StaffStatusMonitor] 本地清理完成，即將重新載入...');

        // 步驟 6：強制重新載入頁面到首頁
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      } catch (error) {
        // ✅ C3.6.1 修法：即使中途失敗，也要強制重整避免用戶卡在殘留狀態
        // - resetAuthenticatedCache 可能因 IndexedDB 鎖定失敗
        // - 但刪除 IndexedDB 和 reload 仍然必須執行
        // - reload 會讓 useUserRole 重新查 supabase（此時已是 revoked）
        // - 用戶會被導向首頁（不再看到殘留資料）
        console.error('[StaffStatusMonitor] 清理失敗，強制重整:', error);
        cleanupInFlightRef.current = false;

        if (typeof window !== 'undefined') {
          // 重試刪除 IndexedDB（即使 resetAuthenticatedCache 失敗）
          try {
            const { db } = await import('@/lib/db');
            try { db.close(); } catch {}
          } catch {}

          try {
            await new Promise<void>((resolve) => {
              const request = indexedDB.deleteDatabase('MarketPulseDB');
              request.onsuccess = () => resolve();
              request.onerror = () => resolve();
              request.onblocked = () => resolve();
            });
          } catch {}

          // 強制重整（最後手段）
          window.location.href = '/';
        }
      }
    };

    /**
     * Polling 邏輯
     * 每 180 秒檢查一次員工狀態
     *
     * 使用 head:true 只查存在性（COUNT 而非 SELECT 資料）
     * 走 (staff_id, status) 複合索引，極輕量
     */
    const checkStaffStatus = async () => {
      if (!isMounted) return;

      try {
        const { count, error } = await supabase
          .from('staff_relationships')
          .select('*', { count: 'exact', head: true })
          .eq('staff_id', user.id)
          .eq('owner_id', userRole.ownerId!)
          .eq('status', 'active')
          .limit(1);

        if (error) {
          console.error('[StaffStatusMonitor] Polling 查詢失敗:', error);
          return;
        }

        // 找不到 active 記錄（count = 0）→ 員工被撤銷了
        if (count === 0) {
          await handleRevoked('poll');
        }
      } catch (error) {
        console.error('[StaffStatusMonitor] Polling 發生錯誤:', error);
      }
    };

    // Polling 排程
    pollInterval = setInterval(() => {
      void checkStaffStatus();
    }, pollIntervalMs);

    // 立即跑一次 polling（不等 pollIntervalMs）
    // 處理「掛載時剛好錯過 cache 過期事件」的情境
    void checkStaffStatus();

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [enabled, user, isStaff, userRole.ownerId, pollIntervalMs]);
}

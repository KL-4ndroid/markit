/**
 * 員工狀態監控 Hook（C3.6 修法 v2 — 成本優化版 + P5-4a role downgrade 偵測）
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
 * P5-4a（2026-06-19）擴充：role downgrade 偵測
 * - query 從 head:true 改為 select role/permissions（保留 count + .limit(1)）
 * - 新增 localStorage 'staff_status_monitor_known_role' cache
 *   （key 內含 userId + ownerId，避免跨 user 污染）
 * - 偵測 operator/manager → viewer/operator 時 invalidateRoleCache
 * - viewer → operator/manager 視為 upgrade，僅更新 cache 不觸發 invalidate
 * - revoke 流程（handleRevoked）完全不變
 * - 不清 Dexie、不 reload、不接 UI
 *
 * @see docs/C3.6_LEAVE_TEAM_CLEANUP_AUDIT.md
 * @see docs/p5-4-sync-dexie-downgrade-safety-design.md
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { invalidateRoleCache } from '@/hooks/useUserRole';
import { useRoleContext } from '@/lib/role-context';
import { clearStaffLocalProjections } from '@/lib/db/clear-user-data';
import { guardedAuthenticatedCacheReset } from '@/lib/sync/authenticated-cache-reset-guard';
import { dispatchAuthCacheBlockedEvent } from '@/lib/auth/auth-cache-blocked-events';
import { resetInitialSyncFlag } from '@/hooks/useSync';
import { dispatchRoleStatusEvent } from '@/lib/permissions/role-status-events';
import type { StaffRole } from '@/types/staff';

// ─── P5-4a 純 helper（top-level，方便測試） ─────────────────────────────────

/**
 * P5-4a localStorage key
 *
 * 儲存「上次 polling 看到的 staff role 快照」，
 * 用於偵測 role downgrade / upgrade。
 *
 * 重要：key 內含 userId + ownerId 兩個隔離欄位（user 不存在於 P5-4a 規範，
 * 但寫入時仍帶上以避免 useUserRole 與 useStaffStatusMonitor 互相耦合）。
 *
 * P5-4a 規範：useUserRole 不感知此 key；失效完全由 useStaffStatusMonitor 內部
 * 維護。
 */
export const STAFF_STATUS_KNOWN_ROLE_KEY = 'staff_status_monitor_known_role';

/**
 * P5-4a known role 快照結構
 */
export type StaffStatusKnownRoleCache = {
  userId: string;
  ownerId: string;
  role: StaffRole | null;
  infoLevel: number | null;
  timestamp: number;
};

/**
 * Staff role 排序（純 helper，用於 classify 升/降權）
 *
 * viewer   = 0
 * operator = 1
 * manager  = 2
 *
 * owner 不在 StaffRole union（P5-1 §R10）；owner capability 由 isOwner 推導，
 * 不會出現在本 classifier。
 */
export const STAFF_ROLE_RANK: Record<StaffRole, number> = {
  viewer: 0,
  operator: 1,
  manager: 2,
};

/**
 * 分類兩個 role 之間的變化
 *
 * 規則：
 * - previous 或 current 任一為 null / undefined → 'unknown'
 *   （視為 fail-closed / revoke-like，由 useStaffStatusMonitor 走既有 revoke flow）
 * - rank 相同 → 'same'
 * - current rank > previous rank → 'upgrade'
 * - current rank < previous rank → 'downgrade'
 *
 * @example
 *   classifyStaffRoleChange('operator', 'viewer')   // 'downgrade'
 *   classifyStaffRoleChange('manager',  'operator') // 'downgrade'
 *   classifyStaffRoleChange('viewer',   'operator') // 'upgrade'
 *   classifyStaffRoleChange('operator', 'operator') // 'same'
 *   classifyStaffRoleChange(null,       'operator') // 'unknown'
 */
export function classifyStaffRoleChange(
  previousRole: StaffRole | null | undefined,
  currentRole: StaffRole | null | undefined
): 'same' | 'upgrade' | 'downgrade' | 'unknown' {
  if (!previousRole || !currentRole) {
    return 'unknown';
  }
  if (!(previousRole in STAFF_ROLE_RANK) || !(currentRole in STAFF_ROLE_RANK)) {
    return 'unknown';
  }
  const prevRank = STAFF_ROLE_RANK[previousRole];
  const currRank = STAFF_ROLE_RANK[currentRole];
  if (prevRank === currRank) return 'same';
  if (currRank > prevRank) return 'upgrade';
  return 'downgrade';
}

/**
 * 從 permissions 物件安全讀取 infoLevel（fail-closed）
 *
 * 支援既有 StaffPermissions.infoLevel: 0 | 1 | 2 | 3 與
 * 任何合法 number；非法回傳 null。
 */
export function readInfoLevelFromPermissions(
  permissions: unknown
): number | null {
  if (!permissions || typeof permissions !== 'object') return null;
  const raw = (permissions as { infoLevel?: unknown }).infoLevel;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return null;
}

/**
 * 讀取 localStorage known role cache
 *
 * 規則（全部 fail-closed）：
 * - localStorage 不存在 → null
 * - JSON parse 失敗 → null
 * - userId 不一致 → null
 * - ownerId 不一致 → null
 * - role 不在 STAFF_ROLE_RANK 內 → null
 *
 * 不 throw，try/catch 全部吞掉。
 */
export function readKnownRoleCache(
  userId: string,
  ownerId: string
): StaffStatusKnownRoleCache | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STAFF_STATUS_KNOWN_ROLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StaffStatusKnownRoleCache> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.userId !== userId) return null;
    if (parsed.ownerId !== ownerId) return null;
    const role = parsed.role ?? null;
    if (role !== null && !(role in STAFF_ROLE_RANK)) return null;
    return {
      userId: parsed.userId,
      ownerId: parsed.ownerId,
      role,
      infoLevel:
        typeof parsed.infoLevel === 'number' && Number.isFinite(parsed.infoLevel)
          ? parsed.infoLevel
          : null,
      timestamp:
        typeof parsed.timestamp === 'number' && Number.isFinite(parsed.timestamp)
          ? parsed.timestamp
          : Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * 寫入 localStorage known role cache
 *
 * 規則：
 * - try/catch 包住 localStorage.setItem
 * - 寫入失敗只 console.warn
 * - 不 throw
 */
export function writeKnownRoleCache(cache: StaffStatusKnownRoleCache): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STAFF_STATUS_KNOWN_ROLE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[StaffStatusMonitor] 寫入 knownRoleCache 失敗：', error);
  }
}

/**
 * 處理 polling 結果，偵測 downgrade / upgrade。
 *
 * 純 helper，副作用僅透過傳入的 callback 觸發
 * （persist 寫入 knownRoleCache、onDowngrade 呼叫 invalidateRoleCache）。
 *
 * 用途：方便測試隔離 React / supabase 依賴。
 *
 * @returns 'noop' | 'baseline' | 'same' | 'upgrade' | 'downgrade' | 'unknown'
 *   - 'noop'：current 為 null（active relationship 消失 → 由 caller 走 revoke flow）
 *   - 'baseline'：沒有 previous，僅寫入 baseline
 *   - 'same'：role 相同，僅更新 timestamp
 *   - 'upgrade'：升權，僅寫入新值
 *   - 'downgrade'：降權，呼叫 onDowngrade + 寫入新值
 *   - 'unknown'：previous/current 任一為 null 但不是 active 缺失
 *     （應被視為 fail-closed；目前不觸發 revoke，僅寫入 baseline）
 */
export function handleRoleChangeDetection(args: {
  userId: string;
  ownerId: string;
  previousRole: StaffRole | null | undefined;
  currentRole: StaffRole | null;
  currentInfoLevel: number | null;
  /** 寫入 cache 的 callback（測試可注入 mock） */
  persist: (cache: StaffStatusKnownRoleCache) => void;
  /** downgrade 時觸發（測試可注入 mock，預設呼叫 invalidateRoleCache） */
  onDowngrade?: (from: StaffRole, to: StaffRole) => void;
  /** 注入 logger（測試可注入 mock，預設 console） */
  logger?: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
  };
}): 'noop' | 'baseline' | 'same' | 'upgrade' | 'downgrade' | 'unknown' {
  const {
    userId,
    ownerId,
    previousRole,
    currentRole,
    currentInfoLevel,
    persist,
    onDowngrade,
    logger = console,
  } = args;

  // current 為 null → active relationship 消失，交給 caller 走 revoke flow
  if (currentRole === null) {
    return 'noop';
  }

  const now = Date.now();

  // 沒有 baseline：寫入後離開
  if (!previousRole) {
    persist({ userId, ownerId, role: currentRole, infoLevel: currentInfoLevel, timestamp: now });
    return 'baseline';
  }

  const classification = classifyStaffRoleChange(previousRole, currentRole);

  switch (classification) {
    case 'same':
      persist({ userId, ownerId, role: currentRole, infoLevel: currentInfoLevel, timestamp: now });
      return 'same';

    case 'upgrade':
      logger.info(
        `[StaffStatusMonitor] 偵測到 staff role 升權（${previousRole} → ${currentRole}），僅更新 baseline`
      );
      persist({ userId, ownerId, role: currentRole, infoLevel: currentInfoLevel, timestamp: now });
      return 'upgrade';

    case 'downgrade':
      logger.warn(
        `⚠️ [StaffStatusMonitor] 偵測到 staff role 降權（${previousRole} → ${currentRole}），invalidateRoleCache`
      );
      if (onDowngrade) {
        onDowngrade(previousRole, currentRole);
      }
      persist({ userId, ownerId, role: currentRole, infoLevel: currentInfoLevel, timestamp: now });
      return 'downgrade';

    case 'unknown':
    default:
      // 包含 previous 為 null 但 current 合法 → 寫入 baseline（不視為 downgrade）
      persist({ userId, ownerId, role: currentRole, infoLevel: currentInfoLevel, timestamp: now });
      return 'unknown';
  }
}

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
  const { isStaff, userRole } = useRoleContext();

  // 防止 React Strict Mode 雙重掛載導致重複清理
  const cleanupInFlightRef = useRef(false);

  useEffect(() => {
    // 條件檢查：必須啟用、有用戶、是員工
    if (!enabled || !user || !isStaff || !userRole.ownerId) {
      return;
    }

    let isMounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

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
      dispatchRoleStatusEvent({
        kind: 'revoked',
        message: '你的員工關係已被解除，系統正在清除本機資料並重新載入。',
      });

      console.warn(`⚠️ [StaffStatusMonitor] 偵測到員工權限被撤銷（${source}），開始清理本地資料...`);

      try {
        // 步驟 1：失效 role cache 強制 useUserRole 重新查詢
        invalidateRoleCache();

        // 步驟 2：清空所有 authenticated tables + sync cursors + role cache
        const resetResult = await guardedAuthenticatedCacheReset({
          scope: 'full',
          reason: 'staff_status_reset',
          userId: user.id,
          allowSyncAttempt: false,
        });

        if (resetResult.decision === 'blocked') {
          console.warn('[StaffStatusMonitor] revoked cleanup blocked by local pending writes', resetResult.blockingReasonCodes);
          dispatchAuthCacheBlockedEvent(
            'staff_status_reset',
            resetResult,
            'Staff access changed, but local changes have not reached Cloud yet. The app kept local data and paused cleanup.'
          );
          dispatchRoleStatusEvent({
            kind: 'projection-cleanup-failed',
            message: 'Local pending writes must be resolved before clearing staff cache.',
          });
          cleanupInFlightRef.current = false;
          return;
        }

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
        dispatchRoleStatusEvent({
          kind: 'projection-cleanup-failed',
          message: '權限變更後的本機清理失敗，系統會嘗試重新載入以避免資料殘留。',
        });
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

    const handleDowngrade = async (from: StaffRole, to: StaffRole) => {
      try {
        dispatchRoleStatusEvent({
          kind: 'downgraded',
          message: `你的角色已從 ${from} 變更為 ${to}，正在清理超出權限的本機資料。`,
          fromRole: from,
          toRole: to,
        });
        invalidateRoleCache();
        const result = await clearStaffLocalProjections({
          staffUserId: user.id,
          ownerId: userRole.ownerId!,
        });
        console.warn('[StaffStatusMonitor] staff role downgrade projection cleanup complete', {
          from,
          to,
          result,
        });
        dispatchRoleStatusEvent({
          kind: 'projection-cleanup-complete',
          message: '角色變更後的本機資料清理已完成，系統會重新同步目前可見資料。',
          fromRole: from,
          toRole: to,
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('trigger-sync'));
        }
      } catch (error) {
        console.error('[StaffStatusMonitor] staff role downgrade projection cleanup failed:', error);
        dispatchRoleStatusEvent({
          kind: 'projection-cleanup-failed',
          message: '角色變更後的本機資料清理失敗，請重新整理後再操作。',
          fromRole: from,
          toRole: to,
        });
      }
    };

    /**
     * Polling 邏輯
     * 每 180 秒檢查一次員工狀態
     *
     * P5-4a：除了偵測 active relationship 是否存在（count），
     * 也取回 role / permissions 用於偵測 downgrade。
     * 保留 .eq('staff_id' / 'owner_id' / 'status') + .limit(1) 既有條件。
     *
     * 走 (staff_id, status) 複合索引，極輕量
     */
    const checkStaffStatus = async (revalidateAfterCheck = false) => {
      if (!isMounted) return;

      try {
        const { data, count, error } = await supabase
          .from('staff_relationships')
          .select('role, permissions', { count: 'exact' })
          .eq('staff_id', user.id)
          .eq('owner_id', userRole.ownerId!)
          .eq('status', 'active')
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(1);

        if (error) {
          console.error('[StaffStatusMonitor] Polling 查詢失敗:', error);
          return;
        }

        // 找不到 active 記錄（count = 0）→ 員工被撤銷了
        if (count === 0) {
          await handleRevoked('poll');
          return;
        }

        // P5-4a：role downgrade 偵測
        // - current role / infoLevel 從查詢結果推導
        // - previous role 優先從 localStorage knownRoleCache 讀取
        //   （若沒有則用目前 useUserRole 的 userRole.staffRole 作為 baseline）
        // - 分類為 downgrade / upgrade / same
        // - downgrade 觸發 invalidateRoleCache（不清 Dexie / 不 reload）
        // - upgrade 僅更新 baseline
        // - revoke 流程（count=0）已在上方 return，不會到這裡
        const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
        const currentRole: StaffRole | null =
          row && typeof row.role === 'string' && row.role in STAFF_ROLE_RANK
            ? (row.role as StaffRole)
            : null;
        const currentInfoLevel = row ? readInfoLevelFromPermissions(row.permissions) : null;

        // 1. 優先讀 knownRoleCache
        const cached = readKnownRoleCache(user.id, userRole.ownerId!);
        let previousRole: StaffRole | null | undefined = cached?.role;

        // 2. 若無 cache，fallback 使用 useUserRole 載入的 staffRole 作為 baseline
        if (!previousRole) {
          previousRole = userRole.staffRole ?? undefined;
        }

        // 3. 處理 role 變化
        const roleChange = handleRoleChangeDetection({
          userId: user.id,
          ownerId: userRole.ownerId!,
          previousRole,
          currentRole,
          currentInfoLevel,
          persist: (cache) => writeKnownRoleCache(cache),
          onDowngrade: (from, to) => {
            void handleDowngrade(from, to);
          },
        });

        const previousInfoLevel = cached?.infoLevel;
        const infoLevelChanged =
          previousInfoLevel != null &&
          currentInfoLevel != null &&
          previousInfoLevel !== currentInfoLevel;

        if (roleChange === 'upgrade' || (infoLevelChanged && currentInfoLevel > previousInfoLevel)) {
          invalidateRoleCache();
        } else if (
          roleChange === 'same' &&
          infoLevelChanged &&
          currentInfoLevel < previousInfoLevel &&
          previousRole &&
          currentRole
        ) {
          void handleDowngrade(previousRole, currentRole);
        } else if (revalidateAfterCheck && roleChange !== 'downgrade') {
          invalidateRoleCache();
        }
      } catch (error) {
        console.error('[StaffStatusMonitor] Polling 發生錯誤:', error);
      }
    };

    // Polling 排程
    pollInterval = setInterval(() => {
      void checkStaffStatus();
    }, pollIntervalMs);

    // Realtime is the fast path while the app is active. Polling and the
    // foreground role revalidation remain the recovery paths for missed events,
    // offline periods, or projects where this table is not in the publication.
    realtimeChannel = supabase
      .channel(`staff-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_relationships',
          filter: `staff_id=eq.${user.id}`,
        },
        () => {
          void checkStaffStatus(true);
        },
      )
      .subscribe();

    // 立即跑一次 polling（不等 pollIntervalMs）
    // 處理「掛載時剛好錯過 cache 過期事件」的情境
    void checkStaffStatus();

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (realtimeChannel) {
        void supabase.removeChannel(realtimeChannel);
      }
    };
  }, [enabled, user, isStaff, userRole.ownerId, userRole.staffRole, pollIntervalMs]);
}

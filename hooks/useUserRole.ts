/**
 * 用戶角色檢查 Hook
 *
 * 用於檢查當前用戶的身份（老闆或員工）
 * 這個 hook 會查詢 Supabase 來確定用戶身份
 *
 * ✅ 優化：使用 localStorage 緩存角色狀態，消除 UI 閃爍
 * ✅ P5-4b：invalidateRoleCache 同時 dispatch custom event，
 *           useUserRole 監聽後主動 revalidate，避免已 mounted
 *           的 hook 在 downgrade / revoke / manual invalidate 後
 *           殘留 stale userRole state
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { deriveRolePermissions } from '@/lib/permissions/role-fail-closed';
import type { StaffRole } from '@/types/staff';

export interface UserRole {
  isStaff: boolean;
  ownerId?: string;
  ownerEmail?: string;
  /**
   * ✅ P5-2: read-only exposure of staff_relationships.role.
   * - owner: null (owner is NOT a StaffRole enum value, see R10).
   * - staff: 'viewer' | 'operator' | 'manager' as stored in DB.
   * - loading initial / fail-closed: undefined / null respectively.
   * - No UI consumer is allowed in P5-2.
   */
  staffRole?: StaffRole | null;
  permissions?: {
    can_view: boolean;
    can_edit: boolean;
  };
}

// ✅ localStorage 緩存鍵
const ROLE_CACHE_KEY = 'user_role_cache';

// ✅ 角色快取 TTL：5 分鐘（降低角色不一致風險）
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

// ✅ P5-4b：custom event 名稱（讓 mounted useUserRole 收到 invalidation 通知）
//
// 命名理由：
// - 'boothbook:' 前綴區隔專案內部 custom event 與瀏覽器原生 event
// - 'role-cache-invalidated' 語意精確（不限 downgrade 場景，涵蓋 revoke / manual）
// - 與既有 'trigger-sync' 風格一致但更明確
export const ROLE_CACHE_INVALIDATED_EVENT = 'boothbook:role-cache-invalidated';

/**
 * 從 localStorage 讀取緩存的角色
 */
function getCachedRole(userId: string): UserRole | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(ROLE_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);

    // 檢查是否為同一用戶
    if (data.userId !== userId) return null;

    // 檢查緩存是否過期
    const now = Date.now();
    if (now - data.timestamp > ROLE_CACHE_TTL_MS) {
      localStorage.removeItem(ROLE_CACHE_KEY);
      return null;
    }

    return data.role;
  } catch {
    return null;
  }
}

/**
 * 保存角色到 localStorage
 */
function setCachedRole(userId: string, role: UserRole): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({
      userId,
      role,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('保存角色緩存失敗:', error);
  }
}

/**
 * 主動失效角色快取
 * 供外部流程（如接受邀請、員工被移除、降權偵測 P5-4a、revoke C3.6）
 * 在關鍵狀態變化後呼叫，強制下次 useUserRole() 重新查詢 Supabase。
 *
 * ✅ P5-4b：除清 localStorage 外，額外 dispatch custom event
 *           'boothbook:role-cache-invalidated'，通知所有已 mounted 的
 *           useUserRole 主動 revalidate。避免 React state 殘留 stale role。
 */
export function invalidateRoleCache(): void {
  clearRoleCache();
  dispatchRoleCacheInvalidatedEvent();
}

/**
 * ✅ P5-4b：dispatch invalidation custom event（內部 helper）
 *
 * 規則：
 * - SSR / window undefined 早退
 * - try/catch 包住 dispatch（不 throw）
 * - payload 暫時不加（保持簡單；future 可擴充為 CustomEvent<Detail>）
 */
function dispatchRoleCacheInvalidatedEvent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(ROLE_CACHE_INVALIDATED_EVENT));
  } catch (error) {
    console.warn('[useUserRole] Failed to dispatch role cache invalidation event:', error);
  }
}

/**
 * ✅ P5-4b：subscribe to invalidation event
 *
 * 用途：
 * - useUserRole 內部 useEffect 註冊 listener
 * - 測試可獨立 import 驗證 subscribe / unsubscribe 行為
 *
 * 規則：
 * - SSR / window undefined 時回傳 noop cleanup（不 throw）
 * - 回傳 unsubscribe function，呼叫後 removeEventListener
 *
 * 不提供 component callback、不接 UI、不暴露 payload。
 */
export function subscribeToRoleCacheInvalidation(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(ROLE_CACHE_INVALIDATED_EVENT, handler);
  return () => {
    window.removeEventListener(ROLE_CACHE_INVALIDATED_EVENT, handler);
  };
}

/**
 * 清除角色緩存（登出時調用）
 */
export function clearRoleCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ROLE_CACHE_KEY);
}

export function useUserRole() {
  const { user } = useAuth();

  // ✅ 優化：初始化時先從緩存讀取，避免閃爍
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (user) {
      const cached = getCachedRole(user.id);
      if (cached) {
        return cached;
      }
    }
    return { isStaff: false };
  });

  const [isLoading, setIsLoading] = useState(true);
  // ✅ C2.28：明確追蹤角色查詢錯誤，確保 fail-closed 行為
  const [roleError, setRoleError] = useState<Error | null>(null);

  // ✅ P5-4b：防止重複 revalidate（連續 invalidateRoleCache dispatch 時）
  // loadUserRole finally 區塊會釋放此旗標
  const revalidationInFlightRef = useRef(false);
  const mountedRef = useRef(false);
  const roleRequestIdRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(user?.id ?? null);

  currentUserIdRef.current = user?.id ?? null;

  const shouldCommitRoleLoad = (requestId: number, requestUserId: string | null): boolean => {
    return (
      mountedRef.current &&
      roleRequestIdRef.current === requestId &&
      currentUserIdRef.current === requestUserId
    );
  };

  /**
   * ✅ P5-4b：抽出 loadUserRole 為 stable function
   *
   * 原本是 useEffect 內部 closure；P5-4b 抽出後：
   * 1. 既有 useEffect [user] 仍呼叫 loadUserRole（user 變化時重新查）
   * 2. 新增 event listener useEffect 也呼叫 loadUserRole（invalidation 觸發 revalidate）
   *
   * 規則（與 P5-4a 前完全相同，零行為改動）：
   * - 查詢語意不變
   * - relationship selection 不變
   * - owner / staff 判斷不變
   * - fail-closed catch 不變
   * - 寫 cache 行為不變
   */
  const loadUserRole = async (requestUser = user): Promise<void> => {
    const requestId = ++roleRequestIdRef.current;
    const requestUserId = requestUser?.id ?? null;
    revalidationInFlightRef.current = true;

    // ✅ 如果沒有用戶,立即清除緩存並返回
    if (!requestUser) {
      clearRoleCache();
      if (shouldCommitRoleLoad(requestId, requestUserId)) {
        setUserRole({ isStaff: false });
        setRoleError(null);
        setIsLoading(false);
        revalidationInFlightRef.current = false;
      }
      return;
    }

    try {
      if (shouldCommitRoleLoad(requestId, requestUserId)) {
        setIsLoading(true);
        setRoleError(null);
      }

      // 查詢是否為員工
      const { data, error } = await supabase
        .from('staff_relationships')
        .select('owner_id, permissions, role')
        .eq('staff_id', requestUser.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!shouldCommitRoleLoad(requestId, requestUserId)) return;

      if (data && data.length > 0) {
        // 是員工，獲取老闆的 email
        const { data: ownerProfile, error: ownerError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', data[0].owner_id)
          .single();

        if (ownerError) throw ownerError;
        if (!shouldCommitRoleLoad(requestId, requestUserId)) return;

        const role: UserRole = {
          isStaff: true,
          ownerId: data[0].owner_id,
          ownerEmail: ownerProfile?.email || '未知',
          staffRole: data[0].role ?? null,
          permissions: data[0].permissions,
        };

        setUserRole(role);
        // ✅ 保存到緩存
        setCachedRole(requestUser.id, role);
      } else {
        // 是老闆
        const role: UserRole = { isStaff: false, staffRole: null };

        setUserRole(role);
        // ✅ 保存到緩存
        setCachedRole(requestUser.id, role);
      }
    } catch (error: any) {
      if (!shouldCommitRoleLoad(requestId, requestUserId)) return;

      console.error('檢查用戶身份失敗:', error);
      // ✅ C2.28：fail-closed —— 記錄錯誤並保持 userRole 為員工預設值
      // （不再 fallback 成 owner）讓 isOwner / canEdit / canViewSensitiveData 全部回傳 false
      setRoleError(error instanceof Error ? error : new Error(String(error)));
      setUserRole({ isStaff: true, staffRole: null, permissions: { can_view: false, can_edit: false } });
    } finally {
      if (shouldCommitRoleLoad(requestId, requestUserId)) {
        setIsLoading(false);
        // ✅ P5-4b：釋放 revalidate in-flight 旗標
        revalidationInFlightRef.current = false;
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      revalidationInFlightRef.current = false;
    };
  }, []);

  // ✅ 既有 user 變化時重新查（user 從 null 變 user / 切換帳號）
  useEffect(() => {
    void loadUserRole(user);
    // 依賴 [user]：user 變化時自動重查
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ P5-4b：監聽 role cache invalidation event
  //
  // 觸發情境：
  // - P5-4a downgrade detection 呼叫 invalidateRoleCache()
  // - C3.6 revoke detection 呼叫 invalidateRoleCache()
  // - 其他明確 invalidate 流程
  //
  // 行為：
  // - revalidationInFlightRef 防止重複查詢
  // - setIsLoading(true) → fail-closed 自動生效（deriveSafeInfoLevel=0）
  // - 重新查 staff_relationships / owner profile
  // - 成功 → setUserRole + setCachedRole
  // - 失敗 → 既有 fail-closed catch 生效
  //
  // 與既有 useEffect [user] 互不干擾：
  // - [user] effect 處理「user 變化時重新查」
  // - 本 effect 處理「同一 user session 內 cache invalidation」
  useEffect(() => {
    const unsubscribe = subscribeToRoleCacheInvalidation(() => {
      // 防止重複 revalidate：若已有 in-flight 查詢（含 user 變化查詢），
      // 忽略本次 event（既有查詢完成後若仍有 stale 風險，
      // 下次 invalidateRoleCache dispatch 仍會再觸發）
      if (revalidationInFlightRef.current) {
        return;
      }
      void loadUserRole(user);
    });

    return unsubscribe;
    // 依賴 [user]：user 變化時重新註冊 listener
    // （loadUserRole 透過 closure 讀取最新 user，無需加入依賴）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ✅ C2.28：fail-closed 權限計算（loading / error / 未登入 → 全部鎖住）
  const permissions = deriveRolePermissions({ userRole, isLoading, roleError });

  return {
    userRole,
    isLoading,
    roleError, // ✅ C2.28：新增錯誤狀態出口
    isStaff: userRole.isStaff, // ✅ 保留向後相容：語意維持「從 userRole 讀」
    isOwner: permissions.isOwner,
    canEdit: permissions.canEdit,
    canViewSensitiveData: permissions.canViewSensitiveData,
  };
}

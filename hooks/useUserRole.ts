/**
 * 用戶角色檢查 Hook
 * 
 * 用於檢查當前用戶的身份（老闆或員工）
 * 這個 hook 會查詢 Supabase 來確定用戶身份
 * 
 * ✅ 優化：使用 localStorage 緩存角色狀態，消除 UI 閃爍
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { deriveRolePermissions } from '@/lib/permissions/role-fail-closed';

export interface UserRole {
  isStaff: boolean;
  ownerId?: string;
  ownerEmail?: string;
  permissions?: {
    can_view: boolean;
    can_edit: boolean;
  };
}

// ✅ localStorage 緩存鍵
const ROLE_CACHE_KEY = 'user_role_cache';

// ✅ 角色快取 TTL：5 分鐘（降低角色不一致風險）
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

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
 * 供外部流程（如接受邀請、員工被移除）在關鍵狀態變化後呼叫，
 * 強制下次 useUserRole() 重新查詢 Supabase。
 */
export function invalidateRoleCache(): void {
  clearRoleCache();
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

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadUserRole = async () => {
      // ✅ 如果沒有用戶,立即清除緩存並返回
      if (!user) {
        clearRoleCache();
        if (isMounted) {
          setUserRole({ isStaff: false });
          setRoleError(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsLoading(true);
          setRoleError(null);
        }

        // ✅ 檢查是否已被取消
        if (abortController.signal.aborted) return;

        // 查詢是否為員工
        const { data, error } = await supabase
          .from('staff_relationships')
          .select('owner_id, permissions')
          .eq('staff_id', user.id)
          .eq('status', 'active')
          .limit(1);

        if (error) throw error;

        // ✅ 再次檢查是否已被取消
        if (abortController.signal.aborted || !isMounted) return;

        if (data && data.length > 0) {
          // 是員工，獲取老闆的 email
          const { data: ownerProfile, error: ownerError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', data[0].owner_id)
            .single();

          if (ownerError) throw ownerError;

          // ✅ 最後檢查是否已被取消
          if (abortController.signal.aborted || !isMounted) return;

          const role: UserRole = {
            isStaff: true,
            ownerId: data[0].owner_id,
            ownerEmail: ownerProfile?.email || '未知',
            permissions: data[0].permissions,
          };

          if (isMounted) {
            setUserRole(role);
            // ✅ 保存到緩存
            setCachedRole(user.id, role);
          }
        } else {
          // 是老闆
          const role: UserRole = { isStaff: false };
          
          if (isMounted) {
            setUserRole(role);
            // ✅ 保存到緩存
            setCachedRole(user.id, role);
          }
        }
      } catch (error: any) {
        // ✅ 忽略已取消的請求錯誤
        if (abortController.signal.aborted || !isMounted) return;

        console.error('檢查用戶身份失敗:', error);
        if (isMounted) {
          // ✅ C2.28：fail-closed —— 記錄錯誤並保持 userRole 為員工預設值
          // （不再 fallback 成 owner）讓 isOwner / canEdit / canViewSensitiveData 全部回傳 false
          setRoleError(error instanceof Error ? error : new Error(String(error)));
          setUserRole({ isStaff: true, permissions: { can_view: false, can_edit: false } });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadUserRole();

    return () => {
      isMounted = false;
      abortController.abort(); // ✅ 取消進行中的請求
    };
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

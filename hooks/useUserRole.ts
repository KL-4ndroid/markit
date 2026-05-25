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
    
    // 檢查緩存是否過期（24 小時）
    const now = Date.now();
    if (now - data.timestamp > 24 * 60 * 60 * 1000) {
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

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadUserRole = async () => {
      // ✅ 如果沒有用戶,立即清除緩存並返回
      if (!user) {
        clearRoleCache();
        if (isMounted) {
          setUserRole({ isStaff: false });
          setIsLoading(false);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsLoading(true);
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
          setUserRole({ isStaff: false });
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

return {
    userRole,
    isLoading,
    isStaff: userRole.isStaff,
    isOwner: !userRole.isStaff,
    canEdit: !userRole.isStaff, // ✅ 只有老闆可以編輯，員工固定不能編輯
    canViewSensitiveData: !userRole.isStaff, // 只有老闆可以查看敏感數據
  };
}

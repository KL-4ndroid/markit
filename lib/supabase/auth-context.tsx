/**
 * Supabase Auth Context
 * 
 * 管理全域用戶狀態和身份驗證
 * 支援離線優先架構
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './client';
import { initializeUserSettings } from './settings';
import { pullQuickActionButtonsFromCloud } from '@/lib/quick-actions-store';
import { resetInitialSyncFlag } from '@/hooks/useSync';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isConfigured: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured] = useState(isSupabaseConfigured());

  useEffect(() => {
    // 如果 Supabase 未配置，直接設為未登入狀態
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // 獲取初始 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // 如果已登入，拉取用戶設定
      if (session?.user) {
        syncUserSettings(session.user.id);
      }
    });

    // 監聽 Auth 狀態變化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // 登入時拉取用戶設定
      if (event === 'SIGNED_IN' && session?.user) {
        syncUserSettings(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  /**
   * 同步用戶設定（從雲端拉取）
   */
  const syncUserSettings = async (userId: string) => {
    try {
      // 使用 setTimeout 延遲執行，避免在初始化時立即執行
      setTimeout(async () => {
        try {
          // 嘗試拉取設定
          const buttons = await pullQuickActionButtonsFromCloud(userId);
          
          // 如果雲端沒有設定，初始化預設設定
          if (!buttons) {
            await initializeUserSettings(userId);
          }
        } catch (error) {
          console.error('同步用戶設定失敗:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('同步用戶設定失敗:', error);
    }
  };

  const handleSignOut = async () => {
    // ✅ 檢查是否為員工模式
    const { clearRoleCache } = await import('@/hooks/useUserRole');
    const cachedRole = typeof window !== 'undefined' ? localStorage.getItem('user_role_cache') : null;
    let isStaffUser = false;
    
    if (cachedRole) {
      try {
        const data = JSON.parse(cachedRole);
        isStaffUser = data.role?.isStaff || false;
      } catch (error) {
        console.error('解析角色緩存失敗:', error);
      }
    }
    
    // 執行登出
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('登出失敗:', error);
      throw error;
    }
    
    // ✅ 重置初始同步標記，下次登入時會重新執行
    resetInitialSyncFlag();
    
    // ✅ 清除 sessionStorage 中的初始同步完成標記
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('hasCompletedInitialSync');
    }
    
    // ✅ 清除角色緩存
    clearRoleCache();
    
    console.log('🔄 已重置同步標記和角色緩存');
    
    // ✅ 員工模式：清除本地資料庫並重新載入頁面
    if (isStaffUser) {
      console.log('👤 員工模式登出：清除本地資料庫...');
      
      try {
        // 刪除 IndexedDB 資料庫
        if (typeof window !== 'undefined' && window.indexedDB) {
          const dbName = 'MarketPulseDB';
          const deleteRequest = window.indexedDB.deleteDatabase(dbName);
          
          deleteRequest.onsuccess = () => {
            console.log('✅ 本地資料庫已清除');
            // 清除所有 localStorage
            localStorage.clear();
            // 清除所有 sessionStorage
            sessionStorage.clear();
            // 強制重新載入頁面
            window.location.href = '/';
          };
          
          deleteRequest.onerror = (event) => {
            console.error('❌ 清除本地資料庫失敗:', event);
            // 即使失敗也要重新載入
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
          };
          
          deleteRequest.onblocked = () => {
            console.warn('⚠️ 資料庫刪除被阻擋，強制重新載入');
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
          };
        } else {
          // 如果不支援 IndexedDB，直接清除並重新載入
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/';
        }
      } catch (error) {
        console.error('清除本地資料時發生錯誤:', error);
        // 確保即使出錯也要重新載入
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * 使用 Auth Context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth 必須在 AuthProvider 內使用');
  }
  
  return context;
}

/**
 * 檢查是否已登入
 */
export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  return { isAuthenticated: !!user, loading };
}

/**
 * 獲取當前用戶 ID
 */
export function useUserId() {
  const { user } = useAuth();
  return user?.id || null;
}

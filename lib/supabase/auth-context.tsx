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
      // ✅ 記錄所有 Auth 狀態變化
      console.log(`🔐 Auth 狀態變化: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        timestamp: new Date().toISOString(),
      });
      
      // ✅ 特別記錄登出事件
      if (event === 'SIGNED_OUT') {
        const logoutReason = {
          event: 'SIGNED_OUT',
          timestamp: new Date().toISOString(),
          previousUser: user?.id,
          stackTrace: new Error().stack,
        };
        console.warn('⚠️ 用戶已登出', logoutReason);
        
        // 保存到 localStorage 供後續分析
        try {
          const logoutHistory = JSON.parse(localStorage.getItem('logout_history') || '[]');
          logoutHistory.push(logoutReason);
          // 只保留最近 10 次記錄
          if (logoutHistory.length > 10) {
            logoutHistory.shift();
          }
          localStorage.setItem('logout_history', JSON.stringify(logoutHistory));
        } catch (error) {
          console.error('保存登出記錄失敗:', error);
        }
      }
      
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
    // ✅ 記錄主動登出
    console.log('🚪 用戶主動登出', {
      userId: user?.id,
      timestamp: new Date().toISOString(),
      reason: 'manual_signout',
      stackTrace: new Error().stack,
    });
    
    // 🔒 安全措施：登出時清空本地資料庫（防止數據盜取）
    console.log('🔒 安全清理：準備清空本地資料庫...');
    
    // ✅ 增強：先手動清除數據表（防止 IndexedDB 刪除被阻擋）
    try {
      const { db } = await import('@/lib/db');
      await db.markets.clear();
      await db.products.clear();
      await db.events.clear();
      await db.dailyStats.clear();
      console.log('✅ 數據表已手動清除');
    } catch (dbError) {
      console.error('手動清除數據表失敗:', dbError);
      // 繼續執行，不中斷流程
    }
    
    // 執行登出
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ 登出失敗:', error);
      throw error;
    }
    
    console.log('✅ 登出成功');
    
    // ✅ 重置初始同步標記，下次登入時會重新執行
    resetInitialSyncFlag();
    
    // ✅ 清除角色緩存
    const { clearRoleCache } = await import('@/hooks/useUserRole');
    clearRoleCache();
    
    console.log('🔄 已重置同步標記和角色緩存');
    
    // 🔒 所有用戶登出時都清除本地資料庫（安全措施）
    console.log('🔒 安全清理：清除本地資料庫...');
    
    try {
      // ✅ 選擇性清除 localStorage（保留用戶設定）
      const keysToRemove = [
        'user_role_cache',
        'logout_history',
        'hasCompletedInitialSync',
      ];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`清除 ${key} 失敗:`, e);
        }
      });
      
      // 清除所有 sessionStorage
      sessionStorage.clear();
      
      console.log('✅ 緩存已選擇性清除');
      
      // 刪除 IndexedDB 資料庫
      if (typeof window !== 'undefined' && window.indexedDB) {
        const dbName = 'MarketPulseDB';
        const deleteRequest = window.indexedDB.deleteDatabase(dbName);
        
        deleteRequest.onsuccess = () => {
          console.log('✅ IndexedDB 已刪除');
          // 強制重新載入頁面
          window.location.href = '/';
        };
        
        deleteRequest.onerror = (event) => {
          console.error('❌ 刪除 IndexedDB 失敗:', event);
          // 即使失敗也要重新載入（數據表已清除）
          window.location.href = '/';
        };
        
        deleteRequest.onblocked = () => {
          console.warn('⚠️ IndexedDB 刪除被阻擋（多標籤頁），但數據表已清除');
          // 強制重新載入（數據表已清除，安全）
          window.location.href = '/';
        };
      } else {
        // 如果不支援 IndexedDB，直接重新載入
        window.location.href = '/';
      }
    } catch (error) {
      console.error('清除本地資料時發生錯誤:', error);
      // 確保即使出錯也要重新載入
      window.location.href = '/';
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

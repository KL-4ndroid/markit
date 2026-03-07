/**
 * Supabase Auth Context
 * 
 * 管理全域用戶狀態和身份驗證
 * 支援離線優先架構
 * ✅ 增強：跨分頁同步、Session 過期檢查、防閃爍優化
 */

'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
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

// ✅ 跨分頁通訊頻道
const AUTH_CHANNEL_NAME = 'auth_channel';
const AUTH_STORAGE_KEY = 'auth_state_sync';

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isConfigured: false,
  signOut: async () => {},
});

/**
 * ✅ 檢查 Session 是否真正過期（已經超過過期時間）
 * 注意：不提前判定，讓 Supabase 的 autoRefreshToken 機制自動處理
 */
function isSessionExpired(session: Session | null): boolean {
  if (!session) return true;
  
  const expiresAt = session.expires_at;
  if (!expiresAt) return false;
  
  const now = Math.floor(Date.now() / 1000);
  
  // 只有真正過期才返回 true，不提前判定
  return now >= expiresAt;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured] = useState(isSupabaseConfigured());
  
  // ✅ 使用 ref 追蹤 BroadcastChannel，避免重複創建
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // ✅ 追蹤是否為主動登出
  const isManualSignOutRef = useRef(false);

  useEffect(() => {
    // 如果 Supabase 未配置，直接設為未登入狀態
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // ✅ 初始化跨分頁通訊
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel(AUTH_CHANNEL_NAME);
      
      broadcastChannelRef.current.onmessage = (event) => {
        console.log('📡 收到跨分頁訊息:', event.data);
        
        if (event.data.type === 'SIGNED_OUT') {
          // 其他分頁登出，同步更新狀態
          console.log('🔄 同步登出：其他分頁已登出');
          setUser(null);
          setSession(null);
          setLoading(false);
        } else if (event.data.type === 'SIGNED_IN') {
          // 其他分頁登入，重新載入頁面以同步狀態
          console.log('🔄 同步登入：其他分頁已登入，重新載入頁面');
          window.location.reload();
        }
      };
    } else {
      // ✅ Fallback: 使用 localStorage 事件監聽
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === AUTH_STORAGE_KEY && e.newValue) {
          const data = JSON.parse(e.newValue);
          console.log('📡 收到 localStorage 同步訊息:', data);
          
          if (data.type === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
            setLoading(false);
          } else if (data.type === 'SIGNED_IN') {
            window.location.reload();
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
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

    // ✅ 移除定期檢查 Session 的邏輯
    // Supabase 的 autoRefreshToken 會自動處理 token 刷新
    // 只在 onAuthStateChange 收到 SIGNED_OUT 事件時才登出

    // 監聽 Auth 狀態變化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // ✅ 記錄所有 Auth 狀態變化
      console.log(`🔐 Auth 狀態變化: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        previousUserId: user?.id,
        timestamp: new Date().toISOString(),
      });
      
      // ✅ TOKEN_REFRESHED 是正常的自動刷新，應該接受
      // 這讓用戶可以長時間保持登入狀態
      
      // ✅ 特別記錄登出事件
      if (event === 'SIGNED_OUT') {
        const isManual = isManualSignOutRef.current;
        const logoutReason = {
          event: 'SIGNED_OUT',
          timestamp: new Date().toISOString(),
          previousUser: user?.id,
          isManual,
          stackTrace: new Error().stack,
        };
        
        if (isManual) {
          console.log('✅ 用戶主動登出', logoutReason);
          // 重置標記
          isManualSignOutRef.current = false;
        } else {
          console.warn('⚠️ 用戶已登出（被動）', logoutReason);
        }
        
        // ✅ 被動登出時也清除數據
        clearUserData('passive_signout').catch(error => {
          console.error('被動登出清除數據失敗:', error);
        });
        
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
        
        // ✅ 廣播登出事件到其他分頁
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'SIGNED_OUT', timestamp: Date.now() });
        } else {
          // Fallback: 使用 localStorage
          try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ type: 'SIGNED_OUT', timestamp: Date.now() }));
            // 立即清除，避免干擾
            setTimeout(() => localStorage.removeItem(AUTH_STORAGE_KEY), 100);
          } catch (e) {
            console.error('廣播登出事件失敗:', e);
          }
        }
      }
      
      // ✅ 登入事件：檢測用戶切換
      if (event === 'SIGNED_IN') {
        const newUserId = session?.user?.id;
        const previousUserId = user?.id;
        
        // ✅ 檢測用戶切換（不同用戶登入）
        if (previousUserId && newUserId && previousUserId !== newUserId) {
          console.warn('⚠️ 檢測到用戶切換', {
            from: previousUserId.substring(0, 8),
            to: newUserId.substring(0, 8),
          });
          
          // ✅ 清除前一個用戶的數據
          try {
            const { clearOtherUsersData } = await import('@/lib/db/clear-user-data');
            await clearOtherUsersData(newUserId);
            console.log('✅ 已清除前一個用戶的數據');
          } catch (error) {
            console.error('❌ 清除前一個用戶數據失敗:', error);
          }
        }
        
        // 廣播登入事件到其他分頁
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ type: 'SIGNED_IN', timestamp: Date.now() });
        } else {
          try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ type: 'SIGNED_IN', timestamp: Date.now() }));
            setTimeout(() => localStorage.removeItem(AUTH_STORAGE_KEY), 100);
          } catch (e) {
            console.error('廣播登入事件失敗:', e);
          }
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

    return () => {
      subscription.unsubscribe();
      
      // 清理 BroadcastChannel
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
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

  /**
   * ✅ 統一的清除數據函數
   * 無論是主動登出還是被動登出，都調用此函數
   */
  const clearUserData = async (reason: string) => {
    console.log(`🔒 清除用戶數據 (原因: ${reason})`, {
      userId: user?.id,
      timestamp: new Date().toISOString(),
    });
    
    try {
      // 1. 清除本地資料庫（完整清除，不保留任何用戶數據）
      const { clearAllData } = await import('@/lib/db');
      await clearAllData();
      console.log('✅ 本地資料庫已清除');
    } catch (dbError) {
      console.error('清除本地資料庫失敗:', dbError);
    }
    
    try {
      // 2. 重置初始同步標記
      resetInitialSyncFlag();
      
      // 3. 清除角色緩存
      const { clearRoleCache } = await import('@/hooks/useUserRole');
      clearRoleCache();
      
      // 4. 清除 localStorage（包括員工模式標記）
      const keysToRemove = [
        'user_role_cache',
        'logout_history',
        'hasCompletedInitialSync',
        'staff_mode_enabled',  // ✅ 清除員工模式標記
        'lastSyncAt',          // ✅ 清除同步時間戳
      ];
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error(`清除 ${key} 失敗:`, e);
        }
      });
      
      // 5. 清除 sessionStorage
      sessionStorage.clear();
      
      console.log('✅ 所有緩存已清除');
    } catch (error) {
      console.error('清除緩存失敗:', error);
    }
  };

  const handleSignOut = async () => {
    // ✅ 設置主動登出標記
    isManualSignOutRef.current = true;
    
    // ✅ 記錄主動登出
    console.log('🚪 用戶主動登出', {
      userId: user?.id,
      timestamp: new Date().toISOString(),
      reason: 'manual_signout',
    });
    
    // ✅ 清除用戶數據
    await clearUserData('manual_signout');
    
    // ✅ 先清除本地狀態（立即反應）
    setUser(null);
    setSession(null);
    
    // 執行登出
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ 登出失敗:', error);
      throw error;
    }
    
    console.log('✅ 登出成功');
    
    // ✅ 不重新載入頁面，讓 AuthGuard 自動顯示歡迎頁面
    // window.location.href = '/';
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

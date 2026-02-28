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
 * ✅ 檢查 Session 是否過期
 */
function isSessionExpired(session: Session | null): boolean {
  if (!session) return true;
  
  const expiresAt = session.expires_at;
  if (!expiresAt) return false;
  
  // 提前 5 分鐘判定為過期，給予緩衝時間
  const bufferSeconds = 5 * 60;
  const now = Math.floor(Date.now() / 1000);
  
  return now >= (expiresAt - bufferSeconds);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured] = useState(isSupabaseConfigured());
  
  // ✅ 使用 ref 追蹤 BroadcastChannel，避免重複創建
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      // ✅ 檢查 Session 是否過期
      if (isSessionExpired(session)) {
        console.warn('⚠️ Session 已過期，清除狀態');
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // 如果已登入，拉取用戶設定
      if (session?.user) {
        syncUserSettings(session.user.id);
      }
    });

    // ✅ 定期檢查 Session 是否過期（每分鐘檢查一次）
    sessionCheckIntervalRef.current = setInterval(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (isSessionExpired(session)) {
          console.warn('⚠️ Session 已過期，觸發登出');
          
          // ✅ Session 過期時清除數據
          clearUserData('session_expired').catch(error => {
            console.error('Session 過期清除數據失敗:', error);
          });
          
          // 觸發登出流程
          setSession(null);
          setUser(null);
        }
      });
    }, 60 * 1000); // 每分鐘檢查

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
        console.warn('⚠️ 用戶已登出（被動）', logoutReason);
        
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
      
      // ✅ 登入事件
      if (event === 'SIGNED_IN') {
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
      
      // 清理定時器
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
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
      // 1. 清除本地資料庫
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
      
      // 4. 清除 localStorage
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
      
      // 5. 清除 sessionStorage
      sessionStorage.clear();
      
      console.log('✅ 所有緩存已清除');
    } catch (error) {
      console.error('清除緩存失敗:', error);
    }
  };

  const handleSignOut = async () => {
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

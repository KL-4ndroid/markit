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
      // 動態導入避免循環依賴
      const { pullQuickActionButtonsFromCloud } = await import('@/lib/quick-actions-store');
      const { initializeUserSettings } = await import('./settings');
      
      // 嘗試拉取設定
      const buttons = await pullQuickActionButtonsFromCloud(userId);
      
      // 如果雲端沒有設定，初始化預設設定
      if (!buttons) {
        await initializeUserSettings(userId);
        console.log('✅ 用戶設定已初始化');
      } else {
        console.log('✅ 已從雲端同步用戶設定');
      }
    } catch (error) {
      console.error('同步用戶設定失敗:', error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('登出失敗:', error);
      throw error;
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

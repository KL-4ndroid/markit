/**
 * Supabase Auth Context
 * 
 * 管理全域用戶狀態和身份驗證
 * 支援離線優先架構
 * ✅ 增強：跨分頁同步、Session 過期檢查、防閃爍優化
 */

'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './client';
import { initializeUserSettings } from './settings';
import { pullQuickActionButtonsFromCloud } from '@/lib/quick-actions-store';
import {
  guardedAuthenticatedCacheReset,
  type GuardedAuthenticatedCacheResetResult,
} from '@/lib/sync/authenticated-cache-reset-guard';
import { dispatchAuthCacheBlockedEvent } from '@/lib/auth/auth-cache-blocked-events';

export interface AuthSignOutOptions {
  forceDiscardLocalChanges?: boolean;
}

export const AUTH_MANUAL_SIGN_OUT_STARTED_EVENT = 'auth:manual-sign-out-started';
export const AUTH_MANUAL_SIGN_OUT_CANCELLED_EVENT = 'auth:manual-sign-out-cancelled';

export class AuthenticatedCacheResetBlockedError extends Error {
  result: GuardedAuthenticatedCacheResetResult;

  constructor(result: GuardedAuthenticatedCacheResetResult) {
    super('Local changes are not synced yet.');
    this.name = 'AuthenticatedCacheResetBlockedError';
    this.result = result;
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signOut: (options?: AuthSignOutOptions) => Promise<void>;
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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured] = useState(isSupabaseConfigured());
  
  // ✅ 使用 ref 追蹤 BroadcastChannel，避免重複創建
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // ✅ 追蹤是否為主動登出
  const isManualSignOutRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const blockedLocalChangesUserIdRef = useRef<string | null>(null);
  const syncUserSettingsRef = useRef<(userId: string) => Promise<void>>(async () => {});
  const clearUserDataRef = useRef<(reason: string) => Promise<void>>(async () => {});

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // 如果 Supabase 未配置，直接設為未登入狀態
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // ✅ 初始化跨分頁通訊
    let removeStorageListener: (() => void) | undefined;
    const supportsBroadcastChannel = typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined';

    if (supportsBroadcastChannel) {
      broadcastChannelRef.current = new BroadcastChannel(AUTH_CHANNEL_NAME);
      
      broadcastChannelRef.current.onmessage = (event) => {
        console.log('📡 收到跨分頁訊息:', event.data);
        
        if (event.data.type === 'SIGNED_OUT') {
          // 其他分頁登出，同步更新狀態
          console.log('🔄 同步登出：其他分頁已登出');
          setUser(null);
          setSession(null);
          setLoading(false);
        }
      };
    } else if (typeof window !== 'undefined') {
      // ✅ Fallback: 使用 localStorage 事件監聽
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === AUTH_STORAGE_KEY && e.newValue) {
          const data = JSON.parse(e.newValue);
          console.log('📡 收到 localStorage 同步訊息:', data);
          
          if (data.type === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
            setLoading(false);
          }
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      removeStorageListener = () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }

    // 獲取初始 Session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('取得初始 Session 失敗:', error);
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // 如果已登入，拉取用戶設定
        if (session?.user) {
          syncUserSettingsRef.current(session.user.id);
        }
      })
      .catch(error => {
        // 認證初始化失敗時採未登入狀態，避免永久停在全域載入骨架。
        console.error('初始化 Session 失敗:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
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
        previousUserId: userRef.current?.id,
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
          previousUser: userRef.current?.id,
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
        guardedAuthenticatedCacheReset({
          scope: 'full',
          reason: 'passive_signout',
          userId: userRef.current?.id,
          allowSyncAttempt: false,
        }).then(result => {
          if (result.decision === 'blocked') {
            blockedLocalChangesUserIdRef.current = userRef.current?.id ?? null;
            console.warn('[auth] sign-out cache reset blocked by local pending writes', result.blockingReasonCodes);
            dispatchAuthCacheBlockedEvent(
              'passive_signout',
              result,
              'The session ended, but local changes have not reached Cloud yet. Local data was kept on this device.'
            );
          } else {
            blockedLocalChangesUserIdRef.current = null;
          }
        }).catch(error => {
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
        const previousUserId = userRef.current?.id;
        const blockedLocalChangesUserId = blockedLocalChangesUserIdRef.current;

        if (blockedLocalChangesUserId && newUserId && blockedLocalChangesUserId !== newUserId) {
          console.warn('[auth] blocking sign-in because another user has unsynced local writes', {
            blockedUserId: blockedLocalChangesUserId.substring(0, 8),
            newUserId: newUserId.substring(0, 8),
          });
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        if (blockedLocalChangesUserId && newUserId === blockedLocalChangesUserId) {
          blockedLocalChangesUserIdRef.current = null;
        }
        
        // ✅ 檢測用戶切換（不同用戶登入）
        if (previousUserId && newUserId && previousUserId !== newUserId) {
          console.warn('⚠️ 檢測到用戶切換', {
            from: previousUserId.substring(0, 8),
            to: newUserId.substring(0, 8),
          });
          
          // ✅ 清除前一個用戶的數據（全量 authenticated cache reset）
          try {
            const resetResult = await guardedAuthenticatedCacheReset({
              scope: 'role_switch',
              reason: 'identity_switch',
              userId: previousUserId,
              allowSyncAttempt: false,
            });

            if (resetResult.decision === 'blocked') {
              blockedLocalChangesUserIdRef.current = previousUserId;
              console.warn('[auth] identity switch blocked by local pending writes', resetResult.blockingReasonCodes);
              dispatchAuthCacheBlockedEvent(
                'identity_switch',
                resetResult,
                'Account switching was paused because the previous account still has local changes that have not reached Cloud.'
              );
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setLoading(false);
              return;
            }

            blockedLocalChangesUserIdRef.current = null;
            console.log('✅ 已清除前一個用戶的數據（role_switch scope）');
          } catch (error) {
            console.error('❌ 清除前一個用戶數據失敗:', error);
          }
        }
        
        // Supabase already synchronizes sessions across same-origin tabs.
        // SIGNED_IN can also fire when an existing session is reconfirmed after
        // tab focus, so broadcasting it as a new login would reload peer tabs.
      }
      
      setSession(session);
      setUser(currentUser => {
        const nextUser = session?.user ?? null;
        if (event !== 'USER_UPDATED' && currentUser?.id && currentUser.id === nextUser?.id) {
          return currentUser;
        }
        return nextUser;
      });
      setLoading(false);
      
      // 登入時拉取用戶設定
      if (event === 'SIGNED_IN' && session?.user && userRef.current?.id !== session.user.id) {
        syncUserSettingsRef.current(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      removeStorageListener?.();
      
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
   * 清除用戶數據（由 handleSignOut 呼叫）
   * 現在由 resetAuthenticatedCache('full') 統一處理
   */
  const clearUserData = async (reason: string) => {
    console.log(`🔒 清除用戶數據 (原因: ${reason})`);
    const resetResult = await guardedAuthenticatedCacheReset({
      scope: 'full',
      reason: 'passive_signout',
      userId: userRef.current?.id,
      allowSyncAttempt: false,
    });

    if (resetResult.decision === 'blocked') {
      blockedLocalChangesUserIdRef.current = userRef.current?.id ?? null;
      throw new AuthenticatedCacheResetBlockedError(resetResult);
    }
  };

  syncUserSettingsRef.current = syncUserSettings;
  clearUserDataRef.current = clearUserData;

  const handleSignOut = async (options: AuthSignOutOptions = {}) => {
    // ✅ 設置主動登出標記
    isManualSignOutRef.current = true;
    
    // ✅ 記錄主動登出
    console.log('🚪 用戶主動登出', {
      userId: user?.id,
      timestamp: new Date().toISOString(),
      reason: 'manual_signout',
    });
    
    // ✅ 清除用戶數據
    const resetResult = await guardedAuthenticatedCacheReset({
      scope: 'full',
      reason: options.forceDiscardLocalChanges ? 'force_discard' : 'manual_signout',
      userId: user?.id,
      allowSyncAttempt: !options.forceDiscardLocalChanges,
      forceDiscardLocalChanges: options.forceDiscardLocalChanges === true,
    });

    if (resetResult.decision === 'blocked') {
      isManualSignOutRef.current = false;
      throw new AuthenticatedCacheResetBlockedError(resetResult);
    }

    // Force discard may run after Supabase has already emitted SIGNED_OUT.
    // Release the remembered cache owner so a subsequent account is not
    // rejected by a stale identity-switch guard.
    blockedLocalChangesUserIdRef.current = null;
    
    // Let session-expiry UI distinguish an intentional sign-out before
    // Supabase emits SIGNED_OUT and clears the React auth state.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_MANUAL_SIGN_OUT_STARTED_EVENT));
    }

    // 執行登出
    const { error } = await supabase.auth.signOut();
    if (error) {
      isManualSignOutRef.current = false;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(AUTH_MANUAL_SIGN_OUT_CANCELLED_EVENT));
      }
      console.error('❌ 登出失敗:', error);
      throw error;
    }

    setUser(null);
    setSession(null);
    
    console.log('✅ 登出成功');
    
    // Keep signed-out users out of protected settings routes without a full
    // document reload. AuthManager remains mounted, so the login dialog can be
    // opened deliberately instead of flashing through a loading skeleton.
    if (typeof window !== 'undefined') {
      router.replace('/');
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('auth:open-login', { detail: { mode: 'login' } }));
      }, 0);
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

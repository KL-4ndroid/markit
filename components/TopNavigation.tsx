/**
 * Top Navigation - 頂部導航欄
 * 
 * 顯示同步狀態和用戶資訊
 * 提供登入/登出功能
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import { getTheme } from '@/lib/theme-config';
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator';
import { confirmDiscardLocalChangesForSignOut } from '@/lib/auth/signout-confirmation';
import { LogIn, LogOut, User, Shield, Eye, Edit3, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function TopNavigation() {
  const { user, signOut, isConfigured } = useAuth();
  const { userRole } = useRoleContext();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();

  // ✅ 依角色套用主題（員工模式沿用主色 + 透明度，避免兩套品牌色並行）
  const theme = getTheme(userRole.isStaff);
  
  // TODO: 從實際訂閱狀態獲取
  const currentPlan: 'free' | 'pro' | 'enterprise' = 'free';

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('已登出');
      setShowUserMenu(false);
    } catch (error: any) {
      if (confirmDiscardLocalChangesForSignOut(error)) {
        await signOut({ forceDiscardLocalChanges: true });
        toast.success('已登出');
        setShowUserMenu(false);
        return;
      }

      toast.error('登出失敗：' + error.message);
    }
  };

  const handleLogin = () => {
    // 觸發登入對話框
    window.dispatchEvent(new CustomEvent('auth:open-login', { detail: { mode: 'login' } }));
  };

  // 如果未配置 Supabase，不顯示
  if (!isConfigured) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 backdrop-blur-md ${theme.light} ${theme.border} border-b z-40`}>
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- PWA icon 已是預優化小圖，不需要 next/image 額外處理 */}
            <img
              src="/icons/icon-192x192.png"
              alt="Féria - 出攤筆記"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-sm font-medium text-foreground">Féria</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* ✅ 輕量化同步狀態指示器 */}
          {user && <SyncStatusIndicator />}

          {/* 用戶資訊 / 登入按鈕 */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-soft-green hover:bg-soft-green/80 transition-colors"
              >
                {userRole.isStaff ? (
                  <Shield className="w-4 h-4 text-secondary" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
                <span className="text-sm text-foreground max-w-[100px] truncate">
                  {user.email?.split('@')[0]}
                </span>
              </button>

              {/* 用戶選單 */}
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-xl p-2 min-w-[240px] z-50 border border-primary/10">
                    {/* 用戶信息 */}
                    <div className="px-3 py-2 border-b border-primary/10">
                      <p className="text-xs text-muted-foreground">登入為</p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.email}
                      </p>
                    </div>

                    {/* 訂閱狀態（僅老闆身份顯示） */}
                    {!userRole.isStaff && (
                      <div className="px-3 py-2 border-b border-primary/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">目前方案</span>
                          {currentPlan === 'free' && (
                            <Crown className="w-4 h-4 text-secondary" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {currentPlan === "free"
                              ? "免費版"
                              : currentPlan === "pro"
                              ? "專業版"
                              : currentPlan === "enterprise"
                              ? "企業版"
                              : ""}
                          </span>
                          {currentPlan === 'free' ? (
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                router.push('/subscription');
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              升級
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                router.push('/subscription');
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              管理
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 身份信息 */}
                    <div className="px-3 py-2 border-b border-primary/10">
                      {userRole.isStaff ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-secondary" />
                            <span className="text-sm font-medium text-foreground">
                              員工身份
                            </span>
                          </div>
                          {/* 老闆信息 */}
                          {userRole.ownerEmail && (
                            <div className="mb-2 p-2 bg-primary/10 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-0.5">為以下老闆工作</p>
                              <p className="text-sm font-medium text-foreground truncate">
                                {userRole.ownerEmail}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-xs">
                            {userRole.permissions?.can_edit ? (
                              <>
                                <Edit3 className="w-3 h-3 text-primary" />
                                <span className="text-muted-foreground">可編輯</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                                <span className="text-muted-foreground">僅查看</span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">
                            老闆身份
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 登出按鈕 */}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-soft-pink transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-danger" />
                      <span className="text-sm text-foreground">登出</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/85 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span className="text-sm font-medium">登入</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

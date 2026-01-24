/**
 * Top Navigation - 頂部導航欄
 * 
 * 顯示同步狀態和用戶資訊
 * 提供登入/登出功能
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { SyncStatus } from '@/components/sync/SyncStatus';
import { LogIn, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';

export function TopNavigation() {
  const { user, signOut, isConfigured } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('已登出');
      setShowUserMenu(false);
    } catch (error: any) {
      toast.error('登出失敗：' + error.message);
    }
  };

  const handleLogin = () => {
    // 觸發登入對話框
    const button = document.getElementById('auth-manager-login-trigger');
    if (button) {
      button.click();
    }
  };

  // 如果未配置 Supabase，不顯示
  if (!isConfigured) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-[#7B9FA6]/10 z-40">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] rounded-xl flex items-center justify-center">
            <span className="text-white text-sm font-bold">市</span>
          </div>
          <span className="text-sm font-medium text-[#3A3A3A]">市集誌</span>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* 同步狀態 */}
          {user && <SyncStatus />}

          {/* 用戶資訊 / 登入按鈕 */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#E8F3E8] hover:bg-[#D8E3D8] transition-colors"
              >
                <User className="w-4 h-4 text-[#7B9FA6]" />
                <span className="text-sm text-[#3A3A3A] max-w-[100px] truncate">
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
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-2xl shadow-xl p-2 min-w-[200px] z-50 border border-[#7B9FA6]/10">
                    <div className="px-3 py-2 border-b border-[#7B9FA6]/10">
                      <p className="text-xs text-[#6B6B6B]">登入為</p>
                      <p className="text-sm font-medium text-[#3A3A3A] truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-[#F5E6E8] transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4 text-[#d4183d]" />
                      <span className="text-sm text-[#3A3A3A]">登出</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors"
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

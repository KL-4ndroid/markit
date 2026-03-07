/**
 * Login Modal - 登入對話框
 * 
 * 簡單的 Email 登入介面
 * 串接 Supabase Auth
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { supabase } from '@/lib/supabase/client';
import { Mail, Lock, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userId: string, email: string) => void;
  defaultMode?: 'login' | 'signup';  // ✅ 新增：允許指定預設模式
}

export function LoginModal({ isOpen, onClose, onLoginSuccess, defaultMode = 'login' }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [rememberMe, setRememberMe] = useState(false); // ✅ 新增：記住帳號狀態
  
  // ✅ 當 defaultMode 改變時，更新 mode
  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);
  
  // ✅ 新增：載入已記住的帳號
  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('請填寫所有欄位');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        // 登入
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // ✅ 新增：根據「記住帳號」選項儲存或清除 Email
          if (rememberMe) {
            localStorage.setItem('remembered_email', email);
          } else {
            localStorage.removeItem('remembered_email');
          }
          
          toast.success('登入成功！');
          onLoginSuccess(data.user.id, data.user.email!);
        }
      } else {
        // 註冊
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: email.split('@')[0],
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          // ✅ 檢查是否有邀請 Token（透過連結註冊）
          const invitationToken = sessionStorage.getItem('invitation_token');
          
          if (invitationToken) {
            try {
              // 自動綁定員工關係
              const { acceptInvitationAndBind } = await import('@/lib/supabase/staff-invitations');
              const result = await acceptInvitationAndBind(invitationToken, data.user.id);
              
              if (result.success) {
                // ✅ 啟用員工模式
                const { enableStaffMode } = await import('@/lib/db/feature-flags');
                enableStaffMode();
                
                toast.success('註冊成功！已自動加入團隊');
                // 清除 token
                sessionStorage.removeItem('invitation_token');
              } else {
                toast.warning('註冊成功，但加入團隊失敗', {
                  description: result.message,
                });
              }
            } catch (bindError: any) {
              console.error('自動綁定員工關係失敗:', bindError);
              toast.warning('註冊成功，但加入團隊失敗', {
                description: '請聯繫邀請人重新邀請',
              });
            }
          } else {
            // 一般註冊（無邀請）
            toast.success('註冊成功！');
          }
          
          onLoginSuccess(data.user.id, data.user.email!);
        }
      }
    } catch (error: any) {
      console.error('認證失敗:', error);
      
      if (error.message.includes('Invalid login credentials')) {
        toast.error('帳號或密碼錯誤');
      } else if (error.message.includes('User already registered')) {
        toast.error('此 Email 已註冊');
      } else {
        toast.error(error.message || '認證失敗，請稍後再試');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast.error('請輸入 Email');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      toast.success('Magic Link 已發送至您的信箱！');
      onClose();
    } catch (error: any) {
      console.error('發送 Magic Link 失敗:', error);
      toast.error(error.message || '發送失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      {/* 對話框容器 */}
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
          {/* 標題 */}
          <div className="flex items-center justify-between mb-6">
            <DialogTitle className="text-2xl font-medium text-[#3A3A3A]">
              {mode === 'login' ? '登入帳號' : '註冊帳號'}
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5E6E8] rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[#6B6B6B]" />
            </button>
          </div>

          {/* 表單 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-[#6B6B6B] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7B9FA6]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#7B9FA6]/20 focus:border-[#7B9FA6] focus:outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-[#6B6B6B] mb-2">
                密碼
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7B9FA6]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#7B9FA6]/20 focus:border-[#7B9FA6] focus:outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* ✅ 新增：記住帳號選項（僅在登入模式顯示） */}
            {mode === 'login' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#7B9FA6]/20 text-[#7B9FA6] focus:ring-[#7B9FA6] focus:ring-offset-0 cursor-pointer"
                  disabled={isLoading}
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-[#6B6B6B] cursor-pointer select-none"
                >
                  記住帳號
                </label>
              </div>
            )}

            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#7B9FA6] text-white py-4 rounded-2xl hover:bg-[#6A8E95] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  處理中...
                </>
              ) : (
                mode === 'login' ? '登入' : '註冊'
              )}
            </button>
          </form>

          {/* Magic Link */}
          <div className="mt-4">
            <button
              onClick={handleMagicLink}
              disabled={isLoading}
              className="w-full bg-[#E8F3E8] text-[#3A3A3A] py-4 rounded-2xl hover:bg-[#D8E3D8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              使用 Magic Link 登入
            </button>
          </div>

          {/* 切換模式 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-[#7B9FA6] hover:text-[#6A8E95] transition-colors text-sm"
              disabled={isLoading}
            >
              {mode === 'login' ? '還沒有帳號？立即註冊' : '已有帳號？立即登入'}
            </button>
          </div>

          {/* 說明 */}
          <div className="mt-6 p-4 bg-[#FFF8E7] rounded-2xl">
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              💡 <strong>提示：</strong>登入後，系統會詢問您是否要將本地資料同步到雲端。
              您可以選擇同步、清除或取消登入。
            </p>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

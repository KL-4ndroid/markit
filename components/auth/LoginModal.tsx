/**
 * Login Modal - 登入對話框
 * 
 * 簡單的 Email 登入介面
 * 串接 Supabase Auth
 */

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Mail, Lock, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userId: string, email: string) => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  if (!isOpen) return null;

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
          toast.success('註冊成功！請檢查您的信箱以驗證帳號');
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
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 對話框 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
          {/* 標題 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-medium text-[#3A3A3A]">
              {mode === 'login' ? '登入帳號' : '註冊帳號'}
            </h2>
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
        </div>
      </div>
    </>
  );
}

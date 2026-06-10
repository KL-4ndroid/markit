'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { supabase } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, Lock, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userId: string, email: string) => void;
  defaultMode?: 'login' | 'signup';
}

function getFriendlyAuthError(error: unknown, mode: 'login' | 'signup'): string {
  const message = error instanceof Error ? error.message : String(error || '');
  const lowerMessage = message.toLowerCase();

  if (message.includes('Invalid login credentials')) {
    return 'Email 或密碼不正確，請確認後再試一次。';
  }

  if (message.includes('User already registered') || lowerMessage.includes('already registered')) {
    return '此 Email 已註冊，請改用登入。';
  }

  if (lowerMessage.includes('password') && (lowerMessage.includes('6') || lowerMessage.includes('short'))) {
    return '密碼至少需要 6 位字元。';
  }

  if (lowerMessage.includes('email')) {
    return '請輸入有效的 Email。';
  }

  return `${mode === 'login' ? '登入' : '註冊'}失敗：${message || '請稍後再試。'}`;
}

export function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  defaultMode = 'login',
}: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSignup = mode === 'signup';

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (!isOpen) return;

    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      toast.error('請輸入 Email 和密碼。');
      return;
    }

    if (isSignup && password.length < 6) {
      toast.error('密碼至少需要 6 位字元。');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;

        if (data.user) {
          if (rememberMe) {
            localStorage.setItem('remembered_email', normalizedEmail);
          } else {
            localStorage.removeItem('remembered_email');
          }

          toast.success('登入成功。');
          onLoginSuccess(data.user.id, data.user.email || normalizedEmail);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              display_name: normalizedEmail.split('@')[0],
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          const invitationToken = sessionStorage.getItem('invitation_token');

          if (invitationToken) {
            try {
              const { acceptInvitationAndBind } = await import('@/lib/supabase/staff-invitations');
              const result = await acceptInvitationAndBind(invitationToken, data.user.id);

              if (result.success) {
                toast.success('帳號已建立，並已加入團隊。');
                sessionStorage.removeItem('invitation_token');
              } else {
                toast.warning('帳號已建立，但加入團隊失敗。', {
                  description: result.message,
                });
              }
            } catch (bindError) {
              console.error('加入團隊失敗:', bindError);
              toast.warning('帳號已建立，但加入團隊失敗。', {
                description: '請聯繫邀請人重新發送邀請連結。',
              });
            }
          } else {
            toast.success('帳號建立成功。');
          }

          onLoginSuccess(data.user.id, data.user.email || normalizedEmail);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast.error(getFriendlyAuthError(error, mode));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <DialogTitle className="text-2xl font-medium text-[#3A3A3A] mb-2">
                {isSignup ? '建立 Markit 帳號' : '登入 Markit'}
              </DialogTitle>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                {isSignup
                  ? '建立帳號後即可同步資料。若你是透過邀請連結加入團隊，註冊後會自動加入。'
                  : '登入後可同步雲端資料，並在不同裝置使用。'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5E6E8] rounded-full transition-colors"
              aria-label="關閉"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-[#6B6B6B]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#6B6B6B] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7B9FA6]" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#7B9FA6]/20 focus:border-[#7B9FA6] focus:outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-[#6B6B6B]">
                  密碼
                </label>
                {isSignup && (
                  <span className="text-xs text-[#8A8A8A]">至少 6 位字元</span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7B9FA6]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="輸入密碼"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className="w-full pl-12 pr-12 py-3 rounded-2xl border border-[#7B9FA6]/20 focus:border-[#7B9FA6] focus:outline-none transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#7B9FA6]"
                  aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isSignup && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="w-4 h-4 rounded border-[#7B9FA6]/20 text-[#7B9FA6] focus:ring-[#7B9FA6] focus:ring-offset-0 cursor-pointer"
                  disabled={isLoading}
                />
                <label
                  htmlFor="rememberMe"
                  className="text-sm text-[#6B6B6B] cursor-pointer select-none"
                >
                  記住 Email
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#7B9FA6] text-white py-4 rounded-2xl hover:bg-[#6A8E95] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isSignup ? '建立帳號中...' : '登入中...'}
                </>
              ) : (
                isSignup ? '建立帳號' : '登入'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(isSignup ? 'login' : 'signup')}
              className="text-[#7B9FA6] hover:text-[#6A8E95] transition-colors text-sm"
              disabled={isLoading}
            >
              {isSignup ? '已有帳號？登入' : '還沒有帳號？建立帳號'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-[#FFF8E7] rounded-2xl">
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              {isSignup
                ? '註冊後，資料會綁定到此 Email 帳號。請使用你之後會固定登入的信箱。'
                : '登入後，系統會自動同步你的雲端資料。若此裝置已有本機資料，系統會先詢問你如何處理。'}
            </p>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

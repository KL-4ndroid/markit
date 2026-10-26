'use client';

import { useEffect, useId, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { supabase } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, Lock, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (
    userId: string,
    email: string,
    meta?: { invitationAccepted?: boolean; invitationLogin?: boolean }
  ) => void;
  defaultMode?: 'login' | 'signup';
}

function getFriendlyAuthError(error: unknown, mode: 'login' | 'signup'): string {
  const message = error instanceof Error ? error.message : String(error || '');
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.startsWith('native_auth_')) {
    return '目前無法安全讀寫登入資料，請解鎖裝置並重新開啟 App 後再試。';
  }

  if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
    return '暫時無法連上登入服務，請確認網路後重試。';
  }

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
  const [authError, setAuthError] = useState('');
  const [isSlowAuth, setIsSlowAuth] = useState(false);

  const isSignup = mode === 'signup';
  const formId = useId();

  useEffect(() => {
    setMode(defaultMode);
    setAuthError('');
    setIsSlowAuth(false);
  }, [defaultMode]);

  useEffect(() => {
    if (!isOpen) return;

    setAuthError('');
    setIsSlowAuth(false);

    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError('');

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      const message = '請輸入 Email 和密碼。';
      setAuthError(message);
      return;
    }

    if (isSignup && password.length < 6) {
      const message = '密碼至少需要 6 位字元。';
      setAuthError(message);
      return;
    }

    setIsLoading(true);
    const slowAuthTimer = window.setTimeout(() => {
      setIsSlowAuth(true);
    }, 8000);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const invitationToken = sessionStorage.getItem('invitation_token');
          if (rememberMe) {
            localStorage.setItem('remembered_email', normalizedEmail);
          } else {
            localStorage.removeItem('remembered_email');
          }

          toast.success('登入成功。');
          onLoginSuccess(
            data.user.id,
            data.user.email || normalizedEmail,
            invitationToken ? { invitationLogin: true } : undefined
          );
        } else {
          throw new Error('登入失敗，請確認 Email 和密碼後再試一次。');
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
          let invitationAccepted = false;

          if (invitationToken) {
            try {
              const { acceptInvitationAndBind } = await import('@/lib/supabase/staff-invitations');
              const result = await acceptInvitationAndBind(invitationToken, data.user.id);

              if (result.success) {
                const { invalidateRoleCache } = await import('@/hooks/useUserRole');
                invalidateRoleCache();
                invitationAccepted = true;
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

          onLoginSuccess(data.user.id, data.user.email || normalizedEmail, { invitationAccepted });
        } else {
          throw new Error('帳號建立失敗，請稍後再試。');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      const message = getFriendlyAuthError(error, mode);
      setAuthError(message);
    } finally {
      window.clearTimeout(slowAuthTimer);
      setIsSlowAuth(false);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-deep/35 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 overflow-y-auto p-4 sm:p-6">
        <div className="flex min-h-full items-center justify-center">
        <DialogPanel className="japanese-surface-card max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <DialogTitle className="text-2xl font-medium text-foreground mb-2">
                {isSignup ? '建立 Féria 帳號' : '登入 Féria'}
              </DialogTitle>
              {isSignup && <p className="text-sm text-muted-foreground leading-relaxed">建立帳號後即可同步資料。若你是透過邀請連結加入團隊，註冊後會自動加入。</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center hover:bg-soft-pink rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="關閉"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isLoading} aria-describedby={authError ? `${formId}-error` : undefined}>
            <div>
              <label htmlFor={`${formId}-email`} className="block text-sm text-muted-foreground mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  id={`${formId}-email`}
                  type="email"
                  name="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (authError) setAuthError('');
                  }}
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-primary/20 focus:border-primary focus:outline-none transition-colors"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor={`${formId}-password`} className="block text-sm text-muted-foreground">
                  密碼
                </label>
                {isSignup && (
                  <span id={`${formId}-password-hint`} className="text-xs text-muted-foreground">至少 6 位字元</span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                <input
                  id={`${formId}-password`}
                  aria-describedby={isSignup ? `${formId}-password-hint` : undefined}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (authError) setAuthError('');
                  }}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className="w-full pl-12 pr-12 py-3 rounded-2xl border border-primary/20 focus:border-primary focus:outline-none transition-colors"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-1 top-1/2 inline-flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isSignup && (
              <div className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  id={`${formId}-remember`}
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="w-4 h-4 rounded border-primary/20 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  disabled={isLoading}
                />
                <label
                  htmlFor={`${formId}-remember`}
                  className="inline-flex min-h-11 items-center text-sm text-muted-foreground cursor-pointer select-none"
                >
                  記住 Email
                </label>
              </div>
            )}

            {authError && (
              <div
                role="alert"
                id={`${formId}-error`}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700"
              >
                {authError}
              </div>
            )}

            {isSlowAuth && !authError && (
              <div role="status" className="rounded-2xl border border-secondary/30 bg-soft-yellow px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                正在等待登入服務回應，尚未開始載入市集資料。請稍候，避免重複送出。
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
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
              type="button"
              onClick={() => {
                setAuthError('');
                setMode(isSignup ? 'login' : 'signup');
              }}
              className="text-primary hover:text-primary/85 transition-colors text-sm"
              disabled={isLoading}
            >
              {isSignup ? '已有帳號？登入' : '還沒有帳號？建立帳號'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-soft-yellow rounded-2xl">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isSignup
                ? '註冊後，資料會綁定到此 Email 帳號。請使用你之後會固定登入的信箱。'
                : '登入成功後會讀取雲端紀錄；若有需要處理的本機資料，會另外提示。'}
            </p>
          </div>
        </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

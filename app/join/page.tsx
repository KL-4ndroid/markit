'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2, Users, WifiOff } from 'lucide-react';
import { GlobalLoadingSkeleton } from '@/components/auth/GlobalLoadingSkeleton';
import { useAuth } from '@/lib/supabase/auth-context';
import { confirmDiscardLocalChangesForSignOut } from '@/lib/auth/signout-confirmation';
import {
  verifyInvitationToken,
  type InvitationVerification,
} from '@/lib/supabase/staff-invitations';
import { toast } from 'sonner';
import { getNetworkPort } from '@/lib/platform/network-capability';

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [verifying, setVerifying] = useState(true);
  const [verification, setVerification] = useState<InvitationVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => getNetworkPort().getCurrentStatus().connected);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const network = getNetworkPort();
    setIsOnline(network.getCurrentStatus().connected);
    return network.subscribe(status => setIsOnline(status.connected));
  }, []);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('缺少邀請 Token。請確認邀請連結是否完整。');
      setVerifying(false);
      return;
    }

    if (!isOnline) {
      setError('驗證邀請連結需要網路連線。請恢復連線後再試一次。');
      setVerifying(false);
      return;
    }

    const invitationToken = token;

    async function verifyToken() {
      try {
        setVerifying(true);
        setError(null);

        const result = await verifyInvitationToken(invitationToken);

        if (!result.is_valid) {
          setError('邀請連結已過期或無效，請聯繫邀請人重新發送。');
          setVerification(null);
          return;
        }

        setVerification(result);
        sessionStorage.setItem('invitation_token', invitationToken);
      } catch (verifyError) {
        console.error('驗證邀請失敗:', verifyError);
        setError('驗證邀請連結失敗，請稍後再試。');
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [searchParams, isOnline]);

  async function handleAcceptInvitation() {
    const token = searchParams.get('token');
    if (!token || !user) return;

    setIsAccepting(true);

    try {
      const { acceptInvitationAndBind } = await import('@/lib/supabase/staff-invitations');
      const result = await acceptInvitationAndBind(token, user.id);

      if (result.success) {
        const { invalidateRoleCache } = await import('@/hooks/useUserRole');
        invalidateRoleCache();
        sessionStorage.removeItem('invitation_token');

        toast.success('已加入團隊，正在載入可存取的市集資料...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setError(result.message);
        setIsAccepting(false);
      }
    } catch (acceptError) {
      console.error('接受邀請失敗:', acceptError);
      setError('加入團隊失敗，請稍後再試或聯繫邀請人。');
      setIsAccepting(false);
    }
  }

  function handleRegister() {
    window.dispatchEvent(new CustomEvent('auth:open-login'));
  }

  function handleLogin() {
    window.dispatchEvent(new CustomEvent('auth:open-login', { detail: { mode: 'login' } }));
  }

  async function handleSwitchAccount() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      if (confirmDiscardLocalChangesForSignOut(error)) {
        await signOut({ forceDiscardLocalChanges: true });
        router.push('/');
      }
    } finally {
      setIsSigningOut(false);
    }
  }

  if (!isOnline) {
    return (
      <JoinShell>
        <div className="text-center">
          <WifiOff className="w-16 h-16 text-secondary mx-auto mb-4 opacity-60" />
          <h2 className="text-xl font-medium text-foreground mb-2">
            需要網路連線
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            驗證邀請連結需要連線。請恢復網路後重新整理頁面。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-white py-3 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
          >
            重新整理
          </button>
        </div>
      </JoinShell>
    );
  }

  if (verifying) {
    return <GlobalLoadingSkeleton message="驗證邀請連結中..." />;
  }

  if (error || !verification) {
    return (
      <JoinShell>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4 opacity-60" />
          <h2 className="text-xl font-medium text-foreground mb-2">
            邀請連結無效
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {error || '此邀請連結已過期或不存在，請聯繫邀請人重新發送。'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-primary text-white py-3 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
          >
            回到首頁
          </button>
        </div>
      </JoinShell>
    );
  }

  return (
    <JoinShell>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-soft-green mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-medium text-foreground mb-2">
          加入市集團隊
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <span className="font-medium text-primary">{verification.owner_email}</span>
          {' '}邀請你成為團隊員工，協助記錄市集資料。
        </p>
      </div>

      <div className="bg-primary/10 rounded-2xl p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-2">
          加入後你可以
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>查看老闆授權的市集與商品資料</li>
          <li>協助記錄互動與成交</li>
          <li>同步你被授權範圍內的資料</li>
        </ul>
      </div>

      <div className="bg-soft-yellow rounded-2xl p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-secondary" />
          請確認帳號
        </h3>
        {user ? (
          <>
            <p className="text-xs text-muted-foreground mb-2">
              你目前登入的帳號是：
            </p>
            <p className="text-sm font-medium text-foreground bg-white rounded-lg px-3 py-2 break-all">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              你將用這個帳號加入 {verification.owner_email} 的團隊。
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground leading-relaxed">
            請建立帳號後加入團隊。已有帳號的人，請先登入後再回到此邀請連結。
          </p>
        )}
      </div>

      {user ? (
        <div className="space-y-3">
          <button
            onClick={handleAcceptInvitation}
            disabled={isAccepting || isSigningOut}
            className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/85 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                加入中...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                確認加入團隊
              </>
            )}
          </button>

          <button
            onClick={handleSwitchAccount}
            disabled={isAccepting || isSigningOut}
            className="w-full bg-soft-pink text-foreground py-3 rounded-2xl hover:bg-soft-pink/80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSigningOut ? '登出中...' : '不是這個帳號？登出切換'}
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={handleRegister}
            className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/85 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            建立帳號並加入團隊
          </button>

          <button
            onClick={handleLogin}
            className="mt-3 w-full bg-soft-green text-foreground py-3 rounded-2xl hover:bg-soft-green/80 transition-colors font-medium"
          >
            已有帳號？登入後加入團隊
          </button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            註冊完成後會自動加入團隊，不需要額外設定。
          </p>
        </>
      )}
    </JoinShell>
  );
}

function JoinShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-xl">
        {children}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<GlobalLoadingSkeleton message="載入中..." />}>
      <JoinPageContent />
    </Suspense>
  );
}

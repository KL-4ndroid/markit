/**
 * 員工邀請處理頁面
 * 
 * 處理邀請連結，驗證 Token，引導註冊
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Users, AlertCircle, Loader2, CheckCircle, WifiOff } from 'lucide-react';
import { verifyInvitationToken, type InvitationVerification } from '@/lib/supabase/staff-invitations';
import { GlobalLoadingSkeleton } from '@/components/auth/GlobalLoadingSkeleton';
import { useAuth } from '@/lib/supabase/auth-context';

function JoinPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [verifying, setVerifying] = useState(true);
  const [verification, setVerification] = useState<InvitationVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false); // ✅ 新增：接受邀請的載入狀態

  useEffect(() => {
    // 檢查網路狀態
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('缺少邀請 Token');
      setVerifying(false);
      return;
    }

    // 如果離線，顯示錯誤
    if (!isOnline) {
      setError('驗證邀請連結需要網路連線');
      setVerifying(false);
      return;
    }

    // 驗證 Token
    verifyToken(token);
  }, [searchParams, isOnline]);

  // ✅ 移除自動接受邀請的邏輯
  // 已登入用戶也需要手動確認才能加入團隊
  // useEffect(() => {
  //   if (user && verification?.is_valid) {
  //     handleAutoAccept();
  //   }
  // }, [user, verification]);

  async function verifyToken(token: string) {
    try {
      setVerifying(true);
      console.log('🔍 開始驗證 Token:', token.substring(0, 10) + '...');
      
      const result = await verifyInvitationToken(token);
      console.log('📊 驗證結果:', result);

      if (!result.is_valid) {
        console.warn('❌ Token 無效或已過期');
        setError('邀請連結已過期或無效');
        setVerification(null);
      } else {
        console.log('✅ Token 驗證成功，老闆:', result.owner_email);
        setVerification(result);
        // 將 token 存入 sessionStorage，供註冊時使用
        sessionStorage.setItem('invitation_token', token);
      }
    } catch (error: any) {
      console.error('❌ 驗證邀請失敗:', error);
      setError('驗證失敗，請稍後再試');
    } finally {
      setVerifying(false);
      console.log('🏁 驗證流程結束');
    }
  }

  // ✅ 手動接受邀請（需要用戶確認）
  async function handleAcceptInvitation() {
    const token = searchParams.get('token');
    if (!token || !user) return;

    setIsAccepting(true);
    
    try {
      const { acceptInvitationAndBind } = await import('@/lib/supabase/staff-invitations');
      const result = await acceptInvitationAndBind(token, user.id);

      if (result.success) {
        // ✅ 啟用員工模式
        const { enableStaffMode } = await import('@/lib/db/feature-flags');
        enableStaffMode();
        
        // 清除 token
        sessionStorage.removeItem('invitation_token');
        
        // 顯示成功訊息
        const { toast } = await import('sonner');
        toast.success('已成功加入團隊！');
        
        // 延遲導向，讓用戶看到成功訊息
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        setError(result.message);
        setIsAccepting(false);
      }
    } catch (error: any) {
      console.error('接受邀請失敗:', error);
      setError('加入團隊失敗，請稍後再試');
      setIsAccepting(false);
    }
  }

  function handleRegister() {
    // 觸發登入 Modal（切換到註冊模式）
    window.dispatchEvent(new CustomEvent('auth:open-login'));
  }

  // 離線狀態
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-xl text-center">
          <WifiOff className="w-16 h-16 text-[#D4A574] mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-medium text-[#3A3A3A] mb-2">
            需要網路連線
          </h2>
          <p className="text-[#6B6B6B] text-sm mb-6">
            驗證邀請連結需要網路連線，請檢查您的網路設定後重試。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#7B9FA6] text-white py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // 驗證中
  if (verifying) {
    return <GlobalLoadingSkeleton message="驗證邀請連結中..." />;
  }

  // 驗證失敗
  if (error || !verification) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-xl text-center">
          <AlertCircle className="w-16 h-16 text-[#d4183d] mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-medium text-[#3A3A3A] mb-2">
            邀請連結無效
          </h2>
          <p className="text-[#6B6B6B] text-sm mb-6">
            {error || '此邀請連結已過期或不存在，請聯繫邀請人重新發送。'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-[#7B9FA6] text-white py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  // 驗證成功，顯示歡迎頁面
  console.log('🎉 渲染歡迎頁面，user:', user?.email, 'verification:', verification);
  
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-xl">
        {/* 成功圖示 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#E8F3E8] mb-4">
            <CheckCircle className="w-8 h-8 text-[#7B9FA6]" />
          </div>
          <h2 className="text-2xl font-medium text-[#3A3A3A] mb-2">
            您受邀加入團隊！
          </h2>
          {verification.owner_email && (
            <p className="text-[#6B6B6B] text-sm">
              <span className="font-medium text-[#7B9FA6]">{verification.owner_email}</span> 邀請您加入他的市集團隊
            </p>
          )}
        </div>

        {/* 說明 */}
        <div className="bg-[#F0E8F3] rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-medium text-[#3A3A3A] mb-2">
            加入後您可以：
          </h3>
          <ul className="space-y-2 text-sm text-[#6B6B6B]">
            <li className="flex items-start gap-2">
              <span className="text-[#7B9FA6] mt-0.5">✓</span>
              <span>查看老闆的市集和商品資訊</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#7B9FA6] mt-0.5">✓</span>
              <span>記錄互動和成交數據</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#7B9FA6] mt-0.5">✓</span>
              <span>協助管理市集營運</span>
            </li>
          </ul>
        </div>

        {/* ✅ 重要提示：一個帳號只能加入一個團隊 */}
        <div className="bg-[#FFF8E7] rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#D4A574]" />
            重要提示
          </h3>
          <p className="text-xs text-[#6B6B6B]">
            一個帳號只能加入一個團隊。如果您已經是其他老闆的員工，將無法加入此團隊。
          </p>
        </div>

        {/* ✅ 已登入用戶：顯示當前帳號和確認按鈕 */}
        {user ? (
          <>
            {/* 當前帳號資訊 */}
            <div className="bg-[#FFF8E7] rounded-2xl p-4 mb-4">
              <h3 className="text-sm font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#D4A574]" />
                請確認
              </h3>
              <p className="text-xs text-[#6B6B6B] mb-2">
                您目前登入的帳號是：
              </p>
              <p className="text-sm font-medium text-[#3A3A3A] bg-white rounded-lg px-3 py-2">
                {user.email}
              </p>
              <p className="text-xs text-[#6B6B6B] mt-2">
                確認後，此帳號將加入 <span className="font-medium text-[#7B9FA6]">{verification.owner_email}</span> 的團隊。
              </p>
            </div>

            {/* 確認按鈕 */}
            <div className="space-y-3">
              <button
                onClick={handleAcceptInvitation}
                disabled={isAccepting}
                className="w-full bg-[#7B9FA6] text-white py-4 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* 取消按鈕 */}
              <button
                onClick={() => router.push('/')}
                disabled={isAccepting}
                className="w-full bg-[#F5E6E8] text-[#3A3A3A] py-3 rounded-2xl hover:bg-[#E5D6D8] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 未登入用戶：顯示註冊按鈕 */}
            <button
              onClick={handleRegister}
              className="w-full bg-[#7B9FA6] text-white py-4 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              註冊並加入團隊
            </button>

            {/* 提示 */}
            <p className="text-xs text-center text-[#6B6B6B] mt-4">
              註冊後將自動加入團隊，無需額外操作
            </p>
          </>
        )}
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

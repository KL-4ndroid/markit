/**
 * Auth Manager - 認證管理組件
 * 
 * 整合登入和資料遷移流程
 * 處理登入後的遷移詢問邏輯
 * ✅ 增強：支援全域事件觸發登入 Modal
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { detectAnonymousData } from '@/lib/supabase/migration';
import { LoginModal } from './LoginModal';
import { MigrationModal } from './MigrationModal';

export function AuthManager() {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login');  // ✅ 新增：控制登入模式
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationData, setMigrationData] = useState({
    userId: '',
    userEmail: '',
    marketCount: 0,
    eventCount: 0,
  });

  // ✅ 監聽全域事件，支援從任何地方觸發登入
  useEffect(() => {
    const handleOpenLogin = (event?: CustomEvent) => {
      console.log('📢 收到開啟登入 Modal 的請求');
      
      // ✅ 檢查是否有邀請 Token，如果有則預設為註冊模式
      const invitationToken = sessionStorage.getItem('invitation_token');
      if (invitationToken) {
        setLoginMode('signup');
      } else {
        setLoginMode('login');
      }
      
      setShowLoginModal(true);
    };

    window.addEventListener('auth:open-login', handleOpenLogin as EventListener);

    return () => {
      window.removeEventListener('auth:open-login', handleOpenLogin as EventListener);
    };
  }, []);

  // 處理登入成功
  const handleLoginSuccess = async (userId: string, email: string) => {
    // 關閉登入對話框
    setShowLoginModal(false);

    // ✅ 發送登入成功事件
    window.dispatchEvent(new CustomEvent('auth:login-success'));

    // 檢測匿名資料
    const { hasAnonymousData, marketCount, eventCount } = await detectAnonymousData(userId);

    if (hasAnonymousData) {
      // 有匿名資料，彈出遷移詢問
      setMigrationData({
        userId,
        userEmail: email,
        marketCount,
        eventCount,
      });
      setShowMigrationModal(true);
    } else {
      // 沒有匿名資料，直接完成登入
      console.log('✅ 登入完成，無需遷移');
    }
  };

  // 處理遷移完成
  const handleMigrationComplete = () => {
    console.log('✅ 遷移完成');
    // 可以在這裡觸發重新載入或其他操作
  };

  return (
    <>
      {/* 登入對話框 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        defaultMode={loginMode}  // ✅ 傳入預設模式
      />

      {/* 遷移對話框 */}
      <MigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        userId={migrationData.userId}
        userEmail={migrationData.userEmail}
        marketCount={migrationData.marketCount}
        eventCount={migrationData.eventCount}
        onMigrationComplete={handleMigrationComplete}
      />

      {/* 登入按鈕（可以在 Navbar 中使用） */}
      {!user && (
        <button
          onClick={() => setShowLoginModal(true)}
          className="hidden" // 預設隱藏，由 Navbar 控制顯示
          id="auth-manager-login-trigger"
        >
          登入
        </button>
      )}
    </>
  );
}

/**
 * 觸發登入對話框的輔助函數
 * 可以在任何地方調用
 */
export function triggerLogin() {
  const button = document.getElementById('auth-manager-login-trigger');
  if (button) {
    button.click();
  }
}

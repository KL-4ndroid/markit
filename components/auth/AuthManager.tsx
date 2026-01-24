/**
 * Auth Manager - 認證管理組件
 * 
 * 整合登入和資料遷移流程
 * 處理登入後的遷移詢問邏輯
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
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationData, setMigrationData] = useState({
    userId: '',
    userEmail: '',
    marketCount: 0,
    eventCount: 0,
  });

  // 處理登入成功
  const handleLoginSuccess = async (userId: string, email: string) => {
    // 關閉登入對話框
    setShowLoginModal(false);

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

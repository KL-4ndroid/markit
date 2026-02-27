/**
 * Auth Guard - 全域認證守衛
 * 
 * 核心功能：
 * 1. 防止閃爍：嚴格控制初始化狀態
 * 2. 路徑白名單：允許特定頁面無需登入
 * 3. 離線支援：檢測 IndexedDB 資料，允許離線訪問
 * 4. 自動登入提示：Session 過期時彈出 Modal
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/supabase/auth-context';
import { GlobalLoadingSkeleton } from './GlobalLoadingSkeleton';
import { WelcomeScreen } from './WelcomeScreen';
import { OfflineBanner } from './OfflineBanner';

// ✅ 白名單路由：無需登入即可訪問
const PUBLIC_ROUTES = ['/privacy', '/terms', '/about'];

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  
  // ✅ 關鍵：追蹤初始化狀態，防止閃爍
  const [isInitialized, setIsInitialized] = useState(false);
  
  // ✅ 離線模式狀態
  const [hasOfflineData, setHasOfflineData] = useState(false);
  const [isCheckingOfflineData, setIsCheckingOfflineData] = useState(true);

  // ✅ 控制登入 Modal 的顯示
  const [shouldShowLogin, setShouldShowLogin] = useState(false);

  // ✅ 初始化完成檢測
  useEffect(() => {
    if (!loading) {
      setIsInitialized(true);
    }
  }, [loading]);

  // ✅ 檢查離線資料（IndexedDB）
  useEffect(() => {
    const checkOfflineData = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        // 檢查 IndexedDB 是否有資料
        const { hasData } = await import('@/lib/db').then(mod => ({
          hasData: async () => {
            try {
              // 嘗試檢查是否有市集資料
              const markets = await mod.db.markets.count();
              return markets > 0;
            } catch {
              return false;
            }
          }
        }));
        
        const hasLocalData = await hasData();
        setHasOfflineData(hasLocalData);
      } catch (error) {
        console.error('檢查離線資料失敗:', error);
        setHasOfflineData(false);
      } finally {
        setIsCheckingOfflineData(false);
      }
    };

    // 只在未登入時檢查
    if (isInitialized && !user) {
      checkOfflineData();
    } else {
      setIsCheckingOfflineData(false);
    }
  }, [isInitialized, user]);

  // ✅ 處理「開始使用」按鈕點擊
  const handleGetStarted = () => {
    setShouldShowLogin(true);
    
    // 觸發 AuthManager 的登入 Modal
    const event = new CustomEvent('auth:open-login');
    window.dispatchEvent(event);
  };

  // ✅ 監聽登入成功事件
  useEffect(() => {
    const handleLoginSuccess = () => {
      setShouldShowLogin(false);
    };

    window.addEventListener('auth:login-success', handleLoginSuccess);
    
    return () => {
      window.removeEventListener('auth:login-success', handleLoginSuccess);
    };
  }, []);

  // ========================================
  // 渲染邏輯（嚴格順序，防止閃爍）
  // ========================================

  // 1️⃣ 初始化中或加載中：顯示骨架屏
  if (!isInitialized || loading || isCheckingOfflineData) {
    return <GlobalLoadingSkeleton />;
  }

  // 2️⃣ 檢查是否為白名單路由
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // 3️⃣ 已登入：正常渲染
  if (user) {
    return (
      <>
        {/* 離線橫幅 */}
        <OfflineBanner />
        {children}
      </>
    );
  }

  // 4️⃣ 未登入但有離線資料：允許訪問（唯讀模式）
  if (!navigator.onLine && hasOfflineData) {
    console.log('🔒 離線模式：允許訪問本地資料（唯讀）');
    return (
      <>
        <OfflineBanner />
        {children}
      </>
    );
  }

  // 5️⃣ 未登入且無離線資料：顯示歡迎頁面
  return <WelcomeScreen onGetStarted={handleGetStarted} />;
}

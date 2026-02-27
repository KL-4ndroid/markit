/**
 * Session Expired Dialog - Session 過期對話框
 * 
 * 當 Session 過期時彈出，提示使用者重新登入
 * 自動保存當前表單資料
 * ✅ 修復：避免首次載入時誤判為登出
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { getAllSavedForms } from '@/lib/form-autosave';

export function SessionExpiredHandler() {
  const { user, session } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [savedFormsCount, setSavedFormsCount] = useState(0);
  
  // ✅ 修復：使用 useRef 而非 useState
  const previousUserRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // ✅ 跳過首次掛載（避免誤判為登出）
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousUserRef.current = user?.id || null;
      return;
    }

    // ✅ 檢測 Session 過期：之前有使用者，現在沒有
    if (previousUserRef.current && !user && !session) {
      console.log('🔐 偵測到 Session 過期', {
        previousUser: previousUserRef.current,
        currentUser: user,
      });
      
      // 檢查是否有暫存的表單
      const savedForms = getAllSavedForms();
      setSavedFormsCount(savedForms.length);
      
      // 只在有暫存表單時顯示對話框
      if (savedForms.length > 0) {
        setShowDialog(true);
      } else {
        // 沒有暫存表單，直接觸發登入
        triggerLogin();
      }
    }

    // ✅ 更新 previousUser
    previousUserRef.current = user?.id || null;
  }, [user, session]);

  // 監聽登入成功事件
  useEffect(() => {
    const handleLoginSuccess = () => {
      setShowDialog(false);
      
      // 檢查是否有暫存的表單
      const savedForms = getAllSavedForms();
      if (savedForms.length > 0) {
        // 顯示提示：表單資料已恢復
        setTimeout(() => {
          const event = new CustomEvent('form:restored', { 
            detail: { count: savedForms.length } 
          });
          window.dispatchEvent(event);
        }, 500);
      }
    };

    window.addEventListener('auth:login-success', handleLoginSuccess);
    
    return () => {
      window.removeEventListener('auth:login-success', handleLoginSuccess);
    };
  }, []);

  const triggerLogin = () => {
    setShowDialog(false);
    window.dispatchEvent(new CustomEvent('auth:open-login'));
  };

  return (
    <Dialog open={showDialog} onClose={() => {}} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      
      {/* 對話框容器 */}
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
          {/* 圖示 */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          {/* 標題 */}
          <DialogTitle className="text-2xl font-semibold text-[#3A3A3A] text-center mb-4">
            登入已過期
          </DialogTitle>

          {/* 說明 */}
          <div className="text-center mb-6">
            <p className="text-[#6B6B6B] leading-relaxed mb-3">
              您的登入狀態已過期，請重新登入以繼續使用。
            </p>
            
            {savedFormsCount > 0 && (
              <div className="bg-[#E8F3E8] rounded-2xl p-4 text-sm">
                <p className="text-[#3A3A3A] font-medium mb-1">
                  ✅ 您的表單資料已自動保存
                </p>
                <p className="text-[#6B6B6B]">
                  重新登入後將自動恢復 {savedFormsCount} 個表單的內容
                </p>
              </div>
            )}
          </div>

          {/* 按鈕 */}
          <button
            onClick={triggerLogin}
            className="w-full bg-[#7B9FA6] text-white py-4 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            重新登入
          </button>

          {/* 提示 */}
          <p className="text-center text-xs text-[#6B6B6B] mt-4">
            為了您的資料安全，我們會定期要求重新驗證身分
          </p>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

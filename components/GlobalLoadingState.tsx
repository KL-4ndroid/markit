/**
 * Global Loading State Component
 * Shows a brief non-blocking loading screen for first-time users.
 * Does not wait for sync — home page local data is displayed as soon as possible.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';

const LOADING_DURATION_MS = 700;

export function GlobalLoadingState() {
  const { isConfigured, user } = useAuth();
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isConfigured || !user) return;

    const hasLoadedBefore = localStorage.getItem('app_loaded_before');
    if (hasLoadedBefore) return;

    setShowLoading(true);

    const timer = setTimeout(() => {
      setShowLoading(false);
      try {
        localStorage.setItem('app_loaded_before', 'true');
      } catch {
        // localStorage may be unavailable in some environments
      }
    }, LOADING_DURATION_MS);

    return () => clearTimeout(timer);
  }, [isConfigured, user]);

  if (!showLoading) return null;

  return (
    <div className="fixed inset-0 bg-[#FAFAF8] z-[9999] flex items-center justify-center">
      <div className="text-center px-6">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#7B9FA6]/30">
            <span className="text-4xl">🎪</span>
          </div>
        </div>

        {/* Spinner */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-[#7B9FA6]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#7B9FA6] border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* Text */}
        <h2 className="text-xl font-medium text-[#3A3A3A] mb-2">
          正在載入資料
        </h2>
        <p className="text-sm text-[#6B6B6B]">
          準備中...
        </p>

        {/* Progress bar */}
        <div className="mt-8 max-w-xs mx-auto">
          <div className="h-1 bg-[#7B9FA6]/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#7B9FA6] to-[#D4A574] rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-[#6B6B6B] mt-6 opacity-60">
          首次載入可能需要幾秒鐘
        </p>
      </div>
    </div>
  );
}

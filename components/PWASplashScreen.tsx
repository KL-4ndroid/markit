/**
 * PWA Splash Screen - PWA 啟動畫面
 * 
 * 在應用載入前顯示美觀的啟動畫面
 * 利用 isInitialized 邏輯優化 PWA 體驗
 */

'use client';

import { useEffect, useState } from 'react';
import { APP_METADATA } from '@/lib/app-metadata';

const MIN_DISPLAY_TIME_MS = 800;
const EXIT_ANIMATION_TIME_MS = 300;

export function PWASplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    // 檢查是否為 PWA 模式
    const isPWA = (typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)').matches)
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!isPWA) {
      // 非 PWA 模式，立即隱藏
      setIsVisible(false);
      return;
    }

    // 元件完成 hydration 後即開始計時，不依賴可能已經錯過的 window.load 事件。
    const exitTimer = window.setTimeout(() => {
      setIsAnimatingOut(true);
    }, MIN_DISPLAY_TIME_MS);

    // 獨立的最終隱藏計時器可避免淡出狀態更新或動畫事件異常時永久遮住應用。
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, MIN_DISPLAY_TIME_MS + EXIT_ANIMATION_TIME_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <style data-app-splash-failsafe>{`
        @keyframes feria-splash-failsafe-hide {
          0%, 68.75% {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }
          87.5%, 100% {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }
      `}</style>
      <div
        data-app-splash
        className={`fixed inset-0 z-critical bg-gradient-to-br from-primary via-primary/85 to-secondary flex items-center justify-center transition-opacity duration-300 ${
          isAnimatingOut ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ animation: 'feria-splash-failsafe-hide 1600ms ease-out forwards' }}
      >
      {/* 背景裝飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" 
             style={{ animationDelay: '1s' }} />
      </div>

      {/* 主要內容 */}
      <div className="relative flex flex-col items-center">
        {/* Logo */}
        <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8 animate-bounce-slow p-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- PWA icon 已是預優化小圖，不需要 next/image 額外處理 */}
          <img
            src="/icons/icon-192x192.png"
            alt="Féria - 出攤筆記"
            className="w-full h-full object-contain"
          />
        </div>

        {/* 標題 */}
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
          Féria
        </h1>
        
        <p className="text-xl text-white/90 font-light mb-8">
          出攤筆記
        </p>

        {/* 載入動畫 */}
        <div className="flex gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* 版本資訊 */}
      <div className="absolute bottom-8 text-white/60 text-sm">
        v{APP_METADATA.versionLabel}
      </div>
      </div>
    </>
  );
}

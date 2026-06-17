/**
 * PWA Splash Screen - PWA 啟動畫面
 * 
 * 在應用載入前顯示美觀的啟動畫面
 * 利用 isInitialized 邏輯優化 PWA 體驗
 */

'use client';

import { useEffect, useState } from 'react';
import { APP_METADATA } from '@/lib/app-metadata';

export function PWASplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    // 檢查是否為 PWA 模式
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;

    if (!isPWA) {
      // 非 PWA 模式，立即隱藏
      setIsVisible(false);
      return;
    }

    // PWA 模式：顯示啟動畫面至少 800ms
    const minDisplayTime = 800;
    const startTime = Date.now();

    // 等待 DOM 完全載入
    const handleLoad = () => {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsed);

      setTimeout(() => {
        // 開始淡出動畫
        setIsAnimatingOut(true);
        
        // 動畫完成後隱藏
        setTimeout(() => {
          setIsVisible(false);
        }, 300);
      }, remainingTime);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-gradient-to-br from-primary via-primary/85 to-secondary flex items-center justify-center transition-opacity duration-300 ${
        isAnimatingOut ? 'opacity-0' : 'opacity-100'
      }`}
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
            alt="出攤本"
            className="w-full h-full object-contain"
          />
        </div>

        {/* 標題 */}
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
          出攤本
        </h1>
        
        <p className="text-xl text-white/90 font-light mb-8">
          BoothBook
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
  );
}

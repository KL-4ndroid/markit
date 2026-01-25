'use client';

import { useEffect } from 'react';

/**
 * Service Worker 註冊組件
 * 負責註冊和管理 Service Worker 生命週期
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // 等待頁面完全載入後再註冊 SW
      window.addEventListener('load', () => {
        registerServiceWorker();
      });
    }
  }, []);

  return null;
}

async function registerServiceWorker() {
  try {
    // 註冊 Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker 已註冊:', registration.scope);

    // 立即檢查更新
    registration.update();

    // 定期檢查更新（每 30 分鐘）
    setInterval(() => {
      console.log('[PWA] 檢查更新...');
      registration.update();
    }, 30 * 60 * 1000);

  } catch (error) {
    console.error('[PWA] Service Worker 註冊失敗:', error);
  }
}

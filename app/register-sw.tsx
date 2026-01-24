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

    console.log('[PWA] Service Worker registered:', registration.scope);

    // 檢查更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 有新版本可用
            console.log('[PWA] New version available');
            
            // 詢問用戶是否更新
            if (confirm('市集誌有新版本可用，是否立即更新？')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    // 監聽 SW 控制權變更
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // 定期檢查更新（每小時）
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
}

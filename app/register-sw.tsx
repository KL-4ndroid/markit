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
      updateViaCache: 'none', // 確保總是獲取最新的 SW 文件
    });

    console.log('[PWA] Service Worker 已註冊:', registration.scope);

    // 監聽 Service Worker 狀態變化
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] 新版本可用，準備更新...');
          }
        });
      }
    });

    // 立即檢查更新
    registration.update().catch(err => {
      console.warn('[PWA] 檢查更新失敗:', err);
    });

    // 定期檢查更新（每 30 分鐘）
    setInterval(() => {
      console.log('[PWA] 檢查更新...');
      registration.update().catch(err => {
        console.warn('[PWA] 檢查更新失敗:', err);
      });
    }, 30 * 60 * 1000);

  } catch (error) {
    console.error('[PWA] Service Worker 註冊失敗:', error);
    // 在開發環境中，這是正常的，不需要擔心
    if (process.env.NODE_ENV === 'development') {
      console.info('[PWA] 開發環境中 Service Worker 錯誤是正常的');
    }
  }
}

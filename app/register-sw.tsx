'use client';

import { useEffect } from 'react';

/**
 * Service Worker 註冊組件
 * 負責註冊和管理 Service Worker 生命週期
 * 
 * 注意：next-pwa 會自動生成和註冊 Service Worker
 * 這個組件主要用於監聽更新和管理生命週期
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // 等待頁面完全載入後再設置監聽
      window.addEventListener('load', () => {
        setupServiceWorker();
      });
    }
  }, []);

  return null;
}

async function setupServiceWorker() {
  try {
    // next-pwa 會自動註冊 Service Worker
    // 我們只需要等待它準備好
    const registration = await navigator.serviceWorker.ready;

    console.log('[PWA] Service Worker 已就緒:', registration.scope);

    // 監聽 Service Worker 更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('[PWA] 發現新的 Service Worker');
        
        newWorker.addEventListener('statechange', () => {
          console.log('[PWA] Service Worker 狀態:', newWorker.state);
          
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] 新版本已安裝，等待激活');
            // PWAUpdatePrompt 組件會處理更新提示
          }
        });
      }
    });

    // 監聽來自 Service Worker 的訊息
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[PWA] 收到 Service Worker 訊息:', event.data);
      
      if (event.data && event.data.type === 'CACHE_UPDATED') {
        console.log('[PWA] 快取已更新');
      }
    });

    // 立即檢查更新
    try {
      await registration.update();
      console.log('[PWA] 已檢查更新');
    } catch (err) {
      console.warn('[PWA] 檢查更新失敗:', err);
    }

    // 定期檢查更新（每 1 小時）
    setInterval(async () => {
      try {
        console.log('[PWA] 定期檢查更新...');
        await registration.update();
      } catch (err) {
        console.warn('[PWA] 定期檢查更新失敗:', err);
      }
    }, 60 * 60 * 1000); // 1 小時

  } catch (error) {
    console.error('[PWA] Service Worker 設置失敗:', error);
  }
}

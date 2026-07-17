'use client';

import { useEffect } from 'react';
import { getAppPlatform } from '@/lib/platform';

/**
 * Service Worker 註冊組件
 * 功能：僅提供 PWA 基礎功能（安裝到主畫面、推送通知、背景同步）
 * 已移除：離線快取功能
 * 
 * 注意：Service Worker 不再進行任何快取，所有請求都直接通過網路
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (getAppPlatform().kind !== 'web') return;

    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // 等待頁面完全載入後再註冊
      window.addEventListener('load', () => {
        registerServiceWorker();
      });
    }
  }, []);

  return null;
}

async function registerServiceWorker() {
  try {
    console.log('[PWA] 開始註冊 Service Worker...');
    
    // 註冊 Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker 註冊成功:', registration.scope);

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
            
            // 觸發自定義事件通知應用有新版本
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    // 監聽來自 Service Worker 的訊息
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[PWA] 收到 Service Worker 訊息:', event.data);
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
    console.error('[PWA] Service Worker 註冊失敗:', error);
  }
}

/**
 * 清除所有舊的快取（用於清理之前版本的快取）
 */
export async function clearAllCaches() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log('[PWA] 清除所有快取:', cacheNames);
      
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      
      console.log('[PWA] 所有快取已清除');
      return true;
    } catch (error) {
      console.error('[PWA] 清除快取失敗:', error);
      return false;
    }
  }
  return false;
}

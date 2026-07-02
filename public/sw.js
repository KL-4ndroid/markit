// Service Worker for Féria PWA
// Version: 2.0.1
// 功能：僅提供 PWA 基礎功能（安裝到主畫面、推送通知）
// 已移除：離線快取功能
// 更新日期：2026-07-03

const SW_VERSION = '2.0.1';

console.log(`[SW] Service Worker ${SW_VERSION} loaded`);

// ==================== 安裝階段 ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  // 立即啟用新的 SW，不進行任何快取
  event.waitUntil(
    Promise.resolve().then(() => {
      console.log('[SW] Installation complete (no caching)');
      return self.skipWaiting();
    })
  );
});

// ==================== 啟用階段 ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    // 清除所有舊的快取
    caches.keys().then((cacheNames) => {
      console.log('[SW] Clearing all old caches...');
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete, all caches cleared');
      return self.clients.claim(); // 立即控制所有頁面
    })
  );
});

// ==================== Fetch 攔截（不進行快取）====================
// 不攔截任何請求，讓所有請求直接通過網路
// 這樣可以確保始終獲取最新數據，不會有快取問題

// ==================== 訊息處理 ====================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  // 跳過等待，立即啟用新版本
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting, activating new version...');
    self.skipWaiting();
  }
  
  // 清除所有快取（雖然我們不再使用快取，但保留此功能以清理舊快取）
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('[SW] Deleting cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('[SW] All caches cleared');
      })
    );
  }
  
  // 回應版本查詢
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
});

// ==================== 背景同步 ====================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // 背景同步邏輯（保留用於未來擴展）
  console.log('[SW] Background sync triggered');
}

// ==================== 推送通知 ====================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : '您有新的通知',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: '關閉',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Féria', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

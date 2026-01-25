// Service Worker for Market Pulse PWA
// Version: 1.0.1
// 快取策略：嚴格區分靜態資源與 API 請求
// 更新日期：2026-01-25

const CACHE_VERSION = '1.0.1';
const CACHE_NAME = `market-pulse-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `market-pulse-runtime-v${CACHE_VERSION}`;

// 靜態資源列表（Cache First）
const STATIC_ASSETS = [
  '/',
  '/markets',
  '/products',
  '/analytics',
  '/settings',
  '/offline',
];

// API 路徑模式（Network First - 絕不快取）
const API_PATTERNS = [
  /\/api\//,                    // Next.js API routes
  /supabase\.co/,               // Supabase API
  /\.supabase\.co/,             // Supabase 子域名
  /realtime/,                   // 即時同步
  /rest\/v1\//,                 // Supabase REST API
  /auth\/v1\//,                 // Supabase Auth API
  /storage\/v1\//,              // Supabase Storage API
];

// 永不快取的路徑
const NEVER_CACHE = [
  /\/api\//,
  /supabase/,
  /auth/,
  /realtime/,
];

// ==================== 安裝階段 ====================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting(); // 立即啟用新的 SW
    })
  );
});

// ==================== 啟用階段 ====================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 刪除舊版本的快取
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim(); // 立即控制所有頁面
    })
  );
});

// ==================== Fetch 攔截 ====================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只處理同源請求或允許的外部請求
  if (url.origin !== location.origin && !url.href.includes('supabase')) {
    return;
  }

  // 檢查是否為 API 請求（Network First，絕不快取）
  const isApiRequest = API_PATTERNS.some(pattern => pattern.test(request.url));
  
  if (isApiRequest) {
    // API 請求：Network First，失敗時不使用快取
    event.respondWith(networkFirstNoCache(request));
    return;
  }

  // 檢查是否為永不快取的路徑
  const neverCache = NEVER_CACHE.some(pattern => pattern.test(request.url));
  
  if (neverCache) {
    // 永不快取：直接網路請求
    event.respondWith(fetch(request));
    return;
  }

  // 靜態資源：Cache First
  if (request.method === 'GET') {
    event.respondWith(cacheFirst(request));
  }
});

// ==================== 快取策略 ====================

/**
 * Cache First 策略
 * 適用於：靜態資源（HTML, CSS, JS, 圖片）
 */
async function cacheFirst(request) {
  try {
    // 1. 先檢查快取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      return cachedResponse;
    }

    // 2. 快取未命中，從網路獲取
    console.log('[SW] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);

    // 3. 只快取成功的 GET 請求
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First failed:', error);
    
    // 4. 網路失敗，返回離線頁面
    const cache = await caches.open(CACHE_NAME);
    const offlinePage = await cache.match('/offline');
    return offlinePage || new Response('離線模式', { status: 503 });
  }
}

/**
 * Network First (No Cache) 策略
 * 適用於：API 請求、Supabase 即時同步
 * 特點：絕不使用快取，確保數據即時性
 */
async function networkFirstNoCache(request) {
  try {
    console.log('[SW] Network First (No Cache):', request.url);
    
    // 直接從網路獲取，不檢查快取
    const networkResponse = await fetch(request);
    
    // 絕不快取 API 響應
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    
    // API 請求失敗時，返回錯誤響應（不使用快取）
    return new Response(
      JSON.stringify({ 
        error: 'Network request failed', 
        offline: true,
        message: '網路連線失敗，請檢查網路狀態'
      }), 
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ==================== 訊息處理 ====================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  // 跳過等待，立即啟用新版本
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting, activating new version...');
    self.skipWaiting();
  }
  
  // 清除所有快取
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
    event.ports[0].postMessage({ version: CACHE_VERSION });
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
  // 未來整合 Supabase 同步邏輯
  console.log('[SW] Syncing data with Supabase...');
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
    self.registration.showNotification('市集誌', options)
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

console.log('[SW] Service Worker loaded');

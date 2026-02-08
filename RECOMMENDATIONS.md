# 🔧 PWA 快取策略建議

## 問題分析

### 目前狀況
- ✅ 有 PWA manifest.json
- ✅ IndexedDB 資料離線可用
- ❌ **沒有 Service Worker**
- ❌ 應用程式碼無法離線使用

### 影響
1. **完全離線時無法使用**：即使 IndexedDB 有資料，也無法載入應用
2. **網路不穩時體驗差**：市集現場訊號不穩，載入很慢
3. **不符合「離線優先」理念**：只有資料離線，程式碼不離線

---

## 解決方案：實作 Service Worker

### 方案 1：使用 next-pwa（推薦）

#### 1. 安裝套件

```bash
npm install next-pwa
```

#### 2. 修改 next.config.mjs

```javascript
import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // 開發時停用
  runtimeCaching: [
    {
      // 快取頁面（HTML）
      urlPattern: /^https?:\/\/[^/]+\/?$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 小時
        },
      },
    },
    {
      // 快取靜態資源（JS, CSS, 字體）
      urlPattern: /\.(?:js|css|woff2?|ttf|otf)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
        },
      },
    },
    {
      // 快取圖片
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 天
        },
      },
    },
    {
      // Supabase API：網路優先
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 分鐘
        },
      },
    },
  ],
})(nextConfig);
```

#### 3. 快取策略說明

| 資源類型 | 策略 | 說明 |
|---------|------|------|
| **HTML 頁面** | NetworkFirst | 優先從網路載入，失敗時使用快取 |
| **JS/CSS/字體** | CacheFirst | 優先使用快取，快取失效時從網路載入 |
| **圖片** | CacheFirst | 優先使用快取，減少流量 |
| **Supabase API** | NetworkFirst | 優先從網路獲取最新資料，10秒超時則使用快取 |

---

## 資料更新流程

### 場景：商品價格更新

```typescript
// 時間軸
14:00 - 裝置 A：更新商品 X 價格 $100 → $120
        ├─ 寫入 IndexedDB ✅
        ├─ 觸發同步到 Supabase ✅
        └─ React 重新渲染，顯示 $120 ✅

14:05 - 裝置 B：打開應用
        ├─ Service Worker 從快取載入 HTML/JS（舊版本）⚠️
        ├─ React 啟動，從 IndexedDB 讀取資料
        ├─ useSync 觸發同步
        ├─ Pull 下載新事件（包含價格更新）✅
        ├─ 重放事件到 IndexedDB ✅
        ├─ React 組件重新渲染 ✅
        └─ 顯示 $120 ✅

結論：即使 JS 是舊版本，資料仍會正確更新！
```

### 為什麼不會有問題？

1. **資料來源是 IndexedDB**
   - React 組件從 IndexedDB 讀取資料
   - 不是從快取的 HTML 讀取

2. **同步機制會更新資料**
   - useSync 每 30 秒同步一次
   - 下載新事件並重放到 IndexedDB
   - React 自動重新渲染

3. **快取的只是程式碼，不是資料**
   - Service Worker 快取的是 HTML/JS/CSS
   - 資料永遠從 IndexedDB 讀取
   - IndexedDB 不受 Service Worker 影響

---

## 潛在問題與解決方案

### 問題 1：JS 版本過舊

```typescript
// 場景：應用更新了重要功能
舊版本 JS（快取）：沒有「補登功能」
新版本 JS（伺服器）：有「補登功能」

用戶打開應用：
├─ Service Worker 載入舊版本 JS ❌
└─ 看不到新功能
```

**解決方案**：強制更新機制

```typescript
// app/layout.tsx
'use client';

import { useEffect } from 'react';

export default function RootLayout({ children }) {
  useEffect(() => {
    // 檢查 Service Worker 更新
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // 每小時檢查一次更新
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      });

      // 監聽新版本
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // 提示用戶重新載入
        if (confirm('發現新版本，是否立即更新？')) {
          window.location.reload();
        }
      });
    }
  }, []);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

### 問題 2：快取佔用空間

```typescript
// Service Worker 快取會佔用裝置空間
快取大小估算：
- HTML: 50 KB × 10 頁 = 500 KB
- JS/CSS: 2 MB
- 圖片: 1 MB
- API 回應: 500 KB
總計: 4 MB

結論：非常小，不用擔心
```

---

## 流量影響分析

### 有 Service Worker 後的流量變化

#### 首次訪問（冷啟動）
```typescript
下載：HTML + JS + CSS + 圖片 = 500 KB
```

#### 第二次訪問（有快取）
```typescript
下載：0 KB（全部從快取載入）✅
```

#### 應用更新後
```typescript
下載：只下載變更的檔案（約 100 KB）✅
```

### 流量節省估算

```typescript
// 原本（無快取）
每個用戶每月訪問 10 次 × 500 KB = 5 MB

// 有快取後
首次: 500 KB
後續 9 次: 0 KB
總計: 500 KB

節省: 5 MB - 0.5 MB = 4.5 MB/用戶/月
1000 用戶節省: 4.5 GB/月
```

**Vercel 流量成本節省**：
- 原本：6 GB/月
- 有快取：1.8 GB/月（節省 70%）✅

---

## 實作步驟

### Step 1: 安裝 next-pwa
```bash
npm install next-pwa
```

### Step 2: 修改 next.config.mjs
（參考上面的完整配置）

### Step 3: 測試
```bash
# 建置生產版本
npm run build

# 啟動生產伺服器
npm start

# 打開瀏覽器開發者工具
# Application > Service Workers
# 確認 Service Worker 已註冊
```

### Step 4: 測試離線功能
```bash
# 1. 打開應用
# 2. 開啟開發者工具 > Network
# 3. 勾選 "Offline"
# 4. 重新整理頁面
# 5. 應用應該仍然可以使用 ✅
```

---

## 總結

### 目前狀況
- ❌ 沒有 Service Worker
- ❌ 無法真正離線使用
- ⚠️ 網路不穩時體驗差

### 實作 Service Worker 後
- ✅ 完全離線可用
- ✅ 網路不穩時仍流暢
- ✅ 節省 70% 流量成本
- ✅ 符合「離線優先」理念

### 資料一致性
- ✅ 不會有快取導致的資料錯誤
- ✅ IndexedDB 資料永遠是最新的
- ✅ 同步機制確保多裝置一致

---

## 建議優先級

| 優先級 | 項目 | 原因 |
|--------|------|------|
| 🔴 高 | 實作 Service Worker | 真正的離線優先 |
| 🟡 中 | 強制更新機制 | 確保用戶使用最新版本 |
| 🟢 低 | 快取清理機制 | 目前快取很小，不急 |

---

**建議立即實作 Service Worker，讓應用真正成為離線優先的 PWA！** 🚀

import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA 支援
  eslint: {
    // 建置時忽略 ESLint 錯誤（開發時仍會顯示警告）
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 建置時忽略 TypeScript 錯誤（開發時仍會顯示警告）
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
  disable: process.env.NODE_ENV === 'development', // 開發時停用，避免快取問題
  runtimeCaching: [
    {
      // 快取頁面（HTML）- 網路優先
      urlPattern: /^https?:\/\/[^/]+\/?.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24 小時
        },
        networkTimeoutSeconds: 10, // 10 秒超時則使用快取
      },
    },
    {
      // 快取靜態資源（JS, CSS, 字體）- 快取優先
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
      // 快取圖片 - 快取優先
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
      // Supabase API - 網路優先（確保資料最新）
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

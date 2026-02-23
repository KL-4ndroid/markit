/** @type {import('next').NextConfig} */
const nextConfig = {
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
        // Service Worker - 不快取，確保始終獲取最新版本
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
        // PWA Manifest - 不快取，確保始終獲取最新配置
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

export default nextConfig;

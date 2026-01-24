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

export default nextConfig;

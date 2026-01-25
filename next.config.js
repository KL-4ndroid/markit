/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // 優化性能配置
  experimental: {
    // 優化字體載入
    optimizeFonts: true,
  },
  
  // 編譯優化
  compiler: {
    // 移除 console.log（生產環境）
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // PWA 優化
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig

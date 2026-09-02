import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const rootDirectory = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const isMobileBuild = process.env.APP_BUILD_TARGET === 'mobile';
const isMobileRuntimeSmokeBuild = isMobileBuild && process.env.APP_RUNTIME_SMOKE === '1';

function getGitCommitSha() {
  if (process.env.NEXT_PUBLIC_APP_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_APP_COMMIT_SHA;
  }

  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }

  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: rootDirectory,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
  } catch {
    return '';
  }
}

const appCommitSha = getGitCommitSha();
const webContentSecurityPolicy = [
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');
const webSecurityHeaders = [
  { key: 'Content-Security-Policy', value: webContentSecurityPolicy },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    // The React Flight debug channel depends on the dev WebSocket. When that
    // socket is unavailable, its unresolved debug records can block the root
    // model before hydrateRoot() is called and leave the app as inert SSR HTML.
    reactDebugChannel: false,
  },
  turbopack: {
    root: rootDirectory,
  },
  pageExtensions: isMobileBuild
    ? [...(isMobileRuntimeSmokeBuild ? ['smoke.tsx'] : []), 'tsx']
    : ['web.tsx', 'tsx', 'ts', 'jsx', 'js'],
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version,
    NEXT_PUBLIC_APP_BUILD_TIME: process.env.NEXT_PUBLIC_APP_BUILD_TIME || new Date().toISOString(),
    NEXT_PUBLIC_APP_COMMIT_SHA: appCommitSha,
    NEXT_PUBLIC_APP_BUILD_TARGET: isMobileBuild ? 'mobile' : 'web',
    NEXT_PUBLIC_APP_RUNTIME_SMOKE: isMobileRuntimeSmokeBuild ? '1' : '0',
  },
  ...(isMobileBuild
    ? {
        output: 'export',
        trailingSlash: true,
        typescript: {
          tsconfigPath: 'tsconfig.mobile.json',
        },
        images: {
          unoptimized: true,
        },
      }
    : {
        async redirects() {
          return [
            {
              source: '/markets/:id((?!detail$|schedules$)[^/]+)',
              destination: '/markets/detail?id=:id',
              permanent: false,
            },
            {
              source: '/products/:id((?!detail$)[^/]+)',
              destination: '/products/detail?id=:id',
              permanent: false,
            },
          ];
        },
        async headers() {
          return [
            {
              source: '/:path*',
              headers: webSecurityHeaders,
            },
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
      }),
};

export default nextConfig;

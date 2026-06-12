import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const rootDirectory = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: rootDirectory,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || packageJson.version,
    NEXT_PUBLIC_APP_BUILD_TIME: process.env.NEXT_PUBLIC_APP_BUILD_TIME || new Date().toISOString(),
    NEXT_PUBLIC_APP_COMMIT_SHA: appCommitSha,
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

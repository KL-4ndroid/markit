import {
  assertHealthReleaseIdentity,
  requireExpectedCommitSha,
} from './web-smoke-release-identity.mjs';
import { assertWebSecurityHeaders } from './web-smoke-security-headers.mjs';

const timeoutMs = 15_000;
const expectedCommitSha = requireExpectedCommitSha(process.env.WEB_SMOKE_EXPECTED_COMMIT_SHA);

function requireBaseUrl(value) {
  if (!value?.trim()) throw new Error('WEB_LEGAL_SMOKE_BASE_URL is required.');
  const parsed = new URL(value.trim());
  const loopbackHttp = parsed.protocol === 'http:'
    && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
  if (
    (parsed.protocol !== 'https:' && !loopbackHttp)
    || parsed.username
    || parsed.password
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash
  ) {
    throw new Error('Legal smoke base must be HTTPS or loopback HTTP without credentials, path, query, or fragment.');
  }
  return parsed.origin;
}

function requireMode(value) {
  if (value !== 'draft' && value !== 'published') {
    throw new Error('WEB_LEGAL_SMOKE_MODE must be draft or published.');
  }
  return value;
}

async function request(baseUrl, path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${baseUrl}${path}`, {
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function assertIncludes(input, expected, label) {
  if (!input.includes(expected)) throw new Error(`${label}: required public content is absent.`);
}

function assertExcludes(input, forbidden, label) {
  if (input.includes(forbidden)) throw new Error(`${label}: draft or placeholder content remains.`);
}

const baseUrl = requireBaseUrl(process.env.WEB_LEGAL_SMOKE_BASE_URL);
const mode = requireMode(process.env.WEB_LEGAL_SMOKE_MODE);

const health = await request(baseUrl, '/api/health');
if (health.status !== 200) throw new Error(`health status: expected 200, received ${health.status}`);
assertWebSecurityHeaders(health.headers);
assertHealthReleaseIdentity(await health.json(), expectedCommitSha);

const pages = [
  ['/support', ['支援中心', '資料刪除與裝置暫存', '服務營運者']],
  ['/terms', ['服務條款', '目前版本尚未開放真實付款', '不得以草案自行排除法定權利']],
  ['/privacy', ['隱私政策', '主要可信來源', 'Cloudflare R2', '自成功上傳起保存七日']],
  ['/about', ['Féria', '關於我們']],
];

for (const [path, expectedContent] of pages) {
  const response = await request(baseUrl, path);
  if (response.status !== 200) throw new Error(`${path} status: expected 200, received ${response.status}`);
  assertWebSecurityHeaders(response.headers);
  if (!response.headers.get('content-type')?.startsWith('text/html')) {
    throw new Error(`${path} content type is not HTML.`);
  }

  const markup = await response.text();
  for (const expected of expectedContent) assertIncludes(markup, expected, path);

  if (path === '/support' || path === '/terms' || path === '/privacy') {
    if (mode === 'draft') {
      assertIncludes(markup, '上架前草案', path);
    } else {
      assertIncludes(markup, '正式政策版本', path);
      for (const forbidden of ['上架前草案', '尚未設定', '尚未完成公開設定', '不可對外上架或收費']) {
        assertExcludes(markup, forbidden, path);
      }
    }
  }
}

console.log(`PASS commit-bound public legal/support pages (${mode} mode, 4 routes)`);

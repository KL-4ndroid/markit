import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(projectRoot, 'out');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
};

function resolveRequestPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const relativePath = pathname.endsWith('/')
    ? `${pathname.slice(1)}index.html`
    : extname(pathname)
      ? pathname.slice(1)
      : `${pathname.slice(1)}/index.html`;
  const resolved = normalize(join(outputRoot, relativePath));
  return relative(outputRoot, resolved).startsWith('..') ? null : resolved;
}

if (!existsSync(join(outputRoot, 'index.html'))) {
  console.error('FAIL out/index.html is missing. Run the mobile build first.');
  process.exit(1);
}

const server = createServer((request, response) => {
  const path = resolveRequestPath(request.url ?? '/');
  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    response.writeHead(404).end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[extname(path)] ?? 'application/octet-stream',
  });
  createReadStream(path).pipe(response);
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Static smoke server did not expose a TCP port.');

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const paths = [
    '/',
    '/join/?token=smoke-token',
    '/markets/',
    '/markets/detail/?id=smoke-market',
    '/products/',
    '/products/detail/?id=smoke-product',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/fonts/report/NotoSansTC-VariableFont_wght.ttf',
  ];

  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
    await response.body?.cancel();
  }

  for (const apiPath of [
    '/api/sales-photo-evidence/upload',
    '/api/sales-photo-evidence/image',
    '/api/health',
  ]) {
    const missingApi = await fetch(`${baseUrl}${apiPath}`);
    if (missingApi.status !== 404) {
      throw new Error(`Mobile static server unexpectedly exposes ${apiPath}.`);
    }
  }

  console.log(`PASS generic static-server smoke test (${paths.length} artifacts/routes)`);
} finally {
  await new Promise(resolve => server.close(resolve));
}

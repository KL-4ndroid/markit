// Production-optimized shared-code benchmark on loopback. No account or live API configuration.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const port = Number(process.argv[2] ?? 41050);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid loopback port');
const directory = resolve('.codex-artifacts/replay-browser-benchmark');
await mkdir(directory, { recursive: true });
await build({ entryPoints: ['scripts/replay-benchmark/browser.ts'], outfile: resolve(directory, 'benchmark.js'), bundle: true,
  platform: 'browser', format: 'iife', minify: true, target: 'es2022', tsconfig: 'tsconfig.json',
  define: { 'process.env': '{"NODE_ENV":"production"}' },
});
const javascript = await readFile(resolve(directory, 'benchmark.js'));
const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Isolated production replay benchmark</title><style>body{font:16px system-ui;margin:24px;max-width:1000px}button{padding:12px;margin:8px}pre{white-space:pre-wrap;font-size:13px}</style>
<h1>Isolated production replay benchmark</h1><p>Synthetic data only. No login, no cloud requests. Uses browser IndexedDB and the shared replay code.</p>
<label>Replay mode <select id="mode"><option value="batched">Batched projections</option><option value="reference">Published reference</option></select></label>
<button data-count="5000">Run 5,000</button><button data-count="20000">Run 20,000</button><p id="status" role="status">Ready</p><pre id="result">[]</pre>
<button>Run atomic checks</button>
<script src="/benchmark.js"></script></html>`;
createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'none'");
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.url === '/benchmark.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(javascript); }
  else if (request.url === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); }
  else { response.writeHead(404); response.end(); }
}).listen(port, '127.0.0.1', () => console.log(`Production replay benchmark: http://127.0.0.1:${port}`));

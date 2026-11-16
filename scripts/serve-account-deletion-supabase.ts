// Uses the real exported app handlers and storage. No injected auth/repository or cloud env files.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { configureLocalDeletionServer, ageSyntheticSession, INTEGRATION_ORIGIN, LOCAL_API, TEST_PASSWORD } from './lib/account-deletion-local-supabase';

async function main() {
  const { keys, state } = configureLocalDeletionServer();
  const root = await import('../app/api/account-deletion/route');
  const confirm = await import('../app/api/account-deletion/confirm/route');
  const cancel = await import('../app/api/account-deletion/cancel/route');
  const bundle = await build({ entryPoints: ['scripts/account-deletion-workflow/supabase-browser.tsx'], bundle: true, write: false,
    format: 'esm', platform: 'browser', jsx: 'automatic', minify: true,
    define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(LOCAL_API),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(keys.PUBLISHABLE_KEY) },
  });
  let css = '';
  try { for (const file of readdirSync('out/_next/static/chunks').filter(name => name.endsWith('.css'))) css += readFileSync(join('out/_next/static/chunks', file), 'utf8'); } catch { /* base fallback */ }
  const server = createServer(async (incoming, outgoing) => {
    try {
      if (incoming.headers.host !== '127.0.0.1:41082') { outgoing.writeHead(403); outgoing.end(); return; }
      outgoing.setHeader('Cache-Control', 'no-store');
      outgoing.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${LOCAL_API}; font-src 'self' data:; img-src 'self' data:; frame-src 'none'; form-action 'self'`);
      const path = incoming.url?.split('?')[0];
      if (path === '/') { outgoing.setHeader('Content-Type', 'text/html; charset=utf-8'); outgoing.end('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>帳號刪除真實本機整合</title><link rel="stylesheet" href="/integration.css"><div id="root"></div><script type="module" src="/integration.js"></script></html>'); return; }
      if (path === '/integration.js') { outgoing.setHeader('Content-Type', 'text/javascript'); outgoing.end(bundle.outputFiles[0].text); return; }
      if (path === '/integration.css') { outgoing.setHeader('Content-Type', 'text/css'); outgoing.end(css + '\nbody{margin:0;background:#f6f3ed;color:#30291f;font-family:system-ui,"Microsoft JhengHei",sans-serif}'); return; }
      outgoing.setHeader('Content-Type', 'application/json');
      if (path === '/integration/config' && incoming.method === 'GET') {
        // These are deliberately disposable local identities. No server key/HMAC/session is exposed.
        outgoing.end(JSON.stringify({ url: LOCAL_API, publicKey: keys.PUBLISHABLE_KEY, password: TEST_PASSWORD, owner: state.owner.email, staff: state.staff.email })); return;
      }
      if (path === '/integration/age-session' && incoming.method === 'POST') {
        if (incoming.headers.origin && incoming.headers.origin !== INTEGRATION_ORIGIN) { outgoing.writeHead(403); outgoing.end('{}'); return; }
        const token = /^Bearer (.+)$/.exec(incoming.headers.authorization ?? '')?.[1];
        if (!token) { outgoing.writeHead(401); outgoing.end('{}'); return; }
        await ageSyntheticSession(token); outgoing.end('{"ok":true}'); return;
      }
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of incoming) { size += chunk.length; if (size > 4096) { outgoing.writeHead(413); outgoing.end('{}'); return; } chunks.push(chunk); }
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) if (typeof value === 'string') headers.set(key, value);
      const request = new Request(`${INTEGRATION_ORIGIN}${path}`, { method: incoming.method, headers,
        ...(incoming.method === 'POST' ? { body: Buffer.concat(chunks).toString('utf8') } : {}) });
      let response: Response;
      if (path === '/api/account-deletion' && incoming.method === 'GET') response = await root.GET(request);
      else if (path === '/api/account-deletion' && incoming.method === 'POST') response = await root.POST(request);
      else if (path === '/api/account-deletion/confirm' && incoming.method === 'POST') response = await confirm.POST(request);
      else if (path === '/api/account-deletion/cancel' && incoming.method === 'POST') response = await cancel.POST(request);
      else { outgoing.writeHead(404); outgoing.end('{}'); return; }
      console.log(`local API ${incoming.method} ${path}: ${response.status}`);
      response.headers.forEach((value, key) => outgoing.setHeader(key, value));
      outgoing.writeHead(response.status); outgoing.end(await response.text());
    } catch { outgoing.writeHead(500); outgoing.end('{"ok":false,"code":"local_integration_unavailable"}'); }
  });
  server.listen(41082, '127.0.0.1', () => console.log('Real local deletion integration ready at http://127.0.0.1:41082; cleanup disabled'));
}
void main();

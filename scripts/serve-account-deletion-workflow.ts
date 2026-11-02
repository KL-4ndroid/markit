/** Loopback-only UI → real handler → synthetic repository. No env loading or production writer. */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createAccountDeletionRouteHandlers } from '../app/api/account-deletion/route';
import { createAccountDeletionActionHandler } from '../lib/subscription/account-deletion-request-workflow.server';
import { deletionWorkflowFixture } from '../tests/fixtures/account-deletion-workflow-fixture';

async function main() {
  const port = Number(process.argv[2] ?? 41080);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid loopback port');
  const result = await build({ entryPoints: ['scripts/account-deletion-workflow/browser.tsx'], bundle: true, write: false,
    format: 'esm', platform: 'browser', jsx: 'automatic', minify: true, define: { 'process.env.NODE_ENV': '"production"' } });
  const chunks = 'out/_next/static/chunks';
  let css = '';
  try { for (const file of readdirSync(chunks).filter(name => name.endsWith('.css'))) css += readFileSync(join(chunks, file), 'utf8'); } catch { /* explicit basic fallback below */ }
  const fixture = deletionWorkflowFixture();
  let pending = false;
  let delayNextRead = false;
  const html = '<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>帳號刪除隔離驗收</title><link rel="stylesheet" href="/harness.css"><div id="root"></div><script type="module" src="/harness.js"></script></html>';
  createServer(async (incoming, outgoing) => {
    try {
      outgoing.setHeader('Cache-Control', 'no-store');
      outgoing.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; img-src 'self' data:; frame-src 'none'; form-action 'self'");
      const path = incoming.url?.split('?')[0];
      if (path === '/') { outgoing.setHeader('Content-Type', 'text/html; charset=utf-8'); outgoing.end(html); return; }
      if (path === '/harness.js') { outgoing.setHeader('Content-Type', 'text/javascript'); outgoing.end(result.outputFiles[0].text); return; }
      if (path === '/harness.css') { outgoing.setHeader('Content-Type', 'text/css'); outgoing.end(css + '\nbody{margin:0;background:#f6f3ed;color:#30291f;font-family:system-ui,"Microsoft JhengHei",sans-serif}'); return; }
      outgoing.setHeader('Content-Type', 'application/json');
      if (path === '/fixture/device') { outgoing.end(JSON.stringify({ ready: !pending, message: pending ? '仍有待送照片或未完成草稿，請先處理；沒有捨棄資料。' : '這台裝置沒有偵測到待送資料或未完成草稿。' })); return; }
      const buffers: Buffer[] = [];
      let size = 0;
      for await (const chunk of incoming) { size += chunk.length; if (size > 4096) { outgoing.writeHead(413); outgoing.end('{}'); return; } buffers.push(chunk); }
      const body = Buffer.concat(buffers).toString('utf8');
      if (path === '/fixture/control' && incoming.method === 'POST') {
        const control = JSON.parse(body) as { scenario: string; actor: string };
        if (control.scenario === 'pending') pending = true;
        if (control.scenario === 'clean') pending = false;
        if (control.scenario === 'stale') fixture.setFresh(false);
        if (control.scenario === 'fresh') fixture.setFresh(true);
        if (control.scenario === 'drop') fixture.dropResponse();
        if (control.scenario === 'delay') delayNextRead = true;
        if (control.scenario === 'processing') {
          const actor = control.actor === 'staff' ? fixture.staff : fixture.owner;
          const row = fixture.records.get(actor); if (row) fixture.records.set(actor, { ...row, status: 'processing' });
        }
        outgoing.end('{"ok":true}'); return;
      }
      const actor = incoming.headers.authorization === 'Bearer fixture-owner' ? fixture.owner
        : incoming.headers.authorization === 'Bearer fixture-staff' ? fixture.staff : null;
      fixture.setActor(actor);
      const snapshot = await fixture.deps.resolveActor(new Request(`http://127.0.0.1:${port}`));
      const deps = { ...fixture.deps, resolveActor: async () => snapshot };
      if (path === '/api/account-deletion' && incoming.method === 'GET' && delayNextRead) {
        delayNextRead = false;
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      const headers = new Headers({ 'Content-Type': 'application/json' });
      const request = new Request(`http://127.0.0.1:${port}${path}`, { method: incoming.method, headers,
        ...(incoming.method === 'POST' ? { body } : {}) });
      let response: Response;
      if (path === '/api/account-deletion') {
        const handlers = createAccountDeletionRouteHandlers(deps);
        response = incoming.method === 'POST' ? await handlers.POST(request) : await handlers.GET(request);
      } else if (path === '/api/account-deletion/confirm' || path === '/api/account-deletion/cancel') {
        response = await createAccountDeletionActionHandler(path.endsWith('/confirm') ? 'confirm' : 'cancel', deps)(request);
      } else { outgoing.writeHead(404); outgoing.end('{}'); return; }
      outgoing.writeHead(response.status); outgoing.end(await response.text());
    } catch { outgoing.writeHead(500); outgoing.end('{"ok":false,"code":"isolated_harness_error"}'); }
  }).listen(port, '127.0.0.1', () => console.log(`Isolated deletion workflow: http://127.0.0.1:${port}; no cloud or real deletion`));
}
void main();

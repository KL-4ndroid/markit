import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { build } from 'esbuild';

// No .env reads, no real API, no public test route or remote host.
assert.deepEqual(process.argv.slice(2), ['--local']);
assert.ok(!process.env.VERCEL && !process.env.VERCEL_ENV);
async function main() {
  const result = await build({ entryPoints: ['tests/fixtures/apple-purchase-browser.tsx'], bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"', 'process.env.NEXT_PUBLIC_APP_BUILD_TARGET': '"web"' }, logLevel: 'silent' });
  const cssRoot='out/_next/static/chunks';
  const css=readdirSync(cssRoot,{recursive:true}).filter(p=>String(p).endsWith('.css')).map(p=>readFileSync(cssRoot+'/'+p,'utf8')).join('\n');
  const server=createServer((req,res)=>{
    res.setHeader('cache-control','no-store');
    if(req.url==='/app.js'){res.setHeader('content-type','text/javascript');res.end(result.outputFiles[0].contents);return;}
    if(req.url==='/style.css'){res.setHeader('content-type','text/css');res.end(css);return;}
    if(req.url!=='/'){res.writeHead(404).end();return;}
    res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html lang="zh-TW"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>B05 本機手機驗收</title><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
  });
  server.listen(41435,'127.0.0.1',()=>console.log('B05 UI http://127.0.0.1:41435/ — synthetic only; type stop to close'));
  process.stdin.on('data',data=>{if(data.toString().trim()==='stop'){server.closeAllConnections();server.close(()=>{process.stdin.pause();process.stdin.removeAllListeners('data');});}});
}
void main();

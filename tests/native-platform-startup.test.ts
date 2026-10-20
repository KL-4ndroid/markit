import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createPlatformStartup, type PlatformResource } from '../lib/platform/startup';
import { assembleIosPlatform, type PlatformLoaders } from '../lib/platform/capacitor/assemble-platform';
import { unavailableNativePurchases } from '../lib/platform/unavailable-native-purchases';
import { getAppPlatform, installAppPlatform } from '../lib/platform/platform';
import { getNetworkPort } from '../lib/platform/network-capability';
import { NativePlatformGate } from '../components/platform/NativePlatformGate';

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function fixture() {
  const web = getAppPlatform(); const calls: string[] = [];
  const loaders: PlatformLoaders = {
    runtime: async () => ({ network: { getCurrentStatus: () => ({ connected: true, connectionType: 'cellular' }), subscribe: () => () => {} },
      lifecycle: web.lifecycle, dispose: async () => { calls.push('runtime-dispose'); } }),
    interactions: async () => ({ clipboard: web.clipboard, share: web.share, externalLinks: web.externalLinks, deepLinks: web.deepLinks,
      dispose: async () => { calls.push('interaction-dispose'); } }),
    camera: async () => web.camera, files: async () => web.files, storage: async () => web.secureStorage, purchases: unavailableNativePurchases,
  };
  return { loaders, calls };
}
async function main() {
  const original = getAppPlatform();
  {
    const f = fixture(); const files = deferred<Awaited<ReturnType<PlatformLoaders['files']>>>(); f.loaders.files = () => files.promise;
    let loads = 0; let restore = () => {}; let owned: PlatformResource | undefined;
    const start = createPlatformStartup({ runtime: () => 'ios', loadIos: async signal => {
      loads++; owned = await assembleIosPlatform(f.loaders, signal); return owned;
    }, install: platform => { f.calls.push('install'); restore = installAppPlatform(platform); return restore; } });
    const a = start(); const b = start(); assert.equal(a, b); await tick();
    assert.equal(getAppPlatform(), original, 'no partial platform is exposed');
    assert.ok(!f.calls.includes('install')); files.resolve(original.files); await a;
    assert.equal(loads, 1); assert.equal(getAppPlatform().kind, 'ios');
    assert.equal(getNetworkPort().getCurrentStatus().connectionType, 'cellular');
    assert.deepEqual(await getAppPlatform().inAppPurchase.getAvailability(), { available: false, store: null, reason: 'native_adapter_not_installed' });
    restore(); await owned!.dispose(); assert.equal(getAppPlatform(), original);
    assert.ok(f.calls.includes('runtime-dispose') && f.calls.includes('interaction-dispose'));
  }
  {
    const f = fixture(); const runtime = deferred<Awaited<ReturnType<PlatformLoaders['runtime']>>>(); f.loaders.runtime = () => runtime.promise;
    f.loaders.storage = async () => { throw new Error('private auth failure'); };
    const failed = assembleIosPlatform(f.loaders, new AbortController().signal);
    await assert.rejects(failed, /native_platform_unavailable/);
    runtime.resolve({ network: original.network, lifecycle: original.lifecycle, dispose: async () => { f.calls.push('late-runtime-dispose'); } });
    await tick(); assert.ok(f.calls.includes('late-runtime-dispose')); assert.ok(f.calls.includes('interaction-dispose'));
    assert.equal(getAppPlatform(), original);
  }
  {
    const f = fixture(); const files = deferred<Awaited<ReturnType<PlatformLoaders['files']>>>(); f.loaders.files = () => files.promise;
    const controller = new AbortController(); const pending = assembleIosPlatform(f.loaders, controller.signal); await tick();
    controller.abort(); await tick(); assert.equal(f.calls.length, 2); files.resolve(original.files);
    await assert.rejects(pending, /native_platform_unavailable/);
  }
  {
    const resource = deferred<PlatformResource>(); let deadline!: () => void; let installed = false; let disposed = 0; let aborted = false;
    const start = createPlatformStartup({ runtime: () => 'ios', loadIos: signal => { signal.addEventListener('abort', () => { aborted = true; }); return resource.promise; },
      install: () => { installed = true; return () => {}; }, scheduleDeadline(callback) { deadline = callback; return () => {}; } });
    const failed = assert.rejects(start(), /native_platform_unavailable/); await tick(); deadline(); await failed; assert.equal(aborted, true);
    resource.resolve({ platform: { ...original, kind: 'ios' }, dispose: async () => { disposed++; } }); await tick();
    assert.equal(installed, false); assert.equal(disposed, 1); await assert.rejects(start(), /native_platform_unavailable/);
  }
  {
    let loaded = false;
    const dependencies = { loadIos: async () => { loaded = true; throw new Error(); }, install: () => () => {} };
    await createPlatformStartup({ ...dependencies, runtime: () => 'web' })(); assert.equal(loaded, false);
    await assert.rejects(createPlatformStartup({ ...dependencies, runtime: () => 'android' })(), /native_platform_unavailable/); assert.equal(loaded, false);
  }
  const target = process.env.NEXT_PUBLIC_APP_BUILD_TARGET;
  try {
    process.env.NEXT_PUBLIC_APP_BUILD_TARGET = 'web';
    assert.equal(renderToStaticMarkup(React.createElement(NativePlatformGate, null, 'PROVIDER_SENTINEL')), 'PROVIDER_SENTINEL');
    process.env.NEXT_PUBLIC_APP_BUILD_TARGET = 'mobile';
    const initial = renderToStaticMarkup(React.createElement(NativePlatformGate, null, 'PROVIDER_SENTINEL'));
    assert.ok(initial.includes('正在準備裝置功能')); assert.ok(!initial.includes('PROVIDER_SENTINEL'), 'mobile SSR must not mount provider children');
  } finally { if (target === undefined) delete process.env.NEXT_PUBLIC_APP_BUILD_TARGET; else process.env.NEXT_PUBLIC_APP_BUILD_TARGET = target; }
  const layout = readFileSync('app/layout.tsx', 'utf8'); assert.match(layout, /<NativePlatformGate>[\s\S]*<AuthProvider>[\s\S]*<RoleProvider>[\s\S]*<SyncProvider>/);
  const pwa = readFileSync('app/register-sw.tsx', 'utf8'); assert.match(pwa, /getAppPlatform\(\)\.kind !== 'web'/);
  console.log('PASS atomic native startup, provider ordering, SSR boundary, StrictMode reuse, abort and late cleanup; purchases stay disabled');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

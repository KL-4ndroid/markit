import assert from 'node:assert/strict';
import { appLinkPath, externalLinkUrl, normalizeAppLink, publicWebOrigin, nativeLinkScheme } from '../lib/platform/app-link-policy';
import { createNativeInteractions, type InteractionDependencies } from '../lib/platform/capacitor/interactions';
import { startAppLinkRouting } from '../lib/platform/app-link-routing';
import { loadIosInteractions } from '../lib/platform/capacitor/load-interactions';
import { interceptNativeExternalLinks } from '../lib/platform/capacitor/webview-links';

const config = { origin: 'https://app.fixture.invalid', scheme: 'dev.fixture.feria' };
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function fixture() {
  const calls: string[] = [];
  let listener: (value: unknown) => void = () => {};
  let current = 'capacitor://localhost/markets';
  const dependencies: InteractionDependencies = {
    writeText: async value => { calls.push('copy:' + value); }, openUrl: async url => { calls.push('open:' + url); return { completed: true }; },
    share: async input => { calls.push('share:' + input.url); }, getLaunchUrl: async () => undefined,
    addUrlListener: async value => { listener = value; return { remove: async () => { calls.push('remove'); } }; },
    currentUrl: () => current,
  };
  return { dependencies, calls, event: (value: unknown) => listener(value), current: (value: string) => { current = value; },
    create: () => createNativeInteractions(dependencies, config) };
}
async function main() {
  assert.equal(publicWebOrigin('https://app.fixture.invalid/'), config.origin);
  for (const value of ['http://example.com', 'https://a:b@example.com', 'https://example.com/path', 'https://example.com?x=1']) assert.throws(() => publicWebOrigin(value));
  assert.equal(nativeLinkScheme(config.scheme), config.scheme); assert.throws(() => nativeLinkScheme('feria'));
  assert.equal(normalizeAppLink('dev.fixture.feria://app/join?token=a%20token', config), config.origin + '/join?token=a%20token');
  assert.equal(normalizeAppLink(config.origin + '/products?action=add', config), config.origin + '/products?action=add');
  for (const value of ['https://evil.invalid/join?token=a', 'dev.fixture.feria://evil/join?token=a', 'feria://app/join?token=a',
    config.origin + '/x/../join?token=a', config.origin + '/%2e%2e/join?token=a', config.origin + '/join?token=a&token=b',
    config.origin + '/join?token=a&redirect=https://evil.invalid', config.origin + '/join?token=a#access_token=secret',
    config.origin + '/join?token=%0asecret', config.origin + '/auth/callback?code=secret', 'javascript:alert(1)',
    'capacitor://localhost/products?action=add']) assert.equal(normalizeAppLink(value, config), null, value);
  assert.equal(appLinkPath(config.origin + '/join?token=a%2Fb%2Bc'), '/join?token=a%2Fb%2Bc', 'invitation tokens remain opaque');
  assert.equal(externalLinkUrl('mailto:support@example.com?subject=Help%20please'), 'mailto:support@example.com?subject=Help%20please');
  for (const value of ['file:///private/account', 'javascript:alert(1)', 'http://insecure.invalid', 'https://a:b@example.com',
    'mailto:support@example.com?bcc=private@example.com', 'mailto:support@example.com?subject=%0d%0aBcc:private']) assert.equal(externalLinkUrl(value), null);
  {
    const f = fixture(); const port = f.create(); await port.ready;
    assert.equal(port.deepLinks.createAppUrl('/join?token=abc'), config.origin + '/join?token=abc');
    assert.throws(() => port.deepLinks.createAppUrl('//evil.invalid/join?token=a'));
    await port.clipboard.writeText('invitation'); assert.equal(f.calls[0], 'copy:invitation');
    assert.equal(await port.externalLinks.open('https://example.com/'), true);
    assert.equal(await port.externalLinks.open('javascript:alert(1)'), false);
    assert.equal(await port.share.share({ url: config.origin + '/join?token=abc' }), 'shared');
    assert.equal(await port.share.share({ url: 'file:///private/report.pdf' }), 'unsupported');
    assert.equal(await port.deepLinks.getCurrentUrl(), config.origin + '/markets');
    f.event({ url: `${config.scheme}://app/products?action=add` });
    assert.equal(await port.deepLinks.getInitialUrl(), config.origin + '/products?action=add');
    f.current('capacitor://localhost/products');
    assert.equal(await port.deepLinks.getCurrentUrl(), config.origin + '/products', 'launch intent must not replay on a later page visit');
    await assert.rejects(port.clipboard.writeText('a'.repeat(65_537)), /無法複製/);
    await port.dispose(); await port.dispose(); assert.equal(f.calls.filter(call => call === 'remove').length, 1);
    assert.equal(await port.deepLinks.getInitialUrl(), null);
  }
  {
    const f = fixture(); const launch = deferred<unknown>(); f.dependencies.getLaunchUrl = () => launch.promise;
    const subscribe = f.dependencies.addUrlListener;
    f.dependencies.addUrlListener = listener => { listener({ url: `${config.scheme}://app/products?action=add` }); return subscribe(listener); };
    const port = f.create(); await tick(); launch.resolve({ url: `${config.scheme}://app/markets?action=add` }); await port.ready;
    assert.equal(await port.deepLinks.getInitialUrl(), config.origin + '/products?action=add', 'event during listener registration wins over old launch snapshot');
    const delivered: string[] = []; port.deepLinks.subscribe(() => { throw new Error('observer'); });
    const stop = port.deepLinks.subscribe(url => delivered.push(url));
    f.event({ url: 'https://evil.invalid/join?token=secret' }); assert.equal(delivered.length, 0);
    f.event({ url: config.origin + '/join?token=next' }); assert.equal(delivered.length, 1);
    stop(); await port.dispose(); f.event({ url: config.origin + '/markets' }); assert.equal(delivered.length, 1);
  }
  {
    const f = fixture(); f.dependencies.share = async () => { throw new Error('Share canceled'); };
    const port = f.create(); await port.ready;
    assert.equal(await port.share.share({ text: 'hello' }), 'cancelled');
    f.dependencies.writeText = async () => { throw new Error('private contents'); };
    await assert.rejects(port.clipboard.writeText('a'), error => error instanceof Error && !error.message.includes('private'));
    f.dependencies.openUrl = async () => ({ completed: 'yes' }); assert.equal(await port.externalLinks.open('https://example.com'), false);
    await port.dispose();
  }
  {
    const f = fixture(); const timers = new Set<() => void>(); const late = deferred<{ remove(): Promise<void> }>();
    f.dependencies.addUrlListener = () => late.promise;
    const port = createNativeInteractions(f.dependencies, { ...config, scheduleDeadline(callback) { timers.add(callback); return () => { timers.delete(callback); }; } });
    const failed = assert.rejects(port.ready, /native_interaction_unavailable/); await tick(); [...timers][0](); await failed;
    late.resolve({ remove: async () => { f.calls.push('late-remove'); } }); await tick(); assert.deepEqual(f.calls, ['late-remove']);
  }
  {
    const f = fixture(); const write = deferred<void>(); const timers = new Set<() => void>();
    const port = createNativeInteractions(f.dependencies, { ...config, scheduleDeadline(callback) { timers.add(callback); return () => { timers.delete(callback); }; } }); await port.ready;
    f.dependencies.writeText = () => write.promise;
    const failed = assert.rejects(port.clipboard.writeText('copy'), /無法複製/); await tick();
    await assert.rejects(port.clipboard.writeText('again'), /無法複製/);
    [...timers][0](); await failed; write.resolve(); await assert.rejects(port.clipboard.writeText('retry'), /無法複製/); await port.dispose();
  }
  {
    const f = fixture(); const initial = deferred<string | null>(); const port = f.create(); await port.ready;
    port.deepLinks.getInitialUrl = () => initial.promise;
    const paths: string[] = []; const stop = startAppLinkRouting(port.deepLinks, path => { paths.push(path); f.current('capacitor://localhost' + path); });
    f.event({ url: `${config.scheme}://app/products?action=add` }); initial.resolve(config.origin + '/markets?action=add'); await tick();
    assert.deepEqual(paths, ['/products?action=add']); f.event({ url: `${config.scheme}://app/products?action=add` }); await tick(); assert.equal(paths.length, 1);
    f.current('capacitor://localhost/markets'); f.event({ url: `${config.scheme}://app/products?action=add` }); await tick();
    assert.equal(paths.length, 2, 'the same link can be intentionally opened again after leaving the target');
    stop(); f.event({ url: config.origin + '/join?token=ignored' }); assert.equal(paths.length, 2); await port.dispose();
  }
  await assert.rejects(loadIosInteractions(), /native_interaction_unavailable/);
  {
    const names = ['window', 'document', 'Element', 'HTMLAnchorElement'] as const;
    const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
    let click!: (event: unknown) => void; let removed = false;
    class ElementFixture { closest() { return this; } }
    class AnchorFixture extends ElementFixture { constructor(public href: string) { super(); } getAttribute() { return this.href; } }
    const define = (name: string, value: unknown) => Object.defineProperty(globalThis, name, { configurable: true, value });
    try {
      define('Element', ElementFixture); define('HTMLAnchorElement', AnchorFixture);
      define('window', { location: { href: 'capacitor://localhost/markets' } });
      define('document', { addEventListener: (_: string, handler: typeof click) => { click = handler; }, removeEventListener: () => { removed = true; } });
      const f = fixture(); const port = f.create(); await port.ready; let failures = 0;
      const stop = interceptNativeExternalLinks(port.externalLinks, () => { failures++; });
      const dispatch = (href: string) => { let prevented = false; click({ target: new AnchorFixture(href), button: 0,
        defaultPrevented: false, preventDefault() { prevented = true; } }); return prevented; };
      assert.equal(dispatch('capacitor://localhost/privacy'), false);
      assert.equal(dispatch('https://example.com/privacy'), true); await tick(); assert.equal(failures, 0);
      assert.equal(dispatch('javascript:alert(1)'), true); await tick(); assert.equal(failures, 1);
      assert.equal(f.calls.filter(call => call.startsWith('open:')).length, 1, 'unsafe schemes never reach the native opener');
      stop(); assert.equal(removed, true); await port.dispose();
    } finally { for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); } }
  }
  console.log('PASS native clipboard, external links, sharing, route validation, launch races, deadlines and owned cleanup');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

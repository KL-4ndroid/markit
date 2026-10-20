import assert from 'node:assert/strict';
import { assembleIosPlatform } from '../lib/platform/capacitor/assemble-platform';
import { createNativeRuntimePorts } from '../lib/platform/capacitor/runtime-ports';
import { createNativeInteractions } from '../lib/platform/capacitor/interactions';
import { createNativeAuthStorage } from '../lib/platform/capacitor/secure-storage';
import { createNativeFiles } from '../lib/platform/capacitor/files';
import { createNativeCamera } from '../lib/platform/capacitor/camera';
import { createPlatformStartup, type PlatformResource } from '../lib/platform/startup';
import { getAppPlatform, installAppPlatform } from '../lib/platform/platform';
import { getNetworkPort } from '../lib/platform/network-capability';
import { getLifecyclePort } from '../lib/platform/lifecycle-capability';
import { getSecureStorage } from '../lib/platform/secure-storage-capability';
import { getFilePort } from '../lib/platform/file-capability';
import { getClipboardPort, getDeepLinkPort, getSharePort } from '../lib/platform/interaction-capabilities';
import { startAppLinkRouting } from '../lib/platform/app-link-routing';
import { unavailableNativePurchases } from '../lib/platform/unavailable-native-purchases';
import { scheduleFormDraftSave } from '../lib/form-draft-scheduler';

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
async function main() {
  const original = getAppPlatform(); const calls: string[] = []; const storage = new Map<string, string>();
  let networkEvent: (value: unknown) => void = () => {}; let lifecycleEvent: (value: unknown) => void = () => {};
  let urlEvent: (value: unknown) => void = () => {}; let current = 'capacitor://localhost/markets/';
  const runtime = createNativeRuntimePorts({
    network: { getStatus: async () => ({ connected: true, connectionType: 'wifi' }), addListener: async (_, listener) => {
      networkEvent = listener; return { remove: async () => { calls.push('remove-network'); } };
    } },
    app: { getState: async () => ({ isActive: true }), addListener: async (_, listener) => {
      lifecycleEvent = listener; return { remove: async () => { calls.push('remove-lifecycle'); } };
    } },
  });
  const interactions = createNativeInteractions({
    writeText: async value => { calls.push('copy:' + value); }, openUrl: async () => ({ completed: true }),
    share: async () => { calls.push('share-text'); }, getLaunchUrl: async () => ({ url: 'dev.fixture.feria://app/products?action=add' }),
    addUrlListener: async listener => { urlEvent = listener; return { remove: async () => { calls.push('remove-links'); } }; }, currentUrl: () => current,
  }, { origin: 'https://app.fixture.invalid', scheme: 'dev.fixture.feria' });
  const secureStorage = createNativeAuthStorage({ get: async ({ key }) => ({ value: storage.get(key) ?? null }),
    set: async ({ key, value }) => { storage.set(key, value); }, remove: async ({ key }) => { storage.delete(key); } });
  const cacheUri = 'file:///var/mobile/Applications/fixture/Library/Caches';
  const media = createNativeCamera({ takePhoto: async () => { throw { code: 'OS-PLUG-CAMR-0006' }; },
    chooseFromGallery: async () => ({ results: [] }), stat: async () => { throw new Error('unexpected read'); },
    read: async () => { throw new Error('unexpected read'); }, remove: async () => { throw new Error('unexpected cleanup'); },
  }, { cacheUri, imageProcessingAvailable: true });
  const exportFiles = createNativeFiles({ createDirectory: async () => { calls.push('file-create'); },
    write: async () => { calls.push('file-write'); }, getUri: async path => cacheUri + '/' + path,
    removeFile: async () => { calls.push('file-remove'); }, removeDirectory: async () => { calls.push('directory-remove'); },
    share: async () => { calls.push('share-file'); }, preview: async () => { calls.push('preview-file'); },
    createId: () => '12345678-1234-4234-8234-123456789abc',
  }, { cacheUri });
  let resource: PlatformResource | undefined; let restore = () => {}; let stopRouting = () => {}; let stopDraft = () => {};
  const start = createPlatformStartup({ runtime: () => 'ios', loadIos: async signal => {
    resource = await assembleIosPlatform({ runtime: async () => { await runtime.ready; return runtime; },
      interactions: async () => { await interactions.ready; return interactions; }, storage: async () => secureStorage,
      camera: async () => media.camera, files: async () => exportFiles.files, purchases: unavailableNativePurchases,
    }, signal); return resource;
  }, install: platform => { restore = installAppPlatform(platform); return restore; } });
  try {
    await Promise.all([start(), start()]);
    const paths: string[] = [];
    stopRouting = startAppLinkRouting(getDeepLinkPort(), path => { paths.push(path); current = 'capacitor://localhost' + path; });
    await tick(); assert.deepEqual(paths, ['/products?action=add']);
    const authKey = 'sb-fixture-auth-token'; await getSecureStorage().setItem(authKey, 'fixture-session');
    const invitation = getDeepLinkPort().createAppUrl('/join?token=opaque-fixture');
    assert.equal(invitation, 'https://app.fixture.invalid/join?token=opaque-fixture');
    await getClipboardPort().writeText(invitation); assert.equal(await getSharePort().share({ url: invitation }), 'shared');
    let drafts = 0; stopDraft = scheduleFormDraftSave(() => { drafts++; }, getLifecyclePort(), 30_000);
    networkEvent({ connected: false, connectionType: 'none' }); lifecycleEvent({ isActive: false });
    assert.equal(getNetworkPort().getCurrentStatus().connected, false); assert.equal(drafts, 1);
    assert.equal(await getSecureStorage().getItem(authKey), 'fixture-session', 'offline/background must not discard auth');
    lifecycleEvent({ isActive: true }); networkEvent({ connected: true, connectionType: 'cellular' });
    urlEvent({ url: 'dev.fixture.feria://app/markets?action=add' }); await tick();
    assert.deepEqual(paths, ['/products?action=add', '/markets?action=add']);
    assert.equal(await getAppPlatform().camera.selectImage('library'), null);
    const payload = new Blob(['amount\n100\n'], { type: 'text/csv' });
    await getFilePort().saveFile({ filename: 'report.csv', data: payload });
    assert.deepEqual(calls.filter(call => ['file-create', 'file-write', 'share-file', 'file-remove', 'directory-remove'].includes(call)),
      ['file-create', 'file-write', 'share-file', 'file-remove', 'directory-remove']);
    assert.equal(payload.size, 11, 'export leaves the original payload available');
    assert.equal((await getAppPlatform().inAppPurchase.getAvailability()).available, false);
    assert.equal(drafts, 1); assert.equal(getNetworkPort().getCurrentStatus().connectionType, 'cellular');
  } finally {
    stopDraft(); stopRouting(); restore(); await resource?.dispose(); media.dispose(); exportFiles.dispose();
  }
  assert.equal(getAppPlatform(), original);
  for (const name of ['remove-network', 'remove-lifecycle', 'remove-links']) assert.equal(calls.filter(call => call === name).length, 1);
  console.log('PASS assembled native adapters through shared ports: auth, offline/background drafts, cold/warm links, copy/share, camera cancel, file cleanup and disabled purchases; injected bridges only');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

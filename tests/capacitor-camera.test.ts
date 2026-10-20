import assert from 'node:assert/strict';
import { createNativeCamera, iosPhotoTemporaryDirectory, type NativeCameraDependencies } from '../lib/platform/capacitor/camera';
import { CameraSelectionError } from '../lib/platform/contracts/camera';
import { loadIosCamera } from '../lib/platform/capacitor/load-camera';

const home = 'file:///var/mobile/Containers/Data/Application/fixture';
const uri = home + '/tmp/image_1790000000000.jpeg';
const jpeg = Buffer.from([255, 216, 255, 224, 0, 16, 1, 2]);
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
const tick = async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); };
function fixture() {
  const calls: string[] = [];
  const result = { type: 0, uri, thumbnail: 'do-not-use-thumbnail', webPath: 'https://must-not-fetch.invalid' };
  const dependencies: NativeCameraDependencies = {
    async takePhoto() { calls.push('camera'); return result; },
    async chooseFromGallery() { calls.push('library'); return { results: [result] }; },
    async stat(path) { calls.push('stat:' + path); return { type: 'file', size: jpeg.length }; },
    async read(path) { calls.push('read:' + path); return jpeg.toString('base64'); },
    async remove(path) { calls.push('remove:' + path); },
  };
  const options = { cacheUri: home + '/Library/Caches', imageProcessingAvailable: true, maxBytes: 64 };
  return { calls, result, dependencies, options };
}
const rejected = (reason: string) => (error: unknown) => error instanceof CameraSelectionError && error.reason === reason
  && error.message === reason;

async function main() {
  assert.equal(iosPhotoTemporaryDirectory(home.replace('/var/', '/private/var/') + '/Library/Caches/'),
    '/var/mobile/Containers/Data/Application/fixture/tmp/');
  for (const source of ['camera', 'library'] as const) {
    const f = fixture(); const native = createNativeCamera(f.dependencies, f.options);
    const file = await native.camera.selectImage(source);
    assert.ok(file); assert.equal(file.type, 'image/jpeg'); assert.equal(file.name, 'selected-photo.jpg');
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), jpeg);
    assert.deepEqual(f.calls, [source, 'stat:' + uri, 'read:' + uri, 'remove:' + uri]);
    native.dispose(); assert.equal(native.camera.getCapabilitySnapshot().mediaCaptureAvailable, false);
  }
  for (const [code, reason] of [['OS-PLUG-CAMR-0003', 'permission_denied'], ['OS-PLUG-CAMR-0005', 'permission_denied'],
    ['OS-PLUG-CAMR-0007', 'camera_not_found'], ['unexpected', 'source_decode_failed']]) {
    const f = fixture();
    f.dependencies.takePhoto = async () => { throw { code, message: 'private image and native path' }; };
    await assert.rejects(createNativeCamera(f.dependencies, f.options).camera.selectImage('camera'), rejected(reason));
    assert.deepEqual(f.calls, []);
  }
  for (const code of ['OS-PLUG-CAMR-0006', 'OS-PLUG-CAMR-0020']) {
    const f = fixture(); f.dependencies.takePhoto = async () => { throw { code }; };
    assert.equal(await createNativeCamera(f.dependencies, f.options).camera.selectImage('camera'), null);
  }
  // No untrusted URI may reach native file APIs, including cleanup.
  for (const invalid of ['https://foreign.invalid/image_1790000000000.jpeg', home + '/Documents/image_1790000000000.jpeg',
    home + '/tmp/../tmp/image_1790000000000.jpeg', home + '/tmp/%2e%2e/image_1790000000000.jpeg',
    home + '/tmp/photo.jpeg', home + '/tmp/image_1790000000000.jpeg?token=private',
    home.replace('fixture', 'other-app') + '/tmp/image_1790000000000.jpeg',
    home + '/tmp/image_1790000000000.jpeg\n']) {
    const f = fixture(); f.result.uri = invalid;
    await assert.rejects(createNativeCamera(f.dependencies, f.options).camera.selectImage('camera'), rejected('source_decode_failed'));
    assert.deepEqual(f.calls, ['camera']);
  }
  for (const stat of [{ type: 'file', size: 65 }, { type: 'directory', size: 8 }, { type: 'symlink', size: 8 },
    { type: 'file', size: 0 }, { type: 'file', size: NaN }]) {
    const f = fixture(); f.dependencies.stat = async () => stat;
    await assert.rejects(createNativeCamera(f.dependencies, f.options).camera.selectImage('camera'), rejected('source_decode_failed'));
    assert.deepEqual(f.calls, ['camera', 'remove:' + uri]);
  }
  for (const data of [null, 'invalid base64!', 'AAAA', Buffer.from('not an image').toString('base64')]) {
    const f = fixture(); f.dependencies.read = async () => data;
    await assert.rejects(createNativeCamera(f.dependencies, f.options).camera.selectImage('camera'), rejected('source_decode_failed'));
    assert.equal(f.calls.at(-1), 'remove:' + uri);
  }
  {
    const f = fixture(); const pending = deferred<unknown>(); f.dependencies.takePhoto = () => pending.promise;
    const native = createNativeCamera(f.dependencies, f.options);
    const first = native.camera.selectImage('camera');
    await assert.rejects(native.camera.selectImage('library'), rejected('adapter_unavailable'));
    native.dispose(); pending.resolve(f.result);
    assert.equal(await first, null); assert.deepEqual(f.calls, ['remove:' + uri]);
  }
  {
    const f = fixture(); const cleanup = deferred<void>();
    f.dependencies.remove = async () => { f.calls.push('cleanup-start'); await cleanup.promise; };
    const native = createNativeCamera(f.dependencies, f.options); const selection = native.camera.selectImage('camera');
    await tick(); assert.ok(f.calls.includes('cleanup-start')); native.dispose(); cleanup.resolve();
    assert.equal(await selection, null, 'disposal during cleanup must suppress late delivery');
  }
  {
    const f = fixture(); f.dependencies.remove = async () => { throw new Error('private cleanup error'); };
    const native = createNativeCamera(f.dependencies, f.options);
    await assert.rejects(native.camera.selectImage('camera'), rejected('source_decode_failed'));
    await assert.rejects(native.camera.selectImage('library'), rejected('adapter_unavailable'));
  }
  {
    const f = fixture(); const late = deferred<unknown>(); const timers = new Set<() => void>();
    f.dependencies.read = () => late.promise;
    const native = createNativeCamera(f.dependencies, { ...f.options, scheduleDeadline(callback) {
      timers.add(callback); return () => { timers.delete(callback); };
    } });
    const failure = assert.rejects(native.camera.selectImage('camera'), rejected('source_decode_failed'));
    await tick(); assert.equal(timers.size, 1); [...timers][0](); await failure;
    late.resolve(jpeg.toString('base64')); await tick();
    assert.equal(f.calls.at(-1), 'remove:' + uri);
  }
  await assert.rejects(loadIosCamera(), rejected('adapter_unavailable'));
  console.log('PASS native camera handles photos, permissions, cancellation, scoped cleanup, malformed data, timeouts and late results');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCameraResolver } from '../lib/platform/camera-resolver';
import { createNativeCamera } from '../lib/platform/capacitor/camera';
import { CameraSelectionError, type CameraPort } from '../lib/platform/contracts/camera';
import { captureAndStoreSalesPhotoEvidenceWithFileInput, selectSalesPhotoEvidenceFileWithInput } from '../lib/sales/photo-evidence-browser-adapter';
import { createLocalPendingSalesPhotoEvidenceCreation } from '../lib/sales/photo-evidence-pending-creation';
import type { LocalPendingSalesPhotoEvidencePayload } from '../lib/sales/photo-evidence-pending-payload-storage';

const key = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
async function main() {
  let load = 0; let release!: (camera: CameraPort) => void;
  const pending = new Promise<CameraPort>(resolve => { release = resolve; });
  const resolve = createCameraResolver({ runtime: () => 'ios', webCamera: () => { throw new Error('Web fallback forbidden'); },
    loadIosCamera: () => { load += 1; return pending; } });
  const first = resolve(); const second = resolve(); await Promise.resolve(); assert.equal(load, 1);
  const calls: string[] = [];
  const data = Buffer.from([255, 216, 255, 224, 0, 16, 1, 2]);
  const native = createNativeCamera({
    takePhoto: async () => ({ type: 0, uri: 'file:///sandbox/tmp/image_1790000000000.jpg' }),
    chooseFromGallery: async () => ({ results: [] }),
    stat: async () => ({ type: 'file', size: data.length }), read: async () => data.toString('base64'),
    remove: async () => { calls.push('cleanup'); },
  }, { cacheUri: 'file:///sandbox/Library/Caches', imageProcessingAvailable: true });
  release(native.camera); assert.equal(await first, await second);
  const queueItem = createLocalPendingSalesPhotoEvidenceCreation({
    saleEventId: key(1), ownerId: key(2), marketId: key(3), capturedByStaffId: null,
    saleCompletedAt: '2026-10-20T00:00:00.000Z', now: '2026-10-20T00:01:00.000Z',
  });
  let stores = 0;
  const result = await captureAndStoreSalesPhotoEvidenceWithFileInput({ queueItem }, {
    getCapabilitySnapshot: native.camera.getCapabilitySnapshot, selectFile: source => native.camera.selectImage(source),
    decodeImage: async file => { assert.equal(file.type, 'image/jpeg'); assert.deepEqual(calls, ['cleanup']);
      return { width: 800, height: 600, drawable: {} as CanvasImageSource }; },
    renderVariant: async (_, plan) => ({ blob: new Blob(['fixture'], { type: plan.mimeType }), mimeType: plan.mimeType,
      fileSizeBytes: 7, width: 800, height: 600, contentHash: 'fixture-hash' }),
    storePayload: async input => { stores += 1; return { ...input } as unknown as LocalPendingSalesPhotoEvidencePayload; },
  });
  assert.equal(result.action, 'capture_stored_locally'); assert.equal(stores, 1);
  for (const reason of ['permission_denied', 'camera_not_found', 'adapter_unavailable'] as const) {
    const failed = await captureAndStoreSalesPhotoEvidenceWithFileInput({ queueItem }, {
      getCapabilitySnapshot: native.camera.getCapabilitySnapshot,
      selectFile: async () => { throw new CameraSelectionError(reason); },
      storePayload: async () => { throw new Error('must not replace existing pending evidence'); },
    });
    assert.equal(failed.action, 'capture_failed');
    if (failed.action === 'capture_failed') { assert.equal(failed.failure.reason, reason); assert.equal(failed.failure.shouldKeepEvidencePending, true); }
  }
  const canceled = await captureAndStoreSalesPhotoEvidenceWithFileInput({ queueItem, source: 'library' }, {
    getCapabilitySnapshot: native.camera.getCapabilitySnapshot, selectFile: source => native.camera.selectImage(source),
  });
  assert.equal(canceled.action, 'capture_failed');
  if (canceled.action === 'capture_failed') assert.equal(canceled.failure.reason, 'capture_cancelled');
  for (const runtime of ['android', 'unexpected']) {
    const denied = createCameraResolver({ runtime: () => runtime, webCamera: () => { throw new Error('fallback forbidden'); },
      loadIosCamera: async () => native.camera });
    await assert.rejects(denied(), CameraSelectionError);
  }
  const failed = createCameraResolver({ runtime: () => 'ios', webCamera: () => { throw new Error('fallback forbidden'); },
    loadIosCamera: async () => { throw new Error('private native init error'); } });
  await assert.rejects(failed(), { message: 'adapter_unavailable' }); await assert.rejects(failed(), { message: 'adapter_unavailable' });

  // Web file picker cancellation must release its dynamic input and waiting UI.
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const listeners = new Map<string, () => void>(); let removed = false;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: () => ({ type: '', accept: '', style: {}, setAttribute() {}, files: [], click() {},
      addEventListener: (event: string, listener: () => void) => listeners.set(event, listener),
      removeEventListener: (event: string) => listeners.delete(event), remove() { removed = true; } }),
    body: { appendChild() {} },
  } });
  try { const selection = selectSalesPhotoEvidenceFileWithInput('library'); listeners.get('cancel')?.();
    assert.equal(await selection, null); assert.equal(removed, true); assert.equal(listeners.size, 0);
  } finally { if (descriptor) Object.defineProperty(globalThis, 'document', descriptor); else Reflect.deleteProperty(globalThis, 'document'); }

  const field = readFileSync('components/products/ProductCoverPhotoField.tsx', 'utf8');
  assert.match(field, /resolvePhotoCamera\(\)/); assert.doesNotMatch(field, /type="file"|inputRef/);
  assert.match(field, /request !== selectionVersion\.current/);
  assert.match(field, /getProductImageAdapter\(\)/);
  console.log('PASS native photo handoff reuses local capture policy and preserves pending data on cancel/denial; product selection shares the port');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

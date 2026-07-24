import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppPlatform } from '../lib/platform/contracts';
import { getAppPlatform, installAppPlatform } from '../lib/platform/platform';

const projectRoot = join(__dirname, '..');
const readProjectFile = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

console.log('\n=== Platform camera boundary ===');

assert.equal(getAppPlatform().kind, 'web');
assert.equal(typeof getAppPlatform().camera.getCapabilitySnapshot, 'function');
assert.equal(typeof getAppPlatform().camera.selectImage, 'function');
console.log('PASS web is the default platform');

const fakePlatform: AppPlatform = {
  kind: 'ios',
  camera: {
    getCapabilitySnapshot: () => ({
      secureContext: true,
      mediaCaptureAvailable: true,
      imageProcessingAvailable: true,
    }),
    selectImage: async () => null,
  },
  files: {
    saveFile: async () => undefined,
    previewFile: async () => ({ opened: true }),
  },
  network: {
    getCurrentStatus: () => ({ connected: true, connectionType: 'wifi' }),
    subscribe: () => () => undefined,
  },
  lifecycle: {
    getCurrentState: () => 'active',
    subscribe: () => () => undefined,
  },
  secureStorage: {
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  },
  clipboard: { writeText: async () => undefined },
  share: { share: async () => 'shared' },
  externalLinks: { open: async () => true },
  deepLinks: {
    createAppUrl: path => `feria://app${path}`,
    getInitialUrl: async () => null,
    subscribe: () => () => undefined,
  },
};

const restore = installAppPlatform(fakePlatform);
assert.equal(getAppPlatform(), fakePlatform);
restore();
assert.equal(getAppPlatform().kind, 'web');
console.log('PASS a native or fake platform can be installed and restored');

const hookSource = readProjectFile('hooks/useSalesPhotoEvidenceFlow.ts');
const webCameraSource = readProjectFile('lib/platform/web/camera.ts');
const platformContractSource = readProjectFile('lib/platform/contracts/camera.ts');

assert.match(hookSource, /getAppPlatform\(\)\.camera/);
assert.match(hookSource, /getCapabilitySnapshot[\s\S]*camera\.getCapabilitySnapshot/);
assert.match(hookSource, /selectFile[\s\S]*camera\.selectImage/);
assert.doesNotMatch(hookSource, /document\.createElement|getUserMedia|@capacitor\//);
assert.match(webCameraSource, /selectSalesPhotoEvidenceFileWithInput/);
assert.doesNotMatch(platformContractSource, /@capacitor\//);
console.log('PASS the shared flow depends on the port while Web owns browser selection');

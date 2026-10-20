import { Capacitor } from '@capacitor/core';
import { createFileResolver } from '../file-resolver';
import { getFilePort } from '../file-capability';

export const resolveDeviceFiles = createFileResolver({
  runtime: () => Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
  webFiles: getFilePort,
  async loadIosFiles() { return (await (await import('./load-files')).loadIosFiles()).files; },
});

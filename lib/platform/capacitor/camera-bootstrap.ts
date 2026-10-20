import { Capacitor } from '@capacitor/core';
import { createCameraResolver } from '../camera-resolver';
import { getAppPlatform } from '../platform';

export const resolvePhotoCamera = createCameraResolver({
  runtime: () => Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
  webCamera: () => getAppPlatform().camera,
  async loadIosCamera() { return (await (await import('./load-camera')).loadIosCamera()).camera; },
});

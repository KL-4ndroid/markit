import { Capacitor } from '@capacitor/core';
import { createPlatformStartup } from '../startup';
import { installAppPlatform } from '../platform';

export const initializeAppPlatform = createPlatformStartup({
  runtime: () => Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web',
  async loadIos(signal) { return (await import('./load-platform')).loadIosPlatform(signal); },
  install: installAppPlatform,
});

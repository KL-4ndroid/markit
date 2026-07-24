export type { CameraPort } from '@/lib/platform/contracts/camera';
export type { FilePort, FilePreviewResult, PlatformFile } from '@/lib/platform/contracts/files';
export type { NetworkPort, NetworkStatus } from '@/lib/platform/contracts/network';
export type { AppLifecycleState, LifecyclePort } from '@/lib/platform/contracts/lifecycle';
export type { SecureStoragePort } from '@/lib/platform/contracts/secure-storage';
export type { ClipboardPort } from '@/lib/platform/contracts/clipboard';
export type { ShareInput, SharePort, ShareResult } from '@/lib/platform/contracts/share';
export type { ExternalLinkPort } from '@/lib/platform/contracts/external-link';
export type { DeepLinkPort } from '@/lib/platform/contracts/deep-link';

export type AppPlatformKind = 'web' | 'ios';

export interface AppPlatform {
  kind: AppPlatformKind;
  camera: import('@/lib/platform/contracts/camera').CameraPort;
  files: import('@/lib/platform/contracts/files').FilePort;
  network: import('@/lib/platform/contracts/network').NetworkPort;
  lifecycle: import('@/lib/platform/contracts/lifecycle').LifecyclePort;
  secureStorage: import('@/lib/platform/contracts/secure-storage').SecureStoragePort;
  clipboard: import('@/lib/platform/contracts/clipboard').ClipboardPort;
  share: import('@/lib/platform/contracts/share').SharePort;
  externalLinks: import('@/lib/platform/contracts/external-link').ExternalLinkPort;
  deepLinks: import('@/lib/platform/contracts/deep-link').DeepLinkPort;
}

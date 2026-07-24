export type {
  AppPlatform,
  AppPlatformKind,
  CameraPort,
  FilePort,
  FilePreviewResult,
  PlatformFile,
  NetworkPort,
  NetworkStatus,
  AppLifecycleState,
  LifecyclePort,
  SecureStoragePort,
  ClipboardPort,
  ShareInput,
  SharePort,
  ShareResult,
  ExternalLinkPort,
  DeepLinkPort,
} from '@/lib/platform/contracts';
export { getAppPlatform, installAppPlatform } from '@/lib/platform/platform';
export { getFilePort, installFilePort } from '@/lib/platform/file-capability';
export { getNetworkPort, installNetworkPort } from '@/lib/platform/network-capability';
export { getLifecyclePort, installLifecyclePort } from '@/lib/platform/lifecycle-capability';
export { getSecureStorage, installSecureStorage } from '@/lib/platform/secure-storage-capability';
export {
  getClipboardPort,
  getSharePort,
  getExternalLinkPort,
  getDeepLinkPort,
  installInteractionPorts,
} from '@/lib/platform/interaction-capabilities';

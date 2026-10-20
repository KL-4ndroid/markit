import { assembleIosPlatform } from './assemble-platform';
import { resolveAuthStorage } from './auth-storage-bootstrap';
import { resolvePhotoCamera } from './camera-bootstrap';
import { resolveDeviceFiles } from './file-bootstrap';
import { loadCapacitorRuntimePorts } from './load-runtime-ports';
import { loadIosInteractions } from './load-interactions';
import { unavailableNativePurchases } from '../unavailable-native-purchases';

export function loadIosPlatform(signal: AbortSignal) {
  return assembleIosPlatform({ runtime: loadCapacitorRuntimePorts, interactions: loadIosInteractions,
    storage: resolveAuthStorage, camera: resolvePhotoCamera, files: resolveDeviceFiles,
    purchases: unavailableNativePurchases }, signal);
}

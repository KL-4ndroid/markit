import { Capacitor } from '@capacitor/core';
import { getSalesPhotoEvidenceWebCapabilitySnapshot } from '@/lib/sales/photo-evidence-browser-adapter';
import { CameraSelectionError } from '../contracts/camera';
import { createNativeCamera } from './camera';

export async function loadIosCamera() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios'
    || !Capacitor.isPluginAvailable('Camera') || !Capacitor.isPluginAvailable('Filesystem')) {
    throw new CameraSelectionError('adapter_unavailable');
  }
  try {
    const [{ Camera, EncodingType, MediaTypeSelection, CameraDirection }, { Filesystem, Directory }] = await Promise.all([
      import('@capacitor/camera'), import('@capacitor/filesystem'),
    ]);
    const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: '' });
    return createNativeCamera({
      takePhoto: () => Camera.takePhoto({
        quality: 100, encodingType: EncodingType.JPEG, correctOrientation: true,
        cameraDirection: CameraDirection.Rear, saveToGallery: false, editable: 'no', includeMetadata: false,
      }),
      chooseFromGallery: () => Camera.chooseFromGallery({
        mediaType: MediaTypeSelection.Photo, allowMultipleSelection: false, limit: 1,
        editable: 'no', includeMetadata: false, correctOrientation: true, quality: 100,
      }),
      stat: path => Filesystem.stat({ path }),
      read: async path => (await Filesystem.readFile({ path })).data,
      remove: path => Filesystem.deleteFile({ path }),
    }, { cacheUri: uri, imageProcessingAvailable: getSalesPhotoEvidenceWebCapabilitySnapshot().imageProcessingAvailable
      && typeof File === 'function' && typeof atob === 'function'
      && typeof crypto !== 'undefined' && !!crypto.subtle });
  } catch { throw new CameraSelectionError('adapter_unavailable'); }
}

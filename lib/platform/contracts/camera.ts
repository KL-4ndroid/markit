import type { SalesPhotoEvidenceBrowserCapabilitySnapshot } from '@/lib/sales/photo-evidence-browser-adapter-contract';
import type { SalesPhotoEvidenceCaptureSource } from '@/lib/sales/photo-evidence-browser-adapter';

/**
 * The platform-owned boundary for obtaining an image.
 *
 * Decoding, compression, policy validation, and persistence intentionally stay
 * outside this port so Web and iOS share the same evidence safety pipeline.
 */
export interface CameraPort {
  getCapabilitySnapshot(): SalesPhotoEvidenceBrowserCapabilitySnapshot;
  selectImage(source: SalesPhotoEvidenceCaptureSource): Promise<File | null>;
}

export type CameraSelectionFailure = 'permission_denied' | 'camera_not_found'
  | 'adapter_unavailable' | 'source_decode_failed';

/** Fixed classification only; never carry a native error, URI or image payload. */
export class CameraSelectionError extends Error {
  constructor(readonly reason: CameraSelectionFailure) {
    super(reason);
    this.name = 'CameraSelectionError';
  }
}

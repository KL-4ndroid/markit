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

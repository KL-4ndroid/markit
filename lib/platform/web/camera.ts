import {
  getSalesPhotoEvidenceWebCapabilitySnapshot,
  selectSalesPhotoEvidenceFileWithInput,
} from '@/lib/sales/photo-evidence-browser-adapter';
import type { CameraPort } from '@/lib/platform/contracts/camera';

export const webCamera: CameraPort = Object.freeze({
  getCapabilitySnapshot: getSalesPhotoEvidenceWebCapabilitySnapshot,
  selectImage: selectSalesPhotoEvidenceFileWithInput,
});

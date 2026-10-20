import type { PlatformFile } from './contracts/files';
import { resolveDeviceFiles } from './capacitor/file-bootstrap';

/** No application/domain import: safe for database fallback callers. */
export async function savePlatformFile(file: PlatformFile): Promise<void> {
  await (await resolveDeviceFiles()).saveFile(file);
}

export async function previewPlatformFile(file: PlatformFile) {
  return (await resolveDeviceFiles()).previewFile(file);
}

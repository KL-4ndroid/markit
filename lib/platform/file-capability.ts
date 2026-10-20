import type { FilePort } from '@/lib/platform/contracts/files';
import { webFiles } from '@/lib/platform/web/files';

let activeFilePort: FilePort = webFiles;

/**
 * A narrow registry that is safe for database and recovery modules to import.
 * It deliberately has no dependency on AppPlatform, camera, or sales features.
 */
export function getFilePort(): FilePort {
  return activeFilePort;
}

export function installFilePort(filePort: FilePort): () => void {
  const previousFilePort = activeFilePort;
  activeFilePort = filePort;

  return () => {
    if (activeFilePort === filePort) activeFilePort = previousFilePort;
  };
}

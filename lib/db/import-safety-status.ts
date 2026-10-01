export const IMPORT_EMERGENCY_BACKUP_KEY = 'market_pulse_emergency_backup';
export const IMPORT_EMERGENCY_BACKUP_METADATA_KEY = 'market_pulse_emergency_backup_metadata';

export interface ImportEmergencyBackupMetadata {
  createdAt: number;
  size: number;
  downloaded?: boolean;
}

export interface ImportSafetyStatus {
  available: boolean;
  metadata: ImportEmergencyBackupMetadata | null;
  hasLocalBackupContent: boolean;
  storageMode: 'none' | 'local_storage' | 'downloaded_file' | 'metadata_only' | 'unavailable';
  error: string | null;
}

function isMetadata(value: unknown): value is ImportEmergencyBackupMetadata {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<ImportEmergencyBackupMetadata>;
  return (
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt) &&
    typeof candidate.size === 'number' &&
    Number.isFinite(candidate.size) &&
    (candidate.downloaded === undefined || typeof candidate.downloaded === 'boolean')
  );
}

export function getImportSafetyStatus(): ImportSafetyStatus {
  if (typeof window === 'undefined') {
    return {
      available: false,
      metadata: null,
      hasLocalBackupContent: false,
      storageMode: 'unavailable',
      error: 'Import safety status is only available in the browser.',
    };
  }

  try {
    const rawMetadata = window.localStorage.getItem(IMPORT_EMERGENCY_BACKUP_METADATA_KEY);
    const backupContent = window.localStorage.getItem(IMPORT_EMERGENCY_BACKUP_KEY);

    if (!rawMetadata) {
      return {
        available: false,
        metadata: null,
        hasLocalBackupContent: false,
        storageMode: 'none',
        error: null,
      };
    }

    const parsedMetadata: unknown = JSON.parse(rawMetadata);
    if (!isMetadata(parsedMetadata)) {
      return {
        available: false,
        metadata: null,
        hasLocalBackupContent: !!backupContent,
        storageMode: backupContent ? 'metadata_only' : 'none',
        error: 'Emergency backup metadata is invalid.',
      };
    }

    const hasLocalBackupContent = !!backupContent;
    const storageMode = hasLocalBackupContent
      ? 'local_storage'
      : parsedMetadata.downloaded
        ? 'downloaded_file'
        : 'metadata_only';

    return {
      available: true,
      metadata: parsedMetadata,
      hasLocalBackupContent,
      storageMode,
      error: null,
    };
  } catch (error) {
    return {
      available: false,
      metadata: null,
      hasLocalBackupContent: false,
      storageMode: 'unavailable',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function readLocalImportEmergencyBackup(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(IMPORT_EMERGENCY_BACKUP_KEY);
}

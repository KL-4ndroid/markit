export type CacheReplacementScope = 'owner-full' | 'staff-view' | 'debug-only';

export type CacheReplacementRecord = {
  id: string;
  sync_status?: string | null;
  status?: string | null;
  metadata?: {
    blocked_at?: unknown;
    [key: string]: unknown;
  } | null;
  updatedAt?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

export type CacheReplacementPreview<TLocal extends CacheReplacementRecord, TRemote extends CacheReplacementRecord> = {
  scope: CacheReplacementScope;
  authorizedIds: string[];
  wouldAdd: TRemote[];
  wouldUpdate: Array<{ local: TLocal; remote: TRemote }>;
  wouldKeep: TLocal[];
  wouldSkipPending: TLocal[];
  wouldSkipLocalOnly: TLocal[];
  wouldSkipBlocked: TLocal[];
  wouldDeleteCandidates: TLocal[];
  warnings: string[];
};

export type CacheReplacementPreviewInput<
  TLocal extends CacheReplacementRecord,
  TRemote extends CacheReplacementRecord,
> = {
  scope: CacheReplacementScope;
  authorizedIds: Iterable<string>;
  localRecords: TLocal[];
  remoteRecords: TRemote[];
  hasChanged?: (local: TLocal, remote: TRemote) => boolean;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const object = value as Record<string, unknown>;
  const keys = Object.keys(object).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`;
}

function getStatus(record: CacheReplacementRecord): string {
  return String(record.sync_status ?? record.status ?? '');
}

function isBlocked(record: CacheReplacementRecord): boolean {
  const status = getStatus(record);
  return (
    status === 'blocked' ||
    status === 'blocked_permission' ||
    record.metadata?.blocked_at !== undefined
  );
}

function defaultHasChanged<TLocal extends CacheReplacementRecord, TRemote extends CacheReplacementRecord>(
  local: TLocal,
  remote: TRemote
): boolean {
  const localUpdatedAt = local.updatedAt ?? local.updated_at;
  const remoteUpdatedAt = remote.updatedAt ?? remote.updated_at;

  if (localUpdatedAt || remoteUpdatedAt) {
    return localUpdatedAt !== remoteUpdatedAt;
  }

  return stableStringify(local) !== stableStringify(remote);
}

function addProtectedRecord<TLocal extends CacheReplacementRecord, TRemote extends CacheReplacementRecord>(
  preview: CacheReplacementPreview<TLocal, TRemote>,
  record: TLocal
): boolean {
  const status = getStatus(record);

  if (status === 'pending') {
    preview.wouldSkipPending.push(record);
    return true;
  }

  if (status === 'local_only') {
    preview.wouldSkipLocalOnly.push(record);
    return true;
  }

  if (isBlocked(record)) {
    preview.wouldSkipBlocked.push(record);
    return true;
  }

  return false;
}

export function previewCacheReplacement<
  TLocal extends CacheReplacementRecord,
  TRemote extends CacheReplacementRecord,
>(
  input: CacheReplacementPreviewInput<TLocal, TRemote>
): CacheReplacementPreview<TLocal, TRemote> {
  const authorizedIds = Array.from(new Set(Array.from(input.authorizedIds).filter(Boolean))).sort();
  const authorizedSet = new Set(authorizedIds);
  const localById = new Map(input.localRecords.map(record => [record.id, record]));
  const remoteById = new Map(input.remoteRecords.map(record => [record.id, record]));
  const hasChanged = input.hasChanged ?? defaultHasChanged;

  const preview: CacheReplacementPreview<TLocal, TRemote> = {
    scope: input.scope,
    authorizedIds,
    wouldAdd: [],
    wouldUpdate: [],
    wouldKeep: [],
    wouldSkipPending: [],
    wouldSkipLocalOnly: [],
    wouldSkipBlocked: [],
    wouldDeleteCandidates: [],
    warnings: [],
  };

  for (const remote of input.remoteRecords) {
    if (!authorizedSet.has(remote.id)) {
      preview.warnings.push(`remote record ${remote.id} is outside authorized scope`);
      continue;
    }

    const local = localById.get(remote.id);
    if (!local) {
      preview.wouldAdd.push(remote);
      continue;
    }

    if (addProtectedRecord(preview, local)) {
      continue;
    }

    if (hasChanged(local, remote)) {
      preview.wouldUpdate.push({ local, remote });
    } else {
      preview.wouldKeep.push(local);
    }
  }

  let ignoredOutsideScope = 0;
  for (const local of input.localRecords) {
    if (!authorizedSet.has(local.id)) {
      ignoredOutsideScope++;
      continue;
    }

    if (remoteById.has(local.id)) {
      continue;
    }

    if (addProtectedRecord(preview, local)) {
      continue;
    }

    preview.wouldDeleteCandidates.push(local);
  }

  if (input.scope === 'staff-view' && ignoredOutsideScope > 0) {
    preview.warnings.push(
      `staff-view preview ignored ${ignoredOutsideScope} local record(s) outside authorized scope`
    );
  }

  return preview;
}

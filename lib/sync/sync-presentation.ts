import { formatRelativeTimestamp } from '@/lib/presentation/formatters';
import { SyncStatus } from '@/lib/sync/sync-runtime-state';

export type SyncPresentationKind =
  | 'waiting'
  | 'syncing'
  | 'offline'
  | 'error'
  | 'pending'
  | 'synced';

export interface SyncPresentationInput {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error?: string | null;
  isOnline: boolean;
  now?: number;
}

export interface SyncPresentation {
  kind: SyncPresentationKind;
  label: string;
  accessibleLabel: string;
  lastSyncLabel: string;
  tone: string;
  canSync: boolean;
}

export function getSyncPresentation(input: SyncPresentationInput): SyncPresentation {
  const lastSyncLabel = formatRelativeTimestamp(input.lastSyncAt, input.now);

  if (input.status === SyncStatus.SYNCING) {
    return {
      kind: 'syncing',
      label: '同步中',
      accessibleLabel: `同步中，${input.pendingCount} 筆待處理`,
      lastSyncLabel,
      tone: 'text-primary bg-primary/10',
      canSync: false,
    };
  }

  if (!input.isOnline || input.status === SyncStatus.OFFLINE) {
    return {
      kind: 'offline',
      label: '離線使用中',
      accessibleLabel: `離線，${input.pendingCount} 筆資料保存在本機`,
      lastSyncLabel,
      tone: 'text-muted-foreground bg-muted/60',
      canSync: false,
    };
  }

  if (input.status === SyncStatus.ERROR) {
    return {
      kind: 'error',
      label: '同步需要重試',
      accessibleLabel: `同步失敗${input.error ? `：${input.error}` : ''}`,
      lastSyncLabel,
      tone: 'text-danger bg-status-danger-bg',
      canSync: true,
    };
  }

  if (input.pendingCount > 0) {
    return {
      kind: 'pending',
      label: `${input.pendingCount} 筆待同步`,
      accessibleLabel: `${input.pendingCount} 筆待同步，點擊重試`,
      lastSyncLabel,
      tone: 'text-atelier-clay bg-atelier-apricot-soft',
      canSync: true,
    };
  }

  if (input.lastSyncAt !== null) {
    return {
      kind: 'synced',
      label: '已同步',
      accessibleLabel: `資料已同步，最後同步於${lastSyncLabel}，點擊檢查更新`,
      lastSyncLabel,
      tone: 'text-primary bg-soft-green',
      canSync: true,
    };
  }

  return {
    kind: 'waiting',
    label: '尚未完成同步檢查',
    accessibleLabel: '尚未完成首次同步檢查，點擊立即檢查',
    lastSyncLabel,
    tone: 'text-muted-foreground bg-muted/60',
    canSync: true,
  };
}

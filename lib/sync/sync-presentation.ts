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
  detail: string;
  actionLabel: string;
}

export function getSyncPresentation(input: SyncPresentationInput): SyncPresentation {
  const lastSyncLabel = formatRelativeTimestamp(input.lastSyncAt, input.now);

  if (!input.isOnline || input.status === SyncStatus.OFFLINE) {
    return {
      kind: 'offline', label: '離線・未同步', accessibleLabel: `離線，${input.pendingCount} 筆紀錄待同步，查看同步狀態`,
      lastSyncLabel, tone: 'text-muted-foreground bg-muted/60', canSync: input.isOnline,
      detail: input.pendingCount > 0
        ? `${input.pendingCount} 筆紀錄尚未送達雲端，只保存在這台裝置。請恢復連線後再確認同步。`
        : '目前無法確認雲端更新，請恢復連線後再檢查。',
      actionLabel: input.isOnline ? '重試連線與同步' : '連線後再同步',
    };
  }

  if (input.status === SyncStatus.SYNCING) {
    return {
      kind: 'syncing',
      label: '同步中',
      accessibleLabel: `紀錄同步中，${input.pendingCount} 筆待處理，查看同步狀態`,
      lastSyncLabel,
      tone: 'text-primary bg-primary/10',
      canSync: false,
      detail: '正在傳送本機紀錄並讀取雲端更新，完成後此處會顯示結果。',
      actionLabel: '同步進行中',
    };
  }

  if (input.status === SyncStatus.ERROR) {
    return {
      kind: 'error',
      label: '同步需要重試',
      accessibleLabel: `紀錄同步未完成，${input.pendingCount} 筆待同步${input.error ? `：${input.error}` : ''}，查看同步狀態`,
      lastSyncLabel,
      tone: 'text-danger bg-status-danger-bg',
      canSync: true,
      detail: input.pendingCount > 0
        ? `${input.pendingCount} 筆紀錄尚未送達雲端，仍保存在這台裝置。請查看原因後重試。`
        : '本次同步未完成，暫時無法確認最新雲端資料。請查看原因後重試。',
      actionLabel: '重新同步',
    };
  }

  if (input.pendingCount > 0) {
    return {
      kind: 'pending',
      label: `${input.pendingCount} 筆待同步`,
      accessibleLabel: `${input.pendingCount} 筆紀錄待同步，查看同步狀態`,
      lastSyncLabel,
      tone: 'text-atelier-clay bg-atelier-apricot-soft',
      canSync: true,
      detail: '這些紀錄目前只保存在這台裝置，尚未送達雲端。請完成同步後再換裝置使用。',
      actionLabel: '立即同步',
    };
  }

  if (input.lastSyncAt !== null) {
    return {
      kind: 'synced',
      label: '已同步',
      accessibleLabel: `上次完成紀錄同步於${lastSyncLabel}，查看同步狀態`,
      lastSyncLabel,
      tone: 'text-primary bg-soft-green',
      canSync: true,
      detail: '目前沒有待同步的紀錄。上次完成同步後，仍可檢查其他裝置的新紀錄。',
      actionLabel: '檢查雲端更新',
    };
  }

  return {
    kind: 'waiting',
    label: '正在確認同步狀態',
    accessibleLabel: '正在確認同步狀態，查看詳情',
    lastSyncLabel,
    tone: 'text-muted-foreground bg-muted/60',
    canSync: true,
    detail: '尚未完成本次紀錄同步檢查，目前不能確認雲端是否為最新。',
    actionLabel: '檢查同步狀態',
  };
}

'use client';

import { useEffect, useState } from 'react';
import { Download, FileWarning, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getAppPlatform } from '@/lib/platform';
import { formatDisplayDateTime } from '@/lib/presentation/formatters';
import {
  getImportSafetyStatus,
  readLocalImportEmergencyBackup,
  type ImportSafetyStatus,
} from '@/lib/db/import-safety-status';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '未知大小';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return '未知時間';
  return formatDisplayDateTime(new Date(timestamp));
}

function storageModeLabel(status: ImportSafetyStatus): string {
  switch (status.storageMode) {
    case 'local_storage':
      return '已儲存在此瀏覽器';
    case 'downloaded_file':
      return '匯入時已下載為檔案';
    case 'metadata_only':
      return '只有備份資訊，本機沒有備份內容';
    case 'unavailable':
      return '目前環境無法使用';
    case 'none':
    default:
      return '找不到匯入前緊急備份';
  }
}

export function ImportSafetyStatusPanel() {
  const [status, setStatus] = useState<ImportSafetyStatus | null>(null);

  const refresh = () => {
    setStatus(getImportSafetyStatus());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDownload = async () => {
    const content = readLocalImportEmergencyBackup();
    if (!content) {
      toast.error('目前沒有可下載的本機緊急備份');
      refresh();
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await getAppPlatform().files.saveFile({
      filename: `feria-emergency-backup-${timestamp}.json`,
      data: new Blob([content], { type: 'application/json' }),
    });
    toast.success('緊急備份已下載');
  };

  const hasBackup = !!status?.available;
  const canDownload = !!status?.hasLocalBackupContent;

  return (
    <section className="w-full border border-neutral-stripe bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              hasBackup ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {hasBackup ? <ShieldCheck size={20} /> : <FileWarning size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">匯入安全狀態</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              顯示最近一次匯入前建立的緊急備份，不會執行修復或還原。
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-stripe-dark px-3 text-sm font-medium text-foreground hover:bg-cream-soft"
          >
            <RefreshCw size={16} />
            重新整理
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <Download size={16} />
            下載備份
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-warm-mist pt-3 text-sm">
        <p className="text-foreground">
          狀態：<span className="font-medium">{status ? storageModeLabel(status) : '載入中'}</span>
        </p>

        {status?.metadata && (
          <div className="grid gap-2 text-muted-foreground sm:grid-cols-2">
            <p>建立時間：{formatDate(status.metadata.createdAt)}</p>
            <p>檔案大小：{formatBytes(status.metadata.size)}</p>
          </div>
        )}

        {status?.error && (
          <p className="text-red-700">備份狀態讀取失敗，請重新整理後再試。</p>
        )}

        <p className="text-muted-foreground">
          此區塊只讀取備份狀態，不會匯入資料、修復本機資料庫或寫入雲端。
        </p>
      </div>
    </section>
  );
}

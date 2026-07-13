'use client';

import { useEffect, useState } from 'react';
import { Download, FileWarning, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  getImportSafetyStatus,
  readLocalImportEmergencyBackup,
  type ImportSafetyStatus,
} from '@/lib/db/import-safety-status';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return 'Unknown time';
  return new Date(timestamp).toLocaleString('zh-TW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function storageModeLabel(status: ImportSafetyStatus): string {
  switch (status.storageMode) {
    case 'local_storage':
      return 'Stored in this browser';
    case 'downloaded_file':
      return 'Downloaded as file during import';
    case 'metadata_only':
      return 'Metadata exists, backup content is not in localStorage';
    case 'unavailable':
      return 'Unavailable in this environment';
    case 'none':
    default:
      return 'No emergency import backup found';
  }
}

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ImportSafetyStatusPanel() {
  const [status, setStatus] = useState<ImportSafetyStatus | null>(null);

  const refresh = () => {
    setStatus(getImportSafetyStatus());
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDownload = () => {
    const content = readLocalImportEmergencyBackup();
    if (!content) {
      toast.error('No local emergency backup content is available to download.');
      refresh();
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadJson(`feria-emergency-backup-${timestamp}.json`, content);
    toast.success('Emergency backup downloaded.');
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
            <h2 className="text-base font-semibold text-foreground">Import Safety Status</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Read-only emergency backup status for the most recent import attempt.
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
            Refresh
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!canDownload}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <Download size={16} />
            Download backup
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-warm-mist pt-3 text-sm">
        <p className="text-foreground">
          Status: <span className="font-medium">{status ? storageModeLabel(status) : 'Loading'}</span>
        </p>

        {status?.metadata && (
          <div className="grid gap-2 text-muted-foreground sm:grid-cols-2">
            <p>Created: {formatDate(status.metadata.createdAt)}</p>
            <p>Size: {formatBytes(status.metadata.size)}</p>
          </div>
        )}

        {status?.error && (
          <p className="text-red-700">Read error: {status.error}</p>
        )}

        <p className="text-muted-foreground">
          This panel does not run import, repair IndexedDB, or write cloud data.
        </p>
      </div>
    </section>
  );
}

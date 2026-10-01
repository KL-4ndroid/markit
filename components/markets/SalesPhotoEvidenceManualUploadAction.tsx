'use client';

import { Loader2, UploadCloud } from 'lucide-react';
import type {
  SalesPhotoEvidencePendingCreationListItem,
} from '@/lib/sales/photo-evidence-pending-creation-read-model';

type ManualUploadActionStatus = SalesPhotoEvidencePendingCreationListItem['status'];

interface SalesPhotoEvidenceManualUploadActionProps {
  status: ManualUploadActionStatus;
  uploadEnabled?: boolean;
  isUploading?: boolean;
  onUpload?: () => void;
}

function isUploadEligibleStatus(status: ManualUploadActionStatus): boolean {
  return status === 'waiting_for_event_sync' || status === 'failed_retryable';
}

export function SalesPhotoEvidenceManualUploadAction({
  status,
  uploadEnabled = false,
  isUploading = false,
  onUpload,
}: SalesPhotoEvidenceManualUploadActionProps) {
  const eligible = isUploadEligibleStatus(status);
  const canUpload = uploadEnabled && eligible && typeof onUpload === 'function' && !isUploading;
  const label = isUploading ? '照片上傳中' : '上傳照片';
  const helper = eligible
    ? '使用已選擇並壓縮的照片上傳，失敗時會保留本機照片供重試。'
    : '這筆紀錄目前不需要上傳照片。';

  return (
    <div className="mt-3 rounded-xl border border-primary/15 bg-white px-3 py-2">
      <button
        type="button"
        onClick={onUpload}
        disabled={!canUpload}
        className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-65"
      >
        <span className="flex min-w-0 items-center gap-2">
          {isUploading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          ) : (
            <UploadCloud className="h-4 w-4 shrink-0 text-primary" />
          )}
          <span>
            <span className="block text-xs font-medium text-foreground">{label}</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
              {helper}
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}

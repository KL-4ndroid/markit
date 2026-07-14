'use client';

import { Camera, Lock } from 'lucide-react';
import type {
  SalesPhotoEvidencePendingCreationListItem,
} from '@/lib/sales/photo-evidence-pending-creation-read-model';

type CaptureActionStatus = SalesPhotoEvidencePendingCreationListItem['status'];

interface SalesPhotoEvidenceLocalCaptureActionProps {
  status: CaptureActionStatus;
  captureEnabled?: boolean;
  isCapturing?: boolean;
  onCapture?: () => void;
}

function isCaptureEligibleStatus(status: CaptureActionStatus): boolean {
  return status === 'waiting_for_event_sync' || status === 'failed_retryable';
}

export function SalesPhotoEvidenceLocalCaptureAction({
  status,
  captureEnabled = false,
  isCapturing = false,
  onCapture,
}: SalesPhotoEvidenceLocalCaptureActionProps) {
  const eligible = isCaptureEligibleStatus(status);
  const canCapture = captureEnabled && eligible && typeof onCapture === 'function' && !isCapturing;
  const label = isCapturing ? '照片處理中' : '拍攝/選擇照片';
  const helper = captureEnabled
    ? eligible
      ? '照片會先暫存在本機，尚未上傳雲端。'
      : '此筆狀態目前不能重新拍照。'
    : '目前無法拍攝或選擇照片。';

  return (
    <div className="mt-3 rounded-xl border border-dashed border-primary/15 bg-white px-3 py-2">
      <button
        type="button"
        onClick={onCapture}
        disabled={!canCapture}
        className="flex w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-65"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Camera className="h-4 w-4 shrink-0 text-primary" />
          <span>
            <span className="block text-xs font-medium text-foreground">{label}</span>
            <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
              {helper}
            </span>
          </span>
        </span>
        {!captureEnabled && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
    </div>
  );
}

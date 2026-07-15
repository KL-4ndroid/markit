'use client';

import Image from 'next/image';
import { Camera, Loader2, UploadCloud, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { LocalPendingSalesPhotoEvidencePayload } from '@/lib/sales/photo-evidence-pending-payload-storage';

interface SalesPhotoEvidenceCapturePreviewDialogProps {
  isOpen: boolean;
  payload: LocalPendingSalesPhotoEvidencePayload | null;
  isUploading?: boolean;
  uploadError?: string | null;
  onRetake: () => void;
  onUpload: () => void;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SalesPhotoEvidenceCapturePreviewDialog({
  isOpen,
  payload,
  isUploading = false,
  uploadError = null,
  onRetake,
  onUpload,
  onClose,
}: SalesPhotoEvidenceCapturePreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !payload) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(payload.image.blob);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [isOpen, payload]);

  if (!isOpen || !payload) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-photo-evidence-preview-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="sales-photo-evidence-preview-title" className="text-lg font-medium text-foreground">
              確認成交照片
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              成交已完成。確認照片清楚後上傳，或重新拍攝與選擇照片。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
            aria-label="關閉照片預覽"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-5">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-950">
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="準備上傳的成交照片預覽"
                fill
                unoptimized
                sizes="(max-width: 640px) calc(100vw - 3rem), 480px"
                className="object-contain"
              />
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{payload.image.width} x {payload.image.height}</span>
            <span>{formatFileSize(payload.image.fileSizeBytes)}</span>
            <span>照片已安全暫存在此裝置</span>
          </div>

          {uploadError && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
              {uploadError}
            </div>
          )}
        </div>

        <footer className="grid gap-2 border-t border-border px-5 py-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onRetake}
            disabled={isUploading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
            重新拍攝或選擇
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={isUploading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {isUploading ? '同步並上傳中' : '確認並上傳照片'}
          </button>
        </footer>
      </section>
    </div>
  );
}

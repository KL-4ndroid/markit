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
    <>
      <div
        className="fixed inset-0 z-[1199] bg-black/50 transition-opacity"
        onClick={isUploading ? undefined : onClose}
      />
      <div className="pointer-events-none fixed inset-0 z-[1200] flex justify-center p-4">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-photo-evidence-preview-title"
          className="pointer-events-auto relative flex max-h-[90dvh] w-full max-w-lg self-center flex-col overflow-hidden rounded-[2rem] bg-background shadow-2xl animate-slide-up"
        >
        <header className="flex items-start justify-between gap-4 bg-gradient-to-br from-primary to-secondary px-6 py-6">
          <div className="min-w-0">
            <h2 id="sales-photo-evidence-preview-title" className="text-xl font-medium text-white">
              確認成交照片
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/80">
              成交已完成。確認照片清楚後上傳，或重新拍攝與選擇照片。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="shrink-0 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30 disabled:opacity-50"
            aria-label="關閉照片預覽"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
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

        <footer className="grid gap-2 border-t border-border bg-background px-6 py-4 sm:grid-cols-2">
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
    </>
  );
}

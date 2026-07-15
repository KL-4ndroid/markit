'use client';

import { Camera, CheckCircle2, Clock3, X } from 'lucide-react';

interface SalesPhotoEvidencePostSalePromptProps {
  isOpen: boolean;
  isCaptureReady?: boolean;
  onCaptureNow: () => void;
  onLater: () => void;
}

export function SalesPhotoEvidencePostSalePrompt({
  isOpen,
  isCaptureReady = false,
  onCaptureNow,
  onLater,
}: SalesPhotoEvidencePostSalePromptProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/35 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-photo-evidence-post-sale-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h2 id="sales-photo-evidence-post-sale-title" className="text-lg font-medium text-foreground">
                成交已儲存
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                這個市集要求保留商品照片。可以現在拍攝，也可以稍後從待補照片繼續。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLater}
            className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label="稍後補拍"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCaptureNow}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Camera className="h-4 w-4" />
            {isCaptureReady ? '拍攝商品' : '開啟待補照片'}
          </button>
          <button
            type="button"
            onClick={onLater}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            <Clock3 className="h-4 w-4" />
            稍後補拍
          </button>
        </div>
      </section>
    </div>
  );
}

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
    <>
      <div className="fixed inset-0 z-[1099] bg-black/50 transition-opacity" onClick={onLater} />
      <div className="pointer-events-none fixed inset-0 z-[1100] flex justify-center p-4">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-photo-evidence-post-sale-title"
          className="pointer-events-auto relative flex max-h-[90dvh] w-full max-w-md self-center flex-col overflow-hidden rounded-[2rem] bg-background shadow-2xl animate-slide-up"
        >
          <header className="japanese-gradient-header flex items-center justify-between gap-4 px-6 py-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <h2 id="sales-photo-evidence-post-sale-title" className="text-xl font-medium text-white">
                成交已儲存
              </h2>
            </div>
            <button
              type="button"
              onClick={onLater}
              className="shrink-0 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
              aria-label="稍後補拍"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="overflow-y-auto px-6 py-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              這個市集要求保留商品照片。可以現在拍攝，也可以稍後從待補照片繼續。
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onCaptureNow}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <Camera className="h-4 w-4" />
                {isCaptureReady ? '拍攝商品' : '開啟待補照片'}
              </button>
              <button
                type="button"
                onClick={onLater}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                <Clock3 className="h-4 w-4" />
                稍後補拍
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

'use client';

/* eslint-disable @next/next/no-img-element -- Private blob URLs must bypass Next image optimization and caching. */

import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ImageOff, Loader2, Maximize2, X } from 'lucide-react';
import {
  fetchSalesPhotoEvidenceOwnerImageObjectUrl,
  type SalesPhotoEvidenceOwnerImageVariant,
} from '@/lib/sales/photo-evidence-owner-image-client';

interface SalesPhotoEvidenceOwnerAlbumImageProps {
  evidenceId: string;
  canLoad: boolean;
  alt: string;
  previewVariant?: SalesPhotoEvidenceOwnerImageVariant;
  fullVariant?: SalesPhotoEvidenceOwnerImageVariant;
  allowFullscreen?: boolean;
}

type OwnerImageState = {
  objectUrl: string | null;
  isLoading: boolean;
  errorMessage: string | null;
};

function useOwnerImageObjectUrl(
  evidenceId: string,
  variant: SalesPhotoEvidenceOwnerImageVariant,
  enabled: boolean
): OwnerImageState {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl: string | null = null;

    if (!enabled) {
      setObjectUrl(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    fetchSalesPhotoEvidenceOwnerImageObjectUrl({ evidenceId, variant })
      .then(result => {
        if (cancelled) {
          if (result.ok) URL.revokeObjectURL(result.objectUrl);
          return;
        }

        if (result.ok) {
          createdObjectUrl = result.objectUrl;
          setObjectUrl(result.objectUrl);
          setErrorMessage(null);
          return;
        }

        setObjectUrl(null);
        setErrorMessage(result.message);
      })
      .catch(error => {
        if (cancelled) return;
        console.error(`load sales photo evidence ${variant} failed:`, error);
        setObjectUrl(null);
        setErrorMessage('照片讀取失敗，請稍後再試。');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [enabled, evidenceId, variant]);

  return { objectUrl, isLoading, errorMessage };
}

export function SalesPhotoEvidenceOwnerAlbumImage({
  evidenceId,
  canLoad,
  alt,
  previewVariant = 'thumbnail',
  fullVariant = 'image',
  allowFullscreen = true,
}: SalesPhotoEvidenceOwnerAlbumImageProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const preview = useOwnerImageObjectUrl(evidenceId, previewVariant, canLoad);
  const fullImage = useOwnerImageObjectUrl(
    evidenceId,
    fullVariant,
    canLoad && allowFullscreen && isViewerOpen
  );

  if (preview.objectUrl) {
    const previewImage = (
      <img
        src={preview.objectUrl}
        alt={alt}
        className="h-full w-full rounded-card object-cover"
      />
    );

    if (!allowFullscreen) return previewImage;

    return (
      <>
        <button
          type="button"
          onClick={() => setIsViewerOpen(true)}
          className="group relative h-full w-full cursor-zoom-in overflow-hidden rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="放大查看成交照片"
          aria-haspopup="dialog"
          title="放大查看"
        >
          {previewImage}
          <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white opacity-90 transition-opacity group-hover:opacity-100" aria-hidden="true">
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>

        <Dialog open={isViewerOpen} onClose={setIsViewerOpen} className="relative z-[70]">
          <div className="fixed inset-0 bg-black/85" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-8">
            <DialogPanel className="flex h-full w-full max-w-6xl flex-col">
              <div className="flex min-h-11 items-center justify-between gap-4 text-white">
                <DialogTitle className="truncate text-sm font-medium sm:text-base">
                  {alt}
                </DialogTitle>
                <button
                  type="button"
                  onClick={() => setIsViewerOpen(false)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="關閉照片檢視"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative flex min-h-0 flex-1 items-center justify-center py-3">
                <img
                  src={fullImage.objectUrl ?? preview.objectUrl}
                  alt={alt}
                  className="max-h-full max-w-full object-contain"
                />
                {fullImage.isLoading && (
                  <span className="absolute right-3 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white" role="status" aria-label="原始照片讀取中">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </span>
                )}
              </div>

              {fullImage.errorMessage && (
                <p className="pb-2 text-center text-sm text-white/80" role="status">
                  {fullImage.errorMessage}
                </p>
              )}
            </DialogPanel>
          </div>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-card border border-dashed border-atelier-line bg-atelier-paper text-center">
      <div className="px-4">
        {preview.isLoading ? (
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
        ) : (
          <ImageOff className="mx-auto h-7 w-7 text-muted-foreground" />
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {preview.isLoading ? '照片讀取中' : preview.errorMessage ?? '尚無可顯示照片'}
        </p>
      </div>
    </div>
  );
}

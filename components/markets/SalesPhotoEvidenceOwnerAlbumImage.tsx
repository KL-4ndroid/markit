'use client';

import { useEffect, useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import {
  fetchSalesPhotoEvidenceOwnerImageObjectUrl,
} from '@/lib/sales/photo-evidence-owner-image-client';

interface SalesPhotoEvidenceOwnerAlbumImageProps {
  evidenceId: string;
  canLoad: boolean;
  alt: string;
}

export function SalesPhotoEvidenceOwnerAlbumImage({
  evidenceId,
  canLoad,
  alt,
}: SalesPhotoEvidenceOwnerAlbumImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl: string | null = null;

    if (!canLoad) {
      setObjectUrl(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    fetchSalesPhotoEvidenceOwnerImageObjectUrl({ evidenceId, variant: 'thumbnail' })
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
        console.error('load sales photo evidence thumbnail failed:', error);
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
  }, [canLoad, evidenceId]);

  if (objectUrl) {
    return (
      <img
        src={objectUrl}
        alt={alt}
        className="h-full w-full rounded-xl object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-border bg-white text-center">
      <div className="px-4">
        {isLoading ? (
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
        ) : (
          <ImageOff className="mx-auto h-7 w-7 text-muted-foreground" />
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {isLoading ? '照片讀取中' : errorMessage ?? '尚無可顯示照片'}
        </p>
      </div>
    </div>
  );
}

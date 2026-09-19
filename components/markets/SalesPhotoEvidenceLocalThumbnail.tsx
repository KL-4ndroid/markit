'use client';

import Image from 'next/image';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  getPendingSalesPhotoEvidencePayload,
  type LocalPendingSalesPhotoEvidencePayload,
} from '@/lib/sales/photo-evidence-pending-payload-storage';

interface SalesPhotoEvidenceLocalThumbnailProps {
  queueId: string;
  refreshKey?: string | null;
  onPreview?: (payload: LocalPendingSalesPhotoEvidencePayload) => void;
}

export function SalesPhotoEvidenceLocalThumbnail({
  queueId,
  refreshKey = null,
  onPreview,
}: SalesPhotoEvidenceLocalThumbnailProps) {
  const [payload, setPayload] = useState<LocalPendingSalesPhotoEvidencePayload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setIsLoading(true);
    void getPendingSalesPhotoEvidencePayload(queueId)
      .then(nextPayload => {
        if (cancelled) return;
        setPayload(nextPayload);
        if (nextPayload) {
          objectUrl = URL.createObjectURL(nextPayload.thumbnail.blob);
          setPreviewUrl(objectUrl);
        } else {
          setPreviewUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [queueId, refreshKey]);

  if (isLoading) {
    return (
      <div className="mt-3 flex aspect-[16/9] items-center justify-center rounded-lg border border-border bg-white text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!payload || !previewUrl) {
    return (
      <div className="mt-3 flex aspect-[16/9] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white px-4 text-center">
        <ImagePlus className="h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-xs font-medium text-foreground">尚未選擇照片</p>
        <p className="mt-1 text-[11px] text-muted-foreground">拍攝或從相簿選擇後會在這裡顯示預覽</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview?.(payload)}
      className="group relative mt-3 block aspect-[16/9] w-full overflow-hidden rounded-lg bg-neutral-950 text-left"
      aria-label="開啟成交照片預覽"
    >
      <Image
        src={previewUrl}
        alt="已選擇的成交照片縮圖"
        fill
        unoptimized
        sizes="(max-width: 640px) calc(100vw - 4rem), 440px"
        className="object-contain"
      />
      <span className="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2 text-xs font-medium text-white">
        已選擇照片，點擊查看
      </span>
    </button>
  );
}

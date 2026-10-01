'use client';

import { ImageIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { fetchProductCoverPhoto } from '@/lib/products/product-cover-photo-client';
import { cn } from '@/lib/utils';

interface ProductCoverPhotoImageProps {
  productId?: string;
  productName: string;
  variant?: 'display' | 'thumbnail';
  className?: string;
  fallback?: ReactNode;
  onAvailabilityChange?: (available: boolean) => void;
}

export function ProductCoverPhotoImage({
  productId,
  productName,
  variant = 'thumbnail',
  className,
  fallback,
  onAvailabilityChange,
}: ProductCoverPhotoImageProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    if (!productId) {
      setUrl(null);
      onAvailabilityChange?.(false);
      return;
    }

    void fetchProductCoverPhoto(productId, variant).then(result => {
      objectUrl = result;
      if (!active) {
        if (result) URL.revokeObjectURL(result);
        return;
      }
      setUrl(result);
      onAvailabilityChange?.(Boolean(result));
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [onAvailabilityChange, productId, variant]);

  if (!url) {
    return <>{fallback ?? <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}</>;
  }

  return (
    // Blob URLs are authenticated responses and cannot be handled by next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${productName}的商品照片`}
      loading={variant === 'thumbnail' ? 'lazy' : 'eager'}
      decoding="async"
      className={cn('h-full w-full object-cover', className)}
    />
  );
}

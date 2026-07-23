'use client';

import { Camera, ImagePlus, Lock, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import {
  deleteProductCoverPhoto,
  getProductCoverPhotoCapability,
} from '@/lib/products/product-cover-photo-client';
import { getProductImageAdapter } from '@/lib/platform/product-image-capability';
import type {
  PreparedProductCoverPhoto,
  ProductCoverPhotoCapability,
} from '@/lib/products/product-cover-photo-model';
import { retryPendingProductCoverPhoto } from '@/lib/products/product-cover-photo-pending';
import { ProductCoverPhotoImage } from './ProductCoverPhotoImage';

interface ProductCoverPhotoFieldProps {
  productId?: string;
  productName: string;
  value: PreparedProductCoverPhoto | null;
  onChange: (value: PreparedProductCoverPhoto | null) => void;
  disabled?: boolean;
  onDeleted?: () => void;
}

export function ProductCoverPhotoField({
  productId,
  productName,
  value,
  onChange,
  disabled = false,
  onDeleted,
}: ProductCoverPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const retriedProductRef = useRef<string | null>(null);
  const [capability, setCapability] = useState<ProductCoverPhotoCapability>({
    canManage: false,
    canDelete: false,
    reason: 'unavailable',
  });
  const [cloudPhotoExists, setCloudPhotoExists] = useState(false);
  const [imageRevision, setImageRevision] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void getProductCoverPhotoCapability(productId).then(setCapability);
  }, [productId]);

  useEffect(() => {
    if (!productId || !capability.canManage || retriedProductRef.current === productId) return;
    retriedProductRef.current = productId;
    void retryPendingProductCoverPhoto(productId).then(outcome => {
      if (outcome === 'uploaded') setImageRevision(previous => previous + 1);
    });
  }, [capability.canManage, productId]);

  useEffect(() => () => {
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
  }, [value]);

  const handleAvailabilityChange = useCallback((available: boolean) => {
    setCloudPhotoExists(available);
  }, []);

  const choose = async (file?: File) => {
    if (!file) return;
    setProcessing(true);
    setError('');
    try {
      onChange(await (await getProductImageAdapter()).prepare(file));
    } catch {
      setError('無法處理這張照片，請使用 25MB 以下的 JPEG、PNG 或 WebP。');
    } finally {
      setProcessing(false);
    }
  };

  const removeCloud = async () => {
    if (!productId) return;
    setProcessing(true);
    setError('');
    try {
      await deleteProductCoverPhoto(productId);
      setCloudPhotoExists(false);
      setImageRevision(previous => previous + 1);
      onDeleted?.();
    } catch {
      setError('照片刪除失敗，請確認網路後再試一次。');
    } finally {
      setProcessing(false);
    }
  };

  const canChoose = capability.canManage;
  const canDeleteCloud = Boolean(productId && cloudPhotoExists && capability.canDelete);

  return (
    <section className="space-y-3 border-b border-primary/10 pb-5" aria-labelledby={`${productId ?? 'new'}-cover-title`}>
      <div>
        <h3 id={`${productId ?? 'new'}-cover-title`} className="text-sm font-medium text-foreground">商品封面照片</h3>
        <p className="mt-1 text-xs text-muted-foreground">每項商品支援一張封面，系統會自動壓縮成適合顯示的尺寸。</p>
      </div>

      <div className="aspect-[4/3] overflow-hidden rounded-control border border-primary/15 bg-background">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.previewUrl} alt="待上傳的商品封面" className="h-full w-full object-cover" />
        ) : productId ? (
          <div className="flex h-full items-center justify-center">
            <ProductCoverPhotoImage
              key={`${productId}-${imageRevision}`}
              productId={productId}
              productName={productName || '商品'}
              variant="display"
              onAvailabilityChange={handleAvailabilityChange}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Camera className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>

      {canChoose ? (
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={event => {
              void choose(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="min-w-40 flex-1"
            disabled={disabled || processing}
            onClick={() => inputRef.current?.click()}
            leadingIcon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}
          >
            {processing ? '處理中' : value || cloudPhotoExists ? '更換照片' : '加入照片'}
          </Button>
          {value && (
            <Button type="button" variant="ghost" disabled={disabled || processing} onClick={() => onChange(null)} leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              取消選取
            </Button>
          )}
          {!value && canDeleteCloud && (
            <Button type="button" variant="ghost" disabled={disabled || processing} onClick={() => void removeCloud()} leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              刪除照片
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-control border border-primary/10 bg-muted/40 p-3">
          <Lock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {capability.reason === 'unavailable' ? '商品照片目前無法使用' : '商品照片為付費版功能'}
            </p>
            {capability.reason !== 'unavailable' && <a href="/subscription" className="text-xs text-primary underline underline-offset-2">查看方案</a>}
          </div>
          {canDeleteCloud && (
            <Button type="button" variant="ghost" disabled={disabled || processing} onClick={() => void removeCloud()} leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              刪除
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-status-danger-text" role="alert">{error}</p>}
    </section>
  );
}

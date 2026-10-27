'use client';

import { Camera, ImagePlus, Loader2, Lock, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { canHideDisabledProductPhoto, type ProductPhotoReadState } from '@/lib/products/product-cover-photo-read';
import { Button } from '@/components/ui/Button';
import {
  deleteProductCoverPhoto,
  getProductCoverPhotoCapability,
} from '@/lib/products/product-cover-photo-client';
import { getProductImageAdapter } from '@/lib/platform/product-image-capability';
import { resolvePhotoCamera } from '@/lib/platform/camera-capability';
import { CameraSelectionError } from '@/lib/platform/contracts/camera';
import type {
  PreparedProductCoverPhoto,
  ProductCoverPhotoCapability,
} from '@/lib/products/product-cover-photo-model';
import { retryPendingProductCoverPhoto } from '@/lib/products/product-cover-photo-pending';
import { getSubscriptionBlockedPresentation } from '@/lib/subscription/subscription-presentation';
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
  const selectionVersion = useRef(0);
  const retriedProductRef = useRef<string | null>(null);
  const [capabilityStatus, setCapabilityStatus] = useState<'loading' | 'resolved'>('loading');
  const [capabilityRevision, setCapabilityRevision] = useState(0);
  const [capability, setCapability] = useState<ProductCoverPhotoCapability>({
    canManage: false,
    canDelete: false,
    reason: 'unavailable',
  });
  const [cloudPhotoExists, setCloudPhotoExists] = useState(false);
  const [readState,setReadState]=useState<ProductPhotoReadState>('loading');
  const [retryingUpload,setRetryingUpload]=useState(false);
  const pending=useLiveQuery(async()=>{
    if(!productId) return {productId,checked:true,hasPending:false,hasPayload:false,hasRecord:false,status:null as string|null};
    try {
      const [record,payload]=await Promise.all([db.productCoverPhotoPendingUploads.get(productId),db.productCoverPhotoPendingPayloads.get(productId)]);
      return {productId,checked:true,hasPending:Boolean(record||payload),hasPayload:Boolean(payload),hasRecord:Boolean(record),status:record?.status??null};
    } catch {return {productId,checked:false,hasPending:false,hasPayload:false,hasRecord:false,status:null};}
  },[productId]);
  const [imageRevision, setImageRevision] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    selectionVersion.current += 1;
    setProcessing(false);
    setRetryingUpload(false);
    return () => { selectionVersion.current += 1; };
  }, [productId, capability.canManage]);

  useEffect(()=>{setCloudPhotoExists(false);setReadState('loading');setRetryingUpload(false);setError('');},[productId]);

  useEffect(() => {
    let active = true;
    setCapabilityStatus('loading');
    void getProductCoverPhotoCapability(productId).then(nextCapability => {
      if (!active) return;
      setCapability(nextCapability);
      setCapabilityStatus('resolved');
    });
    return () => {
      active = false;
    };
  }, [capabilityRevision, productId]);

  useEffect(() => {
    if (!productId || !capability.canManage || retriedProductRef.current === productId) return;
    retriedProductRef.current = productId;
    let active=true;
    void retryPendingProductCoverPhoto(productId).then(outcome => {
      if (active && outcome === 'uploaded') setImageRevision(previous => previous + 1);
    }).catch(()=>{if(active) setError('待上傳照片仍保留，請稍後重試。');});
    return ()=>{active=false;};
  }, [capability.canManage, productId]);

  useEffect(() => () => {
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
  }, [value]);

  const handleAvailabilityChange = useCallback((available: boolean) => {
    setCloudPhotoExists(available);
  }, []);

  const handleReadStateChange=useCallback((state: ProductPhotoReadState)=>setReadState(state),[]);
  const retryUpload=async()=>{
    if(!productId||!capability.canManage||retryingUpload) return;
    const request=selectionVersion.current;
    setRetryingUpload(true);setError('');
    try {const outcome=await retryPendingProductCoverPhoto(productId);
      if(request!==selectionVersion.current) return;
      if(outcome==='uploaded') setImageRevision(previous=>previous+1);
      else setError(outcome===null ? '待上傳紀錄尚不完整，請重新選取照片。' : '照片尚未上傳，原檔仍保留在這台裝置。');
    } catch {if(request===selectionVersion.current) setError('照片尚未上傳，原檔仍保留在這台裝置。');}
    finally {if(request===selectionVersion.current) setRetryingUpload(false);}
  };

  const choose = async (source: 'camera' | 'library') => {
    if (!capability.canManage || disabled || processing) return;
    const request = ++selectionVersion.current;
    setProcessing(true);
    setError('');
    try {
      const file = await (await resolvePhotoCamera()).selectImage(source);
      if (!file || request !== selectionVersion.current) return;
      const prepared = await (await getProductImageAdapter()).prepare(file);
      if (request !== selectionVersion.current) { URL.revokeObjectURL(prepared.previewUrl); return; }
      onChange(prepared);
    } catch (error) {
      if (request !== selectionVersion.current) return;
      setError(error instanceof CameraSelectionError && error.reason === 'permission_denied'
        ? '請允許使用相機或照片後再試，或到裝置設定調整權限。'
        : error instanceof CameraSelectionError && error.reason === 'camera_not_found'
          ? '這部裝置沒有可用的相機，請改從相簿選取。'
          : error instanceof CameraSelectionError && error.reason === 'adapter_unavailable'
            ? '目前無法開啟相機或相簿，請稍後再試。'
            : '無法處理這張照片，請使用 25MB 以下的 JPEG、PNG 或 WebP。');
    } finally {
      if (request === selectionVersion.current) setProcessing(false);
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
  const canDeleteCloud = Boolean(productId && cloudPhotoExists && readState==='existing' && capability.canDelete);
  const planBlock = capability.reason === 'free_plan' || capability.reason === 'subscription_inactive'
    ? getSubscriptionBlockedPresentation(
        capability.reason === 'free_plan' ? 'plan_required' : 'entitlement_inactive',
        'pro',
      )
    : null;
  const retryableCapability = capability.reason === 'authentication_required'
    || capability.reason === 'entitlement_unavailable'
    || capability.reason === 'unavailable';
  const unavailableTitle = capability.reason === 'permission_denied'
    ? '目前身分無法管理商品照片'
    : capability.reason === 'runtime_disabled'
      ? '商品照片功能尚未啟用'
      : capability.reason === 'authentication_required'
        ? '登入狀態需要重新確認'
        : capability.reason === 'entitlement_unavailable'
          ? '暫時無法確認商品照片權限'
          : '暫時無法確認商品照片功能';

  const rolloutDisabled = capabilityStatus === 'resolved' && capability.reason === 'runtime_disabled';
  const pendingChecked=Boolean(pending && pending.productId===productId && pending.checked);
  const hasPending=Boolean(pending && pending.productId===productId && pending.hasPending);
  if(canHideDisabledProductPhoto({disabled:rolloutDisabled,productId,hasSelection:Boolean(value),
    presence:capability.photoPresence,pendingChecked:Boolean(pendingChecked),hasPending:Boolean(hasPending)})) return null;

  return (
    <section className="mt-6 space-y-3 border-t border-primary/10 pt-5" aria-labelledby={`${productId ?? 'new'}-cover-title`}>
      <div>
        <h3 id={`${productId ?? 'new'}-cover-title`} className="text-sm font-medium text-foreground">商品封面照片</h3>
        {value && <p className="mt-1 text-xs text-muted-foreground">儲存商品後上傳照片。</p>}
      </div>

      {rolloutDisabled && productId && !value ? (
        <p className="text-xs leading-5 text-muted-foreground">照片服務目前暫停；既有照片與待上傳紀錄不會因此刪除。</p>
      ) : (value || productId) && (
      <div className={value || cloudPhotoExists || readState==='existing' ? 'aspect-[4/3] overflow-hidden rounded-control border border-primary/15 bg-background' : readState==='empty' ? 'hidden' : 'flex min-h-12 items-center justify-center rounded-control bg-muted/30 px-3'}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.previewUrl} alt="待上傳的商品封面" className="h-full w-full object-cover" />
        ) : productId ? (
          <div className="flex h-full items-center justify-center">
            <ProductCoverPhotoImage
              key={`${productId}-${imageRevision}`}
              showStatusText
              onReadStateChange={handleReadStateChange}
              productId={productId}
              productName={productName || '商品'}
              variant="display"
              onAvailabilityChange={handleAvailabilityChange}
            />
          </div>
        ) : null}
      </div>
      )}

      {rolloutDisabled ? null : capabilityStatus === 'loading' ? (
        <div className="flex min-h-12 items-center gap-3 rounded-control border border-primary/10 bg-muted/40 p-3" role="status">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">正在確認商品照片功能</p>
        </div>
      ) : canChoose ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-w-40 flex-1"
            disabled={disabled || processing || retryingUpload}
            onClick={() => void choose('library')}
            leadingIcon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}
          >
            {processing ? '處理中' : value || cloudPhotoExists || capability.photoPresence==='existing' ? '更換照片' : '加入照片'}
          </Button>
          <Button type="button" variant="secondary" disabled={disabled || processing || retryingUpload}
            onClick={() => void choose('camera')} leadingIcon={<Camera className="h-4 w-4" aria-hidden="true" />}>
            拍照
          </Button>
          {value && (
            <Button type="button" variant="ghost" disabled={disabled || processing || retryingUpload} onClick={() => onChange(null)} leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              取消選取
            </Button>
          )}
          {!value && canDeleteCloud && (
            <Button type="button" variant="ghost" disabled={disabled || processing || retryingUpload} onClick={() => void removeCloud()} leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              刪除照片
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-control border border-primary/10 bg-muted/40 p-3">
          <Lock className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {planBlock
                ? planBlock.title
                : unavailableTitle}
            </p>
            {planBlock?.showPlanPreviewLink && (
              <a href="/subscription" className="text-xs text-primary underline underline-offset-2">
                {planBlock.actionLabel}
              </a>
            )}
            {retryableCapability && (
              <Button
                type="button"
                variant="ghost"
                className="mt-1 min-h-11 px-0 text-xs text-primary"
                disabled={disabled || processing || retryingUpload}
                onClick={() => setCapabilityRevision(previous => previous + 1)}
                leadingIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              >
                重新確認
              </Button>
            )}
          </div>
          {canDeleteCloud && (
            <Button type="button" variant="ghost" disabled={disabled || processing || retryingUpload} onClick={() => void removeCloud()} leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}>
              刪除
            </Button>
          )}
        </div>
      )}

      {hasPending && <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-muted/40 px-3 py-2" role="status">
        <p className="text-xs leading-5 text-muted-foreground">{!pending?.hasPayload || !pending.hasRecord ? '待上傳紀錄不完整，請重新選取照片。' : pending.status==='uploading' ? '照片正在上傳' : '這台裝置有待上傳照片，原檔仍保留。'}</p>
        {capability.canManage && <Button type="button" variant="ghost" className="min-h-11 text-xs" disabled={disabled||processing||retryingUpload||!pending?.hasPayload||!pending.hasRecord||pending.status==='uploading'} onClick={()=>void retryUpload()}>重試上傳</Button>}
      </div>}
      {rolloutDisabled && <Button type="button" variant="ghost" className="min-h-11 text-xs" disabled={disabled||processing} onClick={()=>setCapabilityRevision(previous=>previous+1)}>重新確認</Button>}

      {error && <p className="text-sm text-status-danger-text" role="alert">{error}</p>}
    </section>
  );
}

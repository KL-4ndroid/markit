'use client';

import { ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { fetchProductCoverPhoto } from '@/lib/products/product-cover-photo-client';
import { applyProductPhotoRead, type ProductPhotoSnapshot, type ProductPhotoReadState } from '@/lib/products/product-cover-photo-read';
import { cn } from '@/lib/utils';

interface ProductCoverPhotoImageProps {
  productId?: string;
  productName: string;
  variant?: 'display' | 'thumbnail';
  className?: string;
  fallback?: ReactNode;
  showStatusText?: boolean;
  onAvailabilityChange?: (available: boolean) => void;
  onReadStateChange?: (state: ProductPhotoReadState) => void;
}

export function ProductCoverPhotoImage({productId,productName,variant='thumbnail',className,fallback,
  showStatusText=false,onAvailabilityChange,onReadStateChange}: ProductCoverPhotoImageProps) {
  const [revision,setRevision]=useState(0);
  const [snapshot,setSnapshot]=useState<ProductPhotoSnapshot>({url:null,state:'loading'});
  const current=snapshot.productId===productId ? snapshot : {url:null,state:'loading' as const};

  useEffect(()=>{
    let active=true;
    if(!productId) {setSnapshot({productId,url:null,state:'empty'});onReadStateChange?.('empty');onAvailabilityChange?.(false);return;}
    setSnapshot(previous=>({productId,url:previous.productId===productId ? previous.url : null,state:'loading'}));
    onReadStateChange?.('loading');
    void fetchProductCoverPhoto(productId, variant).then(result=>{
      if(!active) {if(result.state==='existing') URL.revokeObjectURL(result.url);return;}
      setSnapshot(previous=>applyProductPhotoRead(previous,productId,result));
      onReadStateChange?.(result.state);
      if(result.state==='existing') onAvailabilityChange?.(true);
      if(result.state==='empty') onAvailabilityChange?.(false);
    });
    return ()=>{active=false;};
  },[productId,variant,revision,onReadStateChange,onAvailabilityChange]);

  // A retry keeps its last valid blob until replacement/confirmed absence/unmount.
  useEffect(()=>()=>{if(snapshot.url) URL.revokeObjectURL(snapshot.url);},[snapshot.url]);

  const retry=()=>setRevision(previous=>previous+1);
  const failed=current.state==='unavailable';
  const paused=current.state==='disabled';
  const message=paused ? '照片服務目前暫停' : '照片暫時無法讀取';
  const status=(failed||paused) ? <div className="flex flex-wrap items-center justify-center gap-2" role="status">
    {showStatusText && <span className="text-xs text-muted-foreground">{message}</span>}
    <button type="button" onClick={retry} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-control px-2 text-xs text-primary focus-visible:outline focus-visible:outline-2"
      aria-label={`${message}，重新讀取${productName}的照片`} title={`${message}，重新讀取`}>
      <RefreshCw className="h-4 w-4" aria-hidden="true" />{showStatusText && '重試'}
    </button>
  </div> : null;

  if(!current.url) {
    if(failed||paused) return status;
    if(current.state==='loading') return <span role="status" aria-label="正在讀取照片"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" /></span>;
    return <>{fallback ?? <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}</>;
  }
  return <div className="relative h-full w-full">
    {/* Blob URLs contain authenticated responses, outside next/image. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={current.url} alt={`${productName}的商品照片`} loading={variant==='thumbnail'?'lazy':'eager'} decoding="async"
      className={cn('h-full w-full object-cover',className)} onError={()=>{
        setSnapshot({productId,url:null,state:'unavailable'});onReadStateChange?.('unavailable');
      }} />
    {status && <div className="absolute inset-x-0 bottom-0 bg-background/95">{status}</div>}
  </div>;
}

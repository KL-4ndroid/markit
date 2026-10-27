/** Shared read contract. No browser, storage or device dependencies. */
export type ProductPhotoPresence = 'empty' | 'existing' | 'unavailable';
export type ProductPhotoReadState = 'loading' | 'existing' | 'empty' | 'disabled' | 'unavailable';
export type ProductPhotoImageResult = {state: 'existing'; url: string} | {state: 'empty' | 'disabled' | 'unavailable'};
export type ProductPhotoMetadataResult = {state: 'ready'; photos: Record<string, number>} | {state: 'disabled' | 'unavailable'};

export function classifyProductPhotoRead(status: number, code: unknown): 'empty' | 'disabled' | 'unavailable' {
  if (status === 404 && code === 'photo_empty') return 'empty';
  if (status === 404 && code === 'disabled') return 'disabled';
  // A legacy not_found response can also mean missing R2 data or denied access.
  return 'unavailable';
}

export function parseProductPhotoMetadata(status: number, body: unknown): ProductPhotoMetadataResult {
  if (status === 503 && (body as {code?: unknown} | null)?.code === 'disabled') return {state: 'disabled'};
  if (status !== 200 || !body || typeof body !== 'object') return {state: 'unavailable'};
  const value = body as {state?: unknown; photos?: unknown};
  if (value.state !== 'ready' || !value.photos || typeof value.photos !== 'object' || Array.isArray(value.photos)) return {state: 'unavailable'};
  const photos: Record<string, number> = {};
  for (const [id,version] of Object.entries(value.photos)) {
    if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) return {state: 'unavailable'};
    photos[id] = version;
  }
  return {state: 'ready',photos};
}

export function canHideDisabledProductPhoto(input: {
  disabled: boolean; productId?: string; hasSelection: boolean;
  presence?: ProductPhotoPresence; pendingChecked: boolean; hasPending: boolean;
}): boolean {
  if (!input.disabled || input.hasSelection) return false;
  if (!input.productId) return true;
  return input.presence === 'empty' && input.pendingChecked && !input.hasPending;
}

export function mergeProductPhotoMetadata(previous: Record<string,number>, batches: ProductPhotoMetadataResult[]) {
  const ready = batches.every(batch => batch.state === 'ready');
  // Partial or failed batches must never erase known metadata.
  const photos = ready ? {} : {...previous};
  for (const batch of batches) if (batch.state === 'ready') Object.assign(photos,batch.photos);
  return {photos,state: ready ? 'ready' as const : batches.some(batch=>batch.state==='unavailable') ? 'unavailable' as const : 'disabled' as const};
}

export type ProductPhotoSnapshot = {productId?: string; url: string|null; state: ProductPhotoReadState};
export function applyProductPhotoRead(previous: ProductPhotoSnapshot,productId: string,result: ProductPhotoImageResult): ProductPhotoSnapshot {
  return {productId,state:result.state,url:result.state==='existing' ? result.url
    : result.state==='empty' ? null : previous.productId===productId ? previous.url : null};
}

/** Decode the authenticated HTTP response before any platform creates an image URL. */
export async function decodeProductPhotoImage(response: Response): Promise<{state:'existing';blob:Blob}|{state:'empty'|'disabled'|'unavailable'}> {
  try {
    if(!response.ok) {
      const body=await response.json().catch(()=>null);
      return {state:classifyProductPhotoRead(response.status,body?.code)};
    }
    const blob=await response.blob();
    if(!['image/webp','image/jpeg'].includes(blob.type)||blob.size<1) return {state:'unavailable'};
    return {state:'existing',blob};
  } catch {return {state:'unavailable'};}
}

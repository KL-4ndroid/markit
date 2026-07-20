import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { buildAppApiUrl, isAppApiUrlError } from '@/lib/api/client';
import { parseAppApiErrorResponse } from '@/lib/api/contract';
import {
  fetchAppApi,
  isAppApiRequestError,
  type AppApiSleep,
} from '@/lib/api/transport';
import {
  deletePendingSalesPhotoEvidencePayload,
  getPendingSalesPhotoEvidencePayload,
  type LocalPendingSalesPhotoEvidencePayload,
} from '@/lib/sales/photo-evidence-pending-payload-storage';
import {
  markLocalPendingSalesPhotoEvidenceCreationCreated,
  markLocalPendingSalesPhotoEvidenceCreationRetryableFailure,
} from '@/lib/sales/photo-evidence-pending-creation-storage';
import { getEventMarketId } from '@/lib/events/event-read-model';
import type {
  SalesPhotoEvidencePendingCreationListItem,
} from '@/lib/sales/photo-evidence-pending-creation-read-model';
import type { SalesPhotoEvidenceUploadedVariantInfo } from '@/lib/sales/photo-evidence-upload-contract';
import type { Event } from '@/types/db';

export type SalesPhotoEvidenceManualUploadSuccess = {
  ok: true;
  evidenceId: string | null;
  shouldDeleteLocalPayloadAfterSuccess: boolean;
};

export type SalesPhotoEvidenceManualUploadFailure = {
  ok: false;
  code: string;
  message: string;
  shouldKeepLocalPayload: true;
};

export type SalesPhotoEvidenceManualUploadResult =
  | SalesPhotoEvidenceManualUploadSuccess
  | SalesPhotoEvidenceManualUploadFailure;

export type SalesPhotoEvidenceManualUploadDeps = {
  getAccessToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  sleepImpl?: AppApiSleep;
  timeoutMs?: number;
  getPayload?: typeof getPendingSalesPhotoEvidencePayload;
  deletePayload?: typeof deletePendingSalesPhotoEvidencePayload;
  markCreated?: typeof markLocalPendingSalesPhotoEvidenceCreationCreated;
  markRetryableFailure?: typeof markLocalPendingSalesPhotoEvidenceCreationRetryableFailure;
  waitForSaleEventSync?: (saleEventId: string) => Promise<boolean>;
  resolveCanonicalSaleEventId?: (
    item: SalesPhotoEvidencePendingCreationListItem
  ) => Promise<string | null>;
  now?: () => Date;
};

export type SalesPhotoEvidenceCanonicalSaleEventCandidate = {
  id?: unknown;
  type?: unknown;
  market_id?: unknown;
  actor_id?: unknown;
  timestamp?: unknown;
};

type UploadRouteResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  evidenceId?: string;
  shouldDeleteLocalPayloadAfterSuccess?: boolean;
  shouldKeepLocalPayload?: boolean;
};

function toVariantMetadata(
  kind: SalesPhotoEvidenceUploadedVariantInfo['kind'],
  variant: LocalPendingSalesPhotoEvidencePayload['image']
): SalesPhotoEvidenceUploadedVariantInfo {
  return {
    kind,
    mimeType: variant.mimeType,
    fileSizeBytes: variant.fileSizeBytes,
    width: variant.width,
    height: variant.height,
  };
}

export function buildSalesPhotoEvidenceManualUploadFormData(
  item: SalesPhotoEvidencePendingCreationListItem,
  payload: LocalPendingSalesPhotoEvidencePayload
): FormData {
  const formData = new FormData();
  formData.set('ownerId', item.ownerId);
  formData.set('marketId', item.marketId);
  formData.set('saleEventId', item.saleEventId);
  formData.set('saleCompletedAt', item.saleCompletedAt);
  formData.set('capturedAt', payload.updatedAt);
  formData.set('queueId', item.queueId);
  if (item.capturedByStaffId) {
    formData.set('capturedByStaffId', item.capturedByStaffId);
  }
  formData.set('image', payload.image.blob);
  formData.set('thumbnail', payload.thumbnail.blob);
  formData.set('imageMetadata', JSON.stringify(toVariantMetadata('image', payload.image)));
  formData.set('thumbnailMetadata', JSON.stringify(toVariantMetadata('thumbnail', payload.thumbnail)));
  return formData;
}

async function getDefaultAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

function failure(code: string, message: string): SalesPhotoEvidenceManualUploadFailure {
  return {
    ok: false,
    code,
    message,
    shouldKeepLocalPayload: true,
  };
}

function getUserFacingUploadFailureMessage(code: string): string {
  switch (code) {
    case 'sale_event_sync_pending':
    case 'source_invalid':
      return '成交資料仍在同步，照片已保留在此裝置。請確認網路後稍候再試。';
    case 'metadata_claim_failed':
      return '成交資料驗證失敗，照片仍保留在此裝置。請稍候再試；若持續發生，請聯絡管理者檢查雲端資料設定。';
    case 'r2_image_upload_failed':
    case 'r2_thumbnail_upload_failed':
      return '照片儲存服務上傳失敗，照片仍保留在此裝置，請稍後再試。';
    case 'metadata_finalize_failed':
      return '照片已傳送但成交紀錄更新失敗，本機照片已保留，請稍後再試。';
    case 'sales_photo_evidence_upload_disabled':
    case 'sales_photo_evidence_r2_upload_disabled':
      return '正式環境的照片上傳功能尚未完整啟用，請檢查 Vercel 的照片上傳環境變數。';
    case 'authentication_required':
      return '登入狀態已失效，請重新登入後再上傳照片。';
    case 'upload_route_unexpected_error':
    case 'image_route_unexpected_error':
      return '照片上傳服務暫時發生錯誤，照片已保留在此裝置，請稍後再試。';
    case 'request_timeout':
      return '照片上傳逾時，照片已保留在此裝置。請確認網路後再試。';
    case 'permission_denied':
      return '目前帳號沒有上傳這筆成交照片的權限，照片仍保留在此裝置。';
    case 'invalid_upload_form_data':
    case 'invalid_request':
      return '照片資料格式無法上傳，照片仍保留在此裝置，請重新選擇照片後再試。';
    default:
      return '照片上傳失敗，照片仍保留在此裝置，請稍後再試。';
  }
}

async function waitForDefaultSaleEventSync(saleEventId: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trigger-sync', {
      detail: { eventType: 'deal_closed', eventId: saleEventId },
    }));
  }

  const deadline = Date.now() + 12_000;
  do {
    const event = await db.events.get(saleEventId);
    if (event?.sync_status === 'synced') return true;
    await new Promise(resolve => setTimeout(resolve, 400));
  } while (Date.now() < deadline);

  return false;
}

function toIsoTimestamp(value: unknown): string | null {
  const date = typeof value === 'string' || typeof value === 'number'
    ? new Date(value)
    : null;
  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function selectCanonicalSalesPhotoEvidenceSaleEventId(
  item: SalesPhotoEvidencePendingCreationListItem,
  localEvent: Event | null | undefined,
  candidates: readonly SalesPhotoEvidenceCanonicalSaleEventCandidate[]
): string | null {
  if (
    !localEvent
    || localEvent.id !== item.saleEventId
    || localEvent.type !== 'deal_closed'
    || getEventMarketId(localEvent) !== item.marketId
  ) {
    return null;
  }

  const timestamp = toIsoTimestamp(localEvent.timestamp);
  const expectedActorId = item.capturedByStaffId ?? localEvent.actor_id;
  if (!timestamp || !expectedActorId || expectedActorId === 'local') return null;

  const matchingIds = candidates.flatMap(candidate => {
    const candidateTimestamp = toIsoTimestamp(candidate.timestamp);
    return (
      typeof candidate.id === 'string'
      && candidate.type === 'deal_closed'
      && candidate.market_id === item.marketId
      && candidate.actor_id === expectedActorId
      && candidateTimestamp === timestamp
    ) ? [candidate.id] : [];
  });

  return matchingIds.length === 1 ? matchingIds[0] : null;
}

async function resolveDefaultCanonicalSaleEventId(
  item: SalesPhotoEvidencePendingCreationListItem
): Promise<string | null> {
  const localEvent = await db.events.get(item.saleEventId);
  if (!localEvent) return null;

  const timestamp = toIsoTimestamp(localEvent.timestamp);
  const expectedActorId = item.capturedByStaffId ?? localEvent.actor_id;
  if (!timestamp || !expectedActorId || expectedActorId === 'local') return null;

  const table = item.capturedByStaffId ? 'staff_accessible_events' : 'events';
  const { data, error } = await supabase
    .from(table)
    .select('id,type,market_id,actor_id,timestamp')
    .eq('market_id', item.marketId)
    .eq('type', 'deal_closed')
    .eq('actor_id', expectedActorId)
    .eq('timestamp', timestamp)
    .limit(2);

  if (error || !Array.isArray(data)) return null;
  return selectCanonicalSalesPhotoEvidenceSaleEventId(item, localEvent, data);
}

async function parseUploadResponse(response: Response): Promise<UploadRouteResponse> {
  try {
    return await response.json() as UploadRouteResponse;
  } catch {
    return {};
  }
}

export async function uploadPendingSalesPhotoEvidenceManually(
  item: SalesPhotoEvidencePendingCreationListItem,
  deps: SalesPhotoEvidenceManualUploadDeps = {}
): Promise<SalesPhotoEvidenceManualUploadResult> {
  const getPayload = deps.getPayload ?? getPendingSalesPhotoEvidencePayload;
  const deletePayload = deps.deletePayload ?? deletePendingSalesPhotoEvidencePayload;
  const markCreated = deps.markCreated ?? markLocalPendingSalesPhotoEvidenceCreationCreated;
  const markRetryableFailure =
    deps.markRetryableFailure ?? markLocalPendingSalesPhotoEvidenceCreationRetryableFailure;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());

  const payload = await getPayload(item.queueId);
  if (!payload) {
    return failure('local_payload_missing', '請先選擇照片，或重新選擇照片後再上傳。');
  }

  // The local sync marker is only an optimization. Revocation cleanup followed
  // by re-invitation can leave IndexedDB with a stale local_only marker even
  // after the sale event already exists in Cloud. After the bounded wait, let
  // the authenticated BFF be the final authority; it rejects missing or
  // mismatched sale events before claiming metadata or writing any R2 object.
  const saleEventSynced = await (deps.waitForSaleEventSync ?? waitForDefaultSaleEventSync)(item.saleEventId);
  let uploadItem = item;
  if (!saleEventSynced) {
    try {
      const canonicalSaleEventId = await (
        deps.resolveCanonicalSaleEventId ?? resolveDefaultCanonicalSaleEventId
      )(item);
      if (canonicalSaleEventId && canonicalSaleEventId !== item.saleEventId) {
        uploadItem = { ...item, saleEventId: canonicalSaleEventId };
      }
    } catch {
      // The BFF remains authoritative and will reject the original source ID.
    }
  }

  const token = await (deps.getAccessToken ?? getDefaultAccessToken)();
  if (!token) {
    return failure('authentication_required', '登入狀態已失效，請重新登入後再上傳照片。');
  }

  let response: Response;
  try {
    response = await fetchAppApi(
      buildAppApiUrl('/api/sales-photo-evidence/upload'),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: buildSalesPhotoEvidenceManualUploadFormData(uploadItem, payload),
      },
      {
        fetchImpl,
        sleepImpl: deps.sleepImpl,
        timeoutMs: deps.timeoutMs ?? 25_000,
      }
    );
  } catch (error) {
    const result = isAppApiUrlError(error)
      ? failure(error.code, error.message)
      : isAppApiRequestError(error) && error.code === 'request_timeout'
        ? failure('request_timeout', getUserFacingUploadFailureMessage('request_timeout'))
        : failure(
            'network_error',
            '網路連線失敗，照片已保留在此裝置。請確認網路後再試。'
          );
    await markRetryableFailure({
      queueId: item.queueId,
      code: result.code,
      message: result.message,
      now: now(),
    });
    return result;
  }
  const errorResponse = response.clone();
  const body = await parseUploadResponse(response);

  if (!response.ok || body.ok !== true) {
    const apiError = await parseAppApiErrorResponse(errorResponse);
    const code = apiError.code;
    const result = failure(
      code,
      getUserFacingUploadFailureMessage(code)
    );
    if (apiError.retryable) {
      await markRetryableFailure({
        queueId: item.queueId,
        code: result.code,
        message: result.message,
        now: now(),
      });
    }
    return result;
  }

  const shouldDeletePayload = body.shouldDeleteLocalPayloadAfterSuccess === true;
  if (shouldDeletePayload) {
    await deletePayload(item.queueId);
  }
  await markCreated(item.queueId, now());

  return {
    ok: true,
    evidenceId: body.evidenceId ?? null,
    shouldDeleteLocalPayloadAfterSuccess: shouldDeletePayload,
  };
}

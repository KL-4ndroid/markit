import { supabase } from '@/lib/supabase/client';
import {
  deletePendingSalesPhotoEvidencePayload,
  getPendingSalesPhotoEvidencePayload,
  type LocalPendingSalesPhotoEvidencePayload,
} from '@/lib/sales/photo-evidence-pending-payload-storage';
import {
  markLocalPendingSalesPhotoEvidenceCreationCreated,
  markLocalPendingSalesPhotoEvidenceCreationRetryableFailure,
} from '@/lib/sales/photo-evidence-pending-creation-storage';
import type {
  SalesPhotoEvidencePendingCreationListItem,
} from '@/lib/sales/photo-evidence-pending-creation-read-model';
import type { SalesPhotoEvidenceUploadedVariantInfo } from '@/lib/sales/photo-evidence-upload-contract';

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
  getPayload?: typeof getPendingSalesPhotoEvidencePayload;
  deletePayload?: typeof deletePendingSalesPhotoEvidencePayload;
  markCreated?: typeof markLocalPendingSalesPhotoEvidenceCreationCreated;
  markRetryableFailure?: typeof markLocalPendingSalesPhotoEvidenceCreationRetryableFailure;
  now?: () => Date;
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

  const token = await (deps.getAccessToken ?? getDefaultAccessToken)();
  if (!token) {
    return failure('authentication_required', '登入狀態已失效，請重新登入後再上傳照片。');
  }

  const response = await fetchImpl('/api/sales-photo-evidence/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: buildSalesPhotoEvidenceManualUploadFormData(item, payload),
  });
  const body = await parseUploadResponse(response);

  if (!response.ok || body.ok !== true) {
    const result = failure(
      body.code ?? `http_${response.status}`,
      body.message ?? '照片上傳失敗，請稍後再試。'
    );
    await markRetryableFailure({
      queueId: item.queueId,
      code: result.code,
      message: result.message,
      now: now(),
    });
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

import { supabase } from '@/lib/supabase/client';
import { buildAppApiUrl, isAppApiUrlError } from '@/lib/api/client';
import { parseAppApiErrorResponse } from '@/lib/api/contract';
import {
  fetchAppApi,
  isAppApiRequestError,
  type AppApiSleep,
} from '@/lib/api/transport';

export type SalesPhotoEvidenceOwnerImageVariant = 'image' | 'thumbnail';

export type SalesPhotoEvidenceOwnerImageFetchResult =
  | {
      ok: true;
      objectUrl: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export type SalesPhotoEvidenceOwnerImageFetchDeps = {
  getAccessToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  sleepImpl?: AppApiSleep;
  timeoutMs?: number;
  createObjectUrl?: (blob: Blob) => string;
};

async function getDefaultAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

function getOwnerImageFailureMessage(code?: string): string {
  switch (code) {
    case 'authentication_required':
      return '登入狀態已失效，請重新登入後再查看照片。';
    case 'unauthorized_actor':
    case 'cors_origin_denied':
      return '目前帳號沒有查看這張照片的權限。';
    case 'not_found':
    case 'object_key_missing':
      return '找不到這張照片，可能已過期或移除。';
    case 'evidence_expired':
      return '這張照片已超過七天保留期限，無法再查看。';
    case 'request_timeout':
      return '照片讀取逾時，請確認網路後再試。';
    default:
      return '照片讀取失敗，請稍後再試。';
  }
}

export async function fetchSalesPhotoEvidenceOwnerImageObjectUrl(
  input: { evidenceId: string; variant?: SalesPhotoEvidenceOwnerImageVariant },
  deps: SalesPhotoEvidenceOwnerImageFetchDeps = {}
): Promise<SalesPhotoEvidenceOwnerImageFetchResult> {
  const token = await (deps.getAccessToken ?? getDefaultAccessToken)();
  if (!token) {
    return {
      ok: false,
      code: 'authentication_required',
      message: '登入狀態已失效，請重新登入後再查看照片。',
    };
  }

  const variant = input.variant ?? 'thumbnail';
  let response: Response;
  try {
    response = await fetchAppApi(
      buildAppApiUrl(
        `/api/sales-photo-evidence/image?evidenceId=${encodeURIComponent(input.evidenceId)}&variant=${variant}`
      ),
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      {
        fetchImpl: deps.fetchImpl,
        sleepImpl: deps.sleepImpl,
        timeoutMs: deps.timeoutMs ?? 12_000,
      }
    );
  } catch (error) {
    return isAppApiUrlError(error)
      ? {
          ok: false,
          code: error.code,
          message: error.message,
        }
      : isAppApiRequestError(error) && error.code === 'request_timeout'
        ? {
            ok: false,
            code: 'request_timeout',
            message: getOwnerImageFailureMessage('request_timeout'),
          }
        : {
            ok: false,
            code: 'network_error',
            message: '無法連線讀取銷售照片，請稍後再試。',
          };
  }

  if (!response.ok) {
    const parsed = await parseAppApiErrorResponse(response);
    return {
      ok: false,
      code: parsed.code,
      message: getOwnerImageFailureMessage(parsed.code),
    };
  }

  const objectUrl = (deps.createObjectUrl ?? URL.createObjectURL)(await response.blob());
  return {
    ok: true,
    objectUrl,
  };
}

import { buildAppApiUrl, isAppApiUrlError } from '@/lib/api/client';
import { parseAppApiErrorResponse } from '@/lib/api/contract';
import { fetchAppApi, isAppApiRequestError } from '@/lib/api/transport';
import { supabase } from '@/lib/supabase/client';

export type SalesPhotoEvidenceOwnerDeleteResult =
  | {
      ok: true;
      evidenceId: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      retryable: boolean;
    };

export type SalesPhotoEvidenceOwnerDeleteDeps = {
  getAccessToken?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

async function getDefaultAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

function failureMessage(code: string): string {
  if (code === 'authentication_required') return '登入狀態已失效，請重新登入後再刪除。';
  if (code === 'unauthorized_actor') return '只有市集擁有者可以刪除成交照片。';
  if (code === 'not_found') return '找不到這張照片，可能已經被移除。';
  if (code === 'evidence_not_deletable') return '這筆成交照片目前無法刪除。';
  if (code === 'request_timeout') return '刪除照片逾時，請確認網路後再試。';
  if (code === 'r2_delete_failed') return '照片儲存空間刪除失敗，資料尚未標記為刪除。';
  if (code === 'metadata_finalize_failed') return '照片檔案已處理，但紀錄更新尚未完成，請重新整理後再試。';
  return '刪除成交照片失敗，請稍後再試。';
}

export async function deleteSalesPhotoEvidenceAsOwner(
  evidenceId: string,
  deps: SalesPhotoEvidenceOwnerDeleteDeps = {}
): Promise<SalesPhotoEvidenceOwnerDeleteResult> {
  const token = await (deps.getAccessToken ?? getDefaultAccessToken)();
  if (!token) {
    return {
      ok: false,
      code: 'authentication_required',
      message: failureMessage('authentication_required'),
      retryable: false,
    };
  }

  let response: Response;
  try {
    response = await fetchAppApi(
      buildAppApiUrl(`/api/sales-photo-evidence/delete?evidenceId=${encodeURIComponent(evidenceId)}`),
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      {
        fetchImpl: deps.fetchImpl,
        timeoutMs: deps.timeoutMs ?? 15_000,
      }
    );
  } catch (error) {
    if (isAppApiUrlError(error)) {
      return { ok: false, code: error.code, message: error.message, retryable: false };
    }
    const code = isAppApiRequestError(error) ? error.code : 'network_error';
    return {
      ok: false,
      code,
      message: failureMessage(code),
      retryable: code === 'request_timeout' || code === 'network_error',
    };
  }

  if (!response.ok) {
    const parsed = await parseAppApiErrorResponse(response);
    return {
      ok: false,
      code: parsed.code,
      message: failureMessage(parsed.code),
      retryable: parsed.retryable,
    };
  }

  return { ok: true, evidenceId };
}


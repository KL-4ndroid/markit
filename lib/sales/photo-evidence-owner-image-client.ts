import { supabase } from '@/lib/supabase/client';

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
  createObjectUrl?: (blob: Blob) => string;
};

async function getDefaultAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

async function parseError(response: Response): Promise<{ code: string; message: string }> {
  try {
    const body = await response.json() as { code?: string; message?: string };
    return {
      code: body.code ?? `http_${response.status}`,
      message: body.message ?? '照片讀取失敗，請稍後再試。',
    };
  } catch {
    return {
      code: `http_${response.status}`,
      message: '照片讀取失敗，請稍後再試。',
    };
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
  const response = await (deps.fetchImpl ?? fetch)(
    `/api/sales-photo-evidence/image?evidenceId=${encodeURIComponent(input.evidenceId)}&variant=${variant}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const parsed = await parseError(response);
    return {
      ok: false,
      ...parsed,
    };
  }

  const objectUrl = (deps.createObjectUrl ?? URL.createObjectURL)(await response.blob());
  return {
    ok: true,
    objectUrl,
  };
}

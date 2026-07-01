'use client';

import { useEffect, useState } from 'react';
import { Store, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  OWNER_BRAND_NAME_FALLBACK,
  OWNER_BRAND_NAME_MAX_LENGTH,
  loadOwnerBrandName,
  normalizeOwnerBrandName,
  readCachedOwnerBrandName,
  saveOwnerBrandName,
} from '@/lib/owner-brand';

export function OwnerBrandSettingsCard() {
  const { user } = useAuth();
  const [brandName, setBrandName] = useState(OWNER_BRAND_NAME_FALLBACK);
  const [initialBrandName, setInitialBrandName] = useState(OWNER_BRAND_NAME_FALLBACK);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;

    const cached = readCachedOwnerBrandName(user.id);
    if (cached) {
      setBrandName(cached);
      setInitialBrandName(cached);
    }

    setIsLoading(true);
    loadOwnerBrandName(user.id)
      .then((loadedBrandName) => {
        if (cancelled) return;
        setBrandName(loadedBrandName);
        setInitialBrandName(loadedBrandName);
      })
      .catch((error) => {
        console.error('載入品牌名稱失敗:', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const normalizedBrandName = normalizeOwnerBrandName(brandName);
  const isDirty = normalizedBrandName !== normalizeOwnerBrandName(initialBrandName);
  const canSave = Boolean(user?.id && normalizedBrandName && isDirty && !isSaving);

  const handleSave = async () => {
    if (!user?.id || !normalizedBrandName) {
      toast.error('品牌名稱不可空白');
      return;
    }

    try {
      setIsSaving(true);
      const savedBrandName = await saveOwnerBrandName(user.id, normalizedBrandName);
      setBrandName(savedBrandName);
      setInitialBrandName(savedBrandName);
      toast.success('品牌名稱已更新');
    } catch (error: any) {
      console.error('儲存品牌名稱失敗:', error);
      toast.error(error?.message || '儲存品牌名稱失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Store className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-medium text-foreground">品牌名稱</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            這個名稱會顯示在首頁與 owner 結算報告中。
          </p>
        </div>
      </div>

      <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="owner-brand-name">
        品牌主顯示名稱
      </label>
      <input
        id="owner-brand-name"
        value={brandName}
        onChange={(event) => setBrandName(event.target.value.slice(0, OWNER_BRAND_NAME_MAX_LENGTH))}
        maxLength={OWNER_BRAND_NAME_MAX_LENGTH}
        className="h-12 w-full rounded-2xl border border-primary/15 bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
        placeholder={OWNER_BRAND_NAME_FALLBACK}
      />
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{isLoading ? '正在載入雲端設定...' : '未設定時會顯示「我的品牌」'}</span>
        <span>{brandName.length}/{OWNER_BRAND_NAME_MAX_LENGTH}</span>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {isSaving ? '儲存中...' : '儲存品牌名稱'}
      </button>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Camera, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  loadDefaultSalesPhotoEvidenceRequired,
  saveDefaultSalesPhotoEvidenceRequired,
} from '@/lib/sales/photo-evidence-settings';

export function SalesPhotoEvidenceSettingsCard() {
  const { user } = useAuth();
  const [required, setRequired] = useState(false);
  const [initialRequired, setInitialRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;

    setIsLoading(true);
    loadDefaultSalesPhotoEvidenceRequired(user.id)
      .then((loadedRequired) => {
        if (cancelled) return;
        setRequired(loadedRequired);
        setInitialRequired(loadedRequired);
      })
      .catch((error) => {
        console.error('載入成交照片紀錄設定失敗:', error);
        toast.error('載入成交照片紀錄設定失敗');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isDirty = required !== initialRequired;
  const canSave = Boolean(user?.id && isDirty && !isSaving);

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      setIsSaving(true);
      const savedRequired = await saveDefaultSalesPhotoEvidenceRequired(user.id, required);
      setRequired(savedRequired);
      setInitialRequired(savedRequired);
      toast.success('成交照片紀錄設定已更新');
    } catch (error: any) {
      console.error('儲存成交照片紀錄設定失敗:', error);
      toast.error(error?.message || '儲存成交照片紀錄設定失敗');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Camera className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-medium text-foreground">成交照片紀錄</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            設定新建立的市集是否預設需要員工在成交後補上照片。
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRequired((current) => !current)}
        disabled={isLoading || isSaving}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-background px-4 py-4 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>
          <span className="block text-sm font-medium text-foreground">新市集預設需要成交照片</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            只影響之後新增的市集，不會修改既有市集。
          </span>
        </span>
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            required ? 'bg-primary' : 'bg-gray-300'
          }`}
          aria-hidden="true"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              required ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </span>
      </button>

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {isSaving ? '儲存中...' : '儲存成交照片設定'}
      </button>
    </section>
  );
}

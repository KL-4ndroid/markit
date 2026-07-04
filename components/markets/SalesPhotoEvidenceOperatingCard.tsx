'use client';

import { Camera, ChevronRight, ImagePlus } from 'lucide-react';

interface SalesPhotoEvidenceOperatingCardProps {
  required: boolean;
  mode: 'owner' | 'staff';
  pendingCount?: number;
  isUpdating?: boolean;
  onToggle?: () => void;
  onOpenPendingEvidence?: () => void;
  className?: string;
}

export function SalesPhotoEvidenceOperatingCard({
  required,
  mode,
  pendingCount = 0,
  isUpdating = false,
  onToggle,
  onOpenPendingEvidence,
  className = '',
}: SalesPhotoEvidenceOperatingCardProps) {
  const isOwner = mode === 'owner';
  const canToggle = isOwner && typeof onToggle === 'function';
  const pendingButtonDisabled = typeof onOpenPendingEvidence !== 'function';

  return (
    <section className={`bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6 mb-6 ${className}`}>
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Camera className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-medium text-foreground">成交照片證明</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {isOwner
              ? '營業中可快速調整本場是否要求成交照片證明。變更只影響之後的成交。'
              : '本場是否需要成交照片證明由老闆設定，員工只能查看狀態。'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {isOwner ? (
          <button
            type="button"
            onClick={onToggle}
            disabled={!canToggle || isUpdating}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-background px-4 py-4 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block text-sm font-medium text-foreground">
                此市集要求成交照片證明
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {required ? '目前已啟用' : '目前未啟用'}
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
        ) : (
          <div className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-background px-4 py-4">
            <span>
              <span className="block text-sm font-medium text-foreground">
                此市集要求成交照片證明
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {required ? '成交後需要補上照片證明' : '目前沒有要求照片證明'}
              </span>
            </span>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                required ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-muted-foreground'
              }`}
            >
              {required ? '已啟用' : '未啟用'}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenPendingEvidence}
          disabled={pendingButtonDisabled}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="flex min-w-0 items-center gap-3">
            <ImagePlus className="h-5 w-5 shrink-0 text-primary" />
            <span>
              <span className="block text-sm font-medium text-foreground">
                待補照片 {pendingCount}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                待處理列表會在成交照片流程啟用後開放
              </span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>
      </div>
    </section>
  );
}

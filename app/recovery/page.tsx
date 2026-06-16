'use client';

import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { DatabaseRecoveryPanel } from '@/components/common/DatabaseRecoveryPanel';
import { LocalProjectionRepairPanel } from '@/components/common/LocalProjectionRepairPanel';
import { OwnerRevenueGapRepairPanel } from '@/components/common/OwnerRevenueGapRepairPanel';

export default function RecoveryPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/settings"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <ArrowLeft size={16} />
              返回設定
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft-green text-[#4D7F87]">
                <Database size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-foreground">資料修復</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  這裡只處理本機資料健康、收入同步落差與統計投影異常。執行修復前會先提供預覽或備份，避免誤改資料。
                </p>
              </div>
            </div>
          </div>
        </header>

        <DatabaseRecoveryPanel />

        <OwnerRevenueGapRepairPanel />

        <LocalProjectionRepairPanel />

        <section className="border border-[#E8E3D8] bg-white px-4 py-4 text-sm text-muted-foreground shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-foreground">使用建議</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>先按「檢查」確認本機資料庫狀態，若有 numeric cache 錯誤，再使用資料庫修復。</li>
            <li>若新裝置或無痕登入後收入為 0 或與雲端不一致，先使用「收入差距修復」。</li>
            <li>若本機收入出現倍增，但本機已經有 deal_closed events，使用「本機統計投影修復」。</li>
            <li>修復完成後重新整理頁面，再檢查市集詳情與分析頁的數字是否一致。</li>
          </ol>
        </section>
      </div>
    </div>
  );
}

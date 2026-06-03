'use client';

import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import { DatabaseRecoveryPanel } from '@/components/common/DatabaseRecoveryPanel';
import { LocalProjectionRepairPanel } from '@/components/common/LocalProjectionRepairPanel';
import { OwnerRevenueGapRepairPanel } from '@/components/common/OwnerRevenueGapRepairPanel';

export default function RecoveryPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/settings"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#6B6B6B]"
            >
              <ArrowLeft size={16} />
              返回設定
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F3E8] text-[#4D7F87]">
                <Database size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-[#3A3A3A]">資料修復</h1>
                <p className="mt-1 text-sm text-[#6B6B6B]">
                  檢查本機資料完整性，並在必要時建立救援備份。
                </p>
              </div>
            </div>
          </div>
        </header>

        <DatabaseRecoveryPanel />

        <OwnerRevenueGapRepairPanel />

        <LocalProjectionRepairPanel />

        <section className="border border-[#E8E3D8] bg-white px-4 py-4 text-sm text-[#6B6B6B] shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-[#3A3A3A]">建議流程</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>先執行完整性檢查，確認目前 IndexedDB 狀態。</li>
            <li>若狀態異常，先建立救援備份，再嘗試重新初始化。</li>
            <li>如果重試後仍異常，保留救援備份並避免新增交易或清除資料。</li>
          </ol>
        </section>
      </div>
    </div>
  );
}

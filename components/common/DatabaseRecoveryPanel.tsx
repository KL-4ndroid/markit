'use client';

import { useState } from 'react';
import { AlertTriangle, Download, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import {
  createRecoveryBackup,
  getDatabaseRecoveryStatus,
  repairInvalidDailyStats,
  retryDatabaseRecovery,
  type DatabaseRecoveryStatus,
} from '@/lib/db/recovery';

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DatabaseRecoveryPanel() {
  const [status, setStatus] = useState<DatabaseRecoveryStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const nextStatus = await getDatabaseRecoveryStatus();
      setStatus(nextStatus);
      toast[nextStatus.state === 'healthy' ? 'success' : 'error'](
        nextStatus.state === 'healthy' ? '資料庫狀態正常' : '資料庫需要修復'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '資料庫檢查失敗');
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      const nextStatus = await retryDatabaseRecovery();
      setStatus(nextStatus);
      toast[nextStatus.state === 'healthy' ? 'success' : 'error'](
        nextStatus.state === 'healthy' ? '資料庫已恢復' : '資料庫仍需要修復'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '資料庫重試失敗');
    } finally {
      setIsChecking(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backup = await createRecoveryBackup();
      downloadJson(backup.filename, backup.content);
      toast.success('救援備份已建立');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '救援備份失敗');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRepairDailyStats = async () => {
    setIsRepairing(true);
    try {
      const result = await repairInvalidDailyStats();
      downloadJson(result.backup.filename, result.backup.content);
      const nextStatus = await getDatabaseRecoveryStatus();
      setStatus(nextStatus);

      if (result.integrity.ok) {
        toast.success(`已修復 ${result.repairedDailyStats} 筆每日統計，並建立修復前備份`);
      } else {
        toast.warning(`已修復 ${result.repairedDailyStats} 筆每日統計，但仍有其他問題需要檢查`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '每日統計修復失敗');
    } finally {
      setIsRepairing(false);
    }
  };

  const isHealthy = status?.state === 'healthy';
  const errors = status?.state === 'unhealthy' ? status.integrity?.errors || [] : [];
  const warnings = status?.integrity?.warnings || [];

  return (
    <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {isHealthy ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#3A3A3A]">
              {isHealthy ? '資料庫狀態正常' : '資料庫修復模式'}
            </h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              {isHealthy ? '本機資料完整性檢查通過。' : '請先建立救援備份，再重試初始化。'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={isChecking}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-[#3A3A3A] disabled:opacity-50"
          >
            <ShieldCheck size={16} />
            檢查
          </button>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isChecking}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-[#3A3A3A] disabled:opacity-50"
          >
            <RefreshCw size={16} />
            重試
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#7B9FA6] px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <Download size={16} />
            備份
          </button>
          <button
            type="button"
            onClick={handleRepairDailyStats}
            disabled={isRepairing}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#D4A574] px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <Wrench size={16} />
            修復
          </button>
        </div>
      </div>

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="mt-4 space-y-2 border-t border-[#F0ECE4] pt-3 text-sm">
          {errors.slice(0, 4).map((error) => (
            <p key={error} className="text-red-700">{error}</p>
          ))}
          {warnings.slice(0, 4).map((warning) => (
            <p key={warning} className="text-amber-700">{warning}</p>
          ))}
        </div>
      )}
    </section>
  );
}

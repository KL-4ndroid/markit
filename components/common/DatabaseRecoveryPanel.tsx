'use client';

import { useState } from 'react';
import { AlertTriangle, Download, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { getAppPlatform } from '@/lib/platform';
import {
  createRecoveryBackup,
  getDatabaseRecoveryStatus,
  repairInvalidDailyStats,
  repairProductReferenceErrors,
  retryDatabaseRecovery,
  type DatabaseRecoveryStatus,
} from '@/lib/db/recovery';
import { useUserRole } from '@/hooks/useUserRole';
import { resolveInfoLevel } from '@/lib/permissions/PermissionGate';

async function saveJson(filename: string, content: string): Promise<void> {
  await getAppPlatform().files.saveFile({
    filename,
    data: new Blob([content], { type: 'application/json' }),
  });
}

export function DatabaseRecoveryPanel() {
  const [status, setStatus] = useState<DatabaseRecoveryStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isRepairingProducts, setIsRepairingProducts] = useState(false);
  const { userRole } = useUserRole();
  const infoLevel = resolveInfoLevel(userRole);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const nextStatus = await getDatabaseRecoveryStatus();
      setStatus(nextStatus);
      toast[nextStatus.state === 'healthy' ? 'success' : 'error'](
        nextStatus.state === 'healthy' ? '本機資料庫狀態正常' : '本機資料庫需要處理'
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
        nextStatus.state === 'healthy' ? '重新檢查完成，資料庫正常' : '重新檢查後仍有問題'
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重新檢查失敗');
    } finally {
      setIsChecking(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backup = await createRecoveryBackup();
      await saveJson(backup.filename, backup.content);
      toast.success('已建立並下載本機備份');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '建立備份失敗');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRepairDailyStats = async () => {
    setIsRepairing(true);
    try {
      const result = await repairInvalidDailyStats();
      await saveJson(result.backup.filename, result.backup.content);
      const nextStatus = await getDatabaseRecoveryStatus();
      setStatus(nextStatus);

      if (result.integrity.ok) {
        toast.success(`已修復 ${result.repairedDailyStats} 筆每日統計，並已下載修復前備份`);
      } else {
        toast.warning(`已修復 ${result.repairedDailyStats} 筆每日統計，但仍有其他項目需要檢查`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '每日統計修復失敗');
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRepairProducts = async () => {
    setIsRepairingProducts(true);
    try {
      // 傳入 infoLevel 讓從雲端補回的商品依權限脫敏
      const result = await repairProductReferenceErrors(infoLevel);
      await saveJson(result.backup.filename, result.backup.content);
      const nextStatus = await getDatabaseRecoveryStatus();
      setStatus(nextStatus);

      if (result.repairedProducts === 0) {
        toast.info('沒有需要修復的商品缺口');
      } else if (result.integrity.ok) {
        toast.success(
          `已修復 ${result.repairedProducts} 個商品（雲端 ${result.fromCloud.length} 個、佔位 ${result.asPlaceholder.length} 個），並已下載修復前備份`
        );
      } else {
        toast.warning(
          `已修復 ${result.repairedProducts} 個商品，但仍有其他項目需要檢查`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '商品修復失敗');
    } finally {
      setIsRepairingProducts(false);
    }
  };

  const isHealthy = status?.state === 'healthy';
  const errors = status?.state === 'unhealthy' ? status.integrity?.errors || [] : [];
  const warnings = status?.integrity?.warnings || [];
  const hasDailyStatsNumericErrors = errors.some((error) =>
    /^dailyStats\[\d+\] (touchCount|inquiryCount|dealCount|revenue|cost|profit|productsSold|updatedAt)/.test(error)
  );
  const hasProductReferenceErrors = errors.some((error) =>
    /references missing product|cannot replay because product is unavailable/.test(error)
  );

  return (
    <section className="w-full border border-neutral-stripe bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isHealthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {isHealthy ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              {isHealthy ? '資料庫狀態正常' : '資料庫健康檢查'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isHealthy
                ? '本機資料完整性檢查已通過。'
                : '檢查本機 IndexedDB 是否有格式錯誤或統計快取異常。修復前會自動下載備份。'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCheck}
            disabled={isChecking}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-stripe-dark px-3 text-sm font-medium text-foreground disabled:opacity-50"
          >
            <ShieldCheck size={16} />
            檢查
          </button>
          <button
            type="button"
            onClick={handleRetry}
            disabled={isChecking}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-stripe-dark px-3 text-sm font-medium text-foreground disabled:opacity-50"
          >
            <RefreshCw size={16} />
            重試
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <Download size={16} />
            備份
          </button>
          <button
            type="button"
            onClick={handleRepairDailyStats}
            disabled={isRepairing || !hasDailyStatsNumericErrors}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <Wrench size={16} />
            修復統計
          </button>
          <button
            type="button"
            onClick={handleRepairProducts}
            disabled={isRepairingProducts || !hasProductReferenceErrors}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <Wrench size={16} />
            修復商品
          </button>
        </div>
      </div>

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="mt-4 space-y-2 border-t border-warm-mist pt-3 text-sm">
          {hasDailyStatsNumericErrors && (
            <p className="text-foreground">
              發現每日統計快取欄位異常。可先按「備份」，再按「修復統計」將無效數值正規化。
            </p>
          )}
          {hasProductReferenceErrors && (
            <p className="text-foreground">
              發現成交記錄引用了已刪除或不存在的商品。可先按「備份」，再按「修復商品」從雲端補回或建立佔位商品。
            </p>
          )}
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

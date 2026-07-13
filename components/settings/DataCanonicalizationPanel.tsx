'use client';

import { useState } from 'react';
import { CheckCircle2, Database, FileSearch, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type {
  CanonicalizationPlan,
  CanonicalizationProgress,
  CanonicalizationResult,
} from '@/lib/db/data-canonicalization';

function ProgressBar({ progress }: { progress: CanonicalizationProgress | null }) {
  if (!progress) return null;

  const percentage = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress.message}</span>
        <span>{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-cat-clothing">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}

function SummaryGrid({ plan }: { plan: CanonicalizationPlan | CanonicalizationResult }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="rounded-xl bg-white p-3">
        <p className="text-xs text-muted-foreground">掃描事件</p>
        <p className="mt-1 text-lg font-semibold text-foreground">{plan.scanned.events}</p>
      </div>
      <div className="rounded-xl bg-white p-3">
        <p className="text-xs text-muted-foreground">需整理事件</p>
        <p className="mt-1 text-lg font-semibold text-primary">{plan.changes.events}</p>
      </div>
      <div className="rounded-xl bg-white p-3">
        <p className="text-xs text-muted-foreground">掃描統計</p>
        <p className="mt-1 text-lg font-semibold text-foreground">{plan.scanned.dailyStats}</p>
      </div>
      <div className="rounded-xl bg-white p-3">
        <p className="text-xs text-muted-foreground">需整理統計</p>
        <p className="mt-1 text-lg font-semibold text-primary">{plan.changes.dailyStats}</p>
      </div>
    </div>
  );
}

export function DataCanonicalizationPanel() {
  const [plan, setPlan] = useState<CanonicalizationPlan | null>(null);
  const [result, setResult] = useState<CanonicalizationResult | null>(null);
  const [progress, setProgress] = useState<CanonicalizationProgress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const hasChanges = !!plan && (plan.changes.events > 0 || plan.changes.dailyStats > 0);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResult(null);
    setProgress(null);

    try {
      const { analyzeLocalDataCanonicalization } = await import('@/lib/db/data-canonicalization');
      const nextPlan = await analyzeLocalDataCanonicalization();
      setPlan(nextPlan);
      toast.success('資料格式分析完成');
    } catch (error) {
      console.error('資料格式分析失敗:', error);
      toast.error('資料格式分析失敗，請稍後再試');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRun = async () => {
    if (!plan) return;

    if (!hasChanges) {
      toast.info('目前沒有需要整理的資料');
      return;
    }

    const confirmed = window.confirm(
      '即將整理本機資料格式。\n\n此工具會先建立本機備份，只整理 IndexedDB 內的事件與統計欄位，不會修改雲端資料，也不會刪除 events。\n\n是否繼續？'
    );
    if (!confirmed) return;

    setIsRunning(true);
    setResult(null);

    try {
      const { runLocalDataCanonicalization } = await import('@/lib/db/data-canonicalization');
      const nextResult = await runLocalDataCanonicalization(setProgress);
      setResult(nextResult);
      setPlan(nextResult);

      if (nextResult.integrityErrors.length > 0) {
        toast.warning('資料格式已整理，但仍有健康檢查錯誤需要處理');
      } else {
        toast.success('資料格式整理完成');
      }
    } catch (error) {
      console.error('資料格式整理失敗:', error);
      toast.error('資料格式整理失敗，請稍後再試');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-[#F8FBFB] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-medium text-foreground">本機資料格式整理</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            將舊格式事件整理成目前穩定格式，例如補齊 market_id、eventId、dealDate、totalAmount 等相容欄位。
            此工具只整理本機資料，不修改雲端，不刪除事件。
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white p-3 text-xs leading-5 text-muted-foreground">
        <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          安全規則
        </div>
        <ul className="space-y-1">
          <li>先分析，再執行。</li>
          <li>執行前會建立本機備份。</li>
          <li>保留舊欄位，只補齊穩定欄位。</li>
          <li>不重算收入、不刪除 events、不寫入 Supabase。</li>
        </ul>
      </div>

      {plan && <SummaryGrid plan={result ?? plan} />}

      {plan && plan.issues.length > 0 && (
        <div className="mt-4 rounded-xl border border-secondary/30 bg-soft-yellow p-3">
          <p className="text-sm font-medium text-foreground">需要留意的資料</p>
          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-muted-foreground">
            {plan.issues.slice(0, 8).map((issue, index) => (
              <li key={`${issue.table}-${issue.id}-${index}`}>
                {issue.table}[{String(issue.id)}] - {issue.message}
              </li>
            ))}
            {plan.issues.length > 8 && <li>還有 {plan.issues.length - 8} 項</li>}
          </ul>
        </div>
      )}

      <ProgressBar progress={progress} />

      {result && (
        <div className="mt-4 rounded-xl border border-[#A8D5BA]/30 bg-[#F0FAF3] p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-[#5AA06C]" />
            整理完成
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            已整理 {result.changes.events} 筆事件、{result.changes.dailyStats} 筆統計。
            {result.integrityErrors.length === 0 ? ' 資料健康檢查沒有阻塞錯誤。' : ` 仍有 ${result.integrityErrors.length} 個錯誤需處理。`}
          </p>
          {result.integrityWarnings.length > 0 && (
            <p className="mt-1 text-xs text-[#8A6D3B]">
              健康檢查另有 {result.integrityWarnings.length} 個提醒，通常是舊資料或視角資料相容訊息。
            </p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing || isRunning}
          className="flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-white px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-[#EEF6F7] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
          分析資料格式
        </button>
        <button
          type="button"
          onClick={handleRun}
          disabled={!plan || !hasChanges || isAnalyzing || isRunning}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          執行格式整理
        </button>
      </div>
    </div>
  );
}

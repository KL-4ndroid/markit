'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, AlertTriangle, BarChart3, CheckCircle2, FileText, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { useUserRole } from '@/hooks/useUserRole';
import { db } from '@/lib/db';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import {
  buildSettlementReportModel,
  type SettlementReportKind,
} from '@/lib/reporting/settlement-report';
import { buildSettlementReportPreviewModel } from '@/lib/reporting/settlement-report-preview';

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDefaultMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function readinessLabel(readiness: 'ready' | 'limited' | 'not_ready'): string {
  if (readiness === 'ready') return '可用';
  if (readiness === 'limited') return '有限';
  return '需補資料';
}

function confidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
  if (confidence === 'high') return '高';
  if (confidence === 'medium') return '中';
  return '低';
}

function statusClasses(status: 'available' | 'limited' | 'unavailable'): string {
  if (status === 'available') return 'border-[#B8D8C3] bg-[#F1F8F3] text-[#2F6B46]';
  if (status === 'limited') return 'border-[#E7D6A0] bg-[#FFF8E6] text-[#7A5A12]';
  return 'border-[#E6B9B0] bg-[#FFF1EE] text-[#9B3A2A]';
}

export default function SettlementReportPreviewPage() {
  const { user } = useAuth();
  const { userRole, isOwner, isLoading: isRoleLoading } = useUserRole();
  const [kind, setKind] = useState<SettlementReportKind>('monthly');
  const defaultRange = useMemo(() => getDefaultMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);

  const capabilities = useMemo(() => deriveRoleCapabilities({
    isOwner,
    staffRole: userRole.staffRole,
  }), [isOwner, userRole.staffRole]);
  const canPreview =
    !isRoleLoading &&
    hasCapability(capabilities, 'canImportExport') &&
    hasCapability(capabilities, 'canViewOwnerFinance');

  const markets = useLiveQuery(async () => {
    if (!user?.id || !canPreview) return [];
    const rows = await db.markets.toArray();
    return rows.filter(market => market.owner_id === user.id && !market.isDeleted);
  }, [user?.id, canPreview]) ?? [];

  const products = useLiveQuery(async () => {
    if (!user?.id || !canPreview) return [];
    const rows = await db.products.toArray();
    return rows.filter(product => product.owner_id === user.id || product.owner_id === undefined);
  }, [user?.id, canPreview]) ?? [];

  const dailyStats = useLiveQuery(async () => {
    if (!canPreview) return [];
    return await db.dailyStats
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }, [canPreview, startDate, endDate]) ?? [];

  const preview = useMemo(() => {
    if (!canPreview) return null;

    const report = buildSettlementReportModel({
      capabilities,
      period: {
        kind,
        startDate,
        endDate,
        label: `${startDate} - ${endDate}`,
      },
      markets,
      dailyStats,
      products,
    });

    return buildSettlementReportPreviewModel({
      capabilities,
      report,
    });
  }, [canPreview, capabilities, kind, startDate, endDate, markets, dailyStats, products]);

  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          <div className="border border-[#E8E3D8] bg-white px-4 py-5 text-sm text-muted-foreground shadow-sm">
            正在確認權限...
          </div>
        </div>
      </div>
    );
  }

  if (!canPreview) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowLeft size={16} />
            返回分析
          </Link>
          <section className="border border-[#E8E3D8] bg-white px-4 py-5 text-sm text-muted-foreground shadow-sm">
            <div className="mb-3 flex items-center gap-3 text-foreground">
              <ShieldAlert className="h-5 w-5 text-danger" />
              <h1 className="text-lg font-semibold">結算報告預覽僅限 owner 使用</h1>
            </div>
            <p>目前角色無法查看包含成本、淨利與攤位費的結算報告內容。</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-[#E8E3D8] pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link href="/analytics" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowLeft size={16} />
              返回分析
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#F1F8F3] text-[#2F6B46]">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-foreground">結算報告預覽</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {preview ? `${preview.header.periodLabel} · 信心度 ${confidenceLabel(preview.header.confidence)}` : '正在整理本機資料'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[120px_1fr_1fr]">
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as SettlementReportKind)}
              className="border border-[#D8D0C3] bg-white px-3 py-2 text-sm text-foreground"
            >
              <option value="weekly">週報</option>
              <option value="monthly">月報</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="border border-[#D8D0C3] bg-white px-3 py-2 text-sm text-foreground"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="border border-[#D8D0C3] bg-white px-3 py-2 text-sm text-foreground"
            />
          </div>
        </header>

        {preview && (
          <>
            <section className="grid gap-3 md:grid-cols-4">
              <div className="border border-[#E8E3D8] bg-white p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">總營收</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(preview.executiveSummary.totalRevenue)}</p>
              </div>
              <div className="border border-[#E8E3D8] bg-white p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">淨利</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(preview.executiveSummary.netProfit)}</p>
              </div>
              <div className="border border-[#E8E3D8] bg-white p-4 shadow-sm">
                <p className="text-xs text-muted-foreground">成交數</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{Math.round(preview.executiveSummary.totalDeals)}</p>
              </div>
              <div className={`border p-4 shadow-sm ${statusClasses(preview.header.readiness === 'not_ready' ? 'unavailable' : preview.header.readiness === 'limited' ? 'limited' : 'available')}`}>
                <p className="text-xs">報告狀態</p>
                <p className="mt-2 text-2xl font-semibold">{readinessLabel(preview.header.readiness)}</p>
              </div>
            </section>

            <section className="border border-[#E8E3D8] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">摘要結論</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{preview.header.readinessReason}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-[#2F6B46]">
                  <BarChart3 size={18} />
                  {preview.executiveSummary.grade} · {Math.round(preview.executiveSummary.overallScore)}
                </div>
              </div>
              <p className="text-sm leading-6 text-foreground">{preview.executiveSummary.summary}</p>
            </section>

            {preview.topWarnings.length > 0 && (
              <section className="border border-[#E6B9B0] bg-[#FFF1EE] p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[#9B3A2A]">
                  <AlertTriangle size={18} />
                  <h2 className="text-base font-semibold">需要優先確認</h2>
                </div>
                <div className="space-y-3">
                  {preview.topWarnings.map((warning) => (
                    <div key={`${warning.code}-${warning.message}`} className="border-t border-[#E6B9B0] pt-3">
                      <p className="text-sm font-medium text-foreground">{warning.message}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{warning.recommendation}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-3 md:grid-cols-2">
              {preview.sections.map((section) => (
                <div key={section.key} className={`border p-4 shadow-sm ${statusClasses(section.status)}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                    <span className="text-xs font-medium">{section.status}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5">{section.reason}</p>
                </div>
              ))}
            </section>

            <section className="border border-[#E8E3D8] bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-foreground">
                <CheckCircle2 size={18} className="text-[#2F6B46]" />
                <h2 className="text-base font-semibold">下一步行動</h2>
              </div>
              <div className="space-y-2">
                {preview.nextActions.map((action) => (
                  <p key={action} className="border-t border-[#E8E3D8] pt-2 text-sm leading-6 text-foreground">
                    {action}
                  </p>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import { SettlementReportScreen } from '@/components/reports/settlement/SettlementReportScreen';

export default function SettlementReportPage() {
  return <Suspense fallback={<p className="px-4 py-8 text-sm text-muted-foreground" role="status">正在開啟完整報告…</p>}><SettlementReportScreen /></Suspense>;
}

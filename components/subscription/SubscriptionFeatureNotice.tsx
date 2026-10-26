'use client';

import Link from 'next/link';
import { useSubscriptionExperience } from './SubscriptionExperienceProvider';

export function SubscriptionFeatureNotice({ advanced = false }: { advanced?: boolean }) {
  const { tier, refresh, isLoading } = useSubscriptionExperience();
  if (isLoading) return <p role="status" className="my-4 rounded-xl bg-atelier-paper px-4 py-3 text-sm text-muted-foreground">正在確認方案身分…</p>;
  return <section className="mx-auto my-6 max-w-3xl space-y-3 rounded-card bg-atelier-paper p-5" aria-live="polite">
    <h2 className="text-lg font-semibold">{tier === 'unavailable' ? '暫時無法確認方案身分' : advanced ? '高階版功能' : '輕量版起可使用'}</h2>
    <p className="text-sm leading-6 text-muted-foreground">{tier === 'unavailable'
      ? '目前尚未取得有效方案資料，請確認連線後重試。市集安排與私人心得仍可使用。'
      : advanced ? '深入分析、報告、成交照片與團隊協作由高階版提供。'
      : '免費版保留市集安排、錄取、繳費、準備與心得；銷售、互動及商品管理由輕量版起提供。'}</p>
    <div className="flex flex-wrap gap-3">
      {tier === 'unavailable' && <button type="button" onClick={refresh} className="min-h-11 rounded-xl border px-4">重新確認</button>}
      <Link href="/subscription" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-white">查看方案</Link>
      <Link href="/markets" className="inline-flex min-h-11 items-center rounded-xl border px-4">返回市集</Link>
    </div>
  </section>;
}

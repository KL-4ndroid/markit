import Link from 'next/link';
import { Lock } from 'lucide-react';

export function RetainedDataAccessNotice({ href, returnLabel }: { href: string; returnLabel: string }) {
  return <main className="min-h-screen bg-atelier-canvas px-4 py-12 text-atelier-ink">
    <section className="mx-auto max-w-lg rounded-card bg-atelier-paper p-6 shadow-atelier">
      <Lock className="mb-4 h-8 w-8 text-primary" aria-hidden="true" />
      <h1 className="text-xl font-semibold">目前無法存取此品牌資料</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">請由老闆確認員工權限及方案。本機待同步資料與照片會保留。</p>
      <Link href={href} className="mt-5 inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-sm text-white">{returnLabel}</Link>
    </section>
  </main>;
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BarChart3, CalendarDays, Receipt } from 'lucide-react';

import { APP_BRAND } from '@/lib/app-brand';
import { APP_METADATA } from '@/lib/app-metadata';

export const metadata: Metadata = {
  title: '關於',
  description: APP_BRAND.description,
};

const stallWorkflow = [
  {
    title: '出攤前，安排場次',
    description: '整理市集報名、錄取、攤位費與出攤準備。每週在同一個地點營業時，可以建立固定安排。',
    icon: CalendarDays,
  },
  {
    title: '營業中，記下每筆生意',
    description: '記錄成交與顧客互動、追蹤商品庫存。忙碌時可先記一筆金額，收攤後再補齊細節。',
    icon: Receipt,
  },
  {
    title: '收攤後，回顧營運',
    description: '留下人潮、交通或備貨心得，回看單場成果。累積多場紀錄後，可比較場地與商品表現。',
    icon: BarChart3,
  },
];

const publicLinks = [
  { href: '/support', label: '支援中心' },
  { href: '/privacy', label: '隱私政策' },
  { href: '/terms', label: '服務條款' },
  { href: '/settings/app', label: 'App 與版本' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-atelier-canvas text-foreground">
      <header className="border-b border-atelier-line bg-atelier-paper">
        <div className="mx-auto max-w-3xl px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-8 sm:pb-12">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回首頁
          </Link>

          <div className="mt-5 max-w-xl sm:mt-7">
            {/* eslint-disable-next-line @next/next/no-img-element -- 使用已最佳化的本機品牌圖示 */}
            <img src="/icons/icon-192x192.png" alt="" width={64} height={64} className="rounded-2xl border border-atelier-line bg-background" />
            <h1 className="mt-4 text-4xl font-semibold leading-tight">{APP_BRAND.name}</h1>
            <p lang="en" className="mt-1 text-xs font-medium tracking-widest text-muted-foreground">{APP_BRAND.englishName}</p>
            <p className="mt-4 text-lg font-medium">{APP_BRAND.positioning}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{APP_BRAND.tagline}</p>
            <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
              從週末市集、固定夜市到流動餐車，都可以把擺攤安排、收入和現場心得留在同一個地方。回頭看時，更容易知道哪裡值得再去、什麼商品賣得好，以及下次可以怎麼準備。
            </p>
            <Link href="/demo" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              免登入體驗
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
        <section aria-labelledby="about-workflow-title">
          <h2 id="about-workflow-title" className="text-xl font-semibold">從安排出攤到收攤回顧</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {stallWorkflow.map(({ title, description, icon: Icon }) => (
              <li key={title} className="rounded-2xl border border-atelier-line bg-atelier-paper p-4">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">銷售記錄、分析報告與員工協作依帳號方案及角色提供。現階段尚未開放正式訂閱付款。</p>
        </section>

        <section aria-labelledby="about-access-title" className="border-t border-atelier-line pt-6">
          <h2 id="about-access-title" className="text-xl font-semibold">使用方式</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            開啟網頁就能使用，也可用支援的瀏覽器加入手機主畫面。出攤時網路不穩，可以先把支援離線的操作存到裝置。重新連線後，可在 App 內確認同步狀態。
          </p>
        </section>

        <footer className="border-t border-atelier-line pt-5">
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap gap-x-2">
              <dt>版本</dt>
              <dd>{APP_METADATA.versionLabel}</dd>
            </div>
            {APP_METADATA.buildTime && (
              <div className="flex flex-wrap gap-x-2">
                <dt>最近建置</dt>
                <dd><time dateTime={APP_METADATA.buildTime}>{APP_METADATA.lastUpdatedLabel}</time></dd>
              </div>
            )}
          </dl>
          <nav aria-label="產品支援" className="mt-3 flex flex-wrap gap-x-5">
            {publicLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                {label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}

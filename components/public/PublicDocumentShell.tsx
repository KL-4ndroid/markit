import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface PublicDocumentShellProps {
  title: string;
  description: string;
  effectiveDate: string | null;
  publicationReady: boolean;
  children: ReactNode;
}

const PUBLIC_LINKS = [
  { href: '/support', label: '支援中心' },
  { href: '/privacy', label: '隱私政策' },
  { href: '/terms', label: '服務條款' },
  { href: '/about', label: '關於 Féria' },
] as const;

export function PublicDocumentShell({
  title,
  description,
  effectiveDate,
  publicationReady,
  children,
}: PublicDocumentShellProps) {
  return (
    <div className="min-h-screen bg-atelier-canvas/80 text-atelier-ink">
      <header className="border-b border-primary/10 bg-atelier-paper">
        <div className="mx-auto max-w-3xl px-5 pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回 Féria
          </Link>
          <p className="mt-6 text-sm font-semibold text-atelier-clay">Féria 出攤筆記</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-foreground">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>

          <div
            className={`mt-5 flex items-start gap-3 border-l-4 px-4 py-3 text-sm ${
              publicationReady
                ? 'border-primary bg-atelier-sage-soft text-foreground'
                : 'border-atelier-clay bg-atelier-apricot-soft text-foreground'
            }`}
          >
            {publicationReady ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-atelier-clay" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold">
                {publicationReady ? '正式政策版本' : '上架前草案'}
              </p>
              <p className="mt-1 leading-5 text-muted-foreground">
                {publicationReady
                  ? `生效日：${effectiveDate}`
                  : '正式營運者資料或核准證據尚未齊全，本頁不得作為已核准的付費條款。'}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
        <div className="divide-y divide-primary/10 border-y border-primary/10 px-1 sm:px-2">
          {children}
        </div>
      </div>

      <footer className="border-t border-primary/10 bg-atelier-paper">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-3 px-5 py-7 text-sm sm:px-6">
          {PUBLIC_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}

'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronRight, Info, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { useUserRole } from '@/hooks/useUserRole';
import { APP_METADATA } from '@/lib/app-metadata';
import { THEME_LAB_OPEN_EVENT } from '@/lib/theme-lab';

const PWAInstallButton = dynamic(
  () => import('@/components/PWAInstallButton').then((module) => module.PWAInstallButton),
  { ssr: false },
);

export default function AppSettingsPage() {
  const { isStaff } = useUserRole();
  const themeLabTapCount = useRef(0);
  const themeLabResetTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (themeLabResetTimer.current) window.clearTimeout(themeLabResetTimer.current);
  }, []);

  const handleVersionTap = useCallback(() => {
    if (process.env.NODE_ENV !== 'development') return;
    themeLabTapCount.current += 1;
    if (themeLabResetTimer.current) window.clearTimeout(themeLabResetTimer.current);
    themeLabResetTimer.current = window.setTimeout(() => {
      themeLabTapCount.current = 0;
    }, 3000);

    if (themeLabTapCount.current < 7) return;
    themeLabTapCount.current = 0;
    window.dispatchEvent(new Event(THEME_LAB_OPEN_EVENT));
  }, []);

  const versionContent = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element -- PWA icon is a local optimized app asset. */}
        <img src="/icons/icon-192x192.png" alt="" className="h-full w-full object-contain" />
      </span>
      <span className="min-w-0 flex-1">
        <span id="version-title" className="block text-sm font-semibold text-foreground">{APP_METADATA.displayName}</span>
        <span className="mt-1 block text-xs text-muted-foreground">版本 {APP_METADATA.versionLabel}</span>
      </span>
    </>
  );

  return (
    <SettingsPageShell
      title="App 與版本"
      description="管理主畫面安裝，並查看目前使用的版本與產品資訊。"
      icon={Smartphone}
      isStaff={isStaff}
      backHref="/settings"
    >
      <div className="space-y-6">
        <PWAInstallButton />

        <section className="rounded-card border border-primary/10 bg-white" aria-labelledby="version-title">
          {process.env.NODE_ENV === 'development' ? (
            <button
              type="button"
              onClick={handleVersionTap}
              aria-label="App 版本資訊"
              className="flex w-full items-center gap-3 px-4 py-4 text-left"
            >
              {versionContent}
            </button>
          ) : (
            <div className="flex items-center gap-3 px-4 py-4">{versionContent}</div>
          )}

          <Link
            href="/about"
            className="flex min-h-14 items-center gap-3 border-t border-primary/10 px-4 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <Info className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="flex-1 text-sm font-medium text-foreground">關於 Féria</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </SettingsPageShell>
  );
}

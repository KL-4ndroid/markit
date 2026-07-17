'use client';

import { ClipboardList, Shield, Users } from 'lucide-react';
import Link from 'next/link';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="japanese-app fixed inset-0 flex items-center justify-center p-6 z-50">
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-br from-soft-yellow/45 via-transparent to-soft-green/50"
        aria-hidden="true"
      />

      <div className="relative max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border border-primary/15 bg-atelier-paper p-3 shadow-atelier-lift mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- PWA icon is already generated at fixed sizes */}
            <img
              src="/icons/icon-192x192.png"
              alt="Féria - 出攤筆記"
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="mb-3 font-serif text-4xl tracking-[0.15em] text-foreground/80">
            Féria
          </h1>

          <p className="text-xs text-muted-foreground tracking-[0.4em]">
            出攤筆記
          </p>
        </div>

        <div className="space-y-4 mb-10">
          <FeatureItem
            icon={<ClipboardList className="w-5 h-5" />}
            title="快速記錄市集收入"
            description="忙碌現場可以先快速記錄，收攤後再補齊細節。"
          />
          <FeatureItem
            icon={<Shield className="w-5 h-5" />}
            title="離線也能使用"
            description="本機資料會先保存在裝置中，登入後可同步到雲端。"
          />
          <FeatureItem
            icon={<Users className="w-5 h-5" />}
            title="可邀請員工協助"
            description="老闆可邀請員工一起記錄市集互動與成交。"
          />
        </div>

        <button
          onClick={onGetStarted}
          className="w-full rounded-2xl bg-primary py-4 text-lg tracking-widest text-white shadow-atelier-key transition-[background-color,box-shadow,transform] hover:bg-primary/88 hover:shadow-atelier-lift active:scale-[0.98]"
        >
          開始使用
        </button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          登入或註冊後，可在不同裝置同步資料。
        </p>

        <div className="mt-8 text-center space-y-4">
          <div className="flex justify-center gap-4 text-xs text-muted-foreground/75">
            <Link href="/about" className="hover:text-primary/90 transition-colors">
              關於
            </Link>
            <span>/</span>
            <Link href="/privacy" className="hover:text-primary/90 transition-colors">
              隱私
            </Link>
            <span>/</span>
            <Link href="/terms" className="hover:text-primary/90 transition-colors">
              條款
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="japanese-surface-card p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soft-green text-primary">
          {icon}
        </div>

        <div>
          <h3 className="text-foreground/70 font-serif text-lg mb-1">
            {title}
          </h3>

          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

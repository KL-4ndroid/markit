'use client';

import { ClipboardList, Shield, Users } from 'lucide-react';
import Link from 'next/link';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 bg-[#F4F1EA] flex items-center justify-center p-6 z-50">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-gradient-to-br from-[#E8E4DC] via-transparent to-[#E8E4DC]"
        aria-hidden="true"
      />

      <div className="relative max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-[#6F8B74] text-[#6F8B74] text-3xl font-serif mb-6">
            市
          </div>

          <h1 className="text-4xl font-serif text-[#3F3A37] tracking-[0.15em] mb-3">
            市集誌
          </h1>

          <p className="text-xs text-[#8A867D] tracking-[0.4em]">
            MARKET NOTEBOOK
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
          className="w-full bg-[#6F8B74] text-white py-4 rounded-full tracking-widest text-lg transition-colors hover:bg-[#5F7A64] active:scale-[0.98]"
        >
          開始使用
        </button>

        <p className="mt-4 text-center text-sm text-[#8A867D]">
          登入或註冊後，可在不同裝置同步資料。
        </p>

        <div className="mt-8 text-center space-y-4">
          <div className="flex justify-center gap-4 text-xs text-[#A6A29A]">
            <Link href="/about" className="hover:text-[#6F8B74] transition-colors">
              關於
            </Link>
            <span>/</span>
            <Link href="/privacy" className="hover:text-[#6F8B74] transition-colors">
              隱私
            </Link>
            <span>/</span>
            <Link href="/terms" className="hover:text-[#6F8B74] transition-colors">
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
    <div className="bg-white rounded-xl p-5 border border-[#E5E0D8] shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#F1EEE7] text-[#6F8B74] shrink-0">
          {icon}
        </div>

        <div>
          <h3 className="text-[#3F3A37] font-serif text-lg mb-1">
            {title}
          </h3>

          <p className="text-[#8A867D] text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

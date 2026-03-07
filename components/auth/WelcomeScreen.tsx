/**
 * Welcome Screen - 日系文創版
 */

'use client';

import { TrendingUp, Users, Shield } from 'lucide-react';
import Link from 'next/link';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 bg-[#F4F1EA] flex items-center justify-center p-6 z-50">

      {/* subtle paper overlay - 移除不存在的圖片 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none 
        bg-gradient-to-br from-[#E8E4DC] via-transparent to-[#E8E4DC]" />

      <div className="relative max-w-md w-full">

        {/* Logo / Title */}
        <div className="text-center mb-12">
          
          {/* 印章風標誌 */}
          <div className="inline-flex items-center justify-center 
            w-24 h-24 rounded-full 
            border-2 border-[#6F8B74] 
            text-[#6F8B74] 
            text-3xl font-serif 
            mb-6">
            市
          </div>

          <h1 className="text-4xl font-serif text-[#3F3A37] tracking-[0.15em] mb-3">
            市集誌
          </h1>

          <p className="text-xs text-[#8A867D] tracking-[0.4em]">
            MARKET NOTEBOOK
          </p>
        </div>

        {/* 介紹卡片區 */}
        <div className="space-y-5 mb-12">
          <FeatureItem
            icon={<TrendingUp className="w-5 h-5" />}
            title="每日營運記錄"
            description="以溫柔清晰的方式，整理每一次市集銷售與趨勢變化。"
          />
          <FeatureItem
            icon={<Users className="w-5 h-5" />}
            title="團隊共同書寫"
            description="夥伴可分權協作，讓記帳與管理更加安心流暢。"
          />
          <FeatureItem
            icon={<Shield className="w-5 h-5" />}
            title="離線安心使用"
            description="即使在訊號不佳的市集中，也能穩定保存每筆紀錄。"
          />
        </div>

        {/* CTA */}
        <button
          onClick={onGetStarted}
          className="
            w-full 
            bg-[#6F8B74] 
            text-white 
            py-4 
            rounded-full 
            tracking-widest 
            text-lg 
            transition-colors 
            hover:bg-[#5F7A64]
            active:scale-[0.98]
          "
        >
          開始市集智慧管理
        </button>

        {/* 底部說明 */}
        <div className="mt-10 text-center space-y-4">
          <p className="text-[#8A867D] text-sm">
            初次使用？註冊帳號即可開始管理市集。
          </p>

          <div className="flex justify-center gap-4 text-xs text-[#A6A29A]">
            <Link href="/about" className="hover:text-[#6F8B74] transition-colors">
              關於
            </Link>
            <span>・</span>
            <Link href="/privacy" className="hover:text-[#6F8B74] transition-colors">
              隱私
            </Link>
            <span>・</span>
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
    <div
      className="
        bg-white 
        rounded-xl 
        p-5 
        border border-[#E5E0D8] 
        shadow-[0_4px_12px_rgba(0,0,0,0.04)]
      "
    >
      <div className="flex items-start gap-4">

        <div
          className="
            w-10 h-10 
            flex items-center justify-center 
            rounded-lg 
            bg-[#F1EEE7] 
            text-[#6F8B74]
          "
        >
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
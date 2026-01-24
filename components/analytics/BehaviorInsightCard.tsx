'use client';

import { Lightbulb } from 'lucide-react';

interface BehaviorInsightCardProps {
  insights: string[];
}

/**
 * 智能洞察提示卡片
 */
export function BehaviorInsightCard({ insights }: BehaviorInsightCardProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-[#FFF8E7] to-[#FFF0D4] rounded-[1.5rem] p-6 shadow-lg shadow-[#D4A574]/10">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white/60 rounded-xl">
          <Lightbulb className="w-5 h-5 text-[#D4A574]" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-medium text-[#3A3A3A] mb-3">
            💡 智能洞察
          </h3>
          <div className="space-y-2">
            {insights.map((insight, index) => (
              <p key={index} className="text-sm text-[#6B6B6B] leading-relaxed">
                • {insight}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

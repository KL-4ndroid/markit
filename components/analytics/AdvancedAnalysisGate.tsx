import { Lock } from 'lucide-react';

interface AdvancedAnalysisGateProps {
  title: string;
  description: string;
  requirement: string;
}

export function AdvancedAnalysisGate({
  title,
  description,
  requirement,
}: AdvancedAnalysisGateProps) {
  return (
    <div className="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-[#7B9FA6]/10 mb-6 border border-[#7B9FA6]/10">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#F5F5F3] flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-[#7B9FA6]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#7B9FA6] mb-1">進階分析尚未開放</p>
          <h3 className="text-base font-semibold text-[#3A3A3A] leading-snug">{title}</h3>
          <p className="text-sm text-[#6B6B6B] leading-relaxed mt-2">{description}</p>
          <div className="mt-3 bg-[#FAFAF8] rounded-xl p-3">
            <p className="text-xs font-medium text-[#3A3A3A] mb-1">需要的資料</p>
            <p className="text-sm text-[#3A3A3A] leading-relaxed">{requirement}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

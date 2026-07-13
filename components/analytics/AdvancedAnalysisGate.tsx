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
    <div className="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-primary/10 mb-6 border border-primary/10">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-cream-lighter flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-primary mb-1">進階分析尚未開放</p>
          <h3 className="text-base font-semibold text-foreground leading-snug">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">{description}</p>
          <div className="mt-3 bg-background rounded-xl p-3">
            <p className="text-xs font-medium text-foreground mb-1">需要的資料</p>
            <p className="text-sm text-foreground leading-relaxed">{requirement}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

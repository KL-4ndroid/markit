import { BookOpen, ChevronDown } from 'lucide-react';

export function AnalyticsMethodologyDisclosure() {
  return (
    <details className="group rounded-card border border-primary/10 bg-white">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
          查看指標方法與限制
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-primary/10 px-4 py-4 text-sm leading-6 text-muted-foreground">
        <p>綜合評分會整合轉換、淨利、客單價與效率等既有指標；不同指標會先標準化，再依既有權重合成。</p>
        <p className="mt-2">Z 分數、權重與平滑公式只用於多場比較，不代表單一場次的絕對好壞。樣本不足時，畫面會隱藏正式評等與排行。</p>
        <p className="mt-2">收入、成交與成本是使用者輸入或同步後的紀錄。待同步、缺少商品明細或互動紀錄，都會降低結論可信度。</p>
      </div>
    </details>
  );
}

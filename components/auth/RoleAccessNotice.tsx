import { AlertCircle } from 'lucide-react';

/** The protected children remain unmounted; retry uses the existing role refresh. */
export function RoleAccessNotice({ onRetry }: { onRetry: () => void }) {
  return <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
    <section className="japanese-surface-card w-full max-w-md space-y-4 p-5">
      <AlertCircle className="h-6 w-6 text-danger" aria-hidden="true" />
      <h1 className="text-xl font-medium">已登入，尚無法確認使用權限</h1>
      <p role="alert" className="text-sm leading-6 text-muted-foreground">請確認連線後重試。目前尚未開放資料頁面，這不表示帳號或雲端紀錄已遺失。</p>
      <button type="button" onClick={onRetry} className="min-h-12 w-full rounded-control bg-primary px-4 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">重新確認權限</button>
    </section>
  </div>;
}

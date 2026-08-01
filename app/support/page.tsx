import { CreditCard, Database, LifeBuoy, Lock, Mail, User } from 'lucide-react';

import { PublicDocumentShell } from '@/components/public/PublicDocumentShell';
import {
  buildSupportMailto,
  resolvePublicLegalSupportConfig,
} from '@/lib/legal/public-legal-support-config';

const SUPPORT_TOPICS = [
  {
    title: '帳號與登入',
    description: '登入異常、帳號疑似遭他人使用、團隊歸屬或權限問題。',
    subject: '帳號與登入',
    icon: User,
  },
  {
    title: '資料與隱私',
    description: '申請查閱、更正、停止利用、刪除帳號或回報疑似資料外洩。',
    subject: '資料與隱私',
    icon: Database,
  },
  {
    title: '訂閱與付款',
    description: '目前尚未開放付款。未來將由此受理方案、扣款、取消與退款問題。',
    subject: '訂閱與付款',
    icon: CreditCard,
  },
  {
    title: '安全事件',
    description: '回報可疑連結、未授權操作、帳號接管或其他安全風險。',
    subject: '安全事件',
    icon: Lock,
  },
] as const;

export default function SupportPage() {
  const config = resolvePublicLegalSupportConfig(process.env);

  return (
    <PublicDocumentShell
      title="支援中心"
      description="帳號、資料、訂閱與安全事件的單一公開聯絡入口。"
      effectiveDate={config.effectiveDate}
      publicationReady={config.policyPublicationReady}
    >
      <section className="py-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LifeBuoy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-foreground">聯絡支援</h2>
            {config.supportEmail ? (
              <>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  公開支援信箱：<a className="font-medium text-primary underline-offset-4 hover:underline" href={`mailto:${config.supportEmail}`}>{config.supportEmail}</a>
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  來信請附上帳號信箱、問題發生時間與可重現步驟。請勿傳送密碼、API 金鑰、完整卡號或未遮蔽的正式資料匯出檔。
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-atelier-clay">
                正式支援信箱尚未設定，因此本版本不可對外上架或收費。
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">問題分類</h2>
        <div className="mt-4 divide-y divide-primary/10 border-y border-primary/10">
          {SUPPORT_TOPICS.map((topic) => {
            const Icon = topic.icon;
            const href = buildSupportMailto(config.supportEmail, topic.subject);
            const content = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{topic.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">{topic.description}</span>
                </span>
                <Mail className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </>
            );

            return href ? (
              <a
                key={topic.title}
                href={href}
                className="flex min-h-20 items-center gap-3 py-4 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                {content}
              </a>
            ) : (
              <div key={topic.title} className="flex min-h-20 items-center gap-3 py-4 opacity-65">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">資料刪除與裝置暫存</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          帳號或雲端資料刪除目前由支援窗口核對身分後處理。裝置可能仍有尚未同步的離線變更；在收到處理確認前，請勿清除瀏覽器資料或解除安裝，以免未同步內容無法復原。
        </p>
      </section>

      <section className="py-7">
        <h2 className="text-lg font-semibold text-foreground">服務營運者</h2>
        {config.operatorIdentityReady ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-[9rem_1fr]">
            <dt className="font-medium text-muted-foreground">營運者名稱</dt>
            <dd className="break-words text-foreground">{config.operatorName}</dd>
            <dt className="font-medium text-muted-foreground">代表人</dt>
            <dd className="break-words text-foreground">{config.operatorRepresentative}</dd>
            <dt className="font-medium text-muted-foreground">營業地址</dt>
            <dd className="break-words text-foreground">{config.operatorAddress}</dd>
          </dl>
        ) : (
          <p className="mt-3 text-sm leading-6 text-atelier-clay">
            正式營運者名稱、代表人或營業地址尚未完成公開設定。
          </p>
        )}
      </section>
    </PublicDocumentShell>
  );
}

'use client';

import { useMemo } from 'react';
import { User } from 'lucide-react';
import { AccountDeletionPanel } from '@/components/settings/AccountDeletionPanel';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { accountDeletionWorkflowUiEnabled } from '@/lib/subscription/account-deletion-workflow-gate';
import { createAccountDeletionClient } from '@/lib/subscription/account-deletion-client';
import { evaluateDeletionDeviceCheck } from '@/lib/subscription/account-deletion-experience';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { getLocalPendingWriteReport } from '@/lib/sync/local-pending-write-report';
import { getExternalLinkPort } from '@/lib/platform/interaction-capabilities';

export default function AccountDeletionPage() {
  const { user, session } = useAuth();
  const { isStaff } = useRoleContext();
  const enabled = accountDeletionWorkflowUiEnabled();
  const client = useMemo(() => {
    if (!enabled || !user || !session) return null;
    return createAccountDeletionClient({
      accessToken: session.access_token,
      async checkDevice() {
        try {
          const [report, drafts] = await Promise.all([getLocalPendingWriteReport(user.id), db.financialReviewDrafts.count()]);
          return evaluateDeletionDeviceCheck(report, user.id, drafts);
        } catch { return { ready: false, message: '無法確認裝置資料，請重新檢查；原資料保持不變。' }; }
      },
      async reauthenticate(password) {
        if (!user.email) return false;
        const result = await supabase.auth.signInWithPassword({ email: user.email, password });
        return !result.error && result.data.user?.id === user.id;
      },
      openBilling: store => getExternalLinkPort().open(store === 'apple'
        ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions'),
    });
  }, [enabled, user, session]);
  return <SettingsPageShell title="刪除帳號" description="確認申請影響，並查看或撤回自己的申請。" icon={User} isStaff={isStaff} backHref="/settings/account" backLabel="返回帳號與同步">
    {client ? <AccountDeletionPanel client={client} />
      : <p role="status" className="text-sm leading-6">此環境尚未開放帳號刪除。沒有送出申請或刪除資料。</p>}
  </SettingsPageShell>;
}

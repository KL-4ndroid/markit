'use client';

import { Cloud } from 'lucide-react';
import Link from 'next/link';

import { AccountSyncPanel } from '@/components/settings/AccountSyncPanel';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { useRoleContext } from '@/lib/role-context';
import { accountDeletionWorkflowUiEnabled } from '@/lib/subscription/account-deletion-workflow-gate';

export default function AccountSettingsPage() {
  const { isStaff } = useRoleContext();

  return (
    <SettingsPageShell
      title="帳號與同步"
      description="確認目前登入身分、雲端同步狀態與這台裝置的待同步資料。"
      icon={Cloud}
      isStaff={isStaff}
      backHref="/settings"
    >
      <AccountSyncPanel />
      {accountDeletionWorkflowUiEnabled() && <Link href="/settings/account/deletion" className="mt-6 flex min-h-11 items-center rounded-xl border border-primary/15 bg-white px-4 py-3 text-sm font-medium text-foreground">刪除帳號</Link>}
    </SettingsPageShell>
  );
}

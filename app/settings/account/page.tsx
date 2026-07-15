'use client';

import { Cloud } from 'lucide-react';

import { AccountSyncPanel } from '@/components/settings/AccountSyncPanel';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { useUserRole } from '@/hooks/useUserRole';

export default function AccountSettingsPage() {
  const { isStaff } = useUserRole();

  return (
    <SettingsPageShell
      title="帳號與同步"
      description="確認目前登入身分、雲端同步狀態與這台裝置的待同步資料。"
      icon={Cloud}
      isStaff={isStaff}
      backHref="/settings"
    >
      <AccountSyncPanel />
    </SettingsPageShell>
  );
}

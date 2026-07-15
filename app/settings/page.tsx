'use client';

import {
  Camera,
  Cloud,
  Database,
  MoreHorizontal,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { SettingsMenuRow, SettingsSection } from '@/components/settings/SettingsMenu';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { StaffModeNotice } from '@/components/staff/StaffModeNotice';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  getSettingsDestinationGroups,
  type SettingsDestinationId,
} from '@/lib/settings/settings-navigation';

const DESTINATION_ICONS: Record<SettingsDestinationId, LucideIcon> = {
  account: Cloud,
  team: Users,
  sales: Camera,
  data: Database,
  app: Smartphone,
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { userRole, isStaff } = useUserRole();
  const groups = getSettingsDestinationGroups(isStaff);
  const roleLabel = isStaff
    ? userRole.staffRole === 'manager'
      ? 'Manager 管理員'
      : userRole.staffRole === 'operator'
        ? 'Operator 現場紀錄'
        : 'Viewer 檢視'
    : '老闆';

  return (
    <SettingsPageShell
      title="更多"
      description="帳號、團隊、營業偏好與系統工具都集中在這裡。"
      icon={MoreHorizontal}
      isStaff={isStaff}
    >
      <section className="mb-6 flex items-center justify-between gap-4 border-b border-primary/10 pb-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{user?.email ?? '尚未登入'}</p>
          <p className="mt-1 text-xs text-muted-foreground">目前身分：{roleLabel}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          {isStaff ? '團隊模式' : '營運者'}
        </span>
      </section>

      {isStaff && <StaffModeNotice compact className="mb-6" />}

      <div className="space-y-6">
        {groups.map((group) => (
          <SettingsSection key={group.id} title={group.label}>
            {group.items.map((item) => (
              <SettingsMenuRow
                key={item.id}
                href={item.href}
                label={item.label}
                description={item.description}
                icon={DESTINATION_ICONS[item.id]}
              />
            ))}
          </SettingsSection>
        ))}
      </div>
    </SettingsPageShell>
  );
}

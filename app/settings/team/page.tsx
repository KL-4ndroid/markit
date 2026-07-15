'use client';

import dynamic from 'next/dynamic';
import { LogOut, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { OwnerInfoCard } from '@/components/staff/OwnerInfoCard';
import { StaffPermissionCard } from '@/components/staff/StaffPermissionCard';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StateView } from '@/components/ui/StateView';
import { useUserRole } from '@/hooks/useUserRole';
import { clearLocalAppData } from '@/lib/settings/clear-local-app-data';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';

const StaffManagement = dynamic(
  () => import('@/components/settings/StaffManagement').then((module) => module.StaffManagement),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-card border border-primary/10 bg-white p-6 text-sm text-muted-foreground">
        正在載入團隊成員...
      </div>
    ),
  },
);

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const { userRole, isStaff, isLoading } = useUserRole();
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  const confirmLeaveTeam = async () => {
    if (!user || !userRole.ownerId) return;

    try {
      toast.loading('正在離開團隊...', { id: 'leave-team' });
      const { error } = await supabase.rpc('leave_current_staff_team', {
        p_owner_id: userRole.ownerId,
      });
      if (error) throw error;

      toast.loading('團隊關係已解除，正在清除本地快取...', { id: 'leave-team' });
      await clearLocalAppData(user.id, true);
      setShowLeaveConfirmation(false);
      toast.success('已離開團隊，即將重新載入', { id: 'leave-team' });
      window.setTimeout(() => window.location.assign('/'), 1000);
    } catch (leaveError) {
      const message = leaveError instanceof Error ? leaveError.message : '請稍後再試';
      toast.error(`離開失敗：${message}`, { id: 'leave-team' });
    }
  };

  return (
    <SettingsPageShell
      title="團隊與權限"
      description={isStaff
        ? '查看目前所屬團隊、角色與可執行的工作。'
        : '邀請員工、調整角色，並確認每個角色可存取的功能。'}
      icon={Users}
      isStaff={isStaff}
      backHref="/settings"
    >
      {isLoading ? (
        <StateView title="正在確認團隊身分" description="完成後會顯示目前可使用的團隊功能。" />
      ) : isStaff ? (
        <div className="space-y-5">
          {userRole.ownerEmail && <OwnerInfoCard ownerEmail={userRole.ownerEmail} />}
          <StaffPermissionCard
            staffRole={userRole.staffRole}
            ownerEmail={userRole.ownerEmail}
          />

          <section className="border-t border-danger/20 pt-5" aria-labelledby="leave-team-title">
            <h2 id="leave-team-title" className="text-base font-semibold text-foreground">離開目前團隊</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              離開後將無法再查看這個團隊的市集，這台裝置上的團隊資料也會清除。
            </p>
            <Button
              className="mt-4 w-full sm:w-auto"
              variant="danger"
              leadingIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
              onClick={() => setShowLeaveConfirmation(true)}
            >
              離開團隊
            </Button>
          </section>
        </div>
      ) : (
        <StaffManagement />
      )}

      <ConfirmDialog
        open={showLeaveConfirmation}
        onClose={() => setShowLeaveConfirmation(false)}
        onConfirm={confirmLeaveTeam}
        title="離開目前團隊？"
        description="離開後將無法再存取老闆的市集，這台裝置上的團隊資料也會清除，帳號會恢復為一般使用者。"
        confirmLabel="離開團隊"
        tone="danger"
      />
    </SettingsPageShell>
  );
}

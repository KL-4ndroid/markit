'use client';

import dynamic from 'next/dynamic';
import { Camera, ShieldAlert } from 'lucide-react';

import { InteractionSettingsPanel } from '@/components/settings/InteractionSettingsPanel';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { StateView } from '@/components/ui/StateView';
import { useUserRole } from '@/hooks/useUserRole';

const OwnerBrandSettingsCard = dynamic(
  () => import('@/components/settings/OwnerBrandSettingsCard').then((module) => module.OwnerBrandSettingsCard),
  { ssr: false },
);

const SalesPhotoEvidenceSettingsCard = dynamic(
  () => import('@/components/settings/SalesPhotoEvidenceSettingsCard').then((module) => module.SalesPhotoEvidenceSettingsCard),
  { ssr: false },
);

export default function SalesSettingsPage() {
  const { isStaff, isOwner, isLoading } = useUserRole();

  return (
    <SettingsPageShell
      title="銷售與照片"
      description="管理品牌顯示、成交照片預設值與現場互動記錄方式。"
      icon={Camera}
      isStaff={isStaff}
      backHref="/settings"
    >
      {isLoading ? (
        <StateView title="正在確認權限" description="完成後會顯示可調整的營業偏好。" />
      ) : !isOwner ? (
        <StateView
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          title="此頁僅限老闆使用"
          description="員工會沿用目前市集與團隊設定，不會看到全域營業偏好。"
        />
      ) : (
        <div className="space-y-5">
          <OwnerBrandSettingsCard />
          <SalesPhotoEvidenceSettingsCard />
          <InteractionSettingsPanel />
        </div>
      )}
    </SettingsPageShell>
  );
}

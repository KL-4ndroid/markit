'use client';

import { useSubscriptionExperience } from '@/components/subscription/SubscriptionExperienceProvider';
import dynamic from 'next/dynamic';
import { salesSettingsPresentation } from '@/lib/subscription/ui-presentation';
import { Camera, ShieldAlert } from 'lucide-react';

import { InteractionSettingsPanel } from '@/components/settings/InteractionSettingsPanel';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { StateView } from '@/components/ui/StateView';
import { useRoleContext } from '@/lib/role-context';

const OwnerBrandSettingsCard = dynamic(
  () => import('@/components/settings/OwnerBrandSettingsCard').then((module) => module.OwnerBrandSettingsCard),
  { ssr: false },
);

const SalesPhotoEvidenceSettingsCard = dynamic(
  () => import('@/components/settings/SalesPhotoEvidenceSettingsCard').then((module) => module.SalesPhotoEvidenceSettingsCard),
  { ssr: false },
);

export default function SalesSettingsPage() {
  const { tier, canRecord, canAnalyze } = useSubscriptionExperience();
  const { isStaff, isOwner, isLoading } = useRoleContext();

  const presentation = salesSettingsPresentation(tier);
  return (
    <SettingsPageShell
      title={presentation.title}
      description={presentation.description}
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
          <OwnerBrandSettingsCard showReportUsage={canAnalyze} />
          {canAnalyze && <SalesPhotoEvidenceSettingsCard />}
          {canRecord && <InteractionSettingsPanel />}
        </div>
      )}
    </SettingsPageShell>
  );
}

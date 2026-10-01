'use client';

import { Lock } from 'lucide-react';

import { MarketTextImportLab } from '@/components/markets/MarketTextImportLab';
import { StateView } from '@/components/ui/StateView';
import { useRoleContext } from '@/lib/role-context';

export default function MarketTextImportLabPage() {
  const { isOwner, roleRefreshState } = useRoleContext();

  if (!roleRefreshState.isAuthorizationFresh) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
        <StateView
          icon={<Lock className="h-5 w-5" aria-hidden="true" />}
          title="正在確認實驗室存取權限"
          description="權限確認完成前，不會顯示解析或審核內容。"
          className="w-full"
        />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
        <StateView
          icon={<Lock className="h-5 w-5" aria-hidden="true" />}
          title="這個實驗室僅限 owner 使用"
          description="它用於審核解析結果與建立規則改進線索，不會影響現有市集資料。"
          className="w-full"
        />
      </div>
    );
  }

  return <MarketTextImportLab />;
}

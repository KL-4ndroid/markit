'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Lock, X } from 'lucide-react';
import { StaffPermissionCard } from '@/components/staff/StaffPermissionCard';
import { RoleStatusBanner } from '@/components/auth/RoleStatusBanner';
import { dispatchRoleStatusEvent } from '@/lib/permissions/role-status-events';
import {
  deriveRoleCapabilities,
  type RoleCapabilities,
} from '@/lib/permissions/role-capabilities';
import type { StaffRole } from '@/types/staff';

type TestRole = StaffRole | 'owner';
type ActionScenario = {
  label: string;
  allowed: (capabilities: RoleCapabilities, role: TestRole, isOwner: boolean) => boolean;
  note?: string;
};

const ROLE_OPTIONS: Array<{ value: TestRole; label: string }> = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'operator', label: 'Operator' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner' },
];

const ACTIONS: ActionScenario[] = [
  { label: '記錄互動', allowed: (capabilities) => capabilities.canRecordInteraction },
  { label: '記錄成交 / 收入', allowed: (capabilities) => capabilities.canRecordDeal },
  { label: '編輯成交紀錄', allowed: () => false, note: '尚未開放' },
  { label: '建立 field note', allowed: (capabilities) => capabilities.canCreateFieldNote },
  { label: '管理 field notes', allowed: (capabilities) => capabilities.canManageFieldNotes },
  { label: '編輯市集基本資料', allowed: (capabilities) => capabilities.canEditMarketBasic },
  { label: '編輯商品基本資料', allowed: (capabilities) => capabilities.canEditProductBasic },
  { label: '管理 checklist', allowed: (capabilities) => capabilities.canManageChecklist },
  { label: '切換 checklist', allowed: (capabilities) => capabilities.canToggleChecklistItem },
  {
    label: '刪除自己同日紀錄',
    allowed: (capabilities) => capabilities.canDeleteOwnSameDayRecord,
  },
  {
    label: '刪除別人同日紀錄',
    allowed: (capabilities, role, isOwner) =>
      isOwner || (role === 'manager' && capabilities.canDeleteOwnSameDayRecord),
    note: 'manager 同日限定',
  },
  { label: '使用修復工具', allowed: (capabilities) => capabilities.canUseRepairTools },
  { label: '管理員工', allowed: (capabilities) => capabilities.canManageStaff },
  { label: '刪除市集', allowed: (capabilities) => capabilities.canDeleteMarket },
];

export default function StaffRoleTestPage() {
  const [role, setRole] = useState<TestRole>('manager');
  const isOwner = role === 'owner';
  const staffRole = isOwner ? null : role;
  const capabilities = useMemo(
    () => deriveRoleCapabilities({ isOwner, staffRole }),
    [isOwner, staffRole]
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <RoleStatusBanner />

      <div className="bg-primary px-6 pb-8 pt-12 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold">Staff Role 測試頁</h1>
          <p className="mt-2 text-sm text-white/80">
            這個頁面只使用前端 mock，不連 Supabase、不寫 IndexedDB，適合驗收權限規則。
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-4 max-w-3xl space-y-4 px-6">
        <section className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-foreground">切換測試角色</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  role === option.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-primary/15 bg-white text-foreground hover:bg-background'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <StaffPermissionCard
          isOwner={isOwner}
          staffRole={staffRole}
          ownerEmail={isOwner ? undefined : 'owner@example.test'}
          capabilities={capabilities}
        />

        <section className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-foreground">動作矩陣</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ACTIONS.map((action) => {
              const allowed = action.allowed(capabilities, role, isOwner);
              return (
                <div
                  key={action.label}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-primary/10 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 text-foreground">
                    {action.label}
                    {action.note && (
                      <span className="ml-2 text-xs text-muted-foreground">{action.note}</span>
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${
                      allowed ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {allowed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {allowed ? '允許' : '禁止'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-foreground">P5-4e banner 模擬</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() =>
                dispatchRoleStatusEvent({
                  kind: 'downgraded',
                  message: '測試：角色從 manager 降為 viewer，正在重新同步可見資料。',
                  fromRole: 'manager',
                  toRole: 'viewer',
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-soft-yellow px-3 py-2 text-sm font-medium text-foreground"
            >
              <AlertTriangle className="h-4 w-4" />
              模擬降權
            </button>
            <button
              type="button"
              onClick={() =>
                dispatchRoleStatusEvent({
                  kind: 'projection-cleanup-complete',
                  message: '測試：本機 staff projection 已清理完成。',
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-soft-green px-3 py-2 text-sm font-medium text-foreground"
            >
              <Check className="h-4 w-4" />
              模擬完成
            </button>
            <button
              type="button"
              onClick={() =>
                dispatchRoleStatusEvent({
                  kind: 'revoked',
                  message: '測試：員工關係已解除，寫入操作已鎖住。',
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-soft-pink px-3 py-2 text-sm font-medium text-danger"
            >
              <Lock className="h-4 w-4" />
              模擬移除
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

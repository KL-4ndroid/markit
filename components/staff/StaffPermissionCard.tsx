'use client';

import { Check, Info, Shield, X } from 'lucide-react';
import {
  deriveRoleCapabilities,
  type RoleCapabilities,
} from '@/lib/permissions/role-capabilities';
import type { StaffRole } from '@/types/staff';

interface PermissionRow {
  label: string;
  allowed: boolean;
  note?: string;
}

interface StaffPermissionCardProps {
  staffRole?: StaffRole | null;
  isOwner?: boolean;
  ownerEmail?: string;
  capabilities?: RoleCapabilities;
}

const ROLE_LABELS: Record<StaffRole | 'owner' | 'unknown', string> = {
  owner: '老闆',
  viewer: 'Viewer 檢視',
  operator: 'Operator 現場紀錄',
  manager: 'Manager 管理',
  unknown: '權限確認中',
};

export function StaffPermissionCard({
  staffRole,
  isOwner = false,
  ownerEmail,
  capabilities,
}: StaffPermissionCardProps) {
  const resolvedCapabilities =
    capabilities ?? deriveRoleCapabilities({ isOwner, staffRole });
  const roleKey = isOwner ? 'owner' : staffRole ?? 'unknown';

  const permissionList: PermissionRow[] = [
    { label: '查看市集與商品資料', allowed: isOwner || staffRole !== undefined && staffRole !== null },
    { label: '記錄現場互動', allowed: resolvedCapabilities.canRecordInteraction },
    {
      label: '編輯既有市集基本資料',
      allowed: resolvedCapabilities.canEditMarketBasic,
      note: '不含市集名稱、地點、成本、狀態與刪除',
    },
    {
      label: '編輯既有商品基本資料',
      allowed: resolvedCapabilities.canEditProductBasic,
      note: '不含商品名稱、分類、成本與刪除',
    },
    {
      label: '建立 field note',
      allowed: resolvedCapabilities.canCreateFieldNote,
      note: '下一階段開放',
    },
    {
      label: '管理 checklist',
      allowed: resolvedCapabilities.canManageChecklist,
      note: '下一階段開放',
    },
    {
      label: '修改自己建立的紀錄',
      allowed: resolvedCapabilities.canEditOwnSameDayRecord,
      note: '下一階段開放',
    },
    {
      label: '刪除自己建立的紀錄',
      allowed: resolvedCapabilities.canDeleteOwnSameDayRecord,
      note: '下一階段開放',
    },
    { label: '新增市集', allowed: false },
    { label: '新增商品', allowed: false },
    { label: '查看成本、利潤與修復工具', allowed: resolvedCapabilities.canViewOwnerFinance },
    { label: '管理員工與角色', allowed: resolvedCapabilities.canManageStaff },
  ];

  return (
    <section className="rounded-xl border border-primary/15 bg-white p-4 shadow-sm shadow-primary/5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <Shield className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">目前權限</p>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {ROLE_LABELS[roleKey]}
            </span>
          </div>

          {ownerEmail && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              所屬老闆：{ownerEmail}
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {permissionList.map((permission) => (
              <li key={permission.label} className="flex items-start gap-2 text-xs">
                {permission.allowed ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                ) : (
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className={permission.allowed ? 'text-foreground' : 'text-muted-foreground'}>
                  {permission.label}
                  {permission.note && (
                    <span className="ml-1 text-muted-foreground">({permission.note})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-start gap-2 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>權限卡只顯示目前角色規則；實際寫入仍會經過 fresh role 檢查。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

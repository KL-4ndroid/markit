'use client';

import { Shield } from 'lucide-react';
import { staffAccessPresentation, staffRoleWorkDetails } from '@/lib/permissions/staff-access-presentation';
import type { RoleCapabilities } from '@/lib/permissions/role-capabilities';
import type { StaffRole } from '@/types/staff';

interface StaffPermissionCardProps {
  staffRole?: StaffRole | null;
  isOwner?: boolean;
  ownerEmail?: string;
  capabilities?: RoleCapabilities;
  authorizationFresh?: boolean;
}

const ROLE_LABELS = { viewer: '查看者', operator: '出攤助手', manager: '管理員' };

export function StaffPermissionCard({ staffRole, isOwner = false, ownerEmail, capabilities, authorizationFresh = false }: StaffPermissionCardProps) {
  const access = staffAccessPresentation({ role: staffRole, status: 'active', canView: Boolean(staffRole), teamAllowed: authorizationFresh });
  return <section className="rounded-3xl border border-primary/15 bg-white p-4 sm:p-5" aria-label="目前角色與工作範圍">
    <div className="flex items-start gap-3">
      <Shield className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold">{isOwner ? '老闆' : staffRole ? ROLE_LABELS[staffRole] : '角色確認中'}</h2>
        {ownerEmail && <p className="mt-1 break-all text-sm text-muted-foreground">所屬老闆：{ownerEmail}</p>}
        <p className="mt-3 font-medium">{isOwner ? '管理品牌工作區' : access.title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{isOwner ? '管理市集、商品、營運紀錄與團隊。' : access.summary}</p>
        <details className="mt-3 border-t border-border">
          <summary className="min-h-11 cursor-pointer rounded-xl py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">查看角色工作範圍</summary>
          <p className="mb-2 text-sm leading-6 text-muted-foreground">以下為角色規則；實際操作仍需團隊資格有效、成員存取已啟用，且場次開放。</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
            {(isOwner ? ['管理品牌資料與營運紀錄', '查看成本、利潤與報表', '依方案管理團隊'] : staffRoleWorkDetails(staffRole, capabilities)).map(text => <li key={text}>{text}</li>)}
          </ul>
        </details>
      </div>
    </div>
  </section>;
}

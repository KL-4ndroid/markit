'use client';

import { Shield } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface StaffModeNoticeProps {
  className?: string;
  compact?: boolean;
}

export function StaffModeNotice({ className = '', compact = false }: StaffModeNoticeProps) {
  const { userRole, isStaff } = useUserRole();

  if (!isStaff) return null;

  return (
    <div className={`rounded-2xl border border-primary/20 bg-white px-4 py-3 shadow-sm shadow-primary/5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0ECF7] text-primary">
          <Shield size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">員工模式</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {compact
              ? '你只能查看授權市集與商品。成本、利潤、員工管理與資料修復功能僅老闆可用。'
              : '你正在以員工身分使用。畫面只會顯示老闆授權的市集與商品；成本、利潤、員工管理、分析與資料修復功能會被隱藏或限制。'}
          </p>
          {userRole.ownerEmail && (
            <p className="mt-1 truncate text-xs text-primary">
              老闆帳號：{userRole.ownerEmail}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

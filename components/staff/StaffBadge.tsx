/**
 * 員工身份標籤
 * 
 * 顯示在頂部 Header，標識當前為員工模式
 */

'use client';

import { UserCircle } from 'lucide-react';

interface StaffBadgeProps {
  tone?: 'inverse' | 'default';
}

export function StaffBadge({ tone = 'inverse' }: StaffBadgeProps) {
  const classes = tone === 'inverse'
    ? 'bg-white/20 text-white'
    : 'border border-primary/15 bg-primary/10 text-primary';

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${classes}`}>
      <UserCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="text-xs font-medium">員工模式</span>
    </div>
  );
}

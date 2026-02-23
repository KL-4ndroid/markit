/**
 * 員工身份標籤
 * 
 * 顯示在頂部 Header，標識當前為員工模式
 */

'use client';

import { UserCircle } from 'lucide-react';

export function StaffBadge() {
  return (
    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5">
      <UserCircle className="w-3.5 h-3.5 text-white" />
      <span className="text-xs text-white font-medium">員工模式</span>
    </div>
  );
}

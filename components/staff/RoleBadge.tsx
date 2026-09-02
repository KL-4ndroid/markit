/**
 * 員工角色 Badge（純顯示）
 *
 * 對應 supabase/migrations/043_staff_role_foundation.sql 的 staff_relationships.role 欄位。
 * 對應 lib/supabase/staff.ts 的 getMyStaffMembers() 注入。
 *
 * ## P3a 範圍
 * - 純顯示元件，不接受 onClick / onChange / ref
 * - 不引入任何 update / wrapper / RPC 呼叫
 * - 不影響 canEdit / canViewSensitiveData / infoLevel / isStaff
 *
 * ## 文案原則
 * - 只描述角色名稱，不承諾目前權限已生效
 * - 不寫「可操作」、「可管理」、「已開放」、「可修改」等誤導文字
 */

import type { StaffRole } from '@/types/staff';

interface RoleBadgeProps {
  role?: StaffRole;
  className?: string;
}

const ROLE_META: Record<StaffRole, { label: string; className: string }> = {
  viewer: {
    label: '查看者',
    className: 'bg-muted text-muted-foreground',
  },
  operator: {
    label: '出攤助手',
    className: 'bg-soft-green text-primary',
  },
  manager: {
    label: '管理員',
    className: 'bg-soft-yellow text-secondary',
  },
};

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  if (!role) {
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium ${className}`.trim()}
        title="未設定角色（DB 回傳為空）"
      >
        未設定
      </span>
    );
  }

  const meta = ROLE_META[role];
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.className} ${className}`.trim()}
      title={`角色：${meta.label}`}
    >
      {meta.label}
    </span>
  );
}

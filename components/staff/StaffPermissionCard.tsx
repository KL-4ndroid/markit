/**
 * 員工權限說明卡片
 * 
 * 顯示員工的權限範圍
 */

'use client';

import { Shield, Check, X } from 'lucide-react';

interface Permission {
  label: string;
  allowed: boolean;
}

interface StaffPermissionCardProps {
  permissions?: {
    can_view: boolean;
    can_edit: boolean;
  };
}

export function StaffPermissionCard({ permissions }: StaffPermissionCardProps) {
  const canEdit = permissions?.can_edit ?? false;
  
  const permissionList: Permission[] = [
    { label: '查看市集和商品', allowed: true },
    { label: '記錄互動和成交', allowed: canEdit },
    { label: '編輯商品資訊', allowed: canEdit },
    { label: '查看成本和利潤', allowed: false },
    { label: '編輯市集資訊', allowed: false },
    { label: '管理員工', allowed: false },
  ];

  return (
    <div className="bg-gradient-to-br from-[#F0E8F3] to-[#E8EAF3] rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="bg-[#8B7BA6] p-2 rounded-lg flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[#3A3A3A] mb-2">
            您的權限範圍
          </p>
          <ul className="space-y-1.5">
            {permissionList.map((permission, index) => (
              <li key={index} className="flex items-center gap-2 text-xs">
                {permission.allowed ? (
                  <Check className="w-3.5 h-3.5 text-[#8B7BA6] flex-shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-[#6B6B6B] flex-shrink-0" />
                )}
                <span className={permission.allowed ? 'text-[#3A3A3A]' : 'text-[#6B6B6B]'}>
                  {permission.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

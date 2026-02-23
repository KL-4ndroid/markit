'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Mail, Shield, X, Check, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  getMyStaff,
  inviteStaff,
  revokeStaff,
  updateStaffPermissions,
  isOwner,
} from '@/lib/supabase/staff';
import type { StaffRelationship } from '@/types/staff';

export default function StaffPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffRelationship[]>([]);
  const [isOwnerUser, setIsOwnerUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');

  // 檢查是否為老闆
  useEffect(() => {
    if (user) {
      isOwner().then(setIsOwnerUser);
    }
  }, [user]);

  // 載入員工列表
  useEffect(() => {
    if (user && isOwnerUser) {
      loadStaff();
    }
  }, [user, isOwnerUser]);

  async function loadStaff() {
    try {
      setLoading(true);
      const data = await getMyStaff();
      setStaff(data);
    } catch (error: any) {
      console.error('載入員工列表失敗:', error);
      toast.error('載入失敗', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  // 邀請員工
  async function handleInvite() {
    if (!email.trim()) {
      toast.error('請輸入 Email');
      return;
    }

    // 簡單的 Email 驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('請輸入有效的 Email');
      return;
    }

    setIsInviting(true);
    try {
      await inviteStaff({
        staff_email: email.trim(),
        permissions: { can_view: true, can_edit: false },
      });

      toast.success('邀請成功！', {
        description: `已向 ${email} 發送邀請`,
      });

      setEmail('');
      loadStaff();
    } catch (error: any) {
      console.error('邀請失敗:', error);
      toast.error('邀請失敗', {
        description: error.message,
      });
    } finally {
      setIsInviting(false);
    }
  }

  // 撤銷員工
  async function handleRevoke(staffItem: StaffRelationship) {
    if (!confirm(`確定要撤銷 ${staffItem.staff_email} 的權限嗎？`)) {
      return;
    }

    try {
      await revokeStaff(staffItem.id);
      toast.success('已撤銷權限');
      loadStaff();
    } catch (error: any) {
      console.error('撤銷失敗:', error);
      toast.error('撤銷失敗', {
        description: error.message,
      });
    }
  }

  // 切換編輯權限
  async function handleToggleEditPermission(staffItem: StaffRelationship) {
    try {
      const newPermissions = {
        ...staffItem.permissions,
        can_edit: !staffItem.permissions.can_edit,
      };

      await updateStaffPermissions(staffItem.id, newPermissions);
      toast.success('權限已更新');
      loadStaff();
    } catch (error: any) {
      console.error('更新權限失敗:', error);
      toast.error('更新失敗', {
        description: error.message,
      });
    }
  }

  // 格式化日期
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // 獲取狀態樣式
  function getStatusStyle(status: string) {
    switch (status) {
      case 'active':
        return 'bg-[#E8F3E8] text-[#3A3A3A]';
      case 'pending':
        return 'bg-[#FFF8E7] text-[#3A3A3A]';
      case 'revoked':
        return 'bg-[#F5E6E8] text-[#d4183d]';
      default:
        return 'bg-[#FAFAF8] text-[#6B6B6B]';
    }
  }

  // 獲取狀態文字
  function getStatusText(status: string) {
    switch (status) {
      case 'active':
        return '已接受';
      case 'pending':
        return '待接受';
      case 'revoked':
        return '已撤銷';
      default:
        return status;
    }
  }

  // 如果不是老闆，顯示提示
  if (!loading && !isOwnerUser) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
          <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-medium text-white opacity-90">
              員工管理
            </h1>
            <p className="text-white/80 text-sm">
              管理您的員工團隊 👥
            </p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-6 -mt-4">
          <div className="bg-white rounded-[1.5rem] p-12 shadow-lg shadow-[#7B9FA6]/10 text-center">
            <AlertCircle className="w-16 h-16 text-[#D4A574] mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-medium text-[#3A3A3A] mb-2">
              此功能僅限老闆使用
            </h2>
            <p className="text-[#6B6B6B] text-sm">
              您需要先創建自己的市集才能使用員工管理功能
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 載入中
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7B9FA6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B6B6B]">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-medium text-white opacity-90">
            員工管理
          </h1>
          <p className="text-white/80 text-sm">
            管理您的員工團隊 👥
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4 pb-6">
        {/* 邀請表單 */}
        <div className="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-[#7B9FA6]/10 mb-6">
          <h2 className="text-lg font-medium text-[#3A3A3A] mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#7B9FA6]" />
            邀請員工
          </h2>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
              <input
                type="email"
                placeholder="輸入員工 Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInvite();
                  }
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#FAFAF8] focus:outline-none focus:ring-2 focus:ring-[#7B9FA6]/50 text-[#3A3A3A]"
                disabled={isInviting}
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={isInviting || !email.trim()}
              className="px-6 py-3 bg-[#7B9FA6] text-white rounded-xl hover:bg-[#6A8E95] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isInviting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  邀請中
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  邀請
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-2">
            員工將可以查看您的市集和商品，但無法編輯
          </p>
        </div>

        {/* 員工列表 */}
        <div className="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-[#7B9FA6]/10">
          <h2 className="text-lg font-medium text-[#3A3A3A] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#7B9FA6]" />
            員工列表
            <span className="text-sm text-[#6B6B6B] font-normal">
              ({staff.length})
            </span>
          </h2>

          {staff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-[#7B9FA6] mx-auto mb-4 opacity-50" />
              <p className="text-[#6B6B6B] text-sm">
                尚未添加員工
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map((staffItem) => (
                <div
                  key={staffItem.id}
                  className="bg-[#FAFAF8] rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-[#3A3A3A]">
                          {staffItem.staff_email}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(staffItem.status)}`}>
                          {getStatusText(staffItem.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#6B6B6B]">
                        <Clock className="w-3 h-3" />
                        邀請時間：{formatDate(staffItem.invited_at)}
                      </div>
                      {staffItem.accepted_at && (
                        <div className="flex items-center gap-1 text-xs text-[#6B6B6B]">
                          <Check className="w-3 h-3" />
                          接受時間：{formatDate(staffItem.accepted_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 權限設定 */}
                  {staffItem.status === 'active' && (
                    <div className="flex items-center justify-between pt-3 border-t border-[#E5E5E5]">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#7B9FA6]" />
                        <span className="text-sm text-[#6B6B6B]">
                          編輯權限
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleEditPermission(staffItem)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          staffItem.permissions.can_edit
                            ? 'bg-[#7B9FA6] text-white'
                            : 'bg-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        {staffItem.permissions.can_edit ? '已啟用' : '已停用'}
                      </button>
                    </div>
                  )}

                  {/* 操作按鈕 */}
                  {staffItem.status === 'active' && (
                    <div className="mt-3">
                      <button
                        onClick={() => handleRevoke(staffItem)}
                        className="w-full px-4 py-2 bg-[#F5E6E8] text-[#d4183d] rounded-lg hover:bg-[#F5E6E8]/80 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        撤銷權限
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

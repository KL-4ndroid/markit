/**
 * 員工管理組件
 * 
 * 功能：
 * 1. 顯示當前所有員工列表
 * 2. 邀請新員工（輸入 email，選擇權限）
 * 3. 移除員工
 * 4. 員工可以訪問老闆的所有進行中的市集
 */

'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Users, Mail, Shield, Trash2, Plus, X, Eye, Edit3, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  email: string;
  status: 'pending' | 'active' | 'revoked';
  permissions: {
    can_view: boolean;
    can_edit: boolean;
  };
  joined_at: string;
}

export function StaffManagement() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // 載入員工列表
  useEffect(() => {
    if (user) {
      loadStaffList();
    }
  }, [user]);

  const loadStaffList = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // 直接從 staff_relationships 表查詢員工關係
      const { data: relationships, error: relError } = await supabase
        .from('staff_relationships')
        .select('staff_id, status, permissions, created_at')
        .eq('owner_id', user.id)
        .in('status', ['pending', 'active']); // ✅ 包含 pending 和 active

      if (relError) throw relError;

      if (!relationships || relationships.length === 0) {
        setStaffList([]);
        setIsLoading(false);
        return;
      }

      // 獲取員工的 email
      const staffIds = relationships.map(r => r.staff_id);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', staffIds);

      if (profileError) throw profileError;

      // 組合數據
      const staffData: StaffMember[] = profiles?.map(profile => {
        const relationship = relationships.find(r => r.staff_id === profile.id);
        
        return {
          id: profile.id,
          email: profile.email || '未知',
          status: relationship?.status || 'active',
          permissions: relationship?.permissions || { can_view: true, can_edit: false },
          joined_at: relationship?.created_at || new Date().toISOString(),
        };
      }) || [];

      setStaffList(staffData);
    } catch (error: any) {
      console.error('載入員工列表失敗:', error);
      toast.error('載入失敗：' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 邀請員工
  const handleInvite = async () => {
    if (!user) return;
    if (!inviteEmail.trim()) {
      toast.error('請輸入員工的 email');
      return;
    }

    setIsInviting(true);

    try {
      // 1. 檢查 email 是否存在
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', inviteEmail.trim().toLowerCase());

      if (profileError) throw profileError;

      if (!profiles || profiles.length === 0) {
        toast.error('找不到此 email 的用戶，請確認對方已註冊');
        return;
      }

      const staffId = profiles[0].id;
      const staffEmail = profiles[0].email;

      // 檢查是否已經是員工
      if (staffList.some(s => s.id === staffId)) {
        toast.error('此用戶已經是您的員工');
        return;
      }

      // 2. 創建員工關係（staff_relationships）
      // ✅ 固定權限：所有員工都可以查看和記錄互動/成交，但不能編輯
      const permissions = {
        can_view: true,
        can_edit: false,  // ✅ 固定為 false，員工不能編輯
      };

      const { error: relError } = await supabase
        .from('staff_relationships')
        .insert({
          owner_id: user.id,
          staff_id: staffId,
          staff_email: staffEmail,
          status: 'pending', // ✅ 設置為 pending（需要員工接受邀請）
          permissions,
        });

      if (relError) {
        if (relError.code === '23505') {
          toast.error('此用戶已經是您的員工');
          return;
        }
        throw relError;
      }

      toast.success(`✅ 已發送邀請給 ${inviteEmail}，等待對方接受`);
      
      // 重新載入列表
      await loadStaffList();
      
      // 關閉對話框
      setShowInviteDialog(false);
      setInviteEmail('');

    } catch (error: any) {
      console.error('邀請員工失敗:', error);
      toast.error('邀請失敗：' + error.message);
    } finally {
      setIsInviting(false);
    }
  };

  // 移除員工
  const handleRemove = async (staffId: string, email: string) => {
    if (!user) return;

    if (!confirm(`確定要移除員工「${email}」嗎？\n\n移除後，該員工將無法訪問您的任何市集。`)) {
      return;
    }

    try {
      // 1. 刪除員工關係
      const { error: relError } = await supabase
        .from('staff_relationships')
        .delete()
        .eq('owner_id', user.id)
        .eq('staff_id', staffId);

      if (relError) throw relError;

      // 2. 獲取所有自己的市集 ID
      const { data: markets, error: marketsError } = await supabase
        .from('markets')
        .select('id')
        .eq('owner_id', user.id);

      if (marketsError) throw marketsError;

      // 3. 刪除所有 market_members 記錄
      if (markets && markets.length > 0) {
        const marketIds = markets.map(m => m.id);
        
        const { error: membersError } = await supabase
          .from('market_members')
          .delete()
          .eq('user_id', staffId)
          .eq('role', 'staff')
          .in('market_id', marketIds);

        if (membersError) throw membersError;
      }

      toast.success(`✅ 已移除員工 ${email}`);
      
      // 重新載入列表
      await loadStaffList();

    } catch (error: any) {
      console.error('移除員工失敗:', error);
      toast.error('移除失敗：' + error.message);
    }
  };

  if (!user) {
    return (
      <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-[#7B9FA6]" />
          <h2 className="text-lg font-medium text-[#3A3A3A]">員工管理</h2>
        </div>
        <p className="text-sm text-[#6B6B6B] mb-4">
          邀請員工協助管理市集
        </p>
        <div className="bg-[#FFF8E7] rounded-xl p-4 text-center">
          <p className="text-sm text-[#6B6B6B]">
            請先登入 Supabase 帳號才能使用此功能
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-[#7B9FA6]" />
          <h2 className="text-lg font-medium text-[#3A3A3A]">員工管理</h2>
        </div>
        <p className="text-sm text-[#6B6B6B] mb-4">
          邀請員工協助管理市集，員工可以訪問您所有進行中的市集
        </p>

        {/* 說明區塊 */}
        <div className="bg-gradient-to-br from-[#E8F0F8] to-[#E8F3E8] rounded-xl p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-[#7B9FA6] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#3A3A3A] mb-2">
                💡 員工權限說明
              </p>
              <ul className="text-xs text-[#6B6B6B] space-y-1">
                <li>• <strong>可以做的事</strong>：查看市集和商品、記錄互動、記錄成交</li>
                <li>• <strong>不能做的事</strong>：編輯市集、編輯商品、新增商品、新增市集</li>
                <li>• <strong>敏感數據保護</strong>：員工無法查看成本、利潤、總收入</li>
                <li>• 員工可以訪問<strong>所有進行中的市集</strong>（ongoing、registered、accepted、paid）</li>
                <li>• 員工<strong>無法訪問</strong>已完成或已取消的市集</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 員工列表 */}
        {isLoading ? (
          <div className="text-center py-8 text-[#6B6B6B]">
            載入中...
          </div>
        ) : staffList.length === 0 ? (
          <div className="bg-[#FAFAF8] rounded-xl p-6 text-center mb-4">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-sm text-[#3A3A3A] mb-2">
              尚未邀請任何員工
            </p>
            <p className="text-xs text-[#6B6B6B]">
              點擊下方按鈕邀請您的第一位員工
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {staffList.map(staff => (
              <div
                key={staff.id}
                className="bg-[#FAFAF8] rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-[#7B9FA6]" />
                    <span className="text-sm font-medium text-[#3A3A3A]">
                      {staff.email}
                    </span>
                    {staff.status === 'pending' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFF8E7] text-[#D4A574] font-medium">
                        待接受
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-[#6B6B6B]" />
                    <span className="text-xs text-[#6B6B6B] flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      可查看與記錄
                    </span>
                    <span className="text-xs text-[#6B6B6B]">
                      • {staff.status === 'pending' ? '邀請於' : '加入於'} {new Date(staff.joined_at).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(staff.id, staff.email)}
                  className="ml-4 p-2 rounded-xl bg-[#F5E6E8] text-[#d4183d] hover:bg-[#E5D6D8] transition-colors"
                  title={staff.status === 'pending' ? '取消邀請' : '移除員工'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 邀請按鈕 */}
        <button
          onClick={() => setShowInviteDialog(true)}
          className="w-full px-4 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          邀請員工
        </button>
      </div>

      {/* 邀請對話框 */}
      <Transition appear show={showInviteDialog} as={Fragment}>
        <Dialog as="div" className="relative z-[10000]" onClose={() => setShowInviteDialog(false)}>
          {/* 背景遮罩 */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          {/* 對話框容器 */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="text-lg font-medium text-[#3A3A3A]">
                      邀請員工
                    </Dialog.Title>
                    <button
                      onClick={() => setShowInviteDialog(false)}
                      className="p-2 rounded-xl hover:bg-[#FAFAF8] transition-colors"
                    >
                      <X className="w-5 h-5 text-[#6B6B6B]" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Email 輸入 */}
                    <div>
                      <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                        員工 Email
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-4 py-3 rounded-2xl border border-[#7B9FA6]/20 focus:border-[#7B9FA6] focus:outline-none transition-colors"
                      />
                      <p className="text-xs text-[#6B6B6B] mt-2">
                        請輸入已註冊用戶的 email
                      </p>
                    </div>

                    {/* 權限說明（固定） */}
                    <div>
                      <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                        員工權限
                      </label>
                      <div className="p-4 rounded-xl border border-[#7B9FA6]/20 bg-[#E8F0F8]">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="w-5 h-5 text-[#7B9FA6]" />
                          <span className="text-sm font-medium text-[#3A3A3A]">固定權限</span>
                        </div>
                        <ul className="text-xs text-[#6B6B6B] space-y-1">
                          <li>✅ 可以查看市集和商品</li>
                          <li>✅ 可以記錄互動、成交</li>
                          <li>❌ 不能編輯商品</li>
                          <li>❌ 不能編輯市集</li>
                          <li>❌ 不能新增商品、市集</li>
                          <li>❌ 不能查看成本、利潤</li>
                        </ul>
                      </div>
                    </div>

                    {/* 按鈕 */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowInviteDialog(false)}
                        className="flex-1 px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors font-medium"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleInvite}
                        disabled={isInviting || !inviteEmail.trim()}
                        className="flex-1 px-4 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isInviting ? '邀請中...' : '確認邀請'}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

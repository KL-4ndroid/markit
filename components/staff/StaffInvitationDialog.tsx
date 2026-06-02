/**
 * 員工邀請接受對話框
 * 
 * 當用戶登入時，如果有待處理的邀請，顯示此對話框
 * 用戶可以選擇接受或拒絕邀請
 * 
 * 接受邀請的流程：
 * 1. 更新邀請狀態為 active
 * 2. 補齊員工可訪問市集的 market_members 記錄
 * 3. 清除本機快取資料
 * 4. 重新載入頁面，以員工身份同步數據
 * 
 * 拒絕邀請的流程：
 * 1. 更新邀請狀態為 revoked
 * 2. 繼續使用原有身份
 */

'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle, Users, Shield, Trash2, CheckCircle, X } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PendingInvitation {
  id: string;
  owner_id: string;
  owner_email: string;
  permissions: {
    can_view: boolean;
    can_edit: boolean;
  };
  invited_at: string;
}

export function StaffInvitationDialog() {
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<PendingInvitation | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 檢查是否有待處理的邀請
  const checkPendingInvitation = useCallback(async () => {
    if (!user) return;

    try {
      // 查詢待處理的邀請
      const { data, error } = await supabase
        .from('staff_relationships')
        .select('id, owner_id, permissions, invited_at')
        .eq('staff_id', user.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        // 獲取老闆的 email
        const { data: ownerProfile, error: ownerError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', data[0].owner_id)
          .single();

        if (ownerError) throw ownerError;

        setInvitation({
          ...data[0],
          owner_email: ownerProfile?.email || '未知',
        });
        setIsOpen(true);
      }
    } catch (error: any) {
      console.error('檢查邀請失敗:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkPendingInvitation();
    }
  }, [user, checkPendingInvitation]);

  // 接受邀請
  const handleAccept = async () => {
    if (!user || !invitation) return;

    const confirmed = confirm(
      '接受員工邀請後，系統會切換到員工模式並清除本機快取資料。\n\n' +
      '雲端個人資料不會在這個流程中刪除；如需刪除個人資料，請到設定頁另外操作。\n\n' +
      '是否繼續？'
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      toast.loading('正在接受邀請...', { id: 'accept-invitation' });

      const { error: updateError } = await supabase
        .from('staff_relationships')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id)
        .eq('staff_id', user.id);

      if (updateError) throw updateError;

      const { data: ownerMarkets, error: ownerMarketsError } = await supabase
        .from('markets')
        .select('id')
        .eq('owner_id', invitation.owner_id)
        .in('status', ['ongoing', 'registered', 'accepted', 'paid']);

      if (ownerMarketsError) throw ownerMarketsError;

      const marketIds = ownerMarkets?.map(market => market.id) || [];
      if (marketIds.length > 0) {
        const { data: existingMembers, error: existingMembersError } = await supabase
          .from('market_members')
          .select('market_id')
          .eq('user_id', user.id)
          .in('market_id', marketIds);

        if (existingMembersError) throw existingMembersError;

        const existingMarketIds = new Set((existingMembers || []).map(member => member.market_id));
        const memberRecords = marketIds
          .filter(marketId => !existingMarketIds.has(marketId))
          .map(marketId => ({
            market_id: marketId,
            user_id: user.id,
            role: 'staff',
            joined_at: new Date().toISOString(),
          }));

        if (memberRecords.length > 0) {
          const { error: membersError } = await supabase
            .from('market_members')
            .insert(memberRecords);

          if (membersError) throw membersError;
        }
      }

      const { clearAllData } = await import('@/lib/db');
      const { resetInitialSyncFlag } = await import('@/hooks/useSync');
      const { clearRoleCache } = await import('@/hooks/useUserRole');

      await clearAllData();
      resetInitialSyncFlag();
      clearRoleCache();

      toast.success('已接受邀請，正在重新載入資料...', { id: 'accept-invitation' });

      sessionStorage.setItem('force_initial_sync', '1');
      window.location.reload();

    } catch (error: any) {
      console.error('接受邀請失敗:', error);
      toast.error('接受邀請失敗：' + (error.message || '未知錯誤'), { id: 'accept-invitation' });
      setIsProcessing(false);
    }
  };

  // 拒絕邀請
  const handleReject = async () => {
    if (!user || !invitation) return;

    const confirmed = confirm(
      '確定要拒絕邀請嗎？\n\n' +
      '拒絕後，您將繼續使用原有身份。'
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      toast.loading('正在處理...', { id: 'reject-invitation' });

      // ✅ 直接刪除記錄（而不是更新 status 為 revoked）
      // 這樣老闆可以再次邀請同一個員工
      const { error } = await supabase
        .from('staff_relationships')
        .delete()
        .eq('id', invitation.id);

      if (error) throw error;

      toast.success('✅ 已拒絕邀請', { id: 'reject-invitation' });

      // 關閉對話框
      setIsOpen(false);
      setInvitation(null);

    } catch (error: any) {
      console.error('拒絕邀請失敗:', error);
      toast.error('拒絕邀請失敗：' + error.message, { id: 'reject-invitation' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!invitation) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[10001]" onClose={() => {}}>
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white p-8 shadow-2xl transition-all">
                {/* 圖標 */}
                <div className="flex justify-center mb-6">
                  <div className="p-4 rounded-full bg-gradient-to-br from-[#7B9FA6]/10 to-[#D4A574]/10">
                    <Users className="w-12 h-12 text-[#7B9FA6]" />
                  </div>
                </div>

                {/* 標題 */}
                <Dialog.Title className="text-2xl font-medium text-[#3A3A3A] mb-3 text-center">
                  員工邀請
                </Dialog.Title>

                {/* 描述 */}
                <p className="text-center text-[#6B6B6B] mb-6">
                  <strong>{invitation.owner_email}</strong> 邀請您成為員工
                </p>

                {/* 權限信息 */}
                <div className="bg-[#E8F3E8] rounded-2xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-[#7B9FA6]" />
                    <span className="text-sm font-medium text-[#3A3A3A]">
                      您將獲得的權限
                    </span>
                  </div>
                  <ul className="text-sm text-[#6B6B6B] space-y-1">
                    <li>✅ 可以查看老闆的市集和商品</li>
                    <li>✅ 可以記錄互動、成交</li>
                    <li>❌ 不能編輯商品、市集</li>
                    <li>❌ 不能新增商品、市集</li>
                    <li>❌ 無法查看成本、利潤等敏感數據</li>
                  </ul>
                </div>

                {/* 警告信息 */}
                <div className="bg-[#FFF8E7] border-2 border-[#D4A574]/30 rounded-2xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-[#D4A574] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#3A3A3A] mb-2">
                        ⚠️ 重要提醒
                      </p>
                      <ul className="text-xs text-[#6B6B6B] space-y-1">
                        <li>• <strong>您的本機快取資料將被清除</strong></li>
                        <li>• <strong>您的雲端個人資料不會在此流程中刪除</strong></li>
                        <li>• 您將無法再訪問自己原有的市集和商品</li>
                        <li>• 您只能訪問老闆的市集和商品</li>
                        <li>• <strong className="text-[#d4183d]">接受後會切換為員工模式</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 建議 */}
                <div className="bg-[#E8F0F8] rounded-2xl p-4 mb-6">
                  <p className="text-sm font-medium text-[#3A3A3A] mb-2">
                    💡 建議
                  </p>
                  <ul className="text-xs text-[#6B6B6B] space-y-1">
                    <li>• 如果您有重要數據，請先備份</li>
                    <li>• 如果您想保留自己的市集，請拒絕邀請</li>
                    <li>• 如果您只是想協助老闆，接受邀請是最佳選擇</li>
                  </ul>
                </div>

                {/* 按鈕 */}
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-4 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    拒絕邀請
                  </button>
                  <button
                    onClick={handleAccept}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-br from-[#7B9FA6] to-[#6A8E95] text-white hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    接受邀請
                  </button>
                </div>

                {/* 提示 */}
                <p className="text-xs text-center text-[#6B6B6B] mt-4">
                  請仔細閱讀上述說明後再做決定
                </p>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

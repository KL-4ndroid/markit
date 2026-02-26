/**
 * 員工邀請接受對話框
 * 
 * 當用戶登入時，如果有待處理的邀請，顯示此對話框
 * 用戶可以選擇接受或拒絕邀請
 * 
 * 接受邀請的流程：
 * 1. 清除本地數據（IndexedDB）
 * 2. 清除雲端數據（Supabase）
 * 3. 更新邀請狀態為 active
 * 4. 重新載入頁面，以員工身份同步數據
 * 
 * 拒絕邀請的流程：
 * 1. 更新邀請狀態為 revoked
 * 2. 繼續使用原有身份
 */

'use client';

import { Fragment, useEffect, useState } from 'react';
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
  useEffect(() => {
    if (user) {
      checkPendingInvitation();
    }
  }, [user]);

  const checkPendingInvitation = async () => {
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
  };

  // 接受邀請
  const handleAccept = async () => {
    if (!user || !invitation) return;

    const confirmed = confirm(
      '⚠️ 重要提醒\n\n' +
      '接受邀請後，您將成為員工，並且：\n\n' +
      '1. 您的本地數據將被清除\n' +
      '2. 您的雲端數據將被刪除（如果有）\n' +
      '3. 您將無法再訪問自己原有的市集和商品\n' +
      '4. 您只能訪問老闆的市集和商品\n' +
      '5. 您無法查看成本、利潤等敏感數據\n\n' +
      '此操作無法復原！\n\n' +
      '確定要繼續嗎？'
    );

    if (!confirmed) return;

    setIsProcessing(true);

    try {
      toast.loading('正在處理邀請...', { id: 'accept-invitation' });

      // 1. 清除雲端數據
      console.log('🗑️ 清除雲端數據...');

      // 刪除所有事件
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('actor_id', user.id);

      if (eventsError) throw eventsError;

      // 獲取所有市集 ID
      const { data: marketsData, error: marketsQueryError } = await supabase
        .from('markets')
        .select('id')
        .eq('owner_id', user.id);

      if (marketsQueryError) throw marketsQueryError;

      const marketIds = marketsData?.map(m => m.id) || [];

      // 刪除所有商品
      if (marketIds.length > 0) {
        const { error: productsError } = await supabase
          .from('products')
          .delete()
          .in('market_id', marketIds);

        if (productsError) throw productsError;
      }

      // 刪除所有市集
      const { error: marketsDeleteError } = await supabase
        .from('markets')
        .delete()
        .eq('owner_id', user.id);

      if (marketsDeleteError) throw marketsDeleteError;

      console.log('✅ 雲端數據已清除');

      // 2. 更新邀請狀態為 active
      console.log('✅ 接受邀請...');

      const { error: updateError } = await supabase
        .from('staff_relationships')
        .update({
          status: 'active',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      console.log('✅ 邀請已接受');

      // 3. 獲取老闆的所有進行中的市集
      console.log('🔍 獲取老闆的市集...');

      const { data: ownerMarkets, error: ownerMarketsError } = await supabase
        .from('markets')
        .select('id')
        .eq('owner_id', invitation.owner_id)
        .in('status', ['ongoing', 'registered', 'accepted', 'paid']);

      if (ownerMarketsError) throw ownerMarketsError;

      // 4. 為每個市集創建 market_members 記錄
      if (ownerMarkets && ownerMarkets.length > 0) {
        console.log(`📝 添加到 ${ownerMarkets.length} 個市集...`);

        const memberRecords = ownerMarkets.map(market => ({
          market_id: market.id,
          user_id: user.id,
          role: 'staff',
          joined_at: new Date().toISOString(),
        }));

        const { error: membersError } = await supabase
          .from('market_members')
          .insert(memberRecords);

        if (membersError) throw membersError;

        console.log('✅ 已添加到所有市集');
      }

      // 5. 清除本地數據
      console.log('🗑️ 清除本地數據...');

      await indexedDB.deleteDatabase('MarketPulseDB');

      console.log('✅ 本地數據已清除');

      toast.success('✅ 已接受邀請，即將重新載入...', { id: 'accept-invitation' });

      // 6. 重新載入頁面
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('接受邀請失敗:', error);
      toast.error('接受邀請失敗：' + error.message, { id: 'accept-invitation' });
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
                    <li>• 可以查看老闆的市集和商品</li>
                    {invitation.permissions.can_edit ? (
                      <li>• 可以記錄互動、成交，編輯商品</li>
                    ) : (
                      <li>• 僅能查看，無法編輯</li>
                    )}
                    <li>• 無法查看成本、利潤等敏感數據</li>
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
                        <li>• <strong>您的本地數據將被清除</strong></li>
                        <li>• <strong>您的雲端數據將被刪除</strong>（如果有）</li>
                        <li>• 您將無法再訪問自己原有的市集和商品</li>
                        <li>• 您只能訪問老闆的市集和商品</li>
                        <li>• <strong className="text-[#d4183d]">此操作無法復原！</strong></li>
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

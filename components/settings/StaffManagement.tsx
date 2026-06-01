/**
 * 員工管理組件
 * 
 * 功能：
 * 1. 顯示當前所有員工列表
 * 2. 邀請新員工（輸入 email，選擇權限）
 * 3. 產生邀請連結（透過連結邀請新用戶）
 * 4. 移除員工
 * 5. 員工可以訪問老闆的所有進行中的市集
 */

'use client';

import { useCallback, useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Users, Mail, Shield, Trash2, Plus, X, Eye, Edit3, AlertCircle, Link2, Copy, QrCode, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  createInvitation,
  getMyInvitations,
  deleteInvitation,
  generateInvitationUrl,
  formatRemainingTime,
  type StaffInvitation,
} from '@/lib/supabase/staff-invitations';
import { getMyStaffMembers, type StaffMember, inviteStaff } from '@/lib/supabase/staff';

export function StaffManagement() {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  // 邀請連結相關狀態
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [creatingInvitation, setCreatingInvitation] = useState(false);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [showInvitationsSection, setShowInvitationsSection] = useState(false);

  // 載入員工列表和邀請連結
  const loadStaffList = useCallback(async () => {
    try {
      setIsLoading(true);

      const staffData = await getMyStaffMembers();
      setStaffList(staffData);
    } catch (error: any) {
      console.error('載入員工列表失敗:', error);
      toast.error('載入失敗：' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 邀請員工
  const handleInvite = async () => {
    if (!user) return;
    if (!inviteEmail.trim()) {
      toast.error('請輸入員工的 email');
      return;
    }

    // ✅ 本地檢查：避免多一次 DB round-trip
    if (staffList.some(s => s.email.toLowerCase() === inviteEmail.trim().toLowerCase())) {
      toast.error('此用戶已經是您的員工');
      return;
    }

    setIsInviting(true);
    try {
      // ✅ 使用 service 函式處理邀請邏輯
      await inviteStaff({ staff_email: inviteEmail.trim() });

      toast.success(`✅ 已發送邀請給 ${inviteEmail}，等待對方接受`);

      // 重新載入列表
      await loadStaffList();

      // 關閉對話框
      setShowInviteDialog(false);
      setInviteEmail('');

    } catch (error: any) {
      console.error('邀請員工失敗:', error);
      if (error.message?.includes('已經')) {
        toast.error('此用戶已經是您的員工');
      } else {
        toast.error('邀請失敗：' + error.message);
      }
    } finally {
      setIsInviting(false);
    }
  };

  // 載入邀請連結列表
  const loadInvitations = useCallback(async () => {
    try {
      setLoadingInvitations(true);
      const data = await getMyInvitations();
      setInvitations(data);
    } catch (error: any) {
      console.error('載入邀請列表失敗:', error);
    } finally {
      setLoadingInvitations(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadStaffList();
      loadInvitations();
    }
  }, [user, loadStaffList, loadInvitations]);

  // 產生邀請連結
  const handleCreateInvitation = async () => {
    setCreatingInvitation(true);
    try {
      const invitation = await createInvitation();
      toast.success('邀請連結已建立！', {
        description: '有效期限為 3 天',
      });
      loadInvitations();
    } catch (error: any) {
      console.error('建立邀請失敗:', error);
      toast.error('建立失敗', {
        description: error.message,
      });
    } finally {
      setCreatingInvitation(false);
    }
  };

  // 刪除邀請連結
  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('確定要刪除此邀請連結嗎？')) {
      return;
    }

    try {
      await deleteInvitation(invitationId);
      toast.success('已刪除邀請連結');
      loadInvitations();
    } catch (error: any) {
      console.error('刪除邀請失敗:', error);
      toast.error('刪除失敗', {
        description: error.message,
      });
    }
  };

  // 複製邀請連結
  const handleCopyLink = (token: string) => {
    const url = generateInvitationUrl(token);
    navigator.clipboard.writeText(url);
    toast.success('已複製連結！', {
      description: '可以分享給員工了',
    });
  };

  // 檢查邀請是否過期
  const isExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
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
        邀請員工協助管理市集，員工可以訪問您所有進行中的市集
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

        {/* 邀請按鈕組 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowInviteDialog(true)}
            className="px-4 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Email 邀請
          </button>
          <button
            onClick={() => setShowInvitationsSection(!showInvitationsSection)}
            className="px-4 py-3 rounded-2xl bg-[#E8F3E8] text-[#3A3A3A] hover:bg-[#D8E3D8] transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            邀請連結
          </button>
        </div>

        {/* 邀請連結區塊 */}
        {showInvitationsSection && (
          <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#3A3A3A] flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#7B9FA6]" />
                邀請連結管理
              </h3>
              <button
                onClick={handleCreateInvitation}
                disabled={creatingInvitation}
                className="px-3 py-1.5 bg-[#7B9FA6] text-white rounded-lg hover:bg-[#6A8E95] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              >
                {creatingInvitation ? '建立中...' : '產生新連結'}
              </button>
            </div>

            <p className="text-xs text-[#6B6B6B] mb-3">
              產生邀請連結後，新用戶可透過連結註冊並自動加入您的團隊。每個連結有效期為 3 天，可重複使用。
            </p>

            {loadingInvitations ? (
              <div className="text-center py-4 text-xs text-[#6B6B6B]">
                載入中...
              </div>
            ) : invitations.length === 0 ? (
              <div className="bg-[#FAFAF8] rounded-xl p-4 text-center">
                <Link2 className="w-8 h-8 text-[#7B9FA6] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[#6B6B6B]">
                  尚未建立邀請連結
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {invitations.map((invitation) => {
                  const url = generateInvitationUrl(invitation.token);
                  const expired = isExpired(invitation.expires_at);

                  return (
                    <div
                      key={invitation.id}
                      className={`bg-[#FAFAF8] rounded-xl p-3 ${
                        expired ? 'opacity-50' : ''
                      }`}
                    >
                      {/* 連結資訊 */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {expired ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F5E6E8] text-[#d4183d]">
                                已過期
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#E8F3E8] text-[#3A3A3A]">
                                有效
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-xs text-[#6B6B6B]">
                              <Clock className="w-3 h-3" />
                              {expired ? '已過期' : `剩餘 ${formatRemainingTime(invitation.expires_at)}`}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-[#E5E5E5]">
                            <p className="text-xs text-[#6B6B6B] font-mono break-all">
                              {url}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 操作按鈕 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyLink(invitation.token)}
                          disabled={expired}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-[#7B9FA6] text-white rounded-lg hover:bg-[#6A8E95] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                        >
                          <Copy className="w-3 h-3" />
                          複製
                        </button>
                        <button
                          onClick={() => setShowQRCode(showQRCode === invitation.token ? null : invitation.token)}
                          disabled={expired}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-[#E8F3E8] text-[#3A3A3A] rounded-lg hover:bg-[#D8E3D8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                        >
                          <QrCode className="w-3 h-3" />
                          QR
                        </button>
                        <button
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="flex items-center justify-center px-3 py-1.5 bg-[#F5E6E8] text-[#d4183d] rounded-lg hover:bg-[#F5E6E8]/80 transition-colors text-xs font-medium"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* QR Code 顯示 */}
                      {showQRCode === invitation.token && !expired && (
                        <div className="mt-3 pt-3 border-t border-[#E5E5E5]">
                          <div className="bg-white rounded-lg p-3 flex flex-col items-center">
                            <p className="text-xs font-medium text-[#3A3A3A] mb-2">
                              掃描 QR Code 加入團隊
                            </p>
                            <QRCodeSVG
                              value={url}
                              size={160}
                              level="H"
                              includeMargin={true}
                            />
                            <p className="text-xs text-[#6B6B6B] mt-2 text-center">
                              員工可使用手機掃描此 QR Code 快速註冊
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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

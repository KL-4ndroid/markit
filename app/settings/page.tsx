'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, RotateCcw, Database, Trash2, Cloud, HardDrive, AlertTriangle, Edit, ChevronDown, ChevronUp, Sparkles, LogOut, Eye, Edit3 } from 'lucide-react';
import { getInteractionButtons, resetInteractionButtons, isInteractionSetupComplete, type InteractionButton } from '@/lib/interaction-buttons-store';
import { InteractionSetupWizard } from '@/components/settings/InteractionSetupWizard';
import { StaffManagement } from '@/components/settings/StaffManagement';
import { toast } from 'sonner';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { useAuth } from '@/lib/supabase/auth-context';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase/client';
import { getGradientClass } from '@/lib/theme-config';
import { StaffPermissionCard } from '@/components/staff/StaffPermissionCard';
import { OwnerInfoCard } from '@/components/staff/OwnerInfoCard';

export default function SettingsPage() {
  const router = useRouter();
  const [buttons, setButtons] = useState<InteractionButton[]>([]);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [isStaffManagementExpanded, setIsStaffManagementExpanded] = useState(false);
  const [isInteractionExpanded, setIsInteractionExpanded] = useState(false);
  const [isDatabaseExpanded, setIsDatabaseExpanded] = useState(false);
  const { user, signOut } = useAuth();
  const { userRole, isStaff } = useUserRole();

  useEffect(() => {
    setButtons(getInteractionButtons());
    setIsSetupComplete(isInteractionSetupComplete());
  }, []);

  const handleResetInteraction = () => {
    if (confirm('確定要重置互動設定嗎？重置後需要重新設定。')) {
      resetInteractionButtons();
      setButtons(getInteractionButtons());
      setIsSetupComplete(false);
      toast.success('🔄 已重置互動設定');
      
      // 觸發 storage 事件
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleWizardComplete = () => {
    setButtons(getInteractionButtons());
    setIsSetupComplete(true);
    
    // 觸發 storage 事件
    window.dispatchEvent(new Event('storage'));
  };

  const handleClearLocalDatabase = async () => {
    if (!confirm('⚠️ 警告：這將清除所有本地資料（市集、商品、統計等），此操作無法復原！\n\n確定要繼續嗎？')) {
      return;
    }

    try {
      // 刪除 IndexedDB
      await indexedDB.deleteDatabase('MarketPulseDB');
      
      toast.success('✅ 本地資料庫已清除');
      toast.info('🔄 頁面將在 2 秒後重新載入...');
      
      // 延遲刷新頁面
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('清除本地資料庫失敗:', error);
      toast.error('清除失敗，請稍後再試');
    }
  };

  const handleClearOnlineDatabase = async () => {
    if (!user) {
      toast.error('請先登入 Supabase 帳號');
      return;
    }

    const confirmText = prompt(
      '⚠️⚠️⚠️ DANGER: PERMANENT DATA DELETION ⚠️⚠️⚠️\n\n' +
      '這將永久刪除您在 Supabase 雲端的所有資料：\n' +
      'This will permanently delete all your data from Supabase cloud:\n\n' +
      '• 所有市集記錄 (All market records)\n' +
      '• 所有商品資料 (All product data)\n' +
      '• 所有事件歷史 (All event history)\n' +
      '• 所有統計資料 (All statistics)\n' +
      '• 本地資料庫 (Local database)\n\n' +
      '⚠️ 此操作無法復原！(This action CANNOT be undone!)\n' +
      '⚠️ 所有設備的資料都會被清除！(All devices will be affected!)\n' +
      '⚠️ 本地資料也會同時清除，防止重新上傳！(Local data will also be cleared!)\n\n' +
      '如果您確定要繼續，請輸入 DELETE：\n' +
      'If you are sure, type DELETE:'
    );

    if (confirmText !== 'DELETE') {
      toast.info('已取消操作 (Operation cancelled)');
      return;
    }

    const toastId = toast.loading('正在清除所有資料...');

    try {
      // ✅ 步驟 1：優先清除本地資料（防止重新上傳）
      console.log('🧹 步驟 1/3：清除本地資料...');
      
      try {
        const { db } = await import('@/lib/db');
        await db.markets.clear();
        await db.products.clear();
        await db.events.clear();
        await db.dailyStats.clear();
        console.log('✅ 數據表已清除');
      } catch (dbError) {
        console.error('清除數據表失敗:', dbError);
      }
      
      try {
        await indexedDB.deleteDatabase('MarketPulseDB');
        console.log('✅ IndexedDB 已刪除');
      } catch (idbError) {
        console.error('刪除 IndexedDB 失敗:', idbError);
      }
      
      try {
        const keysToRemove = [
          'user_role_cache',
          'logout_history',
          'hasCompletedInitialSync',
        ];
        
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.error(`清除 ${key} 失敗:`, e);
          }
        });
        
        sessionStorage.clear();
        console.log('✅ 緩存已清除');
      } catch (storageError) {
        console.error('清除緩存失敗:', storageError);
      }
      
      try {
        const { resetInitialSyncFlag } = await import('@/hooks/useSync');
        const { clearRoleCache } = await import('@/hooks/useUserRole');
        resetInitialSyncFlag();
        clearRoleCache();
        console.log('✅ 同步標記已重置');
      } catch (resetError) {
        console.error('重置標記失敗:', resetError);
      }

      toast.loading('正在清除雲端資料...', { id: toastId });

      // ✅ 步驟 2：刪除雲端資料（正確順序：事件 → 商品 → 市集）
      console.log('☁️ 步驟 2/3：刪除雲端資料...');

      // 1. 獲取所有市集 ID（先查詢，後續刪除時需要）
      const { data: marketsData, error: marketsQueryError } = await supabase
        .from('markets')
        .select('id')
        .eq('owner_id', user.id);

      if (marketsQueryError) throw marketsQueryError;

      const marketIds = marketsData?.map(m => m.id) || [];
      console.log(`📊 找到 ${marketIds.length} 個市集`);

      // 2. 刪除所有事件（包括市集事件和全局事件）
      if (marketIds.length > 0) {
        // 刪除市集相關的所有事件（不限 actor_id）
        const { error: marketEventsError } = await supabase
          .from('events')
          .delete()
          .in('market_id', marketIds);

        if (marketEventsError) {
          console.error('刪除市集事件失敗:', marketEventsError);
          throw marketEventsError;
        }
        console.log('✅ 市集事件已刪除');
      }

      // 刪除全局事件（actor_id = user.id 且 market_id = null）
      const { error: globalEventsError } = await supabase
        .from('events')
        .delete()
        .eq('actor_id', user.id)
        .is('market_id', null);

      if (globalEventsError) {
        console.error('刪除全局事件失敗:', globalEventsError);
        throw globalEventsError;
      }
      console.log('✅ 全局事件已刪除');

      // 3. 刪除所有商品
      if (marketIds.length > 0) {
        const { error: productsError } = await supabase
          .from('products')
          .delete()
          .in('market_id', marketIds);

        if (productsError) {
          console.error('刪除商品失敗:', productsError);
          throw productsError;
        }
        console.log('✅ 商品已刪除');
      }

      // 刪除全局商品（owner_id = user.id 且 market_id = null）
      const { error: globalProductsError } = await supabase
        .from('products')
        .delete()
        .eq('owner_id', user.id)
        .is('market_id', null);

      if (globalProductsError) {
        console.error('刪除全局商品失敗:', globalProductsError);
        throw globalProductsError;
      }
      console.log('✅ 全局商品已刪除');

      // 4. 刪除 market_members 記錄
      if (marketIds.length > 0) {
        const { error: membersError } = await supabase
          .from('market_members')
          .delete()
          .in('market_id', marketIds);

        if (membersError) {
          console.error('刪除 market_members 失敗:', membersError);
          // 不拋出錯誤，繼續執行
        } else {
          console.log('✅ market_members 已刪除');
        }
      }

      // 5. 刪除所有市集（最後刪除，避免外鍵約束錯誤）
      const { error: marketsError } = await supabase
        .from('markets')
        .delete()
        .eq('owner_id', user.id);

      if (marketsError) {
        console.error('刪除市集失敗:', marketsError);
        throw marketsError;
      }
      console.log('✅ 市集已刪除');

      // 6. 刪除快照（如果有）
      const { error: snapshotsError } = await supabase
        .from('snapshots')
        .delete()
        .eq('user_id', user.id);

      if (snapshotsError) {
        console.error('刪除快照失敗:', snapshotsError);
        // 不拋出錯誤，繼續執行
      } else {
        console.log('✅ 快照已刪除');
      }

      console.log('✅ 雲端資料已完全清除');

      // ✅ 步驟 3：重新載入頁面
      toast.success('✅ 所有資料已清除，即將重新載入...', { id: toastId });
      
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (error: any) {
      console.error('清除資料失敗:', error);
      toast.error(`清除失敗：${error.message || '請稍後再試'}`, { id: toastId });
      
      // ✅ 錯誤處理：本地資料已清除，建議重新載入
      const shouldReload = confirm(
        '清除資料時發生錯誤，但本地資料已清除。\n\n' +
        'An error occurred, but local data has been cleared.\n\n' +
        '建議重新載入頁面以確保狀態正確。\n' +
        'Recommend reloading the page to ensure correct state.\n\n' +
        '是否立即重新載入？(Reload now?)'
      );
      
      if (shouldReload) {
        window.location.href = '/';
      }
    }
  };

  // ✅ 員工離開團隊（優化版：優先清除本地數據）
  const handleLeaveTeam = async () => {
    if (!user || !userRole.ownerId) return;

    const confirmed = confirm(
      '⚠️ 確定要離開團隊嗎？\n\n' +
      '離開後：\n' +
      '• 您將無法再訪問老闆的市集\n' +
      '• 您的本地數據將被清除\n' +
      '• 您將恢復為一般用戶身分\n\n' +
      '此操作無法復原！'
    );

    if (!confirmed) return;

    try {
      // ✅ 步驟 1：優先清除本地數據（避免數據混亂）
      toast.loading('正在清除本地數據...', { id: 'leave-team' });
      console.log('🧹 開始清除本地數據...');
      
      try {
        const { db } = await import('@/lib/db');
        await db.markets.clear();
        await db.products.clear();
        await db.events.clear();
        await db.dailyStats.clear();
        console.log('✅ 數據表已清除');
      } catch (dbError) {
        console.error('清除數據表失敗:', dbError);
      }
      
      try {
        await indexedDB.deleteDatabase('MarketPulseDB');
        console.log('✅ IndexedDB 已刪除');
      } catch (idbError) {
        console.error('刪除 IndexedDB 失敗:', idbError);
      }
      
      try {
        const keysToRemove = [
          'user_role_cache',
          'logout_history',
          'hasCompletedInitialSync',
        ];
        
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.error(`清除 ${key} 失敗:`, e);
          }
        });
        
        sessionStorage.clear();
        console.log('✅ 緩存已清除');
      } catch (storageError) {
        console.error('清除緩存失敗:', storageError);
      }
      
      try {
        const { resetInitialSyncFlag } = await import('@/hooks/useSync');
        const { clearRoleCache } = await import('@/hooks/useUserRole');
        resetInitialSyncFlag();
        clearRoleCache();
        console.log('✅ 同步標記已重置');
      } catch (resetError) {
        console.error('重置標記失敗:', resetError);
      }

      // ✅ 步驟 2：刪除雲端員工關係
      toast.loading('正在離開團隊...', { id: 'leave-team' });

      const { error: relError } = await supabase
        .from('staff_relationships')
        .delete()
        .eq('owner_id', userRole.ownerId)
        .eq('staff_id', user.id);

      if (relError) throw relError;

      // ✅ 步驟 3：刪除 market_members 記錄
      const { data: markets, error: marketsError } = await supabase
        .from('markets')
        .select('id')
        .eq('owner_id', userRole.ownerId);

      if (marketsError) throw marketsError;

      if (markets && markets.length > 0) {
        const marketIds = markets.map(m => m.id);
        
        const { error: membersError } = await supabase
          .from('market_members')
          .delete()
          .eq('user_id', user.id)
          .eq('role', 'staff')
          .in('market_id', marketIds);

        if (membersError) throw membersError;
      }

      // ✅ 步驟 4：驗證雲端記錄已刪除（可選，不影響本地）
      toast.loading('正在驗證雲端同步...', { id: 'leave-team' });
      
      let retryCount = 0;
      const maxRetries = 10;
      let isDeleted = false;
      
      while (retryCount < maxRetries && !isDeleted) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data, error } = await supabase
          .from('staff_relationships')
          .select('id')
          .eq('owner_id', userRole.ownerId)
          .eq('staff_id', user.id)
          .eq('status', 'active');
        
        if (error) {
          console.error('驗證失敗:', error);
          break;
        }
        
        if (!data || data.length === 0) {
          isDeleted = true;
          console.log('✅ 雲端記錄已確認刪除');
          break;
        }
        
        retryCount++;
        console.log(`等待雲端同步... (${retryCount}/${maxRetries})`);
      }

      toast.success('✅ 已離開團隊，即將重新載入...', { id: 'leave-team' });

      // ✅ 步驟 5：強制重新載入頁面
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);

    } catch (error: any) {
      console.error('離開團隊失敗:', error);
      toast.error('離開失敗：' + error.message, { id: 'leave-team' });
      
      // ✅ 錯誤處理：本地數據已清除，建議重新載入
      const shouldReload = confirm(
        '離開團隊時發生錯誤，但本地數據已清除。\n\n' +
        '建議重新載入頁面以確保狀態正確。\n\n' +
        '是否立即重新載入？'
      );
      
      if (shouldReload) {
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* Header */}
      <div className={`${getGradientClass(isStaff)} pt-12 pb-8 px-6 rounded-b-[2rem]`}>
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-medium text-white opacity-90 mb-2">
            設定
          </h1>
          <p className="text-white/80 text-sm">
            {isStaff ? '員工設定與權限管理 👤' : '個人化您的使用體驗 ⚙️'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-4">
        {/* PWA 安裝按鈕 */}
        <PWAInstallButton />

        {/* 員工管理 / 離開團隊 */}
        {isStaff ? (
          /* 員工：顯示離開團隊 */
          <>
            {/* 老闆資訊卡片 */}
            {userRole.ownerEmail && (
              <OwnerInfoCard ownerEmail={userRole.ownerEmail} />
            )}
            
            {/* 權限說明卡片 */}
            <StaffPermissionCard permissions={userRole.permissions} />
            
            {/* 離開團隊區塊 */}
            <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#8B7BA6]/10 p-6">
              <div className="flex items-center gap-2 mb-2">
                <LogOut className="w-5 h-5 text-[#8B7BA6]" />
                <h2 className="text-lg font-medium text-[#3A3A3A]">離開團隊</h2>
              </div>
              <p className="text-sm text-[#6B6B6B] mb-4">
                離開後將無法再訪問老闆的市集資料
              </p>
              {/* 離開團隊按鈕 */}
              <button
                onClick={handleLeaveTeam}
                className="w-full px-6 py-4 rounded-2xl bg-[#F5E6E8] text-[#d4183d] hover:bg-[#E5D6D8] transition-colors font-medium flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                離開團隊
              </button>

              <p className="text-xs text-center text-[#6B6B6B] mt-3">
                離開後將清除本地數據，您可以重新開始使用自己的帳號
              </p>
            </div>
          </>
        ) : (
          /* 老闆：顯示員工管理（可折疊） */
          <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 overflow-hidden">
            <button
              onClick={() => setIsStaffManagementExpanded(!isStaffManagementExpanded)}
              className="w-full p-6 text-left hover:bg-[#FAFAF8] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-[#7B9FA6]" />
                    <h2 className="text-lg font-medium text-[#3A3A3A]">
                      員工管理
                    </h2>
                  </div>
                  <p className="text-sm text-[#6B6B6B]">
                    邀請員工協作，管理權限設定
                  </p>
                </div>
                <div className="ml-4">
                  {isStaffManagementExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#7B9FA6]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#7B9FA6]" />
                  )}
                </div>
              </div>
            </button>

            {isStaffManagementExpanded && (
              <div className="border-t border-[#7B9FA6]/10">
                <StaffManagement />
              </div>
            )}
          </div>
        )}

        {/* 互動按鈕設定 - 只有老闆可見（可折疊） */}
        {!isStaff && (
          <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 overflow-hidden">
            <button
              onClick={() => setIsInteractionExpanded(!isInteractionExpanded)}
              className="w-full p-6 text-left hover:bg-[#FAFAF8] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-[#7B9FA6]" />
                    <h2 className="text-lg font-medium text-[#3A3A3A]">
                      互動記錄設定
                    </h2>
                  </div>
                  <p className="text-sm text-[#6B6B6B]">
                    記錄顧客互動，了解哪一場市集效果最好
                  </p>
                </div>
                <div className="ml-4">
                  {isInteractionExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#7B9FA6]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#7B9FA6]" />
                  )}
                </div>
              </div>
            </button>

            {isInteractionExpanded && (
              <div className="px-6 pb-6 border-t border-[#7B9FA6]/10">
            {isSetupComplete ? (
              <>
                {/* 已設定：顯示當前配置 */}
                <div className="bg-[#FAFAF8] rounded-xl p-4 mb-4 mt-4">
                  <div className="text-xs text-[#6B6B6B] mb-3 text-center">
                    當前設定
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {buttons.map((button, index) => (
                      <div
                        key={button.id}
                        className="bg-white rounded-xl p-3 text-center border border-[#7B9FA6]/10"
                      >
                        <div className="text-2xl mb-1">{button.emoji}</div>
                        <div className="text-xs font-medium text-[#3A3A3A] truncate">
                          {button.label}
                        </div>
                        <div className="text-xs text-[#6B6B6B] mt-1">
                          {index === 0 && '有興趣'}
                          {index === 1 && '有互動'}
                          {index === 2 && '轉換'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="flex-1 px-4 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    重新設定
                  </button>
                  <button
                    onClick={handleResetInteraction}
                    className="flex-1 px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* 未設定：引導設定 */}
                <div className="bg-gradient-to-br from-[#7B9FA6]/10 to-[#D4A574]/10 rounded-xl p-6 mb-4 mt-4 text-center">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-sm text-[#3A3A3A] mb-2">
                    尚未設定互動記錄方式
                  </p>
                  <p className="text-xs text-[#6B6B6B]">
                    設定後即可在營業時記錄顧客互動
                  </p>
                </div>

                <button
                  onClick={() => setShowWizard(true)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors font-medium"
                >
                  開始設定
                </button>
              </>
            )}

            <div className="mt-4 bg-gradient-to-br from-[#E8F0F8] to-[#FFF8E7] rounded-xl p-4">
              <h3 className="text-sm font-medium text-[#3A3A3A] mb-2">
                💡 使用說明
              </h3>
              <ul className="text-xs text-[#6B6B6B] space-y-1">
                <li>• 記錄顧客從「有興趣」到「成交」的過程</li>
                <li>• 不需要精準，只要直覺點擊</li>
                <li>• 數據會顯示在市集分析報表中</li>
                <li>• 幫助你了解哪一場市集效果最好</li>
              </ul>
            </div>
              </div>
            )}
          </div>
        )}

        {/* 資料庫管理 - 只有老闆可見 */}
        {!isStaff && (
          <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 overflow-hidden">
            {/* 標題區（始終顯示） */}
            <button
            onClick={() => setIsDatabaseExpanded(!isDatabaseExpanded)}
            className="w-full p-6 text-left hover:bg-[#FAFAF8] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-[#7B9FA6]" />
                  <h2 className="text-lg font-medium text-[#3A3A3A]">
                    資料庫管理
                  </h2>
                </div>
                <p className="text-sm text-[#6B6B6B]">
                  管理本地和雲端資料，請謹慎操作
                </p>
              </div>
              <div className="ml-4">
                {isDatabaseExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#7B9FA6]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#7B9FA6]" />
                )}
              </div>
            </div>
          </button>

          {/* 展開內容 */}
          {isDatabaseExpanded && (
            <div className="px-6 pb-6 border-t border-[#7B9FA6]/10">
              {/* 總體說明 */}
              <div className="bg-[#FFF8E7] border border-[#D4A574]/20 rounded-xl p-4 mt-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#D4A574] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#3A3A3A] mb-2">
                      ⚠️ 重要提醒
                    </p>
                    <ul className="text-xs text-[#6B6B6B] space-y-1">
                      <li>• 所有清除操作都無法復原，請謹慎使用</li>
                      <li>• 建議在清除前先確認資料已備份</li>
                      <li>• 適用於解決資料同步問題或重新開始</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 優化數據（生成快照） */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#7B9FA6]" />
                  <h3 className="text-base font-medium text-[#3A3A3A]">
                    優化數據
                  </h3>
                </div>
                
                <div className="bg-gradient-to-br from-[#E8F0F8] to-[#E8F3E8] rounded-xl p-4 mb-3">
                  <p className="text-sm text-[#3A3A3A] mb-2 font-medium">
                    📸 生成數據快照
                  </p>
                  <ul className="text-xs text-[#6B6B6B] space-y-1 mb-3">
                    <li>• 將當前數據狀態保存為快照</li>
                    <li>• 加速新設備的首次同步（提升 95%+）</li>
                    <li>• 自動壓縮，節省 60-80% 存儲空間</li>
                    <li>• 系統會在 1000 個事件後自動生成</li>
                  </ul>
                  <div className="bg-white rounded-lg p-3 border border-[#7B9FA6]/10">
                    <p className="text-xs text-[#3A3A3A] font-medium mb-1">
                      💡 適用場景：
                    </p>
                    <ul className="text-xs text-[#6B6B6B] space-y-0.5">
                      <li>• 準備在新設備上登入</li>
                      <li>• 累積大量事件後手動優化</li>
                      <li>• 提升多設備同步速度</li>
                      <li>• 減少雲端存儲成本</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (!user) {
                      toast.error('請先登入 Supabase 帳號');
                      return;
                    }

                    const toastId = toast.loading('正在生成快照...');
                    
                    try {
                      const { createSnapshot } = await import('@/lib/db/snapshot');
                      const snapshotId = await createSnapshot(user.id);
                      
                      toast.success('✅ 快照已生成', {
                        id: toastId,
                        description: '新設備同步速度將大幅提升',
                      });
                    } catch (error: any) {
                      console.error('生成快照失敗:', error);
                      toast.error('生成失敗', {
                        id: toastId,
                        description: error.message || '請稍後再試',
                      });
                    }
                  }}
                  disabled={!user}
                  className="w-full px-4 py-3 rounded-2xl bg-gradient-to-br from-[#7B9FA6] to-[#6A8E95] text-white hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4" />
                  {user ? '生成快照' : '請先登入 Supabase'}
                </button>
              </div>

              {/* 分隔線 */}
              <div className="border-t border-[#7B9FA6]/10 my-6"></div>

              {/* 清除本地資料 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-5 h-5 text-[#7B9FA6]" />
                  <h3 className="text-base font-medium text-[#3A3A3A]">
                    清除本地資料
                  </h3>
                </div>
                
                <div className="bg-[#E8F0F8] rounded-xl p-4 mb-3">
                  <p className="text-sm text-[#3A3A3A] mb-2 font-medium">
                    📱 本地資料（IndexedDB）
                  </p>
                  <ul className="text-xs text-[#6B6B6B] space-y-1 mb-3">
                    <li>• 儲存位置：瀏覽器本地儲存空間</li>
                    <li>• 包含內容：所有市集、商品、統計、事件記錄</li>
                    <li>• 影響範圍：僅限當前瀏覽器</li>
                    <li>• 同步狀態：清除後可從雲端重新同步（如已登入）</li>
                  </ul>
                  <div className="bg-white rounded-lg p-3 border border-[#7B9FA6]/10">
                    <p className="text-xs text-[#3A3A3A] font-medium mb-1">
                      💡 適用場景：
                    </p>
                    <ul className="text-xs text-[#6B6B6B] space-y-0.5">
                      <li>• 資料庫結構升級後出現錯誤</li>
                      <li>• 本地資料損壞或不一致</li>
                      <li>• 想從雲端重新下載最新資料</li>
                      <li>• 清理瀏覽器儲存空間</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleClearLocalDatabase}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#d4183d] hover:bg-[#E5D6D8] transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  清除本地資料
                </button>
              </div>

              {/* 分隔線 */}
              <div className="border-t border-[#7B9FA6]/10 my-6"></div>

              {/* 清除線上資料 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Cloud className="w-5 h-5 text-[#7B9FA6]" />
                  <h3 className="text-base font-medium text-[#3A3A3A]">
                    清除線上資料
                  </h3>
                </div>
                
                <div className="bg-[#FFF0F0] rounded-xl p-4 mb-3">
                  <p className="text-sm text-[#d4183d] mb-2 font-medium">
                    ☁️ 線上資料（Supabase）
                  </p>
                  <ul className="text-xs text-[#6B6B6B] space-y-1 mb-3">
                    <li>• 儲存位置：Supabase 雲端資料庫</li>
                    <li>• 包含內容：所有市集、商品、統計、事件記錄</li>
                    <li>• 影響範圍：所有登入此帳號的設備</li>
                    <li>• 同步狀態：清除後無法恢復，除非有備份</li>
                  </ul>
                  <div className="bg-white rounded-lg p-3 border border-[#d4183d]/20">
                    <p className="text-xs text-[#d4183d] font-medium mb-1">
                      ⚠️ 危險操作：
                    </p>
                    <ul className="text-xs text-[#6B6B6B] space-y-0.5">
                      <li>• 此操作會永久刪除雲端所有資料</li>
                      <li>• 所有設備的資料都會受影響</li>
                      <li>• 無法從雲端恢復資料</li>
                      <li>• <strong className="text-[#d4183d]">本地資料也會同時清除</strong>（防止重新上傳）</li>
                      <li>• 建議先備份重要資料</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleClearOnlineDatabase}
                  disabled={!user}
                  className="w-full px-4 py-3 rounded-2xl bg-[#d4183d] text-white hover:bg-[#b01530] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {user ? '清除線上資料' : '請先登入 Supabase'}
                </button>
              </div>

              {/* 差異對比表 */}
              <div className="mt-6 bg-gradient-to-br from-[#E8F0F8] to-[#FFF8E7] rounded-xl p-4">
                <p className="text-sm font-medium text-[#3A3A3A] mb-3">
                  📊 功能對比
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#7B9FA6]/20">
                        <th className="text-left py-2 text-[#6B6B6B] font-medium">項目</th>
                        <th className="text-center py-2 text-[#6B6B6B] font-medium">本地資料</th>
                        <th className="text-center py-2 text-[#6B6B6B] font-medium">線上資料</th>
                      </tr>
                    </thead>
                    <tbody className="text-[#3A3A3A]">
                      <tr className="border-b border-[#7B9FA6]/10">
                        <td className="py-2">儲存位置</td>
                        <td className="text-center">瀏覽器</td>
                        <td className="text-center">Supabase</td>
                      </tr>
                      <tr className="border-b border-[#7B9FA6]/10">
                        <td className="py-2">影響範圍</td>
                        <td className="text-center">當前設備</td>
                        <td className="text-center">所有設備</td>
                      </tr>
                      <tr className="border-b border-[#7B9FA6]/10">
                        <td className="py-2">可恢復性</td>
                        <td className="text-center text-green-600">可從雲端同步</td>
                        <td className="text-center text-red-600">無法恢復</td>
                      </tr>
                      <tr>
                        <td className="py-2">危險程度</td>
                        <td className="text-center text-yellow-600">中等</td>
                        <td className="text-center text-red-600">極高</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* 互動設定精靈 */}
      <InteractionSetupWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
      />
    </div>
  );
}

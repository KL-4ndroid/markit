'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, RotateCcw, Database, Trash2, Cloud, HardDrive, AlertTriangle, Edit, ChevronDown, ChevronUp, LogOut, Eye, Edit3, Settings } from 'lucide-react';
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
import { StaffModeNotice } from '@/components/staff/StaffModeNotice';
import { DataCanonicalizationPanel } from '@/components/settings/DataCanonicalizationPanel';
import { OwnerBrandSettingsCard } from '@/components/settings/OwnerBrandSettingsCard';

async function clearLocalAppData(): Promise<void> {
  const { clearAllData, db } = await import('@/lib/db');
  const { resetInitialSyncFlag } = await import('@/hooks/useSync');
  const { clearRoleCache } = await import('@/hooks/useUserRole');

  try {
    await clearAllData();
  } catch (error) {
    console.error('清除本地資料表失敗:', error);
  }

  try {
    db.close();
  } catch (error) {
    console.error('關閉本地資料庫失敗:', error);
  }

  try {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('MarketPulseDB');
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('刪除 IndexedDB 失敗:', request.error);
        resolve();
      };
      request.onblocked = () => resolve();
    });
  } catch (error) {
    console.error('刪除 IndexedDB 失敗:', error);
  }

  try {
    ['user_role_cache', 'logout_history', 'hasCompletedInitialSync'].forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('清除 localStorage 快取失敗:', error);
  }

  try {
    sessionStorage.clear();
  } catch (error) {
    console.error('清除 sessionStorage 快取失敗:', error);
  }

  try {
    resetInitialSyncFlag();
    clearRoleCache();
  } catch (error) {
    console.error('重置同步或角色快取失敗:', error);
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [buttons, setButtons] = useState<InteractionButton[]>([]);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [isStaffManagementExpanded, setIsStaffManagementExpanded] = useState(false);
  const [isInteractionExpanded, setIsInteractionExpanded] = useState(false);
  const [isDatabaseExpanded, setIsDatabaseExpanded] = useState(false);
  const { user, signOut } = useAuth();
  const { userRole, isStaff, isLoading: isRoleLoading, roleError } = useUserRole();

  useEffect(() => {
    setButtons(getInteractionButtons());
    setIsSetupComplete(isInteractionSetupComplete());
  }, []);

  // ✅ 角色守衛（RoleGuard）已由 layout 級別統一處理（C2.28B）
  //   - 這裡不需要再寫 if (isRoleLoading || roleError) return <RoleLoadingFallback />
  //   - 到這層時角色必定已載入
  //   - fail-closed 仍由 useUserRole 的 deriveRolePermissions 提供雙層保護

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
      '⚠️ 雲端刪除成功後才會清除本地資料！(Local data is cleared only after cloud deletion succeeds!)\n\n' +
      '如果您確定要繼續，請輸入 DELETE：\n' +
      'If you are sure, type DELETE:'
    );

    if (confirmText !== 'DELETE') {
      toast.info('已取消操作 (Operation cancelled)');
      return;
    }

    const toastId = toast.loading('正在清除所有資料...');

    try {
      toast.loading('正在以安全交易清除雲端資料...', { id: toastId });

      const { data, error } = await supabase.rpc('delete_current_user_app_data');
      if (error) throw error;

      console.log('✅ 雲端資料已透過 RPC 清除:', data);

      toast.loading('雲端資料已清除，正在清除本地快取...', { id: toastId });
      await clearLocalAppData();

      toast.success('✅ 所有資料已清除，即將重新載入...', { id: toastId });
      
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      
    } catch (error: any) {
      console.error('清除資料失敗:', error);
      toast.error(`清除失敗：${error.message || '請稍後再試'}`, { id: toastId });
    }
  };

  // ✅ 員工離開團隊：先解除雲端關係，成功後才清除本地快取
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
      toast.loading('正在離開團隊...', { id: 'leave-team' });

      const { data, error } = await supabase.rpc('leave_current_staff_team', {
        p_owner_id: userRole.ownerId,
      });

      if (error) throw error;

      console.log('✅ 已透過 RPC 離開團隊:', data);

      toast.loading('團隊關係已解除，正在清除本地快取...', { id: 'leave-team' });
      await clearLocalAppData();

      toast.success('✅ 已離開團隊，即將重新載入...', { id: 'leave-team' });

      setTimeout(() => {
        window.location.href = '/';
      }, 1000);

    } catch (error: any) {
      console.error('離開團隊失敗:', error);
      toast.error('離開失敗：' + error.message, { id: 'leave-team' });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className={`${getGradientClass(isStaff)} pt-12 pb-8 px-6 rounded-b-[2rem]`}>
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-medium text-white opacity-90 mb-2 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            設定
          </h1>
          <p className="text-white/80 text-sm">
            {isStaff ? '員工設定與權限管理' : '個人化您的使用體驗'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-4">
        <StaffModeNotice />

        {/* PWA 安裝按鈕 */}
        <PWAInstallButton />

        {!isStaff && <OwnerBrandSettingsCard />}

        {/* 員工管理 / 離開團隊 */}
        {isStaff ? (
          /* 員工：顯示離開團隊 */
          <>
            {/* 老闆資訊卡片 */}
            {userRole.ownerEmail && (
              <OwnerInfoCard ownerEmail={userRole.ownerEmail} />
            )}
            
            {/* 權限說明卡片 */}
            <StaffPermissionCard
              staffRole={userRole.staffRole}
              ownerEmail={userRole.ownerEmail}
            />
            
            {/* 離開團隊區塊 */}
            <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6">
              <div className="flex items-center gap-2 mb-2">
                <LogOut className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-medium text-foreground">離開團隊</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                離開後將無法再訪問老闆的市集資料
              </p>
              {/* 離開團隊按鈕 */}
              <button
                onClick={handleLeaveTeam}
                className="w-full px-6 py-4 rounded-2xl bg-soft-pink text-danger hover:bg-soft-pink/80 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                離開團隊
              </button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                離開後將清除本地數據，您可以重新開始使用自己的帳號
              </p>
            </div>
          </>
        ) : (
          /* 老闆：顯示團隊與權限（可折疊） */
          <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 overflow-hidden">
            <button
              onClick={() => setIsStaffManagementExpanded(!isStaffManagementExpanded)}
              className="w-full p-6 text-left hover:bg-background transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-medium text-foreground">
                      團隊與權限
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    邀請員工加入團隊，查看成員與目前權限狀態。
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-xs text-primary/60 font-medium">
                    {isStaffManagementExpanded ? '收合' : '展開'}
                  </span>
                  {isStaffManagementExpanded ? (
                    <ChevronUp className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  )}
                </div>
              </div>
            </button>

            {isStaffManagementExpanded && (
              <div className="border-t border-primary/10">
                <StaffManagement />
              </div>
            )}
          </div>
        )}

        {/* 互動按鈕設定 - 只有老闆可見（可折疊） */}
        {!isStaff && (
          <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 overflow-hidden">
            <button
              onClick={() => setIsInteractionExpanded(!isInteractionExpanded)}
              className="w-full p-6 text-left hover:bg-background transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-medium text-foreground">
                      互動記錄設定
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    記錄顧客互動，了解哪一場市集效果最好
                  </p>
                </div>
                <div className="ml-4">
                  {isInteractionExpanded ? (
                    <ChevronUp className="w-5 h-5 text-primary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-primary" />
                  )}
                </div>
              </div>
            </button>

            {isInteractionExpanded && (
              <div className="px-6 pb-6 border-t border-primary/10">
            {isSetupComplete ? (
              <>
                {/* 已設定：顯示當前配置 */}
                <div className="bg-background rounded-xl p-4 mb-4 mt-4">
                  <div className="text-xs text-muted-foreground mb-3 text-center">
                    當前設定
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {buttons.map((button, index) => (
                      <div
                        key={button.id}
                        className="bg-white rounded-xl p-3 text-center border border-primary/10"
                      >
                        <div className="text-2xl mb-1">{button.emoji}</div>
                        <div className="text-xs font-medium text-foreground truncate">
                          {button.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
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
                    className="flex-1 px-4 py-3 rounded-2xl bg-primary text-white hover:bg-primary/85 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    重新設定
                  </button>
                  <button
                    onClick={handleResetInteraction}
                    className="flex-1 px-4 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重置
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* 未設定：引導設定 */}
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl p-6 mb-4 mt-4 text-center">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-sm text-foreground mb-2">
                    尚未設定互動記錄方式
                  </p>
                  <p className="text-xs text-muted-foreground">
                    設定後即可在營業時記錄顧客互動
                  </p>
                </div>

                <button
                  onClick={() => setShowWizard(true)}
                  className="w-full px-4 py-3 rounded-2xl bg-primary text-white hover:bg-primary/85 transition-colors font-medium"
                >
                  開始設定
                </button>
              </>
            )}

            <div className="mt-4 bg-gradient-to-br from-[#E8F0F8] to-[#FFF8E7] rounded-xl p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">
                💡 使用說明
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1">
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
          <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 overflow-hidden">
            {/* 標題區（始終顯示） */}
            <button
            onClick={() => setIsDatabaseExpanded(!isDatabaseExpanded)}
            className="w-full p-6 text-left hover:bg-background transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-medium text-foreground">
                    資料庫管理
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  管理本地和雲端資料，請謹慎操作
                </p>
              </div>
              <div className="ml-4">
                {isDatabaseExpanded ? (
                  <ChevronUp className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-primary" />
                )}
              </div>
            </div>
          </button>

          {/* 展開內容 */}
          {isDatabaseExpanded && (
            <div className="px-6 pb-6 border-t border-primary/10">
              <button
                type="button"
                onClick={() => router.push('/recovery')}
                className="mt-4 mb-4 flex w-full items-center justify-between rounded-xl border border-primary/20 bg-[#F8FBFB] p-4 text-left transition-colors hover:bg-[#EEF6F7]"
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">資料修復與救援備份</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    檢查本機資料完整性，必要時先建立救援備份。
                  </span>
                </span>
                <Database className="h-5 w-5 shrink-0 text-primary" />
              </button>
              <DataCanonicalizationPanel />
              {/* 總體說明 */}
              <div className="bg-soft-yellow border border-secondary/20 rounded-xl p-4 mt-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      ⚠️ 重要提醒
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• 所有清除操作都無法復原，請謹慎使用</li>
                      <li>• 建議在清除前先確認資料已備份</li>
                      <li>• 適用於解決資料同步問題或重新開始</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 分隔線 */}
              <div className="border-t border-primary/10 my-6"></div>

              {/* 清除本地資料 */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <HardDrive className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-medium text-foreground">
                    清除本地資料
                  </h3>
                </div>
                
                <div className="bg-[#E8F0F8] rounded-xl p-4 mb-3">
                  <p className="text-sm text-foreground mb-2 font-medium">
                    📱 本地資料（IndexedDB）
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                    <li>• 儲存位置：瀏覽器本地儲存空間</li>
                    <li>• 包含內容：所有市集、商品、統計、事件記錄</li>
                    <li>• 影響範圍：僅限當前瀏覽器</li>
                    <li>• 同步狀態：清除後可從雲端重新同步（如已登入）</li>
                  </ul>
                  <div className="bg-white rounded-lg p-3 border border-primary/10">
                    <p className="text-xs text-foreground font-medium mb-1">
                      💡 適用場景：
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      <li>• 資料庫結構升級後出現錯誤</li>
                      <li>• 本地資料損壞或不一致</li>
                      <li>• 想從雲端重新下載最新資料</li>
                      <li>• 清理瀏覽器儲存空間</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleClearLocalDatabase}
                  className="w-full px-4 py-3 rounded-2xl bg-soft-pink text-danger hover:bg-soft-pink/80 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  清除本地資料
                </button>
              </div>

              {/* 分隔線 */}
              <div className="border-t border-primary/10 my-6"></div>

              {/* 清除線上資料 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Cloud className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-medium text-foreground">
                    清除線上資料
                  </h3>
                </div>
                
                <div className="bg-[#FFF0F0] rounded-xl p-4 mb-3">
                  <p className="text-sm text-danger mb-2 font-medium">
                    ☁️ 線上資料（Supabase）
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 mb-3">
                    <li>• 儲存位置：Supabase 雲端資料庫</li>
                    <li>• 包含內容：所有市集、商品、統計、事件記錄</li>
                    <li>• 影響範圍：所有登入此帳號的設備</li>
                    <li>• 同步狀態：清除後無法恢復，除非有備份</li>
                  </ul>
                  <div className="bg-white rounded-lg p-3 border border-danger/20">
                    <p className="text-xs text-danger font-medium mb-1">
                      ⚠️ 危險操作：
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      <li>• 此操作會永久刪除雲端所有資料</li>
                      <li>• 所有設備的資料都會受影響</li>
                      <li>• 無法從雲端恢復資料</li>
                      <li>• <strong className="text-danger">本地資料也會同時清除</strong>（防止重新上傳）</li>
                      <li>• 建議先備份重要資料</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={handleClearOnlineDatabase}
                  disabled={!user}
                  className="w-full px-4 py-3 rounded-2xl bg-danger text-white hover:bg-danger/80 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {user ? '清除線上資料' : '請先登入 Supabase'}
                </button>
              </div>

              {/* 差異對比表 */}
              <div className="mt-6 bg-gradient-to-br from-[#E8F0F8] to-[#FFF8E7] rounded-xl p-4">
                <p className="text-sm font-medium text-foreground mb-3">
                  📊 功能對比
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-primary/20">
                        <th className="text-left py-2 text-muted-foreground font-medium">項目</th>
                        <th className="text-center py-2 text-muted-foreground font-medium">本地資料</th>
                        <th className="text-center py-2 text-muted-foreground font-medium">線上資料</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      <tr className="border-b border-primary/10">
                        <td className="py-2">儲存位置</td>
                        <td className="text-center">瀏覽器</td>
                        <td className="text-center">Supabase</td>
                      </tr>
                      <tr className="border-b border-primary/10">
                        <td className="py-2">影響範圍</td>
                        <td className="text-center">當前設備</td>
                        <td className="text-center">所有設備</td>
                      </tr>
                      <tr className="border-b border-primary/10">
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

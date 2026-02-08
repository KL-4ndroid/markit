'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, RotateCcw, Database, Trash2, Cloud, HardDrive, AlertTriangle, Bug, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import { getInteractionButtons, resetInteractionButtons, isInteractionSetupComplete, type InteractionButton } from '@/lib/interaction-buttons-store';
import { InteractionSetupWizard } from '@/components/settings/InteractionSetupWizard';
import { toast } from 'sonner';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const [buttons, setButtons] = useState<InteractionButton[]>([]);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [isDatabaseExpanded, setIsDatabaseExpanded] = useState(false);
  const { user } = useAuth();

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
      '⚠️⚠️⚠️ 超級警告 ⚠️⚠️⚠️\n\n' +
      '這將永久刪除您在 Supabase 雲端的所有資料：\n' +
      '• 所有市集記錄\n' +
      '• 所有商品資料\n' +
      '• 所有事件歷史\n' +
      '• 所有統計資料\n\n' +
      '此操作無法復原！\n' +
      '如果您確定要繼續，請輸入「刪除線上資料」：'
    );

    if (confirmText !== '刪除線上資料') {
      toast.info('已取消操作');
      return;
    }

    try {
      toast.loading('正在清除線上資料...');

      // 1. 刪除所有市集的事件
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .eq('actor_id', user.id);

      if (eventsError) throw eventsError;

      // 2. 獲取所有市集 ID
      const { data: marketsData, error: marketsQueryError } = await supabase
        .from('markets')
        .select('id')
        .eq('owner_id', user.id);

      if (marketsQueryError) throw marketsQueryError;

      const marketIds = marketsData?.map(m => m.id) || [];

      // 3. 刪除所有商品
      if (marketIds.length > 0) {
        const { error: productsError } = await supabase
          .from('products')
          .delete()
          .in('market_id', marketIds);

        if (productsError) throw productsError;
      }

      // 4. 刪除所有市集
      const { error: marketsError } = await supabase
        .from('markets')
        .delete()
        .eq('owner_id', user.id);

      if (marketsError) throw marketsError;

      toast.dismiss();
      toast.success('✅ 線上資料已清除');
      toast.info('💡 建議同時清除本地資料以保持一致');
      
    } catch (error: any) {
      toast.dismiss();
      console.error('清除線上資料失敗:', error);
      toast.error(`清除失敗：${error.message || '請稍後再試'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-medium text-white opacity-90 mb-2">
            設定
          </h1>
          <p className="text-white/80 text-sm">
            個人化您的使用體驗 ⚙️
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-4">
        {/* PWA 安裝按鈕 */}
        <PWAInstallButton />

        {/* 開發者工具 */}
        <div className="bg-gradient-to-br from-[#7B9FA6]/10 to-[#D4A574]/10 rounded-[1.5rem] p-6 shadow-lg border-2 border-[#7B9FA6]/20">
          <div className="flex items-center gap-2 mb-3">
            <Bug className="w-5 h-5 text-[#7B9FA6]" />
            <h2 className="text-lg font-medium text-[#3A3A3A]">
              開發者工具
            </h2>
          </div>
          <p className="text-sm text-[#6B6B6B] mb-4">
            測試和調試應用程式的專業工具
          </p>
          <button
            onClick={() => router.push('/debug/flicker-test')}
            className="w-full px-6 py-4 rounded-2xl bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] text-white hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2"
          >
            <Bug className="w-5 h-5" />
            閃爍測試調試工具
          </button>
          <p className="text-xs text-[#6B6B6B] mt-3 text-center">
            實時調整動畫參數，找出最佳配置
          </p>
        </div>

        {/* 互動按鈕設定 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-[#7B9FA6]" />
              <h2 className="text-lg font-medium text-[#3A3A3A]">
                互動記錄設定
              </h2>
            </div>
            <p className="text-sm text-[#6B6B6B] mb-4">
              記錄顧客互動，了解哪一場市集效果最好
            </p>

            {isSetupComplete ? (
              <>
                {/* 已設定：顯示當前配置 */}
                <div className="bg-[#FAFAF8] rounded-xl p-4 mb-4">
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
                <div className="bg-gradient-to-br from-[#7B9FA6]/10 to-[#D4A574]/10 rounded-xl p-6 mb-4 text-center">
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
        </div>

        {/* 資料庫管理 */}
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

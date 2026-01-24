'use client';

import { useState, useEffect } from 'react';
import { Zap, RotateCcw, Save, ChevronDown, ChevronUp, Database, Trash2, Cloud, HardDrive, AlertTriangle } from 'lucide-react';
import { getQuickActionButtons, saveQuickActionButtons, resetQuickActionButtons, type QuickActionButton } from '@/lib/quick-actions-store';
import { toast } from 'sonner';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [buttons, setButtons] = useState<QuickActionButton[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDatabaseExpanded, setIsDatabaseExpanded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setButtons(getQuickActionButtons());
  }, []);

  const handleLabelChange = (id: string, label: string) => {
    setButtons(prev => prev.map(btn => 
      btn.id === id ? { ...btn, label } : btn
    ));
    setHasChanges(true);
  };

  const handleEmojiChange = (id: string, emoji: string) => {
    setButtons(prev => prev.map(btn => 
      btn.id === id ? { ...btn, emoji } : btn
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    try {
      saveQuickActionButtons(buttons);
      setHasChanges(false);
      toast.success('✅ 設定已儲存');
      
      // 觸發 storage 事件讓其他頁面更新
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      toast.error('儲存失敗，請稍後再試');
    }
  };

  const handleReset = () => {
    if (confirm('確定要重置為預設設定嗎？')) {
      resetQuickActionButtons();
      setButtons(getQuickActionButtons());
      setHasChanges(false);
      toast.success('🔄 已重置為預設設定');
      
      // 觸發 storage 事件
      window.dispatchEvent(new Event('storage'));
    }
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

      // 2. 刪除所有商品
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .in('market_id', 
          supabase
            .from('markets')
            .select('id')
            .eq('owner_id', user.id)
        );

      if (productsError) throw productsError;

      // 3. 刪除所有市集
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

        {/* 快速互動按鈕設定 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 overflow-hidden">
          {/* 標題區（始終顯示） */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full p-6 text-left hover:bg-[#FAFAF8] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-[#7B9FA6]" />
                  <h2 className="text-lg font-medium text-[#3A3A3A]">
                    快速互動按鈕
                  </h2>
                </div>
                <p className="text-sm text-[#6B6B6B]">
                  自訂營業中的快速互動按鈕內容。每個按鈕都是獨立的互動類型，會分別統計。
                </p>
              </div>
              <div className="ml-4">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-[#7B9FA6]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#7B9FA6]" />
                )}
              </div>
            </div>
          </button>

          {/* 展開內容 */}
          {isExpanded && (
            <div className="px-6 pb-6 border-t border-[#7B9FA6]/10">
              {/* 按鈕設定列表 */}
              <div className="space-y-4 mt-4">
                {buttons.map((button, index) => (
                  <div key={button.id} className="p-4 bg-[#FAFAF8] rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#7B9FA6] text-white text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-[#3A3A3A]">
                        按鈕 {index + 1}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Emoji 輸入 */}
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">
                          圖示 Emoji
                        </label>
                        <input
                          type="text"
                          value={button.emoji}
                          onChange={(e) => handleEmojiChange(button.id, e.target.value)}
                          placeholder="💬"
                          maxLength={2}
                          className="w-full px-3 py-2 border-2 border-[#7B9FA6]/15 rounded-lg focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all text-center text-2xl"
                        />
                      </div>

                      {/* 標籤輸入 */}
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">
                          按鈕文字
                        </label>
                        <input
                          type="text"
                          value={button.label}
                          onChange={(e) => handleLabelChange(button.id, e.target.value)}
                          placeholder="詢問"
                          maxLength={4}
                          className="w-full px-3 py-2 border-2 border-[#7B9FA6]/15 rounded-lg focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 預覽 */}
              <div className="mt-6 p-4 bg-gradient-to-br from-[#7B9FA6]/5 to-[#D4A574]/5 rounded-xl">
                <div className="text-xs text-[#6B6B6B] mb-3 text-center">
                  預覽效果
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {buttons.map((button) => (
                    <div
                      key={button.id}
                      className="p-3 bg-white rounded-xl shadow-sm"
                    >
                      <div className="text-2xl text-center mb-1">{button.emoji}</div>
                      <div className="text-xs text-center text-[#3A3A3A] font-medium truncate">
                        {button.label}
                      </div>
                    </div>
                  ))}
                  <div className="p-3 bg-gradient-to-br from-[#7B9FA6] to-[#6A8E95] rounded-xl shadow-sm">
                    <div className="text-2xl text-center mb-1">💰</div>
                    <div className="text-xs text-center text-white font-medium">
                      快速成交
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  重置
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  儲存設定
                </button>
              </div>
              {/* 說明卡片 */}
              <div className="mt-6 bg-gradient-to-br from-[#E8F0F8] to-[#FFF8E7] rounded-[1.5rem] p-6">
                <h3 className="text-sm font-medium text-[#3A3A3A] mb-2">
                  💡 使用說明
                </h3>
                <ul className="text-xs text-[#6B6B6B] space-y-1">
                  <li>• 可自訂前三個按鈕的圖示和文字</li>
                  <li>• 每個按鈕都是獨立的互動類型，會分別統計</li>
                  <li>• 第四個按鈕為固定的「快速成交」功能</li>
                  <li>• 快速成交可直接輸入金額完成交易，不需選擇商品</li>
                </ul>
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}

/**
 * Migration Modal - 資料遷移詢問對話框
 * 
 * 當登入時檢測到本地有匿名資料時彈出
 * 讓用戶選擇如何處理本地資料
 */

'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { 
  executeMigration, 
  MigrationOption 
} from '@/lib/supabase/migration';
import { 
  Upload, 
  Trash2, 
  X, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Database,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  marketCount: number;
  eventCount: number;
  onMigrationComplete: () => void;
}

export function MigrationModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  marketCount,
  eventCount,
  onMigrationComplete,
}: MigrationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<MigrationOption | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleMigration = async (option: MigrationOption) => {
    setSelectedOption(option);
    setIsLoading(true);
    setStatus('processing');
    setErrorMessage('');

    try {
      await executeMigration(option, userId);
      
      setStatus('success');
      
      // 根據選項顯示不同的成功訊息
      if (option === MigrationOption.SYNC) {
        toast.success('資料已同步到雲端！');
      } else if (option === MigrationOption.CLEAR) {
        toast.success('已從雲端載入資料！');
      } else {
        toast.info('已取消登入');
      }

      // 延遲關閉，讓用戶看到成功訊息
      setTimeout(() => {
        onMigrationComplete();
        onClose();
      }, 1500);
      
    } catch (error: any) {
      console.error('遷移失敗:', error);
      setStatus('error');
      setErrorMessage(error.message || '遷移失敗，請稍後再試');
      toast.error('遷移失敗：' + (error.message || '未知錯誤'));
    } finally {
      setIsLoading(false);
    }
  };

  // 如果正在處理或已完成，顯示狀態畫面
  if (status === 'processing' || status === 'success' || status === 'error') {
    return (
      <Dialog open={isOpen} onClose={() => {}} className="relative z-50">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <DialogPanel className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              {status === 'processing' && (
                <>
                  <Loader2 className="w-16 h-16 text-[#7B9FA6] mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-medium text-[#3A3A3A] mb-2">
                    處理中...
                  </h3>
                  <p className="text-[#6B6B6B]">
                    {selectedOption === MigrationOption.SYNC && '正在同步資料到雲端'}
                    {selectedOption === MigrationOption.CLEAR && '正在從雲端載入資料'}
                    {selectedOption === MigrationOption.CANCEL && '正在登出'}
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle className="w-16 h-16 text-[#7B9FA6] mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-[#3A3A3A] mb-2">
                    完成！
                  </h3>
                  <p className="text-[#6B6B6B]">
                    {selectedOption === MigrationOption.SYNC && '資料已成功同步到雲端'}
                    {selectedOption === MigrationOption.CLEAR && '已從雲端載入資料'}
                    {selectedOption === MigrationOption.CANCEL && '已取消登入'}
                  </p>
                </>
              )}

              {status === 'error' && (
                <>
                  <AlertCircle className="w-16 h-16 text-[#d4183d] mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-[#3A3A3A] mb-2">
                    發生錯誤
                  </h3>
                  <p className="text-[#6B6B6B] mb-4">
                    {errorMessage}
                  </p>
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setSelectedOption(null);
                    }}
                    className="bg-[#7B9FA6] text-white px-6 py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors"
                  >
                    重試
                  </button>
                </>
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      
      {/* 對話框 */}
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* 標題 */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <DialogTitle className="text-2xl font-medium text-[#3A3A3A] mb-2">
                發現本地資料
              </DialogTitle>
              <p className="text-sm text-[#6B6B6B]">
                登入帳號：<span className="font-medium text-[#7B9FA6]">{userEmail}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5E6E8] rounded-full transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5 text-[#6B6B6B]" />
            </button>
          </div>

          {/* 資料統計 */}
          <div className="bg-[#E8F3E8] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-[#7B9FA6]" />
              <h3 className="font-medium text-[#3A3A3A]">本地資料統計</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-[#7B9FA6]" />
                  <span className="text-xs text-[#6B6B6B]">市集</span>
                </div>
                <div className="text-2xl font-medium text-[#3A3A3A]">
                  {marketCount}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-4 h-4 text-[#7B9FA6]" />
                  <span className="text-xs text-[#6B6B6B]">事件</span>
                </div>
                <div className="text-2xl font-medium text-[#3A3A3A]">
                  {eventCount}
                </div>
              </div>
            </div>
          </div>

          {/* 說明 */}
          <div className="mb-6">
            <p className="text-[#6B6B6B] leading-relaxed">
              此裝置目前有 <strong className="text-[#3A3A3A]">{marketCount} 個市集</strong> 和 <strong className="text-[#3A3A3A]">{eventCount} 個事件</strong> 尚未綁定到任何帳號。
              請選擇如何處理這些資料：
            </p>
          </div>

          {/* 選項 */}
          <div className="space-y-3">
            {/* 選項一：確認同步 */}
            <button
              onClick={() => handleMigration(MigrationOption.SYNC)}
              disabled={isLoading}
              className="w-full bg-[#7B9FA6] text-white p-6 rounded-2xl hover:bg-[#6A8E95] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg mb-1">
                    ✅ 確認同步
                  </h3>
                  <p className="text-sm text-white/80">
                    將此裝置的所有資料同步到帳號 <strong>{userEmail}</strong>
                  </p>
                </div>
              </div>
            </button>

            {/* 選項二：清除並登入 */}
            <button
              onClick={() => handleMigration(MigrationOption.CLEAR)}
              disabled={isLoading}
              className="w-full bg-[#FFF8E7] text-[#3A3A3A] p-6 rounded-2xl hover:bg-[#F5E6D8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left group border-2 border-[#D4A574]/20"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#D4A574]/20 rounded-xl group-hover:bg-[#D4A574]/30 transition-colors">
                  <Trash2 className="w-6 h-6 text-[#D4A574]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg mb-1">
                    🗑️ 清除並登入
                  </h3>
                  <p className="text-sm text-[#6B6B6B]">
                    清空本地資料，改從雲端載入該帳號的既有資料
                  </p>
                </div>
              </div>
            </button>

            {/* 選項三：取消登入 */}
            <button
              onClick={() => handleMigration(MigrationOption.CANCEL)}
              disabled={isLoading}
              className="w-full bg-[#F5E6E8] text-[#3A3A3A] p-6 rounded-2xl hover:bg-[#E5D6D8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left group border-2 border-[#d4183d]/20"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#d4183d]/10 rounded-xl group-hover:bg-[#d4183d]/20 transition-colors">
                  <X className="w-6 h-6 text-[#d4183d]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg mb-1">
                    ❌ 取消登入
                  </h3>
                  <p className="text-sm text-[#6B6B6B]">
                    登出帳號，保留本地資料，恢復匿名狀態
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* 警告 */}
          <div className="mt-6 p-4 bg-[#FFF8E7] rounded-2xl border-2 border-[#D4A574]/20">
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              ⚠️ <strong>注意：</strong>選擇「清除並登入」將會永久刪除本地資料，此操作無法復原。
              請確保您已備份重要資料。
            </p>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

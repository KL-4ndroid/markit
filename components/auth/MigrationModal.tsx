'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Database,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { executeMigration, MigrationOption } from '@/lib/supabase/migration';
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
  const [clearConfirmation, setClearConfirmation] = useState('');

  const handleMigration = async (option: MigrationOption) => {
    if (option === MigrationOption.CLEAR && clearConfirmation.trim() !== '清除') {
      toast.error('請先輸入「清除」以確認此操作。');
      return;
    }

    setSelectedOption(option);
    setIsLoading(true);
    setStatus('processing');
    setErrorMessage('');

    try {
      await executeMigration(option, userId);

      setStatus('success');

      if (option === MigrationOption.SYNC) {
        toast.success('本機資料已準備同步到雲端。');
      } else if (option === MigrationOption.CLEAR) {
        toast.success('此裝置的本機資料已清除，將使用雲端帳號資料。');
      } else {
        toast.info('已取消登入。');
      }

      setTimeout(() => {
        onMigrationComplete();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('資料處理失敗:', error);
      const message = error instanceof Error ? error.message : '請稍後再試。';
      setStatus('error');
      setErrorMessage(message);
      toast.error(`資料處理失敗：${message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
                    {selectedOption === MigrationOption.SYNC && '正在將本機資料標記為可同步。'}
                    {selectedOption === MigrationOption.CLEAR && '正在清除此裝置的本機資料。'}
                    {selectedOption === MigrationOption.CANCEL && '正在取消登入。'}
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle className="w-16 h-16 text-[#7B9FA6] mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-[#3A3A3A] mb-2">
                    已完成
                  </h3>
                  <p className="text-[#6B6B6B]">
                    {selectedOption === MigrationOption.SYNC && '本機資料會在同步時上傳到雲端。'}
                    {selectedOption === MigrationOption.CLEAR && '此裝置將改用雲端帳號資料。'}
                    {selectedOption === MigrationOption.CANCEL && '已取消登入，資料未變更。'}
                  </p>
                </>
              )}

              {status === 'error' && (
                <>
                  <AlertCircle className="w-16 h-16 text-[#d4183d] mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-[#3A3A3A] mb-2">
                    處理失敗
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
                    重新選擇
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <DialogTitle className="text-2xl font-medium text-[#3A3A3A] mb-2">
                此裝置已有本機資料
              </DialogTitle>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                你正在登入 <span className="font-medium text-[#7B9FA6]">{userEmail}</span>。
                系統偵測到此裝置已有尚未綁定到這個帳號的資料，請選擇如何處理。
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F5E6E8] rounded-full transition-colors"
              disabled={isLoading}
              aria-label="關閉"
            >
              <X className="w-5 h-5 text-[#6B6B6B]" />
            </button>
          </div>

          <div className="bg-[#E8F3E8] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-[#7B9FA6]" />
              <h3 className="font-medium text-[#3A3A3A]">本機資料摘要</h3>
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
                  <span className="text-xs text-[#6B6B6B]">事件紀錄</span>
                </div>
                <div className="text-2xl font-medium text-[#3A3A3A]">
                  {eventCount}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
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
                    保留本機資料並同步到雲端
                  </h3>
                  <p className="text-sm text-white/85">
                    建議選項。保留此裝置上的市集與紀錄，並綁定到目前登入的帳號。
                  </p>
                </div>
              </div>
            </button>

            <div className="w-full bg-[#FFF8E7] text-[#3A3A3A] p-6 rounded-2xl border-2 border-[#D4A574]/20">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[#D4A574]/20 rounded-xl group-hover:bg-[#D4A574]/30 transition-colors">
                  <Trash2 className="w-6 h-6 text-[#D4A574]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-lg mb-1">
                    清除此裝置的本機資料，使用雲端帳號
                  </h3>
                  <p className="text-sm text-[#6B6B6B]">
                    只清除此裝置上的本機資料，不會刪除雲端資料。若不確定，請選擇保留並同步。
                  </p>
                  <label className="block text-xs font-medium text-[#6B6B6B] mt-4 mb-2">
                    若要使用此選項，請輸入「清除」
                  </label>
                  <input
                    value={clearConfirmation}
                    onChange={(event) => setClearConfirmation(event.target.value)}
                    disabled={isLoading}
                    placeholder="清除"
                    className="w-full bg-white px-3 py-2 rounded-xl border border-[#D4A574]/30 focus:border-[#D4A574] focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleMigration(MigrationOption.CLEAR)}
                    disabled={isLoading || clearConfirmation.trim() !== '清除'}
                    className="mt-3 w-full bg-[#D4A574] text-white py-3 rounded-xl hover:bg-[#C29565] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    清除此裝置的本機資料
                  </button>
                </div>
              </div>
            </div>

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
                    先不要登入
                  </h3>
                  <p className="text-sm text-[#6B6B6B]">
                    取消登入並保留目前本機資料。你可以稍後再登入。
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 p-4 bg-[#FFF8E7] rounded-2xl border-2 border-[#D4A574]/20">
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              注意：這裡處理的是「此裝置上的本機資料」。若你已經有雲端資料，系統會在登入後重新同步。
              不確定時，請優先選擇「保留本機資料並同步到雲端」。
            </p>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

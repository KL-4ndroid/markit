/**
 * 同步確認對話框
 * 
 * 當用戶首次登入時，詢問是否要同步資料
 */

'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Cloud, Upload, Download, Trash2, AlertCircle, Loader2 } from 'lucide-react';

interface SyncConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: () => Promise<void>;
  onDownload: () => Promise<void>;
  onClear: () => Promise<void>;
  localEventCount: number;
  cloudEventCount: number;
}

export function SyncConfirmDialog({
  isOpen,
  onClose,
  onUpload,
  onDownload,
  onClear,
  localEventCount,
  cloudEventCount,
}: SyncConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<'upload' | 'download' | 'clear' | null>(null);

  const handleAction = async (actionType: 'upload' | 'download' | 'clear') => {
    setIsProcessing(true);
    setAction(actionType);

    try {
      if (actionType === 'upload') {
        await onUpload();
      } else if (actionType === 'download') {
        await onDownload();
      } else if (actionType === 'clear') {
        await onClear();
      }
      onClose();
    } catch (error) {
      console.error('操作失敗:', error);
    } finally {
      setIsProcessing(false);
      setAction(null);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={() => !isProcessing && onClose()}>
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
          <div className="fixed inset-0 bg-black/50" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-[#7B9FA6]/10 p-3 rounded-full">
                    <Cloud className="w-6 h-6 text-[#7B9FA6]" />
                  </div>
                  <div>
                    <Dialog.Title className="text-lg font-medium text-[#3A3A3A]">
                      資料同步設定
                    </Dialog.Title>
                    <p className="text-sm text-[#6B6B6B]">
                      選擇如何處理本地和雲端資料
                    </p>
                  </div>
                </div>

                {/* 資料統計 */}
                <div className="bg-[#FAFAF8] rounded-xl p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-1">本地資料</p>
                      <p className="text-2xl font-bold text-[#7B9FA6]">{localEventCount}</p>
                      <p className="text-xs text-[#6B6B6B]">筆記錄</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B6B6B] mb-1">雲端資料</p>
                      <p className="text-2xl font-bold text-[#D4A574]">{cloudEventCount}</p>
                      <p className="text-xs text-[#6B6B6B]">筆記錄</p>
                    </div>
                  </div>
                </div>

                {/* 操作選項 */}
                <div className="space-y-3 mb-6">
                  {/* 上傳本地資料 */}
                  <button
                    onClick={() => handleAction('upload')}
                    disabled={isProcessing || localEventCount === 0}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-[#7B9FA6]/20 hover:border-[#7B9FA6] hover:bg-[#7B9FA6]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing && action === 'upload' ? (
                      <Loader2 className="w-5 h-5 text-[#7B9FA6] animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-[#7B9FA6]" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-[#3A3A3A]">上傳本地資料到雲端</p>
                      <p className="text-xs text-[#6B6B6B]">保留本地資料，同步到雲端</p>
                    </div>
                  </button>

                  {/* 下載雲端資料 */}
                  <button
                    onClick={() => handleAction('download')}
                    disabled={isProcessing || cloudEventCount === 0}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-[#D4A574]/20 hover:border-[#D4A574] hover:bg-[#D4A574]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing && action === 'download' ? (
                      <Loader2 className="w-5 h-5 text-[#D4A574] animate-spin" />
                    ) : (
                      <Download className="w-5 h-5 text-[#D4A574]" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-[#3A3A3A]">下載雲端資料到本地</p>
                      <p className="text-xs text-[#6B6B6B]">合併雲端資料到本地</p>
                    </div>
                  </button>

                  {/* 清除本地資料 */}
                  <button
                    onClick={() => handleAction('clear')}
                    disabled={isProcessing || localEventCount === 0}
                    className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-[#d4183d]/20 hover:border-[#d4183d] hover:bg-[#d4183d]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing && action === 'clear' ? (
                      <Loader2 className="w-5 h-5 text-[#d4183d] animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5 text-[#d4183d]" />
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-[#3A3A3A]">清除本地資料</p>
                      <p className="text-xs text-[#6B6B6B]">刪除本地資料，從雲端重新開始</p>
                    </div>
                  </button>
                </div>

                {/* 警告提示 */}
                <div className="bg-[#FFF8E7] border border-[#D4A574]/20 rounded-xl p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-[#D4A574] flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[#3A3A3A]">
                      <span className="font-medium">提示：</span>
                      建議先上傳本地資料，再下載雲端資料，以確保資料完整性。
                    </p>
                  </div>
                </div>

                {/* 稍後決定按鈕 */}
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#ECECEC] transition-colors disabled:opacity-50"
                >
                  稍後決定
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

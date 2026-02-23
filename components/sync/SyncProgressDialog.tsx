/**
 * 同步進度對話框
 * 
 * 顯示上傳/下載的進度
 */

'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Upload, Download, CheckCircle, Loader2 } from 'lucide-react';

interface SyncProgressDialogProps {
  isOpen: boolean;
  type: 'upload' | 'download';
  current: number;
  total: number;
  currentItem?: string;
  phase?: 'snapshot' | 'incremental';
}

export function SyncProgressDialog({
  isOpen,
  type,
  current,
  total,
  currentItem,
  phase,
}: SyncProgressDialogProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = current >= total && total > 0;

  // 根據階段顯示不同的標題和描述
  const getPhaseInfo = () => {
    if (type === 'upload') {
      return {
        title: isComplete ? '上傳完成' : '正在上傳資料',
        description: isComplete ? `已上傳 ${total} 筆記錄` : `${current} / ${total} 筆記錄`,
      };
    }

    // 下載階段
    if (phase === 'snapshot') {
      return {
        title: isComplete ? '快照載入完成' : '正在載入雲端快照',
        description: isComplete ? '快照已載入' : '載入數據快照中...',
      };
    }

    if (phase === 'incremental') {
      return {
        title: isComplete ? '增量同步完成' : '正在同步增量事件',
        description: isComplete ? `已同步 ${total} 筆新事件` : `${current} / ${total} 筆新事件`,
      };
    }

    // 默認（全量同步）
    return {
      title: isComplete ? '同步完成' : '正在下載資料',
      description: isComplete ? `已處理 ${total} 筆記錄` : `${current} / ${total} 筆記錄`,
    };
  };

  const { title, description } = getPhaseInfo();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={() => {}}>
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
                <div className="flex flex-col items-center">
                  {/* 圖示 */}
                  <div className={`mb-4 p-4 rounded-full ${
                    isComplete 
                      ? 'bg-[#E8F3E8]' 
                      : type === 'upload' 
                      ? 'bg-[#7B9FA6]/10' 
                      : 'bg-[#D4A574]/10'
                  }`}>
                    {isComplete ? (
                      <CheckCircle className="w-8 h-8 text-[#7B9FA6]" />
                    ) : type === 'upload' ? (
                      <Upload className="w-8 h-8 text-[#7B9FA6]" />
                    ) : (
                      <Download className="w-8 h-8 text-[#D4A574]" />
                    )}
                  </div>

                  {/* 標題 */}
                  <Dialog.Title className="text-lg font-medium text-[#3A3A3A] mb-2">
                    {title}
                  </Dialog.Title>

                  {/* 進度文字 */}
                  <p className="text-sm text-[#6B6B6B] mb-6">
                    {description}
                  </p>

                  {/* 階段指示器（僅下載時顯示） */}
                  {type === 'download' && phase && (
                    <div className="w-full mb-4 flex items-center gap-2">
                      <div className={`flex-1 h-1 rounded-full ${
                        phase === 'snapshot' || phase === 'incremental' 
                          ? 'bg-[#7B9FA6]' 
                          : 'bg-gray-200'
                      }`} />
                      <span className="text-xs text-[#6B6B6B]">
                        {phase === 'snapshot' ? '1/2' : '2/2'}
                      </span>
                      <div className={`flex-1 h-1 rounded-full ${
                        phase === 'incremental' 
                          ? 'bg-[#7B9FA6]' 
                          : 'bg-gray-200'
                      }`} />
                    </div>
                  )}

                  {/* 進度條 */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isComplete 
                          ? 'bg-[#7B9FA6]' 
                          : type === 'upload' 
                          ? 'bg-[#7B9FA6]' 
                          : 'bg-[#D4A574]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* 百分比 */}
                  <p className="text-2xl font-bold text-[#3A3A3A] mb-4">
                    {percentage}%
                  </p>

                  {/* 當前處理項目 */}
                  {!isComplete && currentItem && (
                    <div className="w-full bg-[#FAFAF8] rounded-xl p-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-[#7B9FA6] animate-spin flex-shrink-0" />
                      <p className="text-xs text-[#6B6B6B] truncate">
                        {currentItem}
                      </p>
                    </div>
                  )}

                  {/* 完成提示 */}
                  {isComplete && (
                    <p className="text-sm text-[#7B9FA6] mt-2">
                      ✓ 所有資料已同步完成
                    </p>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

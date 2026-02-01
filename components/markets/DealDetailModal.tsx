'use client';

import { useState } from 'react';
import { X, Edit, Trash2, Clock, CreditCard } from 'lucide-react';
import type { Event, DealClosedPayload } from '@/types/db';

interface DealDetailModalProps {
  isOpen: boolean;
  deal: Event<DealClosedPayload> | null;
  onClose: () => void;
  onEdit?: (deal: Event<DealClosedPayload>) => void;
  onDelete?: (deal: Event<DealClosedPayload>) => void;
}

/**
 * 成交詳細內容彈窗
 * 顯示成交詳情、商品明細，並提供編輯和刪除功能
 */
export function DealDetailModal({ isOpen, deal, onClose, onEdit, onDelete }: DealDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!deal || !isOpen) return null;

  const payload = deal.payload as DealClosedPayload;

  // 格式化時間顯示
  const time = new Date(deal.timestamp).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  // 支付方式對應
  const paymentIcons = {
    cash: '💵',
    card: '💳',
    mobile: '📱',
    other: '💰'
  };

  const paymentLabels = {
    cash: '現金',
    card: '信用卡',
    mobile: '行動支付',
    other: '其他'
  };

  // 處理刪除
  const handleDelete = async () => {
    if (!onDelete || !window.confirm('確定要刪除這筆成交記錄嗎？此操作無法恢復。')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(deal);
      onClose();
    } catch (error) {
      console.error('刪除成交記錄失敗:', error);
      alert('刪除失敗，請稍後再試');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 彈窗內容 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#7B9FA6]/10">
            <h3 className="text-lg font-medium text-[#3A3A3A] flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#7B9FA6]" />
              成交詳情
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#FAFAF8] transition-colors"
            >
              <X className="w-5 h-5 text-[#6B6B6B]" />
            </button>
          </div>

          {/* 內容 */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* 基本資訊 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#FAFAF8] rounded-xl p-3">
                <div className="text-xs text-[#6B6B6B] mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  成交時間
                </div>
                <div className="text-sm font-medium text-[#3A3A3A]">{time}</div>
              </div>
              <div className="bg-[#FAFAF8] rounded-xl p-3">
                <div className="text-xs text-[#6B6B6B] mb-1">支付方式</div>
                <div className="text-sm font-medium text-[#3A3A3A] flex items-center gap-2">
                  <span>{paymentIcons[payload.paymentMethod]}</span>
                  <span>{paymentLabels[payload.paymentMethod]}</span>
                </div>
              </div>
            </div>

            {/* 商品明細 */}
            <div>
              <div className="text-sm font-medium text-[#3A3A3A] mb-3 flex items-center gap-2">
                <span>📦</span>
                商品明細
              </div>
              <div className="space-y-2">
                {payload.items && payload.items.length > 0 ? (
                  payload.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#FAFAF8] rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#3A3A3A]">
                          {item.product_name || `商品 ${item.productId}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-[#6B6B6B]">× {item.quantity}</span>
                        <span className="font-medium text-[#7B9FA6]">
                          NT$ {(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-[#6B6B6B] text-sm italic bg-[#FAFAF8] rounded-lg">
                    快速成交（無商品明細）
                  </div>
                )}
              </div>
            </div>

            {/* 總金額 */}
            <div className="pt-4 border-t-2 border-[#7B9FA6]/10">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-[#3A3A3A]">總計</span>
                <span className="text-xl font-bold text-[#7B9FA6] tabular-nums">
                  NT$ {payload.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 備註 */}
            {payload.notes && (
              <div className="pt-2">
                <div className="text-xs text-[#6B6B6B] mb-2">備註</div>
                <div className="text-sm bg-[#FAFAF8] p-3 rounded-lg border-l-4 border-[#7B9FA6]/20">
                  {payload.notes}
                </div>
              </div>
            )}

            {/* 補登標記 */}
            {payload.isBackfill && (
              <div className="bg-[#FFF8E7] border border-[#D4A574]/30 rounded-lg p-3">
                <div className="text-xs text-[#D4A574] font-medium flex items-center gap-1">
                  <span>📝</span>
                  補登記錄
                </div>
                <div className="text-xs text-[#6B6B6B] mt-1">
                  此筆成交為補登記錄，不影響當日庫存計算
                </div>
              </div>
            )}
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-3 p-6 border-t border-[#7B9FA6]/10 bg-[#FAFAF8]/50">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 py-3 px-4 bg-[#F5E6E8] text-[#d4183d] rounded-xl font-medium hover:bg-[#E5D6D8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? '刪除中...' : '刪除'}
            </button>
            <button
              onClick={() => onEdit?.(deal)}
              className="flex-1 py-3 px-4 bg-[#7B9FA6] text-white rounded-xl font-medium hover:bg-[#6A8E95] transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              編輯
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
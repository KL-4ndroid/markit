'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, DollarSign, Clock, Package, FileText } from 'lucide-react';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import type { Market } from '@/types/db';

interface EditMarketFormProps {
  isOpen: boolean;
  onClose: () => void;
  market: Market;
  onSuccess?: () => void;
}

/**
 * 編輯市集表單組件
 */
export function EditMarketForm({ isOpen, onClose, market, onSuccess }: EditMarketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableFree, setTableFree] = useState(market.tableFree || false);
  const [chairFree, setChairFree] = useState(market.chairFree || false);
  const [umbrellaFree, setUmbrellaFree] = useState(market.umbrellaFree || false);
  
  const [formData, setFormData] = useState({
    name: market.name,
    location: market.location,
    startDate: market.startDate,
    endDate: market.endDate,
    checkInTime: market.checkInTime || '09:30',
    operatingStartTime: market.operatingStartTime || '10:00',
    operatingEndTime: market.operatingEndTime || '18:00',
    boothCost: market.boothCost || 0,
    deposit: market.deposit || 0,
    tableRental: market.tableRental || 0,
    chairRental: market.chairRental || 0,
    umbrellaRental: market.umbrellaRental || 0,
    commissionRate: market.commissionRate || 0,
    notes: market.notes || '',
  });

  // 當 market 變更時更新表單
  useEffect(() => {
    if (market) {
      setFormData({
        name: market.name,
        location: market.location,
        startDate: market.startDate,
        endDate: market.endDate,
        checkInTime: market.checkInTime || '09:30',
        operatingStartTime: market.operatingStartTime || '10:00',
        operatingEndTime: market.operatingEndTime || '18:00',
        boothCost: market.boothCost || 0,
        deposit: market.deposit || 0,
        tableRental: market.tableRental || 0,
        chairRental: market.chairRental || 0,
        umbrellaRental: market.umbrellaRental || 0,
        commissionRate: market.commissionRate || 0,
        notes: market.notes || '',
      });
      setTableFree(market.tableFree || false);
      setChairFree(market.chairFree || false);
      setUmbrellaFree(market.umbrellaFree || false);
    }
  }, [market]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.startDate || !formData.endDate) {
      toast.error('請填寫所有必填欄位');
      return;
    }

    if (formData.endDate < formData.startDate) {
      toast.error('結束日期不能早於開始日期');
      return;
    }

    setIsSubmitting(true);

    try {
      await db.markets.update(market.id!, {
        name: formData.name,
        location: formData.location,
        startDate: formData.startDate,
        endDate: formData.endDate,
        checkInTime: formData.checkInTime,
        operatingStartTime: formData.operatingStartTime,
        operatingEndTime: formData.operatingEndTime,
        boothCost: formData.boothCost,
        deposit: formData.deposit,
        tableRental: tableFree ? 0 : formData.tableRental,
        chairRental: chairFree ? 0 : formData.chairRental,
        umbrellaRental: umbrellaFree ? 0 : formData.umbrellaRental,
        tableFree,
        chairFree,
        umbrellaFree,
        commissionRate: formData.commissionRate,
        notes: formData.notes,
        updatedAt: Date.now(),
      });

      toast.success('市集資訊已更新');
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('更新市集失敗：', error);
      toast.error('更新失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="min-h-full flex items-end sm:items-center sm:justify-center sm:p-4">
          <div className="bg-[#FAFAF8] w-full max-h-[95vh] sm:max-w-2xl sm:rounded-[2rem] overflow-hidden flex flex-col animate-slide-up relative shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] px-6 py-6 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-medium text-white">編輯市集</h2>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 表單內容 */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-24 overscroll-behavior-contain">
            <div className="px-6 py-6 space-y-6">
              {/* 基本資訊 */}
              <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6">
                <h2 className="text-lg font-medium mb-4 text-[#3A3A3A] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#7B9FA6]" />
                  基本資訊
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                      市集名稱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                      地點 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                        開始日期 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleChange('startDate', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                        結束日期 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => handleChange('endDate', e.target.value)}
                        min={formData.startDate}
                        className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 時間設定 */}
              <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6">
                <h2 className="text-lg font-medium mb-4 text-[#3A3A3A] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#7B9FA6]" />
                  時間設定
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">報到時間</label>
                    <input
                      type="time"
                      value={formData.checkInTime}
                      onChange={(e) => handleChange('checkInTime', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">營業開始</label>
                      <input
                        type="time"
                        value={formData.operatingStartTime}
                        onChange={(e) => handleChange('operatingStartTime', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">營業結束</label>
                      <input
                        type="time"
                        value={formData.operatingEndTime}
                        onChange={(e) => handleChange('operatingEndTime', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 成本資訊 */}
              <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6">
                <h2 className="text-lg font-medium mb-4 text-[#3A3A3A] flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#7B9FA6]" />
                  成本資訊
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">攤位費 (NT$)</label>
                      <input
                        type="number"
                        value={formData.boothCost}
                        onChange={(e) => handleChange('boothCost', Number(e.target.value))}
                        min="0"
                        className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">保證金 (NT$)</label>
                      <input
                        type="number"
                        value={formData.deposit}
                        onChange={(e) => handleChange('deposit', Number(e.target.value))}
                        min="0"
                        className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-[#FAFAF8] rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-medium text-[#3A3A3A]">設備租賃</h3>
                    <div>
                      <label className="block text-sm font-medium mb-2">桌子租金 (NT$)</label>
                      <input
                        type="number"
                        value={formData.tableRental}
                        onChange={(e) => handleChange('tableRental', Number(e.target.value))}
                        min="0"
                        disabled={tableFree}
                        className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all disabled:bg-gray-100"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tableFree}
                          onChange={(e) => setTableFree(e.target.checked)}
                          className="w-4 h-4 text-[#7B9FA6] border-[#7B9FA6]/30 rounded"
                        />
                        <span className="text-sm text-[#6B6B6B]">免費提供</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">椅子租金 (NT$)</label>
                      <input
                        type="number"
                        value={formData.chairRental}
                        onChange={(e) => handleChange('chairRental', Number(e.target.value))}
                        min="0"
                        disabled={chairFree}
                        className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all disabled:bg-gray-100"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chairFree}
                          onChange={(e) => setChairFree(e.target.checked)}
                          className="w-4 h-4 text-[#7B9FA6] border-[#7B9FA6]/30 rounded"
                        />
                        <span className="text-sm text-[#6B6B6B]">免費提供</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">傘租金 (NT$)</label>
                      <input
                        type="number"
                        value={formData.umbrellaRental}
                        onChange={(e) => handleChange('umbrellaRental', Number(e.target.value))}
                        min="0"
                        disabled={umbrellaFree}
                        className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all disabled:bg-gray-100"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={umbrellaFree}
                          onChange={(e) => setUmbrellaFree(e.target.checked)}
                          className="w-4 h-4 text-[#7B9FA6] border-[#7B9FA6]/30 rounded"
                        />
                        <span className="text-sm text-[#6B6B6B]">免費提供</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">抽成 (%)</label>
                    <input
                      type="number"
                      value={formData.commissionRate}
                      onChange={(e) => handleChange('commissionRate', Number(e.target.value))}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 備註 */}
              <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6">
                <h2 className="text-lg font-medium mb-4 text-[#3A3A3A] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#7B9FA6]" />
                  備註
                </h2>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-[#7B9FA6]/15 rounded-xl focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all resize-none"
                />
              </div>
            </div>
          </form>

          {/* 底部按鈕 - 固定在彈窗底部 */}
          <div className="sticky bottom-0 left-0 right-0 px-6 py-4 border-t border-[#7B9FA6]/10 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] flex-shrink-0">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors font-medium disabled:opacity-50"
              >
                {isSubmitting ? '更新中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

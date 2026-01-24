'use client';

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateRangeFilterProps {
  value: 'today' | 'week' | 'month' | 'all' | 'custom';
  onChange: (value: 'today' | 'week' | 'month' | 'all' | 'custom') => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (startDate: string, endDate: string) => void;
}

/**
 * 日期範圍篩選器組件
 * 
 * 提供快速篩選選項：今日、本週、本月、全部、自訂
 */
export function DateRangeFilter({ 
  value, 
  onChange, 
  customStartDate, 
  customEndDate, 
  onCustomDateChange 
}: DateRangeFilterProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(customStartDate || '');
  const [tempEndDate, setTempEndDate] = useState(customEndDate || '');

  const options = [
    { value: 'today' as const, label: '今日', emoji: '📅' },
    { value: 'week' as const, label: '本週', emoji: '📆' },
    { value: 'month' as const, label: '本月', emoji: '🗓️' },
    { value: 'all' as const, label: '全部', emoji: '📊' },
  ];

  // 處理自訂日期按鈕點擊
  const handleCustomClick = () => {
    setShowCustomPicker(!showCustomPicker);
    if (!showCustomPicker) {
      // 初始化日期
      const today = new Date().toISOString().split('T')[0];
      setTempStartDate(customStartDate || today);
      setTempEndDate(customEndDate || today);
    }
  };

  // 處理自訂日期確認
  const handleCustomConfirm = () => {
    if (tempStartDate && tempEndDate) {
      // 確保開始日期不晚於結束日期
      if (tempStartDate > tempEndDate) {
        alert('開始日期不能晚於結束日期');
        return;
      }
      
      onCustomDateChange?.(tempStartDate, tempEndDate);
      onChange('custom');
      setShowCustomPicker(false);
    }
  };

  // 處理取消
  const handleCustomCancel = () => {
    setShowCustomPicker(false);
    setTempStartDate(customStartDate || '');
    setTempEndDate(customEndDate || '');
  };

  // 格式化自訂日期顯示
  const formatCustomDateDisplay = () => {
    if (!customStartDate || !customEndDate) return '自訂';
    
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    
    const formatDate = (date: Date) => {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    };
    
    return `${formatDate(start)}-${formatDate(end)}`;
  };

  return (
    <div className="bg-white rounded-[1.5rem] p-4 shadow-md shadow-[#7B9FA6]/5">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-[#7B9FA6]" />
        <span className="text-sm font-medium text-[#3A3A3A]">時間範圍</span>
      </div>
      
      {/* 快速篩選按鈕 */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              py-2.5 rounded-xl text-sm font-medium transition-all
              ${value === option.value
                ? 'bg-[#7B9FA6] text-white shadow-md'
                : 'bg-[#FAFAF8] text-[#6B6B6B] hover:bg-[#F5E6E8]'
              }
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-base">{option.emoji}</span>
              <span className="text-xs">{option.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 自訂日期按鈕 */}
      <button
        onClick={handleCustomClick}
        className={`
          w-full py-2.5 rounded-xl text-sm font-medium transition-all
          ${value === 'custom'
            ? 'bg-[#7B9FA6] text-white shadow-md'
            : 'bg-[#FAFAF8] text-[#6B6B6B] hover:bg-[#F5E6E8]'
          }
        `}
      >
        <div className="flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{value === 'custom' ? formatCustomDateDisplay() : '自訂日期'}</span>
        </div>
      </button>

      {/* 自訂日期選擇器 */}
      {showCustomPicker && (
        <div className="mt-3 p-4 bg-[#FAFAF8] rounded-xl space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#3A3A3A]">選擇日期區間</span>
            <button
              onClick={handleCustomCancel}
              className="p-1 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-[#6B6B6B]" />
            </button>
          </div>

          {/* 開始日期 */}
          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1">
              開始日期
            </label>
            <input
              type="date"
              value={tempStartDate}
              onChange={(e) => setTempStartDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#7B9FA6]/15 rounded-lg focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all text-sm"
            />
          </div>

          {/* 結束日期 */}
          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1">
              結束日期
            </label>
            <input
              type="date"
              value={tempEndDate}
              onChange={(e) => setTempEndDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#7B9FA6]/15 rounded-lg focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all text-sm"
            />
          </div>

          {/* 確認按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={handleCustomCancel}
              className="flex-1 px-4 py-2 rounded-lg bg-white text-[#6B6B6B] hover:bg-[#F5E6E8] transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleCustomConfirm}
              disabled={!tempStartDate || !tempEndDate}
              className="flex-1 px-4 py-2 rounded-lg bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              確認
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

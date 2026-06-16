'use client';

import { useState } from 'react';
import { X, Calendar, MapPin, DollarSign, Clock, Package, FileText, DoorOpen, ClipboardCheck, Store, Moon } from 'lucide-react';
import { createMarket } from '@/lib/db/hooks';
import { DateMultiPicker } from '@/components/ui/DateMultiPicker'; // ✅ 改用多選日期選擇器
import { TimePicker } from '@/components/ui/TimePicker';
import type { MarketCreatedPayload } from '@/types/db';

interface AddMarketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 新增市集表單組件
 * 
 * 參考 sa.html 的設計，包含完整的時間軸管理功能
 */
export function AddMarketForm({ isOpen, onClose, onSuccess }: AddMarketFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noEarlyEntry, setNoEarlyEntry] = useState(true); // 預設勾選「不提前進場」
  
  // 免費提供狀態
  const [tableFree, setTableFree] = useState(false);
  const [chairFree, setChairFree] = useState(false);
  const [umbrellaFree, setUmbrellaFree] = useState(false);
  
  const [formData, setFormData] = useState<MarketCreatedPayload>({
    name: '',
    location: '',
    dates: [],              // ✅ 改用日期陣列
    startDate: '',          // 保留（自動計算）
    endDate: '',            // 保留（自動計算）
    
    // 時間軸 - 預設值
    earlyEntryEnabled: false,
    earlyEntryTime: '11:00',
    checkInTime: '12:00',
    operatingStartTime: '13:00',
    operatingEndTime: '19:00',
    
    // 財務資訊
    registrationFee: 0,
    boothCost: 0,
    deposit: 0,
    tableRental: 0,
    chairRental: 0,
    umbrellaRental: 0,
    commissionRate: 0,
    
    // 免費提供標記
    tableFree: false,
    chairFree: false,
    umbrellaFree: false,
    
    notes: '',
  });

  // 處理表單欄位變更
  const handleChange = (field: keyof MarketCreatedPayload, value: string | number | boolean | string[]) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // ✅ 當日期陣列變更時，自動計算 startDate 和 endDate
      if (field === 'dates' && Array.isArray(value) && value.length > 0) {
        const sortedDates = [...value].sort();
        updated.startDate = sortedDates[0];
        updated.endDate = sortedDates[sortedDates.length - 1];
      }
      
      // 當報到時間變更時，自動調整營業時間
      if (field === 'checkInTime' && typeof value === 'string') {
        const [hours, minutes] = value.split(':').map(Number);
        
        // 營業開始 = 報到 + 60分鐘
        const operatingStart = new Date(2000, 0, 1, hours, minutes + 60);
        updated.operatingStartTime = `${String(operatingStart.getHours()).padStart(2, '0')}:${String(operatingStart.getMinutes()).padStart(2, '0')}`;
        
        // 營業結束 = 報到 + 6小時
        const operatingEnd = new Date(2000, 0, 1, hours, minutes + 420); // 6小時 = 360分鐘
        updated.operatingEndTime = `${String(operatingEnd.getHours()).padStart(2, '0')}:${String(operatingEnd.getMinutes()).padStart(2, '0')}`;
      }
      
      return updated;
    });
  };

  // 使用預設值
  const useDefaultValues = () => {
    setFormData(prev => ({
      ...prev,
      checkInTime: '12:00',
      operatingStartTime: '13:00',
      operatingEndTime: '19:00',
    }));
  };

  // 計算營業時長
  const calculateDuration = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const minutes = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小時${mins}分鐘` : `${hours}小時`;
  };

  // 計算總時長
  const calculateTotalDuration = () => {
    const startTime = noEarlyEntry ? formData.checkInTime : formData.earlyEntryTime;
    return calculateDuration(startTime || '13:00', formData.operatingEndTime || '19:00');
  };

  // 計算固定成本總計
  const calculateTotalCost = () => {
    return (formData.boothCost || 0) + 
           (tableFree ? 0 : (formData.tableRental || 0)) + 
           (chairFree ? 0 : (formData.chairRental || 0)) + 
           (umbrellaFree ? 0 : (formData.umbrellaRental || 0));
  };

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ 驗證必填欄位（改為檢查 dates 陣列）
    if (!formData.name || !formData.location || !formData.dates || formData.dates.length === 0) {
      alert('請填寫所有必填欄位並選擇至少一個日期');
      return;
    }

    setIsSubmitting(true);

    try {
      // 設定提前進場狀態和免費提供標記
      const payload = {
        ...formData,
        earlyEntryEnabled: !noEarlyEntry,
        tableFree,
        chairFree,
        umbrellaFree,
        // 如果免費提供，強制設為 0
        tableRental: tableFree ? 0 : formData.tableRental,
        chairRental: chairFree ? 0 : formData.chairRental,
        umbrellaRental: umbrellaFree ? 0 : formData.umbrellaRental,
      };
      
      // 調用 createMarket 觸發事件溯源
      await createMarket(payload);
      
      // 重置表單
      setFormData({
        name: '',
        location: '',
        dates: [],              // ✅ 重置為空陣列
        startDate: '',
        endDate: '',
        earlyEntryEnabled: false,
        earlyEntryTime: '11:00',
        checkInTime: '12:00',
        operatingStartTime: '13:00',
        operatingEndTime: '19:00',
        registrationFee: 0,
        boothCost: 0,
        deposit: 0,
        tableRental: 0,
        chairRental: 0,
        umbrellaRental: 0,
        commissionRate: 0,
        tableFree: false,
        chairFree: false,
        umbrellaFree: false,
        notes: '',
      });
      setNoEarlyEntry(true);
      setTableFree(false);
      setChairFree(false);
      setUmbrellaFree(false);

      // 關閉表單
      onClose();
      
      // 觸發成功回調
      onSuccess?.();
    } catch (error) {
      console.error('建立市集失敗：', error);
      alert('建立市集失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 如果未開啟，不渲染
  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer 內容 */}
      <div className="fixed inset-0 z-50 flex justify-center p-4">
        <div className="bg-background w-full h-[90vh] rounded-[2rem] sm:h-auto sm:max-h-[95vh] sm:max-w-2xl sm:rounded-[2rem] overflow-hidden flex flex-col animate-slide-up relative">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-secondary px-6 py-6 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-medium text-white">新增市集</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 表單內容 */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pb-24">
            <div className="px-6 py-6 space-y-6">
              {/* 基本資訊 */}
              <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6">
                <h2 className="text-lg font-medium mb-4 text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  基本資訊
                </h2>
                <div className="space-y-4">
                  {/* 市集名稱 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      市集名稱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="例：華山文創市集"
                      className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      required
                    />
                  </div>

                  {/* 地點 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      地點 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      placeholder="例：台北市中正區"
                      className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      required
                    />
                  </div>

                  {/* 日期 - 多選模式 */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      市集日期 <span className="text-red-500">*</span>
                    </label>
                    <DateMultiPicker
                      value={formData.dates || []}
                      onChange={(value) => handleChange('dates', value)}
                      className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground font-medium"
                      placeholder="選擇市集日期（可選擇多個日期）"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 提示：可以選擇多個不連續的日期（例如：只選週六、週日）
                    </p>
                  </div>
                </div>
              </div>

              {/* 成本資訊 */}
              <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6">
                <h2 className="text-lg font-medium mb-4 text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  成本資訊
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm fon-medium mb-2">攤位費 (NT$)</label>
                      <input
                        type="number"
                        value={formData.boothCost}
                        onChange={(e) => handleChange('boothCost', Number(e.target.value))}
                        min="0"
                        placeholder="0"
                        className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">保證金 (NT$)</label>
                      <input
                        type="number"
                        value={formData.deposit}
                        onChange={(e) => handleChange('deposit', Number(e.target.value))}
                        min="0"
                        placeholder="0"
                        className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  {/* 設備租賃 */}
                  <div className="bg-background rounded-xl p-4 space-y-4">
                    <h3 className="text-sm font-medium text-foreground mb-3">設備租賃</h3>
                    
                    {/* 桌子租金 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">桌子租金 (NT$)</label>
                      <input
                        type="number"
                        value={formData.tableRental}
                        onChange={(e) => handleChange('tableRental', Number(e.target.value))}
                        min="0"
                        placeholder="0"
                        disabled={tableFree}
                        className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tableFree}
                          onChange={(e) => {
                            setTableFree(e.target.checked);
                            if (e.target.checked) {
                              handleChange('tableRental', 0);
                            }
                          }}
                          className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">免費提供</span>
                      </label>
                    </div>

                    {/* 椅子租金 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">椅子租金 (NT$)</label>
                      <input
                        type="number"
                        value={formData.chairRental}
                        onChange={(e) => handleChange('chairRental', Number(e.target.value))}
                        min="0"
                        placeholder="0"
                        disabled={chairFree}
                        className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chairFree}
                          onChange={(e) => {
                            setChairFree(e.target.checked);
                            if (e.target.checked) {
                              handleChange('chairRental', 0);
                            }
                          }}
                          className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">免費提供</span>
                      </label>
                    </div>

                    {/* 傘租金 */}
                    <div>
                      <label className="block text-sm font-medium mb-2">傘租金 (NT$)</label>
                      <input
                        type="number"
                        value={formData.umbrellaRental}
                        onChange={(e) => handleChange('umbrellaRental', Number(e.target.value))}
                        min="0"
                        placeholder="0"
                        disabled={umbrellaFree}
                        className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={umbrellaFree}
                          onChange={(e) => {
                            setUmbrellaFree(e.target.checked);
                            if (e.target.checked) {
                              handleChange('umbrellaRental', 0);
                            }
                          }}
                          className="w-4 h-4 text-primary border-primary/30 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">免費提供</span>
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
                      placeholder="0"
                      className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <p className="text-xs text-muted-foreground mt-1">例：10 代表 10% 抽成</p>
                  </div>

                  <div className="bg-primary/10 border-2 border-primary/20 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">固定成本總計：</span>
                      <span className="text-xl font-bold text-primary">NT$ {calculateTotalCost().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 市集時間軸 */}
              <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">市集時間軸</h3>
                  </div>
                  <button
                    type="button"
                    onClick={useDefaultValues}
                    className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors font-medium"
                  >
                    使用預設值
                  </button>
                </div>

                <div className="bg-white border-2 border-primary/15 rounded-[1.5rem] p-4">
                  <div className="space-y-4">
                    {/* 提前進場 */}
                    {!noEarlyEntry && (
                      <>
                        <div>
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-soft-pink text-secondary border-secondary/30">
                              <DoorOpen className="w-5 h-5" />
                              <span className="font-medium text-sm">提前進場</span>
                            </div>
                            <TimePicker
                              value={formData.earlyEntryTime || '09:00'}
                              onChange={(value) => handleChange('earlyEntryTime', value)}
                              className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground text-base font-semibold tracking-wide"
                              placeholder="選擇時間"
                            />
                          </div>
                          <div className="ml-6 my-2">
                            <div className="w-0.5 h-4 bg-primary/20"></div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* 不提前進場 Checkbox */}
                    <div className="bg-soft-pink/30 rounded-xl p-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noEarlyEntry}
                          onChange={(e) => setNoEarlyEntry(e.target.checked)}
                          className="w-5 h-5 text-secondary border-primary/30 rounded focus:ring-secondary"
                        />
                        <span className="text-foreground font-medium">不提前進場</span>
                      </label>
                    </div>

                    {/* 報到 */}
                    <div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-soft-green text-primary border-primary/30">
                          <ClipboardCheck className="w-5 h-5" />
                          <span className="font-medium text-sm">報到</span>
                          <span className="ml-auto text-xs opacity-70">自動調整</span>
                        </div>
                        <TimePicker
                          value={formData.checkInTime || '09:30'}
                          onChange={(value) => handleChange('checkInTime', value)}
                          className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground text-base font-semibold tracking-wide"
                          placeholder="選擇時間"
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                          <span>→</span>
                          <span className="font-medium">{calculateDuration(formData.checkInTime || '12:00', formData.operatingStartTime || '13:00')}</span>
                        </div>
                      </div>
                      <div className="ml-6 my-2">
                        <div className="w-0.5 h-4 bg-primary/20"></div>
                      </div>
                    </div>

                    {/* 營業中 */}
                    <div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-soft-green text-primary border-primary/30">
                          <Store className="w-5 h-5" />
                          <span className="font-medium text-sm">營業中</span>
                        </div>
                        <TimePicker
                          value={formData.operatingStartTime || '10:00'}
                          onChange={(value) => handleChange('operatingStartTime', value)}
                          className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground text-base font-semibold tracking-wide"
                          placeholder="選擇時間"
                        />
                        <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                          <span>→</span>
                          <span className="font-medium">{calculateDuration(formData.operatingStartTime || '10:00', formData.operatingEndTime || '18:00')}</span>
                        </div>
                      </div>
                      <div className="ml-6 my-2">
                        <div className="w-0.5 h-4 bg-primary/20"></div>
                      </div>
                    </div>

                    {/* 營業結束 */}
                    <div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 bg-soft-yellow text-secondary border-secondary/30">
                          <Moon className="w-5 h-5" />
                          <span className="font-medium text-sm">營業結束</span>
                        </div>
                        <TimePicker
                          value={formData.operatingEndTime || '18:00'}
                          onChange={(value) => handleChange('operatingEndTime', value)}
                          className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground text-base font-semibold tracking-wide"
                          placeholder="選擇時間"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 時長統計 */}
                  <div className="mt-6 pt-6 border-t-2 border-primary/10">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-soft-green rounded-xl p-3">
                        <p className="text-muted-foreground mb-1 text-xs">營業時長</p>
                        <p className="text-lg font-bold text-primary">
                          {calculateDuration(formData.operatingStartTime || '10:00', formData.operatingEndTime || '18:00')}
                        </p>
                      </div>
                      <div className="bg-soft-pink rounded-xl p-3">
                        <p className="text-muted-foreground mb-1 text-xs">總時長</p>
                        <p className="text-lg font-bold text-secondary">
                          {calculateTotalDuration()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 提示 */}
                <div className="text-xs text-muted-foreground space-y-1 bg-primary/5 rounded-xl p-3 mt-4">
                  <p className="flex items-center gap-1">
                    <span className="font-medium">💡 提示：修改報到時間會自動調整營業時間</span>
                  </p>
                  <p className="flex items-center gap-1 ml-4">
                    <span>• 營業中 = 報到 + 1小時</span>
                  </p>
                  <p className="flex items-center gap-1 ml-4">
                    <span>• 營業結束 = 營業中 + 6小時</span>
                  </p>
                  <p className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    預設值：報到 12:00 | 營業中 13:00-19:00
                  </p>
                </div>
              </div>

              {/* 備註 */}
              <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6">
                <h2 className="text-lg font-medium mb-4 text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  備註
                </h2>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  placeholder="其他備註事項..."
                  className="w-full px-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>
            </div>
          </form>

          {/* 底部按鈕 - 固定在彈窗底部 */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-primary/10 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 rounded-2xl bg-primary text-white hover:bg-primary/85 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '建立中...' : '建立市集'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

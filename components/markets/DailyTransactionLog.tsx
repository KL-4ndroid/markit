/**
 * 當日流水帳組件
 * 
 * 顯示當日所有交易記錄的流水帳
 * - 按時間順序顯示
 * - 包含互動記錄和成交記錄
 * - 實時更新
 * - 支援刪除單筆記錄
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock, TrendingUp, DollarSign, Package, Trash2, AlertCircle } from 'lucide-react';
import { getActiveDealEvents, getActiveInteractionEvents } from '@/lib/db/event-tombstones';
import { formatCurrency } from '@/lib/utils';
import { getInteractionButtons } from '@/lib/interaction-buttons-store';
import { deleteDealEventById, deleteInteractionEventById } from '@/lib/markets/event-deletion-service';
import { getDealEventDate, getDealEventRevenue, getEventMarketId } from '@/lib/markets/event-view-utils';
import { toast } from 'sonner';

interface DailyTransactionLogProps {
  marketId: string;
  date?: string; // 可選：指定日期，預設為今天
}

interface LogEntry {
  id: string;
  type: 'interaction' | 'deal';
  timestamp: number;
  time: string;
  description: string;
  amount?: number;
  emoji?: string;
  color: string;
}

export function DailyTransactionLog({ marketId, date }: DailyTransactionLogProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalDeals, setTotalDeals] = useState(0);
  const [totalInteractions, setTotalInteractions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 確保只在客戶端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 獲取今天的日期字串
  const getTargetDate = useCallback(() => {
    if (date) return date;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, [date]);

  // 載入當日流水帳
  const loadDailyLog = useCallback(async () => {
    setIsLoading(true);
    try {
      const targetDate = getTargetDate();
      const startOfDay = new Date(targetDate).setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate).setHours(23, 59, 59, 999);

      // 獲取互動按鈕配置
      const buttons = getInteractionButtons();
      const buttonMap = new Map(buttons.map(b => [b.id, { label: b.label, emoji: b.emoji }]));

      // 獲取當日互動記錄
      const interactions = (await getActiveInteractionEvents())
        .filter(e => {
          if (getEventMarketId(e) !== marketId) return false;
          return e.timestamp >= startOfDay && e.timestamp <= endOfDay;
        });

      // 獲取當日成交記錄
      const deals = (await getActiveDealEvents())
        .filter(e => {
          if (getEventMarketId(e) !== marketId) return false;
          return getDealEventDate(e) === targetDate;
        });

      // 轉換為流水帳格式
      const logEntries: LogEntry[] = [];

      // 添加互動記錄
      interactions.forEach(event => {
        const time = new Date(event.timestamp);
        const button = buttonMap.get(event.payload.type);
        
        logEntries.push({
          id: event.id!,
          type: 'interaction',
          timestamp: event.timestamp,
          time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
          description: button?.label || event.payload.type,
          emoji: button?.emoji || '📝',
          color: 'text-[#8B7BA6]',
        });
      });

      // 添加成交記錄
      let revenue = 0;
      deals.forEach(event => {
        const time = new Date(event.timestamp);
        const amount = getDealEventRevenue(event);
        revenue += amount;
        
        // 獲取商品資訊
        let description = '成交';
        if (event.payload.isManualEntry) {
          description = `手動輸入 - ${event.payload.manualDealCount || 1} 筆`;
        } else if (event.payload.items && event.payload.items.length > 0) {
          const itemCount = event.payload.items.reduce((sum, item) => sum + item.quantity, 0);
          description = `${event.payload.items.length} 項商品，共 ${itemCount} 件`;
        }
        
        logEntries.push({
          id: event.id!,
          type: 'deal',
          timestamp: event.timestamp,
          time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
          description,
          amount,
          emoji: '💰',
          color: 'text-[#7B9FA6]',
        });
      });

      // 按時間排序（最新的在上面）
      logEntries.sort((a, b) => b.timestamp - a.timestamp);

      setLogs(logEntries);
      setTotalRevenue(revenue);
      setTotalDeals(deals.length);
      setTotalInteractions(interactions.length);
    } catch (error) {
      console.error('載入當日流水帳失敗：', error);
    } finally {
      setIsLoading(false);
    }
  }, [getTargetDate, marketId]);

  // 初始載入
  useEffect(() => {
    loadDailyLog();
  }, [loadDailyLog]);

  // 監聽新的交易和互動
  useEffect(() => {
    const handleUpdate = () => {
      loadDailyLog();
    };

    window.addEventListener('interaction-recorded', handleUpdate);
    window.addEventListener('deal-closed', handleUpdate);

    return () => {
      window.removeEventListener('interaction-recorded', handleUpdate);
      window.removeEventListener('deal-closed', handleUpdate);
    };
  }, [loadDailyLog]);

  const handleDeleteLog = async () => {
    if (!selectedLog) return;

    setIsDeleting(true);

    try {
      if (selectedLog.type === 'deal') {
        await deleteDealEventById(selectedLog.id);
      } else {
        await deleteInteractionEventById(selectedLog.id);
      }
      setShowDeleteConfirm(false);
      setSelectedLog(null);

      await loadDailyLog();

      toast.success('記錄已刪除並同步到雲端');
    } catch (error) {
      console.error('刪除記錄失敗:', error);
      toast.error('刪除失敗，請稍後再試');
    } finally {
      setIsDeleting(false);
    }
  };
  const openDeleteConfirm = (log: LogEntry) => {
    setSelectedLog(log);
    setShowDeleteConfirm(true);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
        <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A] mb-4">
          <Clock className="w-5 h-5 text-[#7B9FA6]" />
          當日流水帳
        </h2>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[#7B9FA6] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-[#6B6B6B] mt-2">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A]">
          <Clock className="w-5 h-5 text-[#7B9FA6]" />
          當日流水帳
        </h2>
        <div className="text-xs text-[#6B6B6B]">
          {new Date(getTargetDate()).toLocaleDateString('zh-TW', { 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* 統計摘要 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-[#7B9FA6]/10 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-[#7B9FA6]">{totalDeals}</div>
          <div className="text-xs text-[#6B6B6B] mt-1">成交</div>
        </div>
        <div className="bg-[#E8F3E8] rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-[#3A3A3A]">{totalInteractions}</div>
          <div className="text-xs text-[#6B6B6B] mt-1">互動</div>
        </div>
        <div className="bg-[#D4A574]/10 rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-[#D4A574]">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-[#6B6B6B] mt-1">收入</div>
        </div>
      </div>

      {/* 流水帳列表 */}
      {logs.length === 0 ? (
        <div className="bg-[#FAFAF8] rounded-xl p-8 text-center">
          <Package className="w-12 h-12 text-[#7B9FA6] mx-auto mb-3 opacity-30" />
          <p className="text-sm text-[#6B6B6B]">今日尚無交易記錄</p>
          <p className="text-xs text-[#6B6B6B] mt-1">開始記錄互動和成交吧！</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`group flex items-center justify-between p-3 rounded-xl transition-all hover:bg-[#FAFAF8] ${
                log.type === 'deal' ? 'bg-[#7B9FA6]/5' : 'bg-white border border-[#7B9FA6]/10'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-2xl">{log.emoji}</div>
                <div className="flex-1">
                  <div className={`font-medium ${log.color}`}>
                    {log.description}
                  </div>
                  <div className="text-xs text-[#6B6B6B] flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {log.time}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {log.amount !== undefined && (
                  <div className="text-right">
                    <div className="font-bold text-[#7B9FA6]">
                      {formatCurrency(log.amount)}
                    </div>
                  </div>
                )}
                {/* 刪除按鈕 - hover 時顯示 */}
                <button
                  onClick={() => openDeleteConfirm(log)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-red-50 text-red-500"
                  title="刪除記錄"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部提示 */}
      {logs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#7B9FA6]/10">
          <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
            <span>共 {logs.length} 筆記錄</span>
            <span>實時更新</span>
          </div>
        </div>
      )}

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && isMounted && selectedLog && createPortal(
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black/50 z-[999] transition-opacity" 
            onClick={() => {
              setShowDeleteConfirm(false);
              setSelectedLog(null);
            }} 
          />
          
          {/* 對話框容器 */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none p-6">
            <div 
              className="bg-white rounded-[1.5rem] p-6 max-w-sm w-full shadow-xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                確認刪除記錄？
              </h3>
              <p className="text-sm text-[#6B6B6B] mb-4">
                {selectedLog.type === 'deal' ? (
                  <>
                    刪除此成交記錄後，將會：
                    <br />
                    • 扣除收入 {selectedLog.amount ? formatCurrency(selectedLog.amount) : ''}
                    <br />
                    • 更新市集統計
                    <br />
                    • 同步到雲端
                  </>
                ) : (
                  <>
                    刪除此互動記錄後，將會：
                    <br />
                    • 從流水帳中移除
                    <br />
                    • 同步到雲端
                  </>
                )}
              </p>
              
              {/* 記錄詳情 */}
              <div className="bg-[#FAFAF8] rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{selectedLog.emoji}</span>
                  <span className="font-medium text-[#3A3A3A]">{selectedLog.description}</span>
                </div>
                <div className="text-xs text-[#6B6B6B] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedLog.time}
                  {selectedLog.amount && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="font-medium">{formatCurrency(selectedLog.amount)}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedLog(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors"
                  disabled={isDeleting}
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteLog}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? '刪除中...' : '確認刪除'}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

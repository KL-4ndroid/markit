'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, Clock } from 'lucide-react';
import { useMemo } from 'react';
import type { Event, InteractionRecordedPayload } from '@/types/db';
import { getInteractionType } from '@/lib/events/event-read-model';

interface InteractionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  interactionType: string;
  label: string;
  emoji: string;
  events: Event<InteractionRecordedPayload>[];
}

/**
 * 互動記錄詳情彈窗
 * 顯示特定互動類型的所有記錄時間
 */
export function InteractionDetailModal({
  isOpen,
  onClose,
  interactionType,
  label,
  emoji,
  events,
}: InteractionDetailModalProps) {
  // 過濾出該類型的互動事件，並按時間排序（最新的在前）
  const filteredEvents = useMemo(() => {
    return events
      .filter(e => getInteractionType(e) === interactionType)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [events, interactionType]);

  // 按日期分組
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Event<InteractionRecordedPayload>[]> = {};
    
    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(event);
    });
    
    return groups;
  }, [filteredEvents]);

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (dateStr === today) {
      return '今天';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    if (dateStr === yesterdayStr) {
      return '昨天';
    }
    
    return `${month}/${day}`;
  };

  // 格式化時間
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      {/* 彈窗容器 */}
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="bg-white rounded-[1.5rem] max-w-md w-full shadow-xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="text-3xl">{emoji}</div>
              <div>
                <DialogTitle className="text-lg font-medium text-foreground">{label}</DialogTitle>
                <p className="text-sm text-muted-foreground">共 {filteredEvents.length} 次互動</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3 opacity-30">{emoji}</div>
                <p className="text-muted-foreground">尚無互動記錄</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedByDate).map(([date, events]) => (
                  <div key={date}>
                    {/* 日期標題 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-sm font-medium text-primary">
                        {formatDate(date)}
                      </div>
                      <div className="flex-1 h-px bg-primary/20"></div>
                      <div className="text-xs text-muted-foreground">
                        {events.length} 次
                      </div>
                    </div>

                    {/* 時間列表 */}
                    <div className="space-y-2">
                      {events.map((event, index) => (
                        <div
                          key={event.id || index}
                          className="flex items-center gap-3 bg-background rounded-lg p-3 hover:bg-[#F5F5F0] transition-colors"
                        >
                          <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">
                              {formatTime(event.timestamp)}
                            </div>
                            {event.payload.notes && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {event.payload.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full bg-primary text-white px-4 py-3 rounded-2xl hover:bg-primary/85 transition-colors"
            >
              關閉
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

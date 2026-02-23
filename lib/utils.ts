import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合併 Tailwind CSS 類名
 * 使用 clsx 處理條件類名，使用 tailwind-merge 處理衝突
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 格式化日期為本地化字串
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 格式化時間為本地化字串
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化金額
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * 格式化數字（千分位）
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-TW').format(num);
}

/**
 * 生成日期範圍陣列（包含起始和結束日期）
 * 
 * @param startDate - 開始日期 (YYYY-MM-DD)
 * @param endDate - 結束日期 (YYYY-MM-DD)
 * @returns 日期陣列
 * 
 * @example
 * generateDateRange('2024-02-15', '2024-02-17')
 * // 返回: ['2024-02-15', '2024-02-16', '2024-02-17']
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // 設置為本地時間的午夜，避免時區問題
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const current = new Date(start);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    
    // 移動到下一天
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * 智能合併日期顯示
 * 將連續的日期合併為範圍，不連續的日期單獨顯示
 * 
 * @param dates - 日期陣列 (YYYY-MM-DD)
 * @returns 格式化的日期字串
 * 
 * @example
 * formatDateRanges(['2024-02-15', '2024-02-16', '2024-02-17', '2024-02-22', '2024-02-23'])
 * // 返回: '2024-02-15~17, 2024-02-22~23'
 * 
 * formatDateRanges(['2024-02-15', '2024-02-17', '2024-02-20'])
 * // 返回: '2024-02-15, 2024-02-17, 2024-02-20'
 */
export function formatDateRanges(dates: string[]): string {
  if (!dates || dates.length === 0) return '';
  
  // 排序日期
  const sortedDates = [...dates].sort();
  
  if (sortedDates.length === 1) {
    return formatDate(sortedDates[0]);
  }
  
  const ranges: string[] = [];
  let rangeStart = sortedDates[0];
  let rangeEnd = sortedDates[0];
  
  for (let i = 1; i < sortedDates.length; i++) {
    const current = new Date(sortedDates[i]);
    const previous = new Date(sortedDates[i - 1]);
    
    // 計算日期差（天數）
    const diffTime = current.getTime() - previous.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays === 1) {
      // 連續日期，擴展範圍
      rangeEnd = sortedDates[i];
    } else {
      // 不連續，保存當前範圍並開始新範圍
      ranges.push(formatRange(rangeStart, rangeEnd));
      rangeStart = sortedDates[i];
      rangeEnd = sortedDates[i];
    }
  }
  
  // 添加最後一個範圍
  ranges.push(formatRange(rangeStart, rangeEnd));
  
  return ranges.join(', ');
}

/**
 * 格式化單個日期範圍
 * 
 * @param start - 開始日期
 * @param end - 結束日期
 * @returns 格式化的範圍字串
 */
function formatRange(start: string, end: string): string {
  if (start === end) {
    // 單一日期
    return formatDate(start);
  }
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const startDay = startDate.getDate();
  
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;
  const endDay = endDate.getDate();
  
  // 同年同月：2024/02/15~17
  if (startYear === endYear && startMonth === endMonth) {
    return `${startYear}/${String(startMonth).padStart(2, '0')}/${String(startDay).padStart(2, '0')}~${String(endDay).padStart(2, '0')}`;
  }
  
  // 同年不同月：2024/02/28~03/02
  if (startYear === endYear) {
    return `${startYear}/${String(startMonth).padStart(2, '0')}/${String(startDay).padStart(2, '0')}~${String(endMonth).padStart(2, '0')}/${String(endDay).padStart(2, '0')}`;
  }
  
  // 不同年：2024/12/30~2025/01/02
  return `${startYear}/${String(startMonth).padStart(2, '0')}/${String(startDay).padStart(2, '0')}~${endYear}/${String(endMonth).padStart(2, '0')}/${String(endDay).padStart(2, '0')}`;
}

/**
 * 過濾當週的日期
 * 
 * @param dates - 日期陣列 (YYYY-MM-DD)
 * @returns 當週的日期陣列
 */
export function filterCurrentWeekDates(dates: string[]): string[] {
  if (!dates || dates.length === 0) return [];
  
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // 計算本週的開始和結束日期（週日到週六）
  const currentDay = now.getDay(); // 0 (週日) 到 6 (週六)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - currentDay);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
  const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
  
  // 過濾出當週的日期
  return dates.filter(date => date >= weekStartStr && date <= weekEndStr).sort();
}
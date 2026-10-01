import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import {
  formatCurrency as formatSharedCurrency,
  formatDisplayDate,
  formatDisplayDateRanges,
} from '@/lib/presentation/formatters';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return formatDisplayDate(date);
}

export function formatTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsedDate.getTime())) return typeof date === 'string' ? date : '';
  return parsedDate.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatCurrency(amount: number): string {
  return formatSharedCurrency(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-TW').format(num);
}

export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return dates;

  const current = new Date(start);
  while (current <= end) {
    dates.push([
      current.getFullYear(),
      String(current.getMonth() + 1).padStart(2, '0'),
      String(current.getDate()).padStart(2, '0'),
    ].join('-'));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function formatDateRanges(dates: string[]): string {
  return formatDisplayDateRanges(dates);
}

export function filterCurrentWeekDates(dates: string[]): string[] {
  if (dates.length === 0) return [];

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const toDateKey = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  const weekStartKey = toDateKey(weekStart);
  const weekEndKey = toDateKey(weekEnd);
  return dates.filter(date => date >= weekStartKey && date <= weekEndKey).sort();
}

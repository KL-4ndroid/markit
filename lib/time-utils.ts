/**
 * 時間工具函數
 *
 * 統一處理本地時間，避免時區問題
 *
 * 核心原則：
 * 1. 所有時間判斷使用本地時間（用戶設備的時區）
 * 2. 日期字串統一使用 YYYY-MM-DD 格式
 * 3. 時間字串統一使用 HH:MM 格式（24 小時制）
 * 4. 內部處理使用毫秒時間戳（number 類型）
 */

/**
 * 獲取當前本地日期字串（YYYY-MM-DD）
 *
 * @param date - Date 對象（預設為當前時間）
 * @returns 日期字串（YYYY-MM-DD）
 *
 * @example
 * getLocalDateString()  // '2026-02-22'
 * getLocalDateString(new Date(2026, 1, 23))  // '2026-02-23'
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ✅ 從時間戳獲取本地日期字串（YYYY-MM-DD）
 *
 * 這是與 Supabase timestamptz 交互時的核心工具。
 * Supabase 返回 ISO 字串會被解析為本地時間，這個函數確保結果是本地日期。
 *
 * @param timestamp - 時間戳（毫秒）
 * @returns 日期字串（YYYY-MM-DD，本地時間）
 *
 * @example
 * // 台北時間 (UTC+8) 2026-02-22 08:00 UTC -> '2026-02-22'
 * timestampToLocalDateString(Date.now())
 */
export function timestampToLocalDateString(timestamp: number): string {
  return getLocalDateString(new Date(timestamp));
}

/**
 * ✅ 將 ISO 時間字串轉換為本地日期字串
 *
 * 用於處理 Supabase 返回的 timestamptz 字串。
 *
 * @param isoString - ISO 8601 時間字串
 * @returns 日期字串（YYYY-MM-DD，本地時間）
 */
export function isoToLocalDateString(isoString: string): string {
  return timestampToLocalDateString(new Date(isoString).getTime());
}

/**
 * ✅ 獲取當前本地時間戳
 *
 * 與 Supabase timestamptz 保持一致，忽略時區偏移。
 *
 * @returns 時間戳（毫秒）
 */
export function getLocalNow(): number {
  return Date.now();
}

/**
 * 獲取當前本地時間字串（HH:MM）
 * 
 * @param date - Date 對象（預設為當前時間）
 * @returns 時間字串（HH:MM）
 * 
 * @example
 * getLocalTimeString()  // '14:30'
 * getLocalTimeString(new Date(2026, 1, 23, 9, 0))  // '09:00'
 */
export function getLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 獲取當前本地日期時間字串（YYYY-MM-DD HH:MM）
 * 
 * @param date - Date 對象（預設為當前時間）
 * @returns 日期時間字串（YYYY-MM-DD HH:MM）
 * 
 * @example
 * getLocalDateTimeString()  // '2026-02-22 14:30'
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  return `${getLocalDateString(date)} ${getLocalTimeString(date)}`;
}

/**
 * 解析日期字串為本地時間 Date 對象
 * 
 * ⚠️ 注意：不要使用 new Date('2026-02-23')，會被解析為 UTC 時間
 * 
 * @param dateStr - 日期字串（YYYY-MM-DD）
 * @returns Date 對象（本地時間，時分秒為 00:00:00）
 * 
 * @example
 * parseLocalDate('2026-02-23')  // 本地 2026-02-23 00:00:00
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * 解析時間字串為本地時間 Date 對象
 * 
 * @param timeStr - 時間字串（HH:MM）
 * @param baseDate - 基準日期（預設為今天）
 * @returns Date 對象（本地時間）
 * 
 * @example
 * parseLocalTime('09:00')  // 今天 09:00:00
 * parseLocalTime('14:30', new Date(2026, 1, 23))  // 2026-02-23 14:30:00
 */
export function parseLocalTime(timeStr: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * 解析日期時間字串為本地時間 Date 對象
 * 
 * @param dateTimeStr - 日期時間字串（YYYY-MM-DD HH:MM）
 * @returns Date 對象（本地時間）
 * 
 * @example
 * parseLocalDateTime('2026-02-23 09:00')  // 本地 2026-02-23 09:00:00
 */
export function parseLocalDateTime(dateTimeStr: string): Date {
  const [dateStr, timeStr] = dateTimeStr.split(' ');
  const date = parseLocalDate(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * 比較兩個日期字串（YYYY-MM-DD）
 * 
 * @param date1 - 日期字串 1
 * @param date2 - 日期字串 2
 * @returns -1: date1 < date2, 0: date1 === date2, 1: date1 > date2
 * 
 * @example
 * compareDateStrings('2026-02-22', '2026-02-23')  // -1
 * compareDateStrings('2026-02-23', '2026-02-23')  // 0
 * compareDateStrings('2026-02-24', '2026-02-23')  // 1
 */
export function compareDateStrings(date1: string, date2: string): number {
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
}

/**
 * 比較兩個時間字串（HH:MM）
 * 
 * @param time1 - 時間字串 1
 * @param time2 - 時間字串 2
 * @returns -1: time1 < time2, 0: time1 === time2, 1: time1 > time2
 * 
 * @example
 * compareTimeStrings('09:00', '10:00')  // -1
 * compareTimeStrings('14:30', '14:30')  // 0
 * compareTimeStrings('18:00', '09:00')  // 1
 */
export function compareTimeStrings(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;
  
  if (minutes1 < minutes2) return -1;
  if (minutes1 > minutes2) return 1;
  return 0;
}

/**
 * 檢查日期字串是否為今天
 * 
 * @param dateStr - 日期字串（YYYY-MM-DD）
 * @returns 是否為今天
 * 
 * @example
 * isToday('2026-02-22')  // true（如果今天是 2026-02-22）
 * isToday('2026-02-23')  // false（如果今天是 2026-02-22）
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getLocalDateString();
}

/**
 * 檢查當前時間是否在指定時間範圍內
 * 
 * ⚠️ 注意：自動處理跨午夜的情況（例如：22:00 - 02:00）
 * 
 * @param startTime - 開始時間（HH:MM）
 * @param endTime - 結束時間（HH:MM）
 * @param currentTime - 當前時間（HH:MM，可選，預設為當前時間）
 * @returns 是否在範圍內
 * 
 * @example
 * isTimeInRange('09:00', '18:00', '14:30')  // true
 * isTimeInRange('09:00', '18:00', '20:00')  // false
 * isTimeInRange('22:00', '02:00', '23:30')  // true（跨午夜）
 * isTimeInRange('22:00', '02:00', '01:00')  // true（跨午夜）
 */
export function isTimeInRange(
  startTime: string,
  endTime: string,
  currentTime?: string
): boolean {
  const current = currentTime || getLocalTimeString();
  
  // 處理跨午夜的情況
  if (endTime < startTime) {
    // 例如：22:00 - 02:00
    // 當前時間 >= 22:00 或 < 02:00
    return current >= startTime || current < endTime;
  }
  
  // 正常情況：09:00 - 18:00
  // 當前時間 >= 09:00 且 < 18:00
  return current >= startTime && current < endTime;
}

/**
 * 計算兩個時間字串之間的分鐘差
 * 
 * @param time1 - 時間 1（HH:MM）
 * @param time2 - 時間 2（HH:MM）
 * @returns 分鐘差（time2 - time1）
 * 
 * @example
 * getMinutesDifference('09:00', '10:30')  // 90
 * getMinutesDifference('14:30', '14:00')  // -30
 */
export function getMinutesDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;
  return minutes2 - minutes1;
}

/**
 * 為時間字串添加分鐘
 * 
 * ⚠️ 注意：自動處理跨日的情況（結果會在 00:00 - 23:59 範圍內）
 * 
 * @param timeStr - 時間字串（HH:MM）
 * @param minutes - 要添加的分鐘數（可以是負數）
 * @returns 新的時間字串（HH:MM）
 * 
 * @example
 * addMinutes('09:00', 30)   // '09:30'
 * addMinutes('09:00', 90)   // '10:30'
 * addMinutes('23:30', 60)   // '00:30'（跨日）
 * addMinutes('09:00', -30)  // '08:30'
 */
export function addMinutes(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number);
  let totalMinutes = hours * 60 + mins + minutes;
  
  // 處理負數和超過 24 小時的情況
  while (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  totalMinutes = totalMinutes % (24 * 60);
  
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

/**
 * 計算兩個時間戳之間的時間差（人類可讀格式）
 * 
 * @param timestamp1 - 時間戳 1（毫秒）
 * @param timestamp2 - 時間戳 2（毫秒）
 * @returns 時間差描述
 * 
 * @example
 * getTimeDifference(Date.now() - 3600000, Date.now())  // '1 小時前'
 * getTimeDifference(Date.now(), Date.now() + 3600000)  // '1 小時後'
 */
export function getTimeDifference(timestamp1: number, timestamp2: number): string {
  const diff = timestamp2 - timestamp1;
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;
  
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  let result = '';
  
  if (days > 0) {
    result = `${days} 天`;
  } else if (hours > 0) {
    result = `${hours} 小時`;
  } else if (minutes > 0) {
    result = `${minutes} 分鐘`;
  } else {
    result = `${seconds} 秒`;
  }
  
  return isPast ? `${result}前` : `${result}後`;
}

/**
 * 檢查兩個日期範圍是否重疊
 * 
 * @param start1 - 範圍 1 開始日期（YYYY-MM-DD）
 * @param end1 - 範圍 1 結束日期（YYYY-MM-DD）
 * @param start2 - 範圍 2 開始日期（YYYY-MM-DD）
 * @param end2 - 範圍 2 結束日期（YYYY-MM-DD）
 * @returns 是否重疊
 * 
 * @example
 * isDateRangeOverlap('2026-02-20', '2026-02-25', '2026-02-23', '2026-02-28')  // true
 * isDateRangeOverlap('2026-02-20', '2026-02-22', '2026-02-23', '2026-02-25')  // false
 */
export function isDateRangeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * 獲取兩個日期之間的天數差
 * 
 * @param date1 - 日期 1（YYYY-MM-DD）
 * @param date2 - 日期 2（YYYY-MM-DD）
 * @returns 天數差（date2 - date1）
 * 
 * @example
 * getDaysDifference('2026-02-20', '2026-02-23')  // 3
 * getDaysDifference('2026-02-23', '2026-02-20')  // -3
 */
export function getDaysDifference(date1: string, date2: string): number {
  const d1 = parseLocalDate(date1);
  const d2 = parseLocalDate(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 檢查日期字串是否在指定範圍內
 * 
 * @param dateStr - 要檢查的日期（YYYY-MM-DD）
 * @param startDate - 範圍開始日期（YYYY-MM-DD）
 * @param endDate - 範圍結束日期（YYYY-MM-DD）
 * @returns 是否在範圍內
 * 
 * @example
 * isDateInRange('2026-02-22', '2026-02-20', '2026-02-25')  // true
 * isDateInRange('2026-02-26', '2026-02-20', '2026-02-25')  // false
 */
export function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

/**
 * 格式化時間戳為相對時間（例如：剛才、5 分鐘前、昨天）
 * 
 * @param timestamp - 時間戳（毫秒）
 * @returns 相對時間描述
 * 
 * @example
 * formatRelativeTime(Date.now() - 30000)  // '剛才'
 * formatRelativeTime(Date.now() - 300000)  // '5 分鐘前'
 * formatRelativeTime(Date.now() - 86400000)  // '昨天'
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '剛才';
  }
  
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} 分鐘前`;
  }
  
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} 小時前`;
  }
  
  const date = new Date(timestamp);
  const today = getLocalDateString();
  const dateStr = getLocalDateString(date);
  
  if (dateStr === today) {
    return '今天';
  }
  
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
  if (dateStr === yesterday) {
    return '昨天';
  }
  
  const daysDiff = getDaysDifference(dateStr, today);
  if (daysDiff < 7) {
    return `${daysDiff} 天前`;
  }
  
  return dateStr;
}

# 時間處理分析與統一規範

## 問題背景

在檢查專案中發現時間處理存在不一致的情況，特別是在：
1. 本地時間 vs UTC 時間
2. 時間戳格式（毫秒 vs ISO 字串）
3. 日期字串格式（YYYY-MM-DD）

## 當前時間處理方式分析

### 1. 本地 IndexedDB（使用毫秒時間戳）

**位置：** `lib/db/events.ts`, `lib/db/hooks.ts`

```typescript
// ✅ 正確：使用本地時間戳（毫秒）
const event: Event = {
  id: generateUUID(),
  type: 'market_created',
  payload: {...},
  timestamp: Date.now(),  // 本地時間戳（毫秒）
  actor_id: 'local',
  sync_status: 'local_only',
};
```

**特點：**
- 使用 `Date.now()` 獲取本地時間戳（毫秒）
- 儲存為數字類型
- 不受時區影響

### 2. Supabase 雲端（使用 ISO 字串）

**位置：** `hooks/useSync.ts`

```typescript
// ⚠️ 轉換：上傳到 Supabase 時轉換為 ISO 字串
await supabase.from('events').upsert({
  id: event.id,
  type: event.type,
  payload: event.payload,
  timestamp: new Date(event.timestamp).toISOString(),  // 轉換為 ISO 字串
  actor_id: userId,
  market_id: event.market_id,
});

// ⚠️ 轉換：從 Supabase 下載時轉換回毫秒時間戳
await db.events.add({
  id: event.id,
  type: event.type,
  payload: event.payload,
  timestamp: new Date(event.timestamp).getTime(),  // 轉換為毫秒時間戳
  sync_status: 'synced',
});
```

**特點：**
- Supabase 使用 PostgreSQL 的 `timestamptz` 類型
- 儲存為 ISO 8601 格式字串（含時區）
- 需要在上傳/下載時進行轉換

### 3. 日期字串（YYYY-MM-DD）

**位置：** `lib/utils.ts`, `app/markets/[id]/page.tsx`

```typescript
// ✅ 正確：使用本地日期生成日期字串
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

// ✅ 正確：使用本地時間方法
const eventDate = new Date(event.timestamp);
const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
```

**特點：**
- 使用 `getFullYear()`, `getMonth()`, `getDate()` 等本地時間方法
- 格式統一為 `YYYY-MM-DD`
- 不受時區影響

### 4. 時間字串（HH:MM）

**位置：** `app/markets/[id]/page.tsx`

```typescript
// ✅ 正確：使用本地時間生成時間字串
const now = new Date();
const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

// ✅ 正確：解析時間字串並創建本地時間對象
const [startHour, startMinute] = startTime.split(':').map(Number);
const startDateTime = new Date(now);
startDateTime.setHours(startHour, startMinute, 0, 0);
```

**特點：**
- 使用 `getHours()`, `getMinutes()` 等本地時間方法
- 格式統一為 `HH:MM`（24 小時制）
- 不受時區影響

## 問題點分析

### ❌ 問題 1：混用 UTC 和本地時間方法

**錯誤示例：**
```typescript
// ❌ 錯誤：使用 UTC 方法
const date = new Date();
const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
```

**影響：**
- 在不同時區會產生不同的日期
- 例如：台灣時間 2026-02-23 00:30，UTC 時間是 2026-02-22 16:30
- 會導致營業狀態判斷錯誤

### ❌ 問題 2：時間戳轉換不一致

**錯誤示例：**
```typescript
// ❌ 錯誤：直接使用 ISO 字串比較
if (event.timestamp > lastSyncAt) {  // lastSyncAt 是 ISO 字串
  // ...
}

// ✅ 正確：統一轉換為毫秒時間戳
if (new Date(event.timestamp).getTime() > new Date(lastSyncAt).getTime()) {
  // ...
}
```

### ❌ 問題 3：日期字串解析時區問題

**錯誤示例：**
```typescript
// ❌ 錯誤：直接解析日期字串（會被當作 UTC）
const date = new Date('2026-02-23');  // 會被解析為 UTC 時間

// ✅ 正確：明確指定為本地時間
const [year, month, day] = '2026-02-23'.split('-').map(Number);
const date = new Date(year, month - 1, day);  // 本地時間
```

## 統一規範

### 規範 1：本地時間優先

**原則：** 所有時間判斷和顯示都使用本地時間（用戶設備的時區）

**理由：**
- 市集營業時間是基於本地時間（例如：台北時間 09:00 開始）
- 用戶看到的時間應該是本地時間
- 避免時區轉換帶來的混淆

**實作：**
```typescript
// ✅ 正確：使用本地時間方法
const now = new Date();
const year = now.getFullYear();        // 本地年份
const month = now.getMonth();          // 本地月份（0-11）
const date = now.getDate();            // 本地日期（1-31）
const hours = now.getHours();          // 本地小時（0-23）
const minutes = now.getMinutes();      // 本地分鐘（0-59）

// ❌ 錯誤：不要使用 UTC 方法
const year = now.getUTCFullYear();     // UTC 年份
const month = now.getUTCMonth();       // UTC 月份
```

### 規範 2：時間戳統一使用毫秒

**原則：** 內部處理統一使用毫秒時間戳（number 類型）

**理由：**
- 便於比較和計算
- IndexedDB 儲存為數字類型
- 性能更好

**實作：**
```typescript
// ✅ 正確：使用毫秒時間戳
const timestamp = Date.now();                    // 當前時間戳（毫秒）
const eventTime = new Date(event.timestamp);     // 從時間戳創建 Date 對象
const milliseconds = eventTime.getTime();        // 獲取毫秒時間戳

// ⚠️ 轉換：只在與 Supabase 交互時轉換
const isoString = new Date(timestamp).toISOString();  // 上傳到 Supabase
const timestamp = new Date(isoString).getTime();      // 從 Supabase 下載
```

### 規範 3：日期字串統一格式

**原則：** 日期字串統一使用 `YYYY-MM-DD` 格式

**理由：**
- ISO 8601 標準格式
- 便於排序和比較
- 避免地區差異（MM/DD/YYYY vs DD/MM/YYYY）

**實作：**
```typescript
// ✅ 正確：生成日期字串
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ✅ 正確：解析日期字串為本地時間
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);  // 本地時間
}

// ❌ 錯誤：不要直接使用 new Date(dateStr)
const date = new Date('2026-02-23');  // 會被解析為 UTC 時間
```

### 規範 4：時間字串統一格式

**原則：** 時間字串統一使用 `HH:MM` 格式（24 小時制）

**理由：**
- 避免 AM/PM 混淆
- 便於比較和計算
- 國際通用格式

**實作：**
```typescript
// ✅ 正確：生成時間字串
function getLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ✅ 正確：解析時間字串
function parseLocalTime(timeStr: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}
```

## 建議的工具函數

### 創建統一的時間工具模組

**位置：** `lib/time-utils.ts`

```typescript
/**
 * 時間工具函數
 * 統一處理本地時間，避免時區問題
 */

/**
 * 獲取當前本地日期字串（YYYY-MM-DD）
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 獲取當前本地時間字串（HH:MM）
 */
export function getLocalTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 獲取當前本地日期時間字串（YYYY-MM-DD HH:MM）
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  return `${getLocalDateString(date)} ${getLocalTimeString(date)}`;
}

/**
 * 解析日期字串為本地時間 Date 對象
 * @param dateStr - 日期字串（YYYY-MM-DD）
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * 解析時間字串為本地時間 Date 對象
 * @param timeStr - 時間字串（HH:MM）
 * @param baseDate - 基準日期（預設為今天）
 */
export function parseLocalTime(timeStr: string, baseDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * 解析日期時間字串為本地時間 Date 對象
 * @param dateTimeStr - 日期時間字串（YYYY-MM-DD HH:MM）
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
 * @returns -1: date1 < date2, 0: date1 === date2, 1: date1 > date2
 */
export function compareDateStrings(date1: string, date2: string): number {
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
}

/**
 * 比較兩個時間字串（HH:MM）
 * @returns -1: time1 < time2, 0: time1 === time2, 1: time1 > time2
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
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getLocalDateString();
}

/**
 * 檢查當前時間是否在指定時間範圍內
 * @param startTime - 開始時間（HH:MM）
 * @param endTime - 結束時間（HH:MM）
 * @param currentTime - 當前時間（HH:MM，可選）
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
    return current >= startTime || current < endTime;
  }
  
  // 正常情況：09:00 - 18:00
  return current >= startTime && current < endTime;
}

/**
 * 計算兩個時間字串之間的分鐘差
 * @param time1 - 時間 1（HH:MM）
 * @param time2 - 時間 2（HH:MM）
 * @returns 分鐘差（time2 - time1）
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
 * @param timeStr - 時間字串（HH:MM）
 * @param minutes - 要添加的分鐘數
 * @returns 新的時間字串（HH:MM）
 */
export function addMinutes(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}
```

## 遷移計劃

### 階段 1：創建工具函數（已完成）

- [x] 在 `lib/utils.ts` 中已有基本的日期格式化函數
- [ ] 創建 `lib/time-utils.ts` 補充更多工具函數

### 階段 2：重構關鍵模組

**優先級 1：營業狀態判斷**
- [ ] `app/markets/[id]/page.tsx` - `checkOperatingStatus` 函數
- [ ] `components/staff/StaffMarketDetailView.tsx` - `getOperatingStatus` 函數

**優先級 2：事件處理**
- [ ] `lib/db/events.ts` - 確保使用 `Date.now()`
- [ ] `hooks/useSync.ts` - 確保時間戳轉換正確

**優先級 3：UI 顯示**
- [ ] 所有使用 `formatDate` 的地方
- [ ] 所有生成日期字串的地方

### 階段 3：測試驗證

- [ ] 測試不同時區下的營業狀態判斷
- [ ] 測試跨午夜的時間範圍
- [ ] 測試日期字串比較
- [ ] 測試時間戳轉換

## 常見陷阱

### 陷阱 1：Date 構造函數的時區問題

```typescript
// ❌ 錯誤：會被解析為 UTC 時間
new Date('2026-02-23')  // UTC 2026-02-23 00:00:00

// ✅ 正確：明確指定為本地時間
new Date(2026, 1, 23)   // 本地 2026-02-23 00:00:00（注意：月份從 0 開始）
```

### 陷阱 2：getMonth() 從 0 開始

```typescript
const date = new Date();
const month = date.getMonth();  // 0-11，不是 1-12！

// ✅ 正確：需要 +1
const monthStr = String(date.getMonth() + 1).padStart(2, '0');
```

### 陷阱 3：時間字串比較

```typescript
// ❌ 錯誤：字串比較可能不準確
if ('9:00' > '10:00') {  // false，因為 '9' > '1'
  // ...
}

// ✅ 正確：使用工具函數
if (compareTimeStrings('09:00', '10:00') > 0) {
  // ...
}
```

### 陷阱 4：跨午夜時間範圍

```typescript
// ❌ 錯誤：簡單比較無法處理跨午夜
if (currentTime >= '22:00' && currentTime < '02:00') {
  // 永遠不會為 true
}

// ✅ 正確：使用工具函數
if (isTimeInRange('22:00', '02:00', currentTime)) {
  // 正確處理跨午夜
}
```

## 總結

### 核心原則

1. **本地時間優先**：所有時間判斷使用本地時間
2. **統一格式**：日期 `YYYY-MM-DD`，時間 `HH:MM`
3. **毫秒時間戳**：內部處理使用毫秒時間戳
4. **工具函數**：使用統一的工具函數，避免重複代碼

### 檢查清單

在編寫時間相關代碼時，請檢查：

- [ ] 是否使用本地時間方法（`getFullYear()` 而非 `getUTCFullYear()`）
- [ ] 是否使用統一的日期格式（`YYYY-MM-DD`）
- [ ] 是否使用統一的時間格式（`HH:MM`）
- [ ] 是否正確處理跨午夜的時間範圍
- [ ] 是否正確處理 `getMonth()` 從 0 開始的問題
- [ ] 是否使用工具函數而非重複代碼

### 參考資料

- [MDN - Date](https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
- [時區處理最佳實踐](https://stackoverflow.com/questions/439630/how-do-you-create-a-javascript-date-object-with-a-set-timezone-without-using-a)

---

**最後更新：** 2026-02-22  
**作者：** AI Assistant (Grok)

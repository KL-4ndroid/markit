# 自定義日期時間選擇器

## 📋 概述

這是一個輕量級、無依賴的日期時間選擇器，專為 iOS PWA 優化。

## ✨ 特點

- ✅ 純 Vanilla JS，無框架依賴
- ✅ iOS PWA 完美兼容
- ✅ 輕量級 (< 10KB)
- ✅ 支援日期和時間選擇
- ✅ 響應式設計
- ✅ 觸控友好
- ✅ 點擊外部自動關閉

## 📁 文件結構

```
lib/date-time-picker/
├── DateTimePicker.js    # 核心 JS 邏輯
└── DateTimePicker.css   # 樣式文件

public/lib/date-time-picker/
└── DateTimePicker.css   # 公開訪問的 CSS

components/ui/
├── DatePicker.tsx       # React 日期選擇器組件
└── TimePicker.tsx       # React 時間選擇器組件
```

## 🚀 使用方法

### React 組件使用

#### DatePicker（日期選擇器）

```tsx
import { DatePicker } from '@/components/ui/DatePicker';

<DatePicker
  value={formData.startDate}
  onChange={(value) => setFormData({ ...formData, startDate: value })}
  minDate="2024-01-01"
  maxDate="2024-12-31"
  className="w-full px-4 py-3 border rounded-xl"
  placeholder="選擇日期"
  required
/>
```

#### TimePicker（時間選擇器）

```tsx
import { TimePicker } from '@/components/ui/TimePicker';

<TimePicker
  value={formData.checkInTime}
  onChange={(value) => setFormData({ ...formData, checkInTime: value })}
  className="w-full px-4 py-3 border rounded-xl"
  placeholder="選擇時間"
  required
/>
```

### 純 JS 使用

```javascript
import DateTimePicker from '@/lib/date-time-picker/DateTimePicker.js';

// 日期選擇器
const datePicker = new DateTimePicker({
  type: 'date',
  input: document.querySelector('#date-input'),
  onChange: (value) => {
    console.log('選擇的日期:', value); // YYYY-MM-DD
  },
  minDate: '2024-01-01',
  maxDate: '2024-12-31',
});

// 時間選擇器
const timePicker = new DateTimePicker({
  type: 'time',
  input: document.querySelector('#time-input'),
  onChange: (value) => {
    console.log('選擇的時間:', value); // HH:mm
  },
});
```

## 🎨 Props

### DatePicker Props

| Prop | 類型 | 必填 | 說明 |
|------|------|------|------|
| `value` | `string` | ✅ | 日期值 (YYYY-MM-DD) |
| `onChange` | `(value: string) => void` | ✅ | 值改變回調 |
| `minDate` | `string` | ❌ | 最小日期 (YYYY-MM-DD) |
| `maxDate` | `string` | ❌ | 最大日期 (YYYY-MM-DD) |
| `className` | `string` | ❌ | 自定義樣式類 |
| `placeholder` | `string` | ❌ | 佔位符文字 |
| `required` | `boolean` | ❌ | 是否必填 |

### TimePicker Props

| Prop | 類型 | 必填 | 說明 |
|------|------|------|------|
| `value` | `string` | ✅ | 時間值 (HH:mm) |
| `onChange` | `(value: string) => void` | ✅ | 值改變回調 |
| `className` | `string` | ❌ | 自定義樣式類 |
| `placeholder` | `string` | ❌ | 佔位符文字 |
| `required` | `boolean` | ❌ | 是否必填 |

## 🎯 格式

- **日期格式**: `YYYY-MM-DD` (例: 2024-02-05)
- **時間格式**: `HH:mm` (24小時制，例: 14:30)

## 📱 iOS PWA 優化

- 使用 `<input type="text" readonly>` 避免原生鍵盤彈出
- 觸控友好的大按鈕設計
- 平滑滾動支援 `-webkit-overflow-scrolling: touch`
- 禁用文字選擇和長按菜單

## 🎨 自定義樣式

選擇器使用 CSS 類名，可以輕鬆自定義：

```css
/* 修改主題色 */
.datetime-picker-header {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}

.datetime-picker-day.selected {
  background: #your-primary-color;
}

/* 修改圓角 */
.datetime-picker {
  border-radius: 1.5rem;
}
```

## 🔧 API

### DateTimePicker 類

```javascript
const picker = new DateTimePicker(options);

// 方法
picker.open();      // 打開選擇器
picker.close();     // 關閉選擇器
picker.destroy();   // 銷毀實例
```

### Options

```typescript
interface DateTimePickerOptions {
  type: 'date' | 'time';           // 選擇器類型
  input: HTMLInputElement;          // 綁定的 input 元素
  onChange: (value: string) => void; // 值改變回調
  minDate?: string;                 // 最小日期 (僅 date 類型)
  maxDate?: string;                 // 最大日期 (僅 date 類型)
}
```

## 📝 已替換的表單

✅ `components/markets/AddMarketForm.tsx` - 新增市集表單
✅ `components/markets/EditMarketForm.tsx` - 編輯市集表單

所有原生的 `<input type="date">` 和 `<input type="time">` 已替換為自定義選擇器。

## 🐛 故障排除

### 選擇器沒有顯示

確保 CSS 文件已正確載入：

```html
<link rel="stylesheet" href="/lib/date-time-picker/DateTimePicker.css">
```

### 樣式不正確

檢查 z-index 是否被其他元素覆蓋：

```css
.datetime-picker {
  z-index: 9999 !important;
}
```

### iOS 上無法點擊

確保 input 設置為 readonly：

```html
<input type="text" readonly>
```

## 📦 Bundle 大小

- **DateTimePicker.js**: ~8KB (未壓縮)
- **DateTimePicker.css**: ~4KB (未壓縮)
- **總計**: ~12KB (未壓縮)

壓縮後約 4-5KB，非常輕量！

## 🎉 完成！

現在您的應用已經使用自定義日期時間選擇器，在 iOS PWA 中將有完美的用戶體驗！

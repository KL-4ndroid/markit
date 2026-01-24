# Market Pulse - 快速開發指南

## 🚀 快速開始

### 啟動開發伺服器
```bash
npm run dev
```
訪問：http://localhost:3000

### 建置生產版本
```bash
npm run build
npm start
```

## 📂 專案結構速查

```
app/
├── layout.tsx          # 根佈局（含底部導航）
├── page.tsx            # 首頁
├── globals.css         # 全域樣式
├── markets/            # 市集管理
├── products/           # 商品管理
├── analytics/          # 數據分析
└── settings/           # 設定

components/
└── BottomNavigation.tsx # 底部導航

lib/
└── utils.ts            # 工具函數（cn, formatDate, formatCurrency...）
```

## 🎨 設計系統速查

### 色彩
```tsx
// 主色
bg-[#7B9FA6]           // 霧藍（主要品牌色）
bg-[#D4A574]           // 暖木（次要品牌色）

// 輔助色
bg-[#F5E6E8]           // 柔粉
bg-[#E8F3E8]           // 柔綠
bg-[#FFF8E7]           // 柔黃

// 中性色
bg-[#FAFAF8]           // 背景（米白）
text-[#3A3A3A]         // 主文字（深灰）
text-[#6B6B6B]         // 次要文字（中灰）

// 漸層 Header
bg-gradient-to-br from-[#7B9FA6] to-[#D4A574]
```

### 圓角
```tsx
rounded-[1.5rem]       // 主卡片 (24px)
rounded-[1.25rem]      // 次卡片 (20px)
rounded-2xl            // 按鈕 (16px)
rounded-full           // 標籤/徽章
rounded-b-[2rem]       // Header 底部圓角
```

### 陰影
```tsx
shadow-lg shadow-[#7B9FA6]/10    // 主卡片
shadow-md shadow-[#7B9FA6]/5     // 次卡片
hover:shadow-xl                   // Hover 效果
```

### 間距
```tsx
px-6                   // 頁面水平內邊距
pb-24                  // 頁面底部留白（為導航預留）
-mt-4                  // Header 與內容重疊
max-w-lg mx-auto       // 內容最大寬度
```

## 🧩 常用組件模板

### 頁面結構
```tsx
export default function MyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-medium text-white opacity-90 mb-2">
            頁面標題
          </h1>
          <p className="text-white/80 text-sm">
            頁面描述 ✨
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* 內容區塊 */}
      </div>
    </div>
  );
}
```

### 主卡片
```tsx
<div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
  {/* 卡片內容 */}
</div>
```

### 按鈕
```tsx
{/* 主要按鈕 */}
<button className="bg-[#7B9FA6] text-white px-6 py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors">
  按鈕文字
</button>

{/* 次要按鈕 */}
<button className="bg-[#F5E6E8] text-[#3A3A3A] px-6 py-3 rounded-2xl hover:bg-[#E5D6D8] transition-colors">
  按鈕文字
</button>
```

### 狀態標籤
```tsx
<span className="bg-[#E8F3E8] text-[#3A3A3A] px-3 py-1 rounded-full text-sm">
  進行中 🎪
</span>
```

### 圖標與文字
```tsx
<div className="flex items-center gap-2 text-[#6B6B6B]">
  <Calendar className="w-4 h-4 text-[#7B9FA6]" />
  <span className="text-sm">文字內容</span>
</div>
```

## 🛠️ 工具函數

```tsx
import { cn, formatDate, formatTime, formatCurrency, formatNumber } from '@/lib/utils';

// 合併類名
cn('bg-white', isActive && 'bg-blue-500')

// 格式化日期
formatDate(new Date())              // "2026/01/21"

// 格式化時間
formatTime(new Date())              // "14:30"

// 格式化金額
formatCurrency(1000)                // "NT$1,000"

// 格式化數字
formatNumber(1234567)               // "1,234,567"
```

## 📱 移動裝置優化檢查清單

- [ ] 使用 `max-w-lg mx-auto` 限制內容寬度
- [ ] 頁面底部預留空間 `pb-24`
- [ ] 按鈕尺寸足夠大（至少 44x44px）
- [ ] 使用大圓角增加親和力
- [ ] 添加 hover 和 transition 效果
- [ ] 使用適當的 emoji 增加溫度

## 🎯 開發原則

### 3 秒操作原則
所有核心操作必須在 3 秒內完成：
- 單手可觸達
- 最少點擊次數
- 清晰的視覺回饋

### 離線優先
- 所有資料存於 IndexedDB（使用 Dexie.js）
- 不依賴網路連線
- 即時響應，無等待

### 日系美學
- 溫暖、柔和的色彩
- 大圓角、柔和陰影
- 適當使用 emoji
- 友善的文案

## 📚 參考文件

- `PROJECT_CONTEXT.md` - 專案核心上下文
- `JAPANESE_UI_DESIGN_SYSTEM.md` - 完整設計系統
- `STEP1_COMPLETION_REPORT.md` - Step 1 完成報告

## 🔗 常用連結

- Next.js 文件：https://nextjs.org/docs
- Tailwind CSS：https://tailwindcss.com/docs
- Lucide Icons：https://lucide.dev/icons
- Dexie.js：https://dexie.org

---

**提示**：開發時請始終參考 `JAPANESE_UI_DESIGN_SYSTEM.md` 確保視覺一致性！

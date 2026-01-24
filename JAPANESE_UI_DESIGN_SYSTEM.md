# Japanese UI Design System Reference
## 專案設計風格指南 - 基於 JapaneseD

> **重要說明**：本文件定義了整個專案的 UI 設計風格，所有新功能和頁面都應遵循此設計系統。
> 此設計風格源自 `JapaneseD/` 資料夾中的實作範例。

---

## 🎨 設計理念

### 核心美學
- **日系文創風格**：溫暖、柔和、手作感
- **極簡主義**：乾淨的介面，適當的留白
- **情感化設計**：使用 emoji 和友善的文案增加親和力
- **移動優先**：為單手操作優化，3秒內完成核心操作

---

## 🎨 色彩系統

### 主色調
```css
--mist-blue: #7B9FA6        /* 霧藍色 - 主要品牌色 */
--warm-wood: #D4A574        /* 溫暖木色 - 次要品牌色 */
```

### 輔助色彩
```css
--soft-pink: #F5E6E8        /* 柔粉色 - 次要背景 */
--soft-green: #E8F3E8       /* 柔綠色 - 成功/進行中狀態 */
--soft-yellow: #FFF8E7      /* 柔黃色 - 強調/提示 */
```

### 中性色
```css
--background: #FAFAF8       /* 主背景 - 米白色 */
--foreground: #3A3A3A       /* 主文字 - 深灰色 */
--muted-foreground: #6B6B6B /* 次要文字 - 中灰色 */
--card: #ffffff             /* 卡片背景 - 純白 */
```

### 功能色
```css
--destructive: #d4183d      /* 錯誤/刪除 */
--border: rgba(123, 159, 166, 0.15) /* 邊框 - 半透明霧藍 */
```

### 漸層使用
```css
/* 主要漸層 - 用於 Header */
background: linear-gradient(to bottom right, #7B9FA6, #D4A574);
```

---

## 📐 間距與圓角系統

### 圓角 (Border Radius)
```css
--radius: 1.25rem           /* 20px - 基礎圓角 */
--radius-sm: 0.75rem        /* 12px - 小圓角 */
--radius-md: 1.125rem       /* 18px - 中圓角 */
--radius-lg: 1.25rem        /* 20px - 大圓角 */
--radius-xl: 1.5rem         /* 24px - 超大圓角 */
```

### 常用圓角值
- **卡片**: `rounded-[1.5rem]` (24px) - 主要卡片
- **小卡片**: `rounded-[1.25rem]` (20px) - 次要卡片
- **按鈕**: `rounded-2xl` (16px) - 標準按鈕
- **標籤/徽章**: `rounded-full` - 藥丸形狀
- **底部導航**: `rounded-b-[2rem]` - Header 底部圓角

### 內邊距 (Padding)
- **頁面容器**: `px-6` (24px)
- **卡片內容**: `p-6` (24px) 或 `p-4` (16px)
- **按鈕**: `px-4 py-1.5` 或 `p-2.5`
- **標籤**: `px-3 py-1`

### 外邊距 (Margin)
- **區塊間距**: `mb-8` (32px) - 大區塊
- **元素間距**: `mb-4` (16px) - 中等間距
- **小間距**: `mb-2` (8px) 或 `gap-2`

---

## 🔤 字體系統

### 字體大小
```css
--text-2xl: 1.5rem          /* 24px - h1 */
--text-xl: 1.25rem          /* 20px - h2 */
--text-lg: 1.125rem         /* 18px - h3 */
--text-base: 1rem           /* 16px - 正文 */
--text-sm: 0.875rem         /* 14px - 小字 */
--text-xs: 0.75rem          /* 12px - 極小字 */
```

### 字重
```css
--font-weight-medium: 500   /* 標題、按鈕 */
--font-weight-normal: 400   /* 正文 */
```

### 使用規範
- **h1**: 頁面主標題，使用 `text-2xl font-medium`
- **h2**: 區塊標題，使用 `text-xl font-medium`
- **h3**: 小標題，使用 `text-lg font-medium`
- **h4**: 卡片標題，使用 `text-base font-medium`
- **正文**: `text-base` 或 `text-sm`
- **輔助文字**: `text-xs text-[#6B6B6B]`

---

## 🧩 組件設計規範

### 1. Header (頁面頂部)
```tsx
<div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
  <div className="max-w-lg mx-auto">
    <div className="flex items-center justify-between mb-2">
      <h1 className="text-white opacity-90">標題</h1>
      <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full">
        <span className="text-white text-sm">資訊</span>
      </div>
    </div>
    <p className="text-white/80 text-sm">副標題或描述 ✨</p>
  </div>
</div>
```

**特點**：
- 使用品牌色漸層背景
- 底部圓角 `rounded-b-[2rem]`
- 白色文字，適當透明度
- 可選的資訊標籤（毛玻璃效果）

### 2. 主要卡片 (Primary Card)
```tsx
<div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 cursor-pointer hover:shadow-xl transition-shadow">
  {/* 卡片內容 */}
</div>
```

**特點**：
- 白色背景，大圓角 `rounded-[1.5rem]`
- 柔和陰影 `shadow-lg shadow-[#7B9FA6]/10`
- Hover 效果：`hover:shadow-xl transition-shadow`
- 內邊距 `p-6`

### 3. 次要卡片 (Secondary Card)
```tsx
<div className="bg-white rounded-[1.25rem] p-4 shadow-md shadow-[#7B9FA6]/5 cursor-pointer hover:shadow-lg transition-shadow">
  {/* 卡片內容 */}
</div>
```

**特點**：
- 較小的圓角和陰影
- 適用於網格佈局
- 內邊距 `p-4`

### 4. 狀態標籤 (Status Badge)
```tsx
<span className="bg-[#E8F3E8] text-[#3A3A3A] px-3 py-1 rounded-full text-sm">
  進行中 🎪
</span>
```

**顏色對應**：
- **進行中**: `bg-[#E8F3E8]` (柔綠色)
- **即將開始**: `bg-[#FFF8E7]` (柔黃色)
- **已結束**: `bg-[#F5E6E8]` (柔粉色)
- **主要**: `bg-[#7B9FA6] text-white`

### 5. 圖標與文字組合
```tsx
<div className="flex items-center gap-2 text-[#6B6B6B]">
  <Calendar className="w-4 h-4 text-[#7B9FA6]" />
  <span className="text-sm">文字內容</span>
</div>
```

**圖標顏色**：
- **主要圖標**: `text-[#7B9FA6]` (霧藍色)
- **次要圖標**: `text-[#D4A574]` (溫暖木色)
- **中性圖標**: `text-[#6B6B6B]` (中灰色)

### 6. 數據展示區塊
```tsx
<div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#7B9FA6]/10">
  <div className="text-center">
    <div className="text-xs text-[#6B6B6B] mb-1">標籤</div>
    <div className="text-[#3A3A3A] tabular-nums">數值</div>
  </div>
</div>
```

**特點**：
- 使用 `grid` 佈局
- 頂部細邊框分隔
- 數字使用 `tabular-nums` 保持對齊
- 標籤使用小字灰色，數值使用正常大小深色

### 7. 底部導航 (Bottom Navigation)
```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#7B9FA6]/20 px-4 py-3">
  <div className="max-w-lg mx-auto flex justify-around items-center">
    <button className="flex flex-col items-center gap-1 min-w-[60px]">
      <div className="p-2.5 rounded-2xl bg-[#7B9FA6] text-white">
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs text-[#7B9FA6]">標籤</span>
    </button>
  </div>
</nav>
```

**特點**：
- 固定在底部
- 最多 5 個導航項目
- 活動狀態：圖標背景為品牌色，文字也為品牌色
- 非活動狀態：灰色，hover 時背景變為柔粉色
- 圖標容器使用 `rounded-2xl`

### 8. 按鈕系統

#### 主要按鈕 (Primary Button)
```tsx
<button className="bg-[#7B9FA6] text-white px-6 py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors">
  按鈕文字
</button>
```

#### 次要按鈕 (Secondary Button)
```tsx
<button className="bg-[#F5E6E8] text-[#3A3A3A] px-6 py-3 rounded-2xl hover:bg-[#E5D6D8] transition-colors">
  按鈕文字
</button>
```

#### 文字按鈕 (Text Button)
```tsx
<button className="text-[#7B9FA6] text-sm gap-1 flex items-center">
  查看詳情 <ArrowRight className="w-4 h-4" />
</button>
```

---

## 📱 佈局規範

### 頁面結構
```tsx
<div className="min-h-screen bg-[#FAFAF8] pb-24">
  {/* Header */}
  <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
    {/* Header 內容 */}
  </div>

  {/* Main Content */}
  <div className="max-w-lg mx-auto px-6 -mt-4">
    {/* 內容區塊 */}
  </div>
</div>
```

**關鍵點**：
- 背景色：`bg-[#FAFAF8]`
- 底部留白：`pb-24` (為底部導航預留空間)
- 內容最大寬度：`max-w-lg mx-auto`
- Header 與內容重疊：`-mt-4` 創造層次感

### 網格佈局
```tsx
{/* 2 列網格 */}
<div className="grid grid-cols-2 gap-4">
  {/* 卡片 */}
</div>

{/* 3 列網格 */}
<div className="grid grid-cols-3 gap-3">
  {/* 數據項目 */}
</div>
```

---

## 🎭 動畫與互動

### Hover 效果
```css
/* 卡片 */
hover:shadow-xl transition-shadow

/* 按鈕 */
hover:bg-[#6A8E95] transition-colors

/* 導航項目 */
hover:bg-[#F5E6E8] transition-all

/* 縮放效果 */
scale-110 transition-all
```

### 過渡時間
- 預設使用 Tailwind 的 `transition-*` 類別
- 快速互動：150-200ms
- 標準過渡：300ms
- 平滑動畫：500ms

---

## 🌟 設計細節

### 1. 陰影系統
```css
/* 主要卡片 */
shadow-lg shadow-[#7B9FA6]/10

/* 次要卡片 */
shadow-md shadow-[#7B9FA6]/5

/* Hover 狀態 */
hover:shadow-xl
```

### 2. 透明度使用
```css
/* 文字透明度 */
opacity-90          /* 主標題 */
text-white/80       /* 副標題 */
text-white/20       /* 背景元素 */

/* 背景透明度 */
bg-white/20         /* 毛玻璃效果 */
border-[#7B9FA6]/10 /* 細邊框 */
border-[#7B9FA6]/20 /* 標準邊框 */
```

### 3. Emoji 使用
在適當的地方使用 emoji 增加親和力：
- 狀態標籤：🎪 (進行中)、📅 (即將開始)、✅ (已完成)
- 問候語：✨、👋、🌟
- 類別：🎨、📦、💰、📊

### 4. 文字處理
```css
/* 數字對齊 */
tabular-nums

/* 文字截斷 */
line-clamp-1        /* 單行 */
line-clamp-2        /* 兩行 */

/* 最小高度（保持佈局一致） */
min-h-[3rem]
```

---

## 📋 組件清單

### 已實作的 UI 組件 (來自 shadcn/ui)
位於 `JapaneseD/src/app/components/ui/`：

- ✅ Accordion
- ✅ Alert / Alert Dialog
- ✅ Avatar
- ✅ Badge
- ✅ Button
- ✅ Calendar
- ✅ Card
- ✅ Carousel
- ✅ Chart
- ✅ Checkbox
- ✅ Collapsible
- ✅ Command
- ✅ Context Menu
- ✅ Dialog
- ✅ Drawer
- ✅ Dropdown Menu
- ✅ Form
- ✅ Hover Card
- ✅ Input / Input OTP
- ✅ Label
- ✅ Menubar
- ✅ Navigation Menu
- ✅ Pagination
- ✅ Popover
- ✅ Progress
- ✅ Radio Group
- ✅ Resizable
- ✅ Scroll Area
- ✅ Select
- ✅ Separator
- ✅ Sheet
- ✅ Sidebar
- ✅ Skeleton
- ✅ Slider
- ✅ Sonner (Toast)
- ✅ Switch
- ✅ Table
- ✅ Tabs
- ✅ Textarea
- ✅ Toggle / Toggle Group
- ✅ Tooltip

### 自定義頁面組件
位於 `JapaneseD/src/app/components/`：

- ✅ HomePage
- ✅ MarketDetailPage
- ✅ MarketListPage
- ✅ ProductManagementPage
- ✅ DataAnalyticsPage
- ✅ SettingsPage
- ✅ Navigation

---

## 🎯 實作指南

### 當需要創建新頁面時：

1. **參考現有頁面結構**
   - 查看 `JapaneseD/src/app/components/HomePage.tsx`
   - 使用相同的佈局模式

2. **使用設計系統色彩**
   - 主色：`#7B9FA6` (霧藍)
   - 次色：`#D4A574` (溫暖木)
   - 背景：`#FAFAF8` (米白)

3. **保持一致的圓角**
   - 主卡片：`rounded-[1.5rem]`
   - 次卡片：`rounded-[1.25rem]`
   - 按鈕：`rounded-2xl`
   - 標籤：`rounded-full`

4. **使用柔和陰影**
   - `shadow-lg shadow-[#7B9FA6]/10`
   - `shadow-md shadow-[#7B9FA6]/5`

5. **添加適當的互動效果**
   - Hover: `hover:shadow-xl transition-shadow`
   - 點擊: `cursor-pointer`

6. **使用 emoji 增加親和力**
   - 但不要過度使用
   - 保持專業與友善的平衡

### 當需要創建新組件時：

1. **優先使用現有 UI 組件**
   - 檢查 `JapaneseD/src/app/components/ui/` 中的組件
   - 使用 shadcn/ui 的標準組件

2. **遵循命名規範**
   - 組件名稱使用 PascalCase
   - 檔案名稱與組件名稱一致

3. **保持組件簡潔**
   - 單一職責原則
   - 可重用性

---

## 📝 程式碼範例

### 完整頁面範例
參考 `JapaneseD/src/app/components/HomePage.tsx` 獲取完整實作範例。

### 快速啟動模板
```tsx
import { ArrowLeft } from "lucide-react";

interface PageProps {
  onBack?: () => void;
}

export function NewPage({ onBack }: PageProps) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          {onBack && (
            <button onClick={onBack} className="mb-4 text-white/80 hover:text-white">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-white opacity-90">頁面標題</h1>
          <p className="text-white/80 text-sm">頁面描述 ✨</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
          {/* 頁面內容 */}
        </div>
      </div>
    </div>
  );
}
```

---

## 🔗 相關資源

- **設計原型**: [Figma - Japanese Market Management App](https://www.figma.com/design/pXNMqR0DbcMtUwyIkUMHyG/Japanese-Market-Management-App)
- **參考實作**: `JapaneseD/` 資料夾
- **UI 組件庫**: shadcn/ui
- **圖標庫**: Lucide React

---

## ✅ 檢查清單

在實作新功能時，確保：

- [ ] 使用正確的品牌色彩 (#7B9FA6, #D4A574)
- [ ] 背景色為 #FAFAF8
- [ ] 卡片使用大圓角 (1.5rem 或 1.25rem)
- [ ] 陰影使用品牌色半透明 (shadow-[#7B9FA6]/10)
- [ ] 添加 hover 效果和過渡動畫
- [ ] 底部預留導航空間 (pb-24)
- [ ] 內容區域最大寬度限制 (max-w-lg mx-auto)
- [ ] 使用適當的 emoji 增加親和力
- [ ] 數字使用 tabular-nums 保持對齊
- [ ] 圖標顏色與品牌色一致

---

**最後更新**: 2026年1月20日
**維護者**: Market Pulse 開發團隊

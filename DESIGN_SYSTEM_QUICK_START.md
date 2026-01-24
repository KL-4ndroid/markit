# 日系文創設計系統 - 快速開始指南

## 🎨 歡迎使用日系文創設計系統

本指南將幫助您快速了解和使用新的設計系統，確保整個應用保持統一的視覺風格。

---

## 📦 配色方案

### 主要顏色

```tsx
// 霧藍 (Mist Blue) - 主色調
className="bg-[#7B9FA6] text-white"
className="text-[#7B9FA6]"
className="border-[#7B9FA6]"

// 暖木 (Warm Wood) - 次要色調
className="bg-[#D4A574] text-white"
className="text-[#D4A574]"

// 柔粉 (Soft Pink) - 輔助色
className="bg-[#F5E6E8]"

// 柔綠 (Soft Green) - 輔助色
className="bg-[#E8F3E8]"

// 柔黃 (Soft Yellow) - 輔助色
className="bg-[#FFF8E7]"
```

### 文字顏色

```tsx
// 主文字 - 深灰
className="text-[#3A3A3A]"

// 次要文字 - 中灰
className="text-[#6B6B6B]"

// 白色文字
className="text-white"
```

### 背景顏色

```tsx
// 頁面背景 - 溫暖米白
className="bg-[#FAFAF8]"

// 卡片背景 - 純白
className="bg-white"
```

---

## 🎯 常用組件樣式

### 1. 頁面容器

```tsx
<div className="min-h-screen bg-[#FAFAF8] pb-24">
  {/* 頁面內容 */}
</div>
```

### 2. 漸變頭部

```tsx
<div className="gradient-header pt-12 pb-8 px-6 rounded-b-[2rem]">
  <div className="max-w-lg mx-auto">
    <div className="flex items-center justify-between mb-2">
      <h1 className="text-white text-2xl font-medium">標題</h1>
      <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white">
        按鈕
      </button>
    </div>
    <p className="text-white/80 text-sm">副標題</p>
  </div>
</div>
```

### 3. 大卡片（主要內容）

```tsx
<div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6">
  {/* 卡片內容 */}
</div>
```

### 4. 小卡片（統計、次要內容）

```tsx
<div className="bg-white rounded-[1.25rem] shadow-md shadow-[#7B9FA6]/5 p-4">
  {/* 卡片內容 */}
</div>
```

### 5. 統計卡片

```tsx
{/* 霧藍統計卡片 */}
<div className="bg-[#7B9FA6]/10 rounded-xl p-3">
  <div className="text-xs text-[#6B6B6B] mb-1">標籤</div>
  <div className="font-medium text-[#7B9FA6]">數值</div>
</div>

{/* 柔綠統計卡片 */}
<div className="bg-[#E8F3E8] rounded-xl p-3">
  <div className="text-xs text-[#6B6B6B] mb-1">標籤</div>
  <div className="font-medium text-[#3A3A3A]">數值</div>
</div>

{/* 柔粉統計卡片 */}
<div className="bg-[#F5E6E8] rounded-xl p-3">
  <div className="text-xs text-[#6B6B6B] mb-1">標籤</div>
  <div className="font-medium text-[#3A3A3A]">數值</div>
</div>
```

### 6. 主要按鈕

```tsx
{/* 霧藍按鈕 */}
<button className="bg-[#7B9FA6] hover:bg-[#7B9FA6]/90 text-white px-4 py-2 rounded-xl font-medium transition-colors">
  按鈕文字
</button>

{/* 白色透明按鈕（用於深色背景） */}
<button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-white font-medium transition-colors backdrop-blur-sm">
  按鈕文字
</button>
```

### 7. 篩選按鈕

```tsx
{/* 選中狀態 */}
<button className="bg-[#7B9FA6] text-white px-4 py-2 rounded-xl font-medium shadow-md">
  選中
</button>

{/* 未選中狀態 */}
<button className="bg-white text-[#6B6B6B] px-4 py-2 rounded-xl font-medium border border-[#7B9FA6]/15">
  未選中
</button>
```

### 8. 輸入框

```tsx
<input
  type="text"
  className="w-full border-2 border-[#7B9FA6]/15 rounded-xl px-4 py-3 focus:border-[#7B9FA6] focus:outline-none focus:ring-4 focus:ring-[#7B9FA6]/10 transition-all"
  placeholder="請輸入..."
/>
```

### 9. 標籤/徽章

```tsx
{/* 成功狀態 */}
<span className="bg-[#E8F3E8] text-[#3A3A3A] px-3 py-1 rounded-full text-xs font-medium">
  進行中
</span>

{/* 信息狀態 */}
<span className="bg-[#7B9FA6]/10 text-[#7B9FA6] px-3 py-1 rounded-full text-xs font-medium">
  已報名
</span>

{/* 警告狀態 */}
<span className="bg-[#FFF8E7] text-[#3A3A3A] px-3 py-1 rounded-full text-xs font-medium">
  待確認
</span>
```

### 10. 空狀態

```tsx
<div className="text-center py-12 bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10">
  <Icon className="w-16 h-16 mx-auto mb-4 text-[#7B9FA6]/30" />
  <h3 className="text-xl font-medium mb-2 text-[#3A3A3A]">標題</h3>
  <p className="text-[#6B6B6B]">描述文字</p>
</div>
```

### 11. 載入狀態

```tsx
<div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
  <div className="text-center">
    <div className="loading-spinner mx-auto mb-4"></div>
    <p className="text-[#6B6B6B]">載入中...</p>
  </div>
</div>
```

---

## 📐 佈局規範

### 容器寬度

```tsx
{/* 最大寬度容器 */}
<div className="max-w-lg mx-auto px-6">
  {/* 內容 */}
</div>
```

### 間距系統

```tsx
{/* 頁面內邊距 */}
className="px-6 py-6"

{/* 卡片內邊距 */}
className="p-6"  // 大卡片
className="p-4"  // 小卡片

{/* 元素間距 */}
className="mb-6"  // 卡片間距
className="mb-4"  // 區塊間距
className="gap-4" // Grid/Flex 間距
className="gap-2" // 小元素間距
```

### 網格佈局

```tsx
{/* 2欄網格 */}
<div className="grid grid-cols-2 gap-4">
  {/* 項目 */}
</div>

{/* 3欄網格 */}
<div className="grid grid-cols-3 gap-4">
  {/* 項目 */}
</div>

{/* 響應式網格 */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 項目 */}
</div>
```

---

## 🎭 圖標使用

### Lucide React 圖標

```tsx
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  MapPin, 
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Download
} from 'lucide-react';

{/* 使用示例 */}
<Calendar className="w-4 h-4 text-[#7B9FA6]" />
<MapPin className="w-4 h-4 text-[#D4A574]" />
<TrendingUp className="w-5 h-5 text-[#7B9FA6]" />
```

### 圖標顏色規範

```tsx
{/* 主色圖標 */}
<Icon className="w-4 h-4 text-[#7B9FA6]" />

{/* 次要色圖標 */}
<Icon className="w-4 h-4 text-[#D4A574]" />

{/* 灰色圖標 */}
<Icon className="w-4 h-4 text-[#6B6B6B]" />

{/* 白色圖標（深色背景） */}
<Icon className="w-4 h-4 text-white" />
```

---

## 🎨 完整頁面模板

### 基礎頁面結構

```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';

export default function ExamplePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // 載入數據
      setLoading(false);
    } catch (error) {
      console.error('載入失敗:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-[#6B6B6B]">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* 頂部導航 */}
      <div className="gradient-header pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-white hover:opacity-80 transition-opacity">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-white text-2xl font-medium">頁面標題</h1>
            </div>
            <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors text-white flex items-center gap-1 backdrop-blur-sm">
              <Plus className="w-4 h-4" />
              新增
            </button>
          </div>
          <p className="text-white/80 text-sm">頁面描述</p>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* 統計卡片 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
          <h2 className="text-lg font-medium mb-4 text-[#3A3A3A]">統計標題</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-medium text-[#7B9FA6]">123</div>
              <div className="text-xs text-[#6B6B6B] mt-1">標籤</div>
            </div>
          </div>
        </div>

        {/* 內容列表 */}
        <div className="space-y-4">
          {data.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-5 hover:shadow-xl transition-all"
            >
              {/* 項目內容 */}
            </div>
          ))}
        </div>

        {/* 空狀態 */}
        {data.length === 0 && (
          <div className="text-center py-12 bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10">
            <div className="w-16 h-16 mx-auto mb-4 text-[#7B9FA6]/30">
              {/* 圖標 */}
            </div>
            <h3 className="text-xl font-medium mb-2 text-[#3A3A3A]">還沒有數據</h3>
            <p className="text-[#6B6B6B]">描述文字</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## ✅ 檢查清單

在創建或更新頁面時，請確保：

### 配色
- [ ] 使用霧藍 (#7B9FA6) 作為主色調
- [ ] 使用暖木 (#D4A574) 作為次要色調
- [ ] 背景使用溫暖米白 (#FAFAF8)
- [ ] 文字使用深灰 (#3A3A3A) 和中灰 (#6B6B6B)

### 圓角
- [ ] 大卡片使用 rounded-[1.5rem]
- [ ] 小卡片使用 rounded-[1.25rem]
- [ ] 按鈕使用 rounded-xl
- [ ] 頭部底部使用 rounded-b-[2rem]

### 陰影
- [ ] 大卡片使用 shadow-lg shadow-[#7B9FA6]/10
- [ ] 小卡片使用 shadow-md shadow-[#7B9FA6]/5
- [ ] Hover 使用 shadow-xl

### 字體
- [ ] 標題使用 font-medium（不是 font-bold）
- [ ] 正文使用 font-normal
- [ ] 數字使用 tabular-nums

### 間距
- [ ] 頁面使用 px-6
- [ ] 大卡片使用 p-6
- [ ] 小卡片使用 p-4
- [ ] 卡片間距使用 mb-6 或 gap-4

### 圖標
- [ ] 使用 Lucide React 圖標
- [ ] 主色圖標使用 text-[#7B9FA6]
- [ ] 次要色圖標使用 text-[#D4A574]

---

## 📚 相關文檔

- **GLOBAL_DESIGN_PROGRESS.md** - 全局設計進度報告
- **ANALYTICS_QUICK_REFERENCE.md** - 分析頁面快速參考
- **ANALYTICS_UI_UPDATE.md** - 詳細設計說明

---

## 💡 提示

1. **保持一致性** - 使用相同的配色、圓角、陰影
2. **注意細節** - 字體權重、間距、圖標顏色
3. **測試響應式** - 確保在不同設備上顯示正常
4. **優化性能** - 避免過度使用陰影和動畫

---

**祝您使用愉快！** 🎉

如有問題，請參考相關文檔或查看已完成的頁面示例。

---

*快速開始指南 v1.0 - 2025年12月31日*


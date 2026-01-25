# Modal 彈窗定位問題修復

## 🐛 問題描述

在 PWA 移動端應用中，所有彈窗（新增市集、編輯市集、新增商品、編輯商品）都會跑到頁面最下方，需要向下滾動才能看到。

## 🔍 根本原因

使用了錯誤的 Modal 定位結構：

```tsx
// ❌ 錯誤的結構
<div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
  <div className="bg-[#FAFAF8] w-full h-[95vh] sm:h-auto sm:max-h-[95vh]">
    {/* 內容 */}
  </div>
</div>
```

**問題點：**
1. 直接在 `fixed` 容器上使用 `flex`，當內容過長時會導致整個彈窗被推到底部
2. 使用固定高度 `h-[95vh]` 而非 `max-h-[95vh]`
3. 底部按鈕使用 `absolute` 定位，滾動時會消失

## ✅ 解決方案

採用標準的 Modal 定位模式（參考 Headless UI、Radix UI）：

```tsx
// ✅ 正確的結構
<div className="fixed inset-0 z-50 overflow-y-auto">
  <div className="min-h-full flex items-end sm:items-center sm:justify-center sm:p-4">
    <div className="bg-[#FAFAF8] w-full max-h-[95vh] sm:max-w-2xl sm:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex-shrink-0">...</div>
      
      {/* 表單內容 - 可滾動 */}
      <form className="flex-1 overflow-y-auto pb-24 overscroll-behavior-contain">
        ...
      </form>
      
      {/* 底部按鈕 - 固定在彈窗底部 */}
      <div className="sticky bottom-0 flex-shrink-0">
        ...
      </div>
    </div>
  </div>
</div>
```

## 🎯 關鍵改動

### 1. 外層容器結構
```tsx
// 修改前
<div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">

// 修改後
<div className="fixed inset-0 z-50 overflow-y-auto">
  <div className="min-h-full flex items-end sm:items-center sm:justify-center sm:p-4">
```

**原理：**
- 外層 `fixed` 容器負責滾動（`overflow-y-auto`）
- 內層 `min-h-full` 容器負責居中對齊
- 這樣即使內容過長，彈窗也會保持在視窗中央

### 2. 彈窗容器高度
```tsx
// 修改前
<div className="w-full h-[95vh] sm:h-auto sm:max-h-[95vh]">

// 修改後
<div className="w-full max-h-[95vh] sm:max-w-2xl">
```

**原理：**
- 使用 `max-h-[95vh]` 而非固定高度
- 讓內容自適應，不會強制撐開到 95vh

### 3. 底部按鈕定位
```tsx
// 修改前
<div className="absolute bottom-0 left-0 right-0">

// 修改後
<div className="sticky bottom-0 left-0 right-0 flex-shrink-0">
```

**原理：**
- `sticky` 會跟隨容器滾動，始終可見
- `flex-shrink-0` 防止被壓縮

### 4. 表單滾動優化
```tsx
// 修改前
<form className="flex-1 overflow-y-auto pb-24">

// 修改後
<form className="flex-1 overflow-y-auto pb-24 overscroll-behavior-contain">
```

**原理：**
- `overscroll-behavior-contain` 防止滾動穿透到背景頁面

## 📝 修復的文件

### 市集表單
- ✅ `components/markets/AddMarketForm.tsx`
- ✅ `components/markets/EditMarketForm.tsx`

### 商品表單
- ✅ `components/products/AddProductForm.tsx`
- ✅ `components/products/EditProductForm.tsx`

## 🎨 視覺效果

### 修復前
```
┌─────────────────┐
│                 │
│   頁面內容      │
│                 │
│                 │
│                 │ ← 需要滾動到這裡
│                 │
│  ┌───────────┐  │
│  │ 彈窗在    │  │
│  │ 最下方    │  │
│  └───────────┘  │
└─────────────────┘
```

### 修復後
```
┌─────────────────┐
│  ┌───────────┐  │
│  │ 彈窗正確  │  │ ← 直接顯示在視窗中
│  │ 顯示在    │  │
│  │ 畫面中央  │  │
│  └───────────┘  │
│                 │
└─────────────────┘
```

## 🧪 測試檢查清單

- [x] 新增市集彈窗正確顯示在畫面中
- [x] 編輯市集彈窗正確顯示在畫面中
- [x] 新增商品彈窗正確顯示在畫面中
- [x] 編輯商品彈窗正確顯示在畫面中
- [x] 底部按鈕始終可見
- [x] 表單內容可正常滾動
- [x] 背景遮罩點擊可關閉
- [x] 桌面端居中顯示
- [x] 移動端底部顯示
- [x] 無 linter 錯誤

## 📚 參考資料

這個修復方案參考了業界標準的 Modal 實現：

1. **Headless UI Dialog**
   - https://headlessui.com/react/dialog

2. **Radix UI Dialog**
   - https://www.radix-ui.com/docs/primitives/components/dialog

3. **Tailwind UI Modal Pattern**
   - 使用 `fixed inset-0 overflow-y-auto` + `min-h-full flex` 的標準模式

## 🎯 最佳實踐

### Modal 定位的黃金法則

1. **外層容器**：`fixed inset-0` + `overflow-y-auto`
2. **居中容器**：`min-h-full flex items-center justify-center`
3. **彈窗容器**：`max-h-[90vh]` + `flex flex-col`
4. **內容區域**：`flex-1 overflow-y-auto`
5. **固定區域**：`flex-shrink-0` 或 `sticky`

### 為什麼不用 `absolute`？

```tsx
// ❌ 不要這樣做
<div className="absolute bottom-0">底部按鈕</div>

// ✅ 應該這樣做
<div className="sticky bottom-0 flex-shrink-0">底部按鈕</div>
```

**原因：**
- `absolute` 會脫離文檔流，導致滾動時消失
- `sticky` 會跟隨容器滾動，始終可見
- `flex-shrink-0` 確保不會被壓縮

## 🚀 部署

```bash
# 提交修復
git add .
git commit -m "fix: 修復所有彈窗定位問題（市集/商品表單）"
git push origin main

# Vercel 會自動部署
```

## ✨ 修復完成

所有彈窗現在都會正確顯示在畫面中央（桌面）或底部（移動端），不會再跑到頁面最下方！🎉

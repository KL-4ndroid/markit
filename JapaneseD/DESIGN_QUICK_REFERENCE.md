# 日系 UI 設計系統 - 快速參考卡

> 💡 **快速提示**: 複製下方的提示詞模板，直接在 Cursor 中使用！

---

## 🎨 核心色彩

```css
/* 主色調 */
#7B9FA6  /* 霧藍色 - 主要品牌色 */
#D4A574  /* 溫暖木色 - 次要品牌色 */

/* 背景 */
#FAFAF8  /* 米白色 - 主背景 */
#FFFFFF  /* 純白 - 卡片背景 */

/* 文字 */
#3A3A3A  /* 深灰 - 主文字 */
#6B6B6B  /* 中灰 - 次要文字 */

/* 輔助色 */
#F5E6E8  /* 柔粉色 */
#E8F3E8  /* 柔綠色 */
#FFF8E7  /* 柔黃色 */
```

---

## 📐 常用樣式

### 卡片
```tsx
// 主要卡片
className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10"

// 次要卡片
className="bg-white rounded-[1.25rem] p-4 shadow-md shadow-[#7B9FA6]/5"
```

### Header
```tsx
className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]"
```

### 按鈕
```tsx
// 主要按鈕
className="bg-[#7B9FA6] text-white px-6 py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors"

// 次要按鈕
className="bg-[#F5E6E8] text-[#3A3A3A] px-6 py-3 rounded-2xl hover:bg-[#E5D6D8] transition-colors"
```

### 狀態標籤
```tsx
className="bg-[#E8F3E8] text-[#3A3A3A] px-3 py-1 rounded-full text-sm"
```

---

## 💬 提示詞模板

### 創建新頁面
```
請參考 JAPANESE_UI_DESIGN_SYSTEM.md 和 JapaneseD/src/app/components/HomePage.tsx 的設計風格，
創建一個 [頁面名稱] 頁面，包含：
1. 漸層 Header（霧藍到溫暖木色）
2. [功能描述]
3. 使用大圓角卡片和柔和陰影
4. 底部預留導航空間
```

### 創建組件
```
參考 JAPANESE_UI_DESIGN_SYSTEM.md 中的「[組件類型]」規範，
創建一個 [組件描述]，
使用品牌色 #7B9FA6 和 #D4A574，大圓角設計。
```

### 修改現有樣式
```
請將這個組件改為符合 JAPANESE_UI_DESIGN_SYSTEM.md 的日系風格：
- 背景色改為 #FAFAF8
- 卡片使用 rounded-[1.5rem] 和 shadow-lg shadow-[#7B9FA6]/10
- 按鈕使用品牌色 #7B9FA6
- 添加 hover 效果
```

---

## ✅ 設計檢查清單

快速檢查您的 UI 是否符合設計系統：

- [ ] 主色是 #7B9FA6 或 #D4A574
- [ ] 背景是 #FAFAF8
- [ ] 卡片圓角是 1.5rem 或 1.25rem
- [ ] 陰影使用 shadow-[#7B9FA6]/10
- [ ] 有 hover 效果和過渡動畫
- [ ] 底部有 pb-24 預留導航空間
- [ ] 內容有 max-w-lg mx-auto 限制寬度
- [ ] 數字使用 tabular-nums

---

## 📁 重要文件位置

- **完整文檔**: `JAPANESE_UI_DESIGN_SYSTEM.md`
- **使用指南**: `如何使用日系UI設計系統.md`
- **參考實作**: `JapaneseD/src/app/components/`
- **主題配置**: `JapaneseD/src/styles/theme.css`

---

## 🚀 快速開始

1. 閱讀 `如何使用日系UI設計系統.md`
2. 查看 `JapaneseD/src/app/components/HomePage.tsx` 範例
3. 使用上方的提示詞模板與 Cursor 溝通
4. 用檢查清單驗證結果

---

**記住**: 明確引用 `JAPANESE_UI_DESIGN_SYSTEM.md` 可以獲得最佳效果！✨

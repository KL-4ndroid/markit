# 如何使用日系 UI 設計系統

## 📚 概述

您已經成功設置了基於 `JapaneseD` 專案的 UI 設計系統！現在 Cursor 可以在未來的開發中自動應用這個設計風格。

---

## 🎯 設計系統文件位置

### 主要文件
- **`JAPANESE_UI_DESIGN_SYSTEM.md`** - 完整的設計系統文檔
  - 包含所有色彩、間距、圓角、字體規範
  - 提供組件設計規範和程式碼範例
  - 包含完整的檢查清單

### 參考實作
- **`JapaneseD/`** 資料夾 - 實際運作的範例專案
  - `JapaneseD/src/app/components/` - 頁面組件範例
  - `JapaneseD/src/app/components/ui/` - 基礎 UI 組件
  - `JapaneseD/src/styles/theme.css` - 完整的主題定義

### 配置文件
- **`.cursorrules`** - 已更新，包含設計系統引用

---

## 💬 如何讓 Cursor 應用這個設計

### 方法 1: 直接引用設計系統（推薦）

當您需要創建新的 UI 時，使用以下提示詞：

```
請參考 JAPANESE_UI_DESIGN_SYSTEM.md 和 JapaneseD/ 資料夾中的設計風格，
創建一個 [功能描述] 的頁面/組件。
```

**範例**：
```
請參考 JAPANESE_UI_DESIGN_SYSTEM.md 和 JapaneseD/ 資料夾中的設計風格，
創建一個商品列表頁面，包含搜尋功能和分類篩選。
```

### 方法 2: 分階段開發（適合複雜功能）

#### 階段 1: 先完成邏輯和功能
```
請先實作 [功能描述] 的核心邏輯和資料處理，
暫時使用簡單的 UI 即可。
```

#### 階段 2: 應用設計系統
```
現在請參考 JAPANESE_UI_DESIGN_SYSTEM.md 和 JapaneseD/src/app/components/HomePage.tsx，
將剛才實作的功能套用日系文創風格的 UI 設計。
```

### 方法 3: 參考特定組件

如果您想要特定風格的組件：

```
請參考 JapaneseD/src/app/components/HomePage.tsx 中的卡片設計，
創建一個 [功能描述] 的卡片組件。
```

**範例**：
```
請參考 JapaneseD/src/app/components/HomePage.tsx 中的「即將到來」卡片設計，
創建一個顯示熱門商品的卡片網格。
```

---

## 🎨 關鍵設計元素提醒

當您與 Cursor 溝通時，可以強調這些關鍵元素：

### 色彩
- 主色：霧藍色 (#7B9FA6) 和溫暖木色 (#D4A574)
- 背景：米白色 (#FAFAF8)
- 使用柔和的輔助色（柔粉、柔綠、柔黃）

### 圓角
- 大卡片：1.5rem (24px)
- 小卡片：1.25rem (20px)
- 按鈕：rounded-2xl
- 標籤：rounded-full

### 陰影
- 使用品牌色半透明陰影：`shadow-lg shadow-[#7B9FA6]/10`

### 互動效果
- 所有可點擊元素都要有 hover 效果
- 使用平滑的過渡動畫

---

## 📋 實用提示詞範例

### 創建新頁面
```
請參考 JAPANESE_UI_DESIGN_SYSTEM.md 創建一個訂單管理頁面，
包含：
1. 漸層 Header（使用品牌色）
2. 訂單卡片列表（使用大圓角和柔和陰影）
3. 狀態標籤（使用柔和的輔助色）
4. 底部導航空間預留
```

### 修改現有組件
```
請將這個組件的樣式改為符合 JAPANESE_UI_DESIGN_SYSTEM.md 的日系風格，
特別注意：
- 使用正確的品牌色
- 大圓角設計
- 柔和的陰影效果
```

### 創建表單
```
參考 JapaneseD/ 的設計風格，創建一個新增商品的表單，
包含圖片上傳、名稱、價格、分類等欄位。
使用柔和的色彩和大圓角設計。
```

### 創建數據展示
```
參考 JapaneseD/src/app/components/HomePage.tsx 中的數據展示區塊，
創建一個顯示銷售統計的組件（收入、利潤、訂單數）。
```

---

## 🔍 檢查設計是否符合規範

當 Cursor 生成 UI 後，檢查以下項目：

### ✅ 色彩檢查
- [ ] 主色是否為 #7B9FA6 或 #D4A574？
- [ ] 背景是否為 #FAFAF8？
- [ ] 文字顏色是否為 #3A3A3A 或 #6B6B6B？

### ✅ 圓角檢查
- [ ] 主卡片是否使用 `rounded-[1.5rem]`？
- [ ] 按鈕是否使用 `rounded-2xl` 或 `rounded-full`？

### ✅ 陰影檢查
- [ ] 是否使用 `shadow-lg shadow-[#7B9FA6]/10` 或類似？
- [ ] 陰影是否柔和不刺眼？

### ✅ 互動檢查
- [ ] 是否有 hover 效果？
- [ ] 是否有平滑的過渡動畫？

### ✅ 佈局檢查
- [ ] 是否有底部導航空間預留 (`pb-24`)？
- [ ] 內容是否限制最大寬度 (`max-w-lg mx-auto`)？
- [ ] 是否有適當的內外邊距？

---

## 🚀 進階技巧

### 1. 使用 @-mention 功能
在 Cursor 中，您可以使用 `@` 來引用文件：

```
@JAPANESE_UI_DESIGN_SYSTEM.md 
請根據這個設計系統創建一個新的頁面
```

### 2. 同時引用多個文件
```
參考 @JAPANESE_UI_DESIGN_SYSTEM.md 和 
@JapaneseD/src/app/components/HomePage.tsx
創建一個類似的頁面
```

### 3. 引用特定的設計元素
```
使用 @JAPANESE_UI_DESIGN_SYSTEM.md 中定義的「主要卡片」樣式，
創建一個產品詳情卡片
```

---

## 📝 常見問題

### Q: 如果 Cursor 沒有自動應用設計系統怎麼辦？
**A**: 明確在提示詞中引用 `JAPANESE_UI_DESIGN_SYSTEM.md` 或 `JapaneseD/` 資料夾。

### Q: 可以修改設計系統嗎？
**A**: 可以！直接編輯 `JAPANESE_UI_DESIGN_SYSTEM.md`，Cursor 會使用最新版本。

### Q: 如何確保團隊成員都使用相同的設計？
**A**: 確保所有人都：
1. 閱讀 `JAPANESE_UI_DESIGN_SYSTEM.md`
2. 在 `.cursorrules` 中看到設計系統引用
3. 在提示詞中明確引用設計系統

### Q: 設計系統會自動應用到所有新代碼嗎？
**A**: `.cursorrules` 會提供基礎指引，但對於 UI 相關的任務，最好明確引用 `JAPANESE_UI_DESIGN_SYSTEM.md` 以獲得最佳效果。

---

## 🎓 學習資源

### 查看範例
1. **首頁設計**: `JapaneseD/src/app/components/HomePage.tsx`
2. **導航設計**: `JapaneseD/src/app/components/Navigation.tsx`
3. **主題配置**: `JapaneseD/src/styles/theme.css`
4. **完整應用**: `JapaneseD/src/app/App.tsx`

### 理解設計系統
- 閱讀 `JAPANESE_UI_DESIGN_SYSTEM.md` 的「設計理念」章節
- 查看「組件設計規範」了解每個組件的用法
- 參考「程式碼範例」快速上手

---

## 💡 最佳實踐

1. **先規劃，後實作**
   - 先確定功能需求
   - 再考慮如何用設計系統實現

2. **保持一致性**
   - 所有頁面使用相同的 Header 結構
   - 所有卡片使用相同的圓角和陰影
   - 所有按鈕使用相同的樣式

3. **適度使用 emoji**
   - 增加親和力，但不要過度
   - 主要用於狀態標籤和問候語

4. **重視細節**
   - 數字使用 `tabular-nums` 保持對齊
   - 圖標顏色與品牌色一致
   - 適當的 hover 效果

5. **測試互動**
   - 確保所有可點擊元素都有視覺反饋
   - 檢查過渡動畫是否流暢
   - 驗證在不同螢幕尺寸下的表現

---

## 🎉 開始使用

現在您已經準備好了！下次需要創建 UI 時，只需告訴 Cursor：

```
請參考 JAPANESE_UI_DESIGN_SYSTEM.md 和 JapaneseD/ 資料夾的設計風格，
創建 [您的功能描述]
```

Cursor 會自動應用日系文創風格的設計！

---

**祝您開發順利！** ✨

如有任何問題，請參考 `JAPANESE_UI_DESIGN_SYSTEM.md` 獲取詳細資訊。

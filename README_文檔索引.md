# 📚 專案文檔索引
## 快速找到您需要的資訊

> 💡 **使用方法**: 根據您的需求，查找對應的文檔

---

## 🎯 我想要...

### 🚀 開始使用 Cursor
**→ 閱讀**: `CURSOR_高效使用指南.md`
- 了解如何精準控制 AI
- 學習必備的設定檔案
- 掌握提示詞技巧
- 避免常見錯誤

**→ 然後**: `PROMPT_TEMPLATES.md`
- 複製即用的提示詞範本
- 涵蓋各種開發場景
- 節省時間，提高效率

---

### 🎨 應用日系 UI 設計

**→ 快速開始**: `如何使用日系UI設計系統.md`
- 3 種使用方法
- 實用提示詞範例
- 常見問題解答

**→ 完整規範**: `JAPANESE_UI_DESIGN_SYSTEM.md`
- 色彩系統（具體 HEX 色碼）
- 間距與圓角規範
- 組件設計規範
- 程式碼範例

**→ 快速查閱**: `JapaneseD/DESIGN_QUICK_REFERENCE.md`
- 常用色彩代碼
- 常用樣式類別
- 提示詞模板
- 檢查清單

**→ 實際範例**: `JapaneseD/src/app/components/`
- HomePage.tsx - 首頁設計
- Navigation.tsx - 底部導航
- 其他頁面組件

---

### 💻 開發新功能

**→ 第一步**: 查看 `.cursorrules`
- 了解技術棧
- 了解核心原則
- 了解資料結構
- 了解檔案結構

**→ 第二步**: `PROMPT_TEMPLATES.md`
- 使用「範本 1: 完整功能開發」
- 分階段執行
- 每階段確認後再繼續

**→ 第三步**: `CURSOR_高效使用指南.md`
- 參考「分階段開發策略」
- 遵循標準開發流程

---

### 🔧 修改現有功能

**→ 使用**: `PROMPT_TEMPLATES.md`
- 範本 4: 添加新功能到現有頁面
- 範本 5: 重構現有程式碼
- 範本 6: 修復 Bug

**→ 注意**: 明確指定
- 只修改哪個檔案
- 不要改變什麼
- 保持什麼不變

---

### 🎨 創建或修改 UI

**→ 必讀**: `JAPANESE_UI_DESIGN_SYSTEM.md`
- 查看色彩系統
- 查看組件規範
- 複製程式碼範例

**→ 參考**: `JapaneseD/src/app/components/HomePage.tsx`
- 看實際實作
- 了解佈局結構
- 學習樣式寫法

**→ 使用**: `PROMPT_TEMPLATES.md`
- 範本 7: 創建新頁面
- 範本 8: 修改現有頁面樣式
- 範本 9: 創建表單
- 範本 10: 創建卡片組件

---

### 💾 處理資料

**→ 查看**: `.cursorrules`
- Data Schema Reference
- 了解資料結構

**→ 使用**: `PROMPT_TEMPLATES.md`
- 範本 11: 創建資料庫操作函數
- 範本 12: 創建自定義 Hook
- 範本 13: 資料查詢與篩選

**→ 參考**: 現有的 `src/lib/db.ts`（如果存在）
- 了解現有的資料操作模式
- 保持一致性

---

### 🐛 除錯與優化

**→ 使用**: `PROMPT_TEMPLATES.md`
- 範本 14: 分析並修復問題
- 範本 15: 效能優化
- 範本 16: 添加錯誤處理

**→ 參考**: `CURSOR_高效使用指南.md`
- 常見錯誤與解決方案

---

### 📖 學習最佳實踐

**→ 閱讀**: `CURSOR_高效使用指南.md`
- 完整的開發流程
- 進階技巧
- 黃金法則

**→ 查看**: `.cursorrules`
- 了解專案的核心原則
- 了解技術決策

**→ 研究**: `JapaneseD/` 資料夾
- 看實際運作的專案
- 學習程式碼組織方式

---

### 🚀 部署與發布

**→ 閱讀**: `簡易操作指南.md`
- 本地開發流程
- 推送到測試環境
- 推送到正式網站
- 常用命令速查

---

## 📁 文檔清單

### 核心文檔
| 文檔名稱 | 用途 | 何時使用 |
|---------|------|---------|
| `.cursorrules` | 專案規則與技術棧 | 開始任何開發前 |
| `CURSOR_高效使用指南.md` | Cursor 使用教學 | 學習如何精準控制 AI |
| `PROMPT_TEMPLATES.md` | 提示詞範本庫 | 需要與 AI 溝通時 |

### 設計系統
| 文檔名稱 | 用途 | 何時使用 |
|---------|------|---------|
| `JAPANESE_UI_DESIGN_SYSTEM.md` | 完整設計規範 | 創建或修改 UI |
| `如何使用日系UI設計系統.md` | 使用指南 | 第一次使用設計系統 |
| `JapaneseD/DESIGN_QUICK_REFERENCE.md` | 快速參考 | 需要快速查閱樣式 |

### 參考實作
| 位置 | 內容 | 何時參考 |
|------|------|---------|
| `JapaneseD/src/app/components/` | 頁面組件範例 | 創建類似的頁面 |
| `JapaneseD/src/app/components/ui/` | 基礎 UI 組件 | 需要使用 UI 組件 |
| `JapaneseD/src/styles/` | 樣式配置 | 了解主題設定 |

### 操作指南
| 文檔名稱 | 用途 | 何時使用 |
|---------|------|---------|
| `簡易操作指南.md` | Git 與部署流程 | 需要推送程式碼 |
| `COMPLETED_FEATURES.md` | 已完成功能清單 | 了解專案進度 |
| `TODO.md` | 待辦事項 | 規劃下一步工作 |

---

## 🎯 常見場景快速指引

### 場景 1: 我是新手，第一次使用 Cursor

```
1. 閱讀「CURSOR_高效使用指南.md」（30 分鐘）
   → 了解基本概念和原則
   
2. 查看「.cursorrules」（5 分鐘）
   → 了解專案技術棧
   
3. 瀏覽「PROMPT_TEMPLATES.md」（10 分鐘）
   → 熟悉提示詞範本
   
4. 試著創建一個簡單組件
   → 使用範本，實際操作
```

### 場景 2: 我要創建一個新頁面

```
1. 查看「.cursorrules」
   → 確認檔案應該放在哪裡
   
2. 打開「PROMPT_TEMPLATES.md」
   → 複製「範本 7: 創建新頁面」
   
3. 參考「JAPANESE_UI_DESIGN_SYSTEM.md」
   → 了解設計規範
   
4. 查看「JapaneseD/src/app/components/HomePage.tsx」
   → 看實際範例
   
5. 修改範本，貼到 Cursor
   → 開始創建
```

### 場景 3: 我要修改現有功能

```
1. 打開「PROMPT_TEMPLATES.md」
   → 複製「範本 4: 添加新功能到現有頁面」
   
2. 明確指定
   → 只修改哪個檔案
   → 不要改變什麼
   
3. 貼到 Cursor
   → 執行修改
```

### 場景 4: UI 看起來不對

```
1. 查看「JAPANESE_UI_DESIGN_SYSTEM.md」
   → 檢查設計規範
   
2. 使用檢查清單
   → 色彩是否正確？
   → 圓角是否正確？
   → 陰影是否正確？
   
3. 使用「範本 8: 修改現有頁面樣式」
   → 修正樣式
```

### 場景 5: AI 生成的程式碼不符合預期

```
1. 檢查「CURSOR_高效使用指南.md」
   → 查看「常見錯誤與解決方案」
   
2. 確認提示詞是否明確
   → 有沒有指定檔案路徑？
   → 有沒有提供約束條件？
   → 有沒有引用相關文檔？
   
3. 使用更明確的提示詞
   → 參考「PROMPT_TEMPLATES.md」
```

### 場景 6: 我要推送程式碼

```
1. 查看「簡易操作指南.md」
   → 了解 Git 流程
   
2. 本地測試
   → npm run dev
   
3. 推送到測試環境
   → git push origin develop
   
4. 確認無誤後推送到正式環境
   → npm run deploy:prod
```

---

## 🔍 快速搜尋

### 我想找...

**色彩代碼**
→ `JapaneseD/DESIGN_QUICK_REFERENCE.md` 或 `JAPANESE_UI_DESIGN_SYSTEM.md`

**圓角數值**
→ `JapaneseD/DESIGN_QUICK_REFERENCE.md` 或 `JAPANESE_UI_DESIGN_SYSTEM.md`

**組件範例**
→ `JAPANESE_UI_DESIGN_SYSTEM.md` 或 `JapaneseD/src/app/components/`

**資料結構**
→ `.cursorrules` 的 "Data Schema Reference"

**提示詞範本**
→ `PROMPT_TEMPLATES.md`

**Git 命令**
→ `簡易操作指南.md`

**技術棧資訊**
→ `.cursorrules` 的 "Tech Stack"

**核心原則**
→ `.cursorrules` 的 "Core Principles"

**檔案結構**
→ `.cursorrules` 的 "File Structure"

**常見錯誤**
→ `CURSOR_高效使用指南.md` 的 "常見錯誤與解決方案"

---

## 💡 使用建議

### 📌 釘選這些文檔
建議在 Cursor 中保持這些文檔打開：
1. `.cursorrules` - 隨時參考
2. `PROMPT_TEMPLATES.md` - 快速複製範本
3. `JapaneseD/DESIGN_QUICK_REFERENCE.md` - 查閱樣式

### 🔖 書籤這些位置
在瀏覽器或編輯器中標記：
1. `JAPANESE_UI_DESIGN_SYSTEM.md` - 設計規範
2. `JapaneseD/src/app/components/HomePage.tsx` - UI 範例
3. `CURSOR_高效使用指南.md` - 使用教學

### 📝 養成習慣
- 開發前先看 `.cursorrules`
- 創建 UI 前先看設計系統
- 與 AI 溝通時使用範本
- 遇到問題先查文檔

---

## 🎓 學習路徑

### 初學者（第 1 天）
1. ✅ 閱讀 `CURSOR_高效使用指南.md`
2. ✅ 查看 `.cursorrules`
3. ✅ 瀏覽 `PROMPT_TEMPLATES.md`
4. ✅ 試著創建一個簡單組件

### 進階（第 2-3 天）
1. ✅ 深入學習 `JAPANESE_UI_DESIGN_SYSTEM.md`
2. ✅ 研究 `JapaneseD/` 中的範例
3. ✅ 創建一個完整頁面
4. ✅ 學習分階段開發

### 精通（第 4-7 天）
1. ✅ 掌握所有提示詞範本
2. ✅ 能夠精準控制 AI 輸出
3. ✅ 創建複雜功能
4. ✅ 優化現有程式碼

---

## 🆘 遇到問題？

### 問題類型 → 查看文檔

**不知道如何與 AI 溝通**
→ `CURSOR_高效使用指南.md` + `PROMPT_TEMPLATES.md`

**UI 不符合設計規範**
→ `JAPANESE_UI_DESIGN_SYSTEM.md` + `JapaneseD/DESIGN_QUICK_REFERENCE.md`

**不知道檔案放哪裡**
→ `.cursorrules` 的 "File Structure"

**不知道用什麼技術**
→ `.cursorrules` 的 "Tech Stack"

**AI 生成的程式碼有問題**
→ `CURSOR_高效使用指南.md` 的 "常見錯誤與解決方案"

**不知道如何推送程式碼**
→ `簡易操作指南.md`

---

## 📞 快速聯絡

如果文檔中找不到答案，可以：
1. 查看專案的 GitHub Issues
2. 詢問團隊成員
3. 在 Cursor 中直接詢問 AI（記得引用相關文檔）

---

## 🎉 開始使用

**現在就開始吧！**

1. 📖 先花 30 分鐘閱讀 `CURSOR_高效使用指南.md`
2. 🎨 再花 15 分鐘瀏覽 `JAPANESE_UI_DESIGN_SYSTEM.md`
3. 💻 然後打開 `PROMPT_TEMPLATES.md`，開始創建！

**記住**: 文檔是您的好朋友，遇到問題先查文檔！📚

---

**最後更新**: 2026年1月21日

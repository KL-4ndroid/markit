# Cursor 提示詞範本庫
## 複製即用的高效提示詞

> 💡 **使用方法**: 複製範本 → 替換 [方括號] 內容 → 貼到 Cursor

---

## 📋 目錄

1. [創建新功能](#創建新功能)
2. [修改現有功能](#修改現有功能)
3. [UI 相關](#ui-相關)
4. [資料處理](#資料處理)
5. [除錯與優化](#除錯與優化)

---

## 🆕 創建新功能

### 範本 1: 完整功能開發（分階段）

```
我要創建 [功能名稱] 功能，請分階段執行：

階段 1: 類型定義
- 參考 @.cursorrules 中的資料結構
- 創建 src/types/[名稱].ts
- 包含完整的 TypeScript 介面定義

階段 2: 資料層
- 在 src/lib/db.ts 添加 CRUD 函數
- 每個操作都要記錄 Event
- 使用 Dexie 的最佳實踐

階段 3: 業務邏輯
- 創建 src/hooks/use[名稱].ts
- 使用 Zustand 管理狀態
- 封裝所有資料操作

階段 4: 基礎 UI
- 創建 src/app/[路徑]/page.tsx
- 先用簡單 HTML 確保資料流正確
- 暫不套用設計系統

階段 5: 設計系統
- 參考 @JAPANESE_UI_DESIGN_SYSTEM.md
- 套用日系文創風格
- 使用品牌色和大圓角

請先執行階段 1，完成後等我確認再繼續。
```

### 範本 2: 快速創建簡單功能

```
參考 @.cursorrules 和 @JAPANESE_UI_DESIGN_SYSTEM.md，
創建 [功能描述]：

檔案位置：src/[路徑]/[檔案名].tsx

功能需求：
1. [需求 1]
2. [需求 2]
3. [需求 3]

技術要求：
- 使用 TypeScript
- 使用現有的 [組件/Hook] 
- 不要安裝新套件

UI 要求：
- 日系風格（霧藍色 #7B9FA6）
- 大圓角 rounded-[1.5rem]
- 柔和陰影 shadow-lg shadow-[#7B9FA6]/10

限制：
- 不要修改其他檔案
- 不要使用外部 API
```

### 範本 3: 創建可重用組件

```
創建一個可重用的 [組件名稱] 組件：

檔案位置：src/components/[分類]/[組件名].tsx

Props 定義：
interface [組件名]Props {
  [prop1]: [類型];
  [prop2]: [類型];
  [prop3]?: [類型]; // 可選
}

功能：
1. [功能 1]
2. [功能 2]

樣式要求：
- 參考 @JAPANESE_UI_DESIGN_SYSTEM.md
- 使用 Tailwind CSS
- 支援 hover 效果
- 添加過渡動畫

範例使用：
<[組件名] [prop1]="..." [prop2]="..." />
```

---

## ✏️ 修改現有功能

### 範本 4: 添加新功能到現有頁面

```
為 src/[路徑]/[檔案名].tsx 添加 [功能描述]：

新增功能：
1. [功能 1]
2. [功能 2]

實作要求：
- 保持現有功能不變
- 使用現有的狀態管理
- 樣式與現有設計一致
- 參考 @JAPANESE_UI_DESIGN_SYSTEM.md

限制：
- 只修改這一個檔案
- 不要改變現有的資料結構
- 不要移除現有功能
```

### 範本 5: 重構現有程式碼

```
重構 src/[路徑]/[檔案名].tsx：

目標：
- [重構目標，如：提高可讀性、減少重複程式碼]

要求：
1. 保持功能完全相同
2. 提取重複邏輯為函數
3. 改善變數命名
4. 添加適當的註解
5. 遵循 @.cursorrules 的規範

不要：
- 改變任何功能行為
- 修改 UI 外觀
- 改變資料結構
```

### 範本 6: 修復 Bug

```
修復 src/[路徑]/[檔案名].tsx 中的問題：

問題描述：
[詳細描述問題現象]

預期行為：
[應該如何運作]

限制：
- 只修改必要的部分
- 不要改變其他功能
- 保持程式碼風格一致

請先分析問題原因，再提供解決方案。
```

---

## 🎨 UI 相關

### 範本 7: 創建新頁面（完整 UI）

```
參考 @JAPANESE_UI_DESIGN_SYSTEM.md 和 @JapaneseD/src/app/components/HomePage.tsx，
創建 [頁面名稱] 頁面：

檔案位置：src/app/[路徑]/page.tsx

頁面結構：
1. Header（漸層背景，品牌色）
   - 標題：[標題文字]
   - 副標題：[副標題文字]
   - 右上角：[元素描述]

2. 主要內容區
   - [內容描述]
   - 使用 [佈局方式，如：2列網格]
   - 卡片樣式：大圓角、柔和陰影

3. 底部
   - 預留導航空間（pb-24）

設計要求：
- 背景色：#FAFAF8
- 主色：#7B9FA6（霧藍）
- 次色：#D4A574（溫暖木）
- 卡片圓角：rounded-[1.5rem]
- 陰影：shadow-lg shadow-[#7B9FA6]/10
- 所有可點擊元素都要有 hover 效果
```

### 範本 8: 修改現有頁面樣式

```
將 src/[路徑]/[檔案名].tsx 改為符合日系設計風格：

參考：@JAPANESE_UI_DESIGN_SYSTEM.md

要修改的元素：
1. [元素 1]：改為 [具體樣式]
2. [元素 2]：改為 [具體樣式]
3. [元素 3]：改為 [具體樣式]

必須使用：
- 品牌色：#7B9FA6, #D4A574
- 大圓角：rounded-[1.5rem] 或 rounded-[1.25rem]
- 柔和陰影：shadow-lg shadow-[#7B9FA6]/10
- 平滑過渡：transition-all

不要改變：
- 功能邏輯
- 資料流
- 組件結構
```

### 範本 9: 創建表單

```
參考 @JAPANESE_UI_DESIGN_SYSTEM.md，
創建 [表單名稱] 表單組件：

檔案位置：src/components/[分類]/[表單名].tsx

表單欄位：
1. [欄位名稱]：[類型]，[驗證規則]
2. [欄位名稱]：[類型]，[驗證規則]
3. [欄位名稱]：[類型]，[驗證規則]

功能要求：
- 使用 React Hook Form（如果已安裝）或原生狀態
- 即時驗證
- 顯示錯誤訊息
- 提交時顯示 loading 狀態
- 成功後顯示 toast 通知（使用 Sonner）

樣式要求：
- 輸入框：bg-[#f3f3f5] rounded-xl
- 標籤：text-sm text-[#6B6B6B]
- 按鈕：bg-[#7B9FA6] text-white rounded-2xl
- 錯誤訊息：text-xs text-red-500
```

### 範本 10: 創建卡片組件

```
參考 @JapaneseD/src/app/components/HomePage.tsx 中的卡片設計，
創建 [卡片名稱] 卡片組件：

檔案位置：src/components/[分類]/[卡片名].tsx

顯示內容：
1. [內容 1]
2. [內容 2]
3. [內容 3]

互動：
- 點擊時：[行為]
- Hover 時：shadow-xl transition-shadow

樣式：
- 白色背景
- 圓角：rounded-[1.25rem]
- 陰影：shadow-md shadow-[#7B9FA6]/5
- 內邊距：p-4 或 p-6
- 使用品牌色作為強調色
```

---

## 💾 資料處理

### 範本 11: 創建資料庫操作函數

```
在 src/lib/db.ts 中添加 [實體名稱] 的 CRUD 操作：

參考現有的資料結構：@.cursorrules

需要的函數：
1. create[實體名稱](data: [類型]): Promise<number>
   - 創建新記錄
   - 記錄 Event（type: '[實體]_created'）
   - 返回新記錄的 id

2. get[實體名稱]s(): Promise<[類型][]>
   - 獲取所有記錄
   - 按 [排序欄位] 排序

3. get[實體名稱]ById(id: number): Promise<[類型] | undefined>
   - 根據 id 獲取單筆記錄

4. update[實體名稱](id: number, data: Partial<[類型]>): Promise<void>
   - 更新記錄
   - 記錄 Event（type: '[實體]_updated'）

5. delete[實體名稱](id: number): Promise<void>
   - 刪除記錄
   - 記錄 Event（type: '[實體]_deleted'）

要求：
- 使用 Dexie 的最佳實踐
- 所有操作都要有錯誤處理
- 添加 TypeScript 類型註解
```

### 範本 12: 創建自定義 Hook

```
創建 src/hooks/use[名稱].ts：

功能：
- 管理 [實體名稱] 的狀態
- 封裝所有 CRUD 操作
- 使用 Zustand 進行狀態管理

State：
- [狀態名稱]: [類型]
- loading: boolean
- error: string | null

Actions：
1. fetch[實體名稱]s(): Promise<void>
2. create[實體名稱](data: [類型]): Promise<void>
3. update[實體名稱](id: number, data: Partial<[類型]>): Promise<void>
4. delete[實體名稱](id: number): Promise<void>

要求：
- 使用 src/lib/db.ts 中的函數
- 操作成功後自動重新獲取資料
- 錯誤時設置 error 狀態
- 添加 loading 狀態管理
```

### 範本 13: 資料查詢與篩選

```
在 src/lib/db.ts 中添加 [實體名稱] 的查詢函數：

1. search[實體名稱]ByKeyword(keyword: string): Promise<[類型][]>
   - 搜尋 [欄位1] 和 [欄位2]
   - 不區分大小寫
   - 使用 Dexie 的 where() 方法

2. filter[實體名稱]By[條件](value: [類型]): Promise<[類型][]>
   - 根據 [條件] 篩選
   - 返回符合條件的記錄

3. get[實體名稱]sByDateRange(start: Date, end: Date): Promise<[類型][]>
   - 根據日期範圍查詢
   - 使用 between() 方法

要求：
- 高效的查詢（使用索引）
- 完整的類型定義
- 錯誤處理
```

---

## 🐛 除錯與優化

### 範本 14: 分析並修復問題

```
分析 src/[路徑]/[檔案名].tsx 中的問題：

問題現象：
[詳細描述]

重現步驟：
1. [步驟 1]
2. [步驟 2]
3. [步驟 3]

請：
1. 先分析可能的原因
2. 檢查相關的程式碼
3. 提供解決方案
4. 說明為什麼這樣修改

不要直接修改程式碼，先讓我確認方案。
```

### 範本 15: 效能優化

```
優化 src/[路徑]/[檔案名].tsx 的效能：

目標：
- 減少不必要的重新渲染
- 優化資料查詢
- 改善載入速度

可以使用：
- React.memo
- useMemo
- useCallback
- 虛擬滾動（如果需要）

要求：
1. 先分析目前的效能瓶頸
2. 提出優化方案
3. 實作優化
4. 保持功能不變
```

### 範本 16: 添加錯誤處理

```
為 src/[路徑]/[檔案名].tsx 添加完整的錯誤處理：

需要處理的情況：
1. 資料載入失敗
2. 操作失敗（創建、更新、刪除）
3. 網路錯誤（如果有）
4. 驗證錯誤

錯誤顯示方式：
- 使用 Sonner toast 顯示錯誤訊息
- 在 UI 上顯示友善的錯誤提示
- 提供重試選項（如果適用）

要求：
- 不要使用 console.log
- 錯誤訊息要清楚易懂
- 保持 UI 穩定（不要崩潰）
```

---

## 🎯 特殊場景

### 範本 17: 遷移現有程式碼

```
將 [舊檔案路徑] 遷移到新的架構：

目標位置：[新檔案路徑]

遷移要求：
1. 改用 @.cursorrules 中定義的技術棧
2. 套用 @JAPANESE_UI_DESIGN_SYSTEM.md 的設計
3. 使用 Dexie 替代 [舊的資料方案]
4. 使用 Zustand 替代 [舊的狀態管理]

保持：
- 所有現有功能
- 使用者體驗

改善：
- 程式碼結構
- 類型安全
- UI 一致性
```

### 範本 18: 整合第三方套件

```
整合 [套件名稱] 到專案中：

用途：[說明為什麼需要這個套件]

整合要求：
1. 在 src/lib/[名稱].ts 中封裝
2. 提供 TypeScript 類型定義
3. 遵循專案的程式碼風格
4. 添加錯誤處理

使用範例：
[展示如何使用]

限制：
- 不要直接在組件中使用
- 要通過封裝層使用
```

### 範本 19: 創建測試

```
為 src/[路徑]/[檔案名].tsx 創建測試：

測試框架：[如 Jest, Vitest]

需要測試的場景：
1. [場景 1]
2. [場景 2]
3. [場景 3]

測試檔案位置：src/[路徑]/__tests__/[檔案名].test.tsx

要求：
- 測試覆蓋率 > 80%
- 包含正常流程和錯誤流程
- Mock 外部依賴
- 清晰的測試描述
```

---

## 💡 組合使用技巧

### 技巧 1: 多文件引用

```
參考以下文件：
@.cursorrules
@JAPANESE_UI_DESIGN_SYSTEM.md
@JapaneseD/src/app/components/HomePage.tsx
@src/types/[相關類型].ts

創建 [功能描述]
```

### 技巧 2: 分步驟執行

```
我要創建 [功能]，分 3 個步驟：

步驟 1: [描述]
步驟 2: [描述]
步驟 3: [描述]

請先執行步驟 1，完成後等我確認。
```

### 技巧 3: 提供範例

```
創建一個類似 @[參考檔案] 的 [組件/頁面]，
但是要：
- 改變 [差異 1]
- 添加 [差異 2]
- 移除 [差異 3]
```

---

## 📝 快速參考

### 常用引用
```
@.cursorrules                           # 專案規則
@JAPANESE_UI_DESIGN_SYSTEM.md          # 設計系統
@JapaneseD/src/app/components/          # UI 範例
@src/types/                             # 類型定義
@src/lib/db.ts                          # 資料庫操作
```

### 常用約束
```
限制：
- 只修改 [指定檔案]
- 不要安裝新套件
- 不要使用外部 API
- 不要修改資料結構
- 保持現有功能不變
```

### 常用樣式
```
UI 要求：
- 背景：#FAFAF8
- 主色：#7B9FA6
- 圓角：rounded-[1.5rem]
- 陰影：shadow-lg shadow-[#7B9FA6]/10
- Hover：hover:shadow-xl transition-shadow
```

---

## 🎉 使用建議

1. **先複製範本** → 再修改細節
2. **明確指定檔案路徑** → 避免創建錯誤位置
3. **使用 @ 引用文件** → 確保 AI 讀取正確資訊
4. **分階段執行** → 每個階段確認後再繼續
5. **提供約束條件** → 避免 AI 過度發揮

---

**記住**: 好的提示詞 = 明確的需求 + 具體的約束 + 清晰的參考 🎯

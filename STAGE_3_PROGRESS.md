# 階段三進度報告 - 表單整合（進行中）

## ✅ 已完成

### 1. AddMarketForm（新增市集表單）✅

**修改文件**：`components/markets/AddMarketForm.tsx`

#### 改動內容

**1. 導入組件**
```typescript
// 改用多選日期選擇器
import { DateMultiPicker } from '@/components/ui/DateMultiPicker';
```

**2. 表單狀態**
```typescript
const [formData, setFormData] = useState<MarketCreatedPayload>({
  dates: [],              // ✅ 新增：日期陣列
  startDate: '',          // 保留（自動計算）
  endDate: '',            // 保留（自動計算）
  // ... 其他欄位
});
```

**3. 處理函數**
```typescript
const handleChange = (field, value: string | number | boolean | string[]) => {
  // ✅ 當日期陣列變更時，自動計算 startDate 和 endDate
  if (field === 'dates' && Array.isArray(value) && value.length > 0) {
    const sortedDates = [...value].sort();
    updated.startDate = sortedDates[0];
    updated.endDate = sortedDates[sortedDates.length - 1];
  }
};
```

**4. 表單驗證**
```typescript
// 驗證必填欄位（改為檢查 dates 陣列）
if (!formData.dates || formData.dates.length === 0) {
  alert('請填寫所有必填欄位並選擇至少一個日期');
  return;
}
```

**5. UI 組件**
```tsx
<DateMultiPicker
  value={formData.dates || []}
  onChange={(value) => handleChange('dates', value)}
  placeholder="選擇市集日期（可選擇多個日期）"
  required
/>
<p className="text-xs text-[#6B6B6B] mt-2">
  💡 提示：可以選擇多個不連續的日期（例如：只選週六、週日）
</p>
```

---

## 🔄 待完成

### 2. EditMarketForm（編輯市集表單）⏳

**需要修改**：`components/markets/EditMarketForm.tsx`

**改動內容**：
1. 導入 `DateMultiPicker`
2. 修改表單狀態處理 `dates` 陣列
3. 修改 `handleChange` 函數
4. 修改表單驗證
5. 替換日期選擇器組件
6. 處理初始值（從現有市集載入 dates）

---

## 📊 測試計劃

### AddMarketForm 測試清單

#### ✅ 基本功能
- [ ] 打開新增市集表單
- [ ] 點擊日期輸入框
- [ ] 選擇多個日期（例如：2/15, 2/16, 2/22, 2/23）
- [ ] 確認輸入框顯示格式化的日期（例如：2024-02-15~16, 2024-02-22~23）
- [ ] 填寫其他必填欄位
- [ ] 提交表單

#### ✅ 資料驗證
- [ ] 不選擇日期，提交表單 → 應該顯示錯誤
- [ ] 只選擇一個日期 → 應該正常提交
- [ ] 選擇多個連續日期 → 應該正常提交
- [ ] 選擇多個不連續日期 → 應該正常提交

#### ✅ 資料保存
- [ ] 提交後查看資料庫
- [ ] 確認 `dates` 陣列正確保存
- [ ] 確認 `startDate` 和 `endDate` 自動計算正確
- [ ] 確認市集列表正常顯示

#### ✅ 顯示測試
- [ ] 市集卡片顯示日期正確
- [ ] 市集詳情頁顯示日期正確
- [ ] 每日統計功能正常

---

## 🎯 下一步

### 立即執行
1. 修改 `EditMarketForm`（類似 AddMarketForm 的改動）
2. 測試新增市集功能
3. 測試編輯市集功能
4. 修復單選模式的 Bug（如果需要）

### 預計時間
- 修改 EditMarketForm：20 分鐘
- 測試新增功能：10 分鐘
- 測試編輯功能：10 分鐘
- Bug 修復：10 分鐘
- **總計：約 50 分鐘**

---

## 📝 注意事項

### 重要提醒
1. ✅ `dates` 陣列會自動計算 `startDate` 和 `endDate`
2. ✅ 事件處理器已支持 `dates` 陣列
3. ✅ 自動遷移已完成，舊資料已有 `dates` 欄位
4. ✅ 向後兼容，不會影響現有資料

### 已知問題
- ⚠️ 單選模式有 Bug（稍後修復）
- ✅ 多選模式正常運作

---

## 🔗 相關文檔

- [階段一完成報告](./STAGE_1_COMPLETE.md)
- [階段二完成報告](./STAGE_2_COMPLETE.md)
- [影響分析報告](./MULTI_DATE_IMPACT_ANALYSIS.md)

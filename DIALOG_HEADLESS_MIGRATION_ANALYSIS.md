# Dialog/Modal 組件 Headless UI 遷移分析報告

## 📊 總覽

專案中共發現 **13 個** Dialog/Modal 組件，其中：
- ✅ **已使用 Headless UI**: 4 個
- 🔄 **建議遷移至 Headless UI**: 6 個
- ⚠️ **不適合使用 Headless UI**: 3 個

---

## ✅ 已使用 Headless UI 的組件

### 1. `InitialSyncDialog.tsx`
- **路徑**: `components/sync/InitialSyncDialog.tsx`
- **用途**: 初始同步對話框，登入後顯示直到首次同步完成
- **使用**: `Dialog`, `Transition` from `@headlessui/react`
- **狀態**: ✅ 已正確實作

### 2. `SyncProgressDialog.tsx`
- **路徑**: `components/sync/SyncProgressDialog.tsx`
- **用途**: 顯示上傳/下載進度
- **使用**: `Dialog`, `Transition` from `@headlessui/react`
- **狀態**: ✅ 已正確實作

### 3. `SyncConfirmDialog.tsx`
- **路徑**: `components/sync/SyncConfirmDialog.tsx`
- **用途**: 首次登入時詢問是否同步資料
- **使用**: `Dialog`, `Transition` from `@headlessui/react`
- **狀態**: ✅ 已正確實作

### 4. `StaffInvitationDialog.tsx`
- **路徑**: `components/staff/StaffInvitationDialog.tsx`
- **用途**: 員工邀請接受對話框
- **使用**: `Dialog`, `Transition` from `@headlessui/react`
- **狀態**: ✅ 已正確實作

### 5. `MarketCard.tsx` (備註彈窗)
- **路徑**: `components/markets/MarketCard.tsx`
- **用途**: 市集備註提醒彈窗
- **使用**: `Dialog`, `DialogPanel`, `DialogTitle` from `@headlessui/react`
- **狀態**: ✅ 已正確實作（剛完成遷移）

---

## 🔄 建議遷移至 Headless UI 的組件

### 1. `QuickDealModal.tsx` ⭐ 高優先級
- **路徑**: `components/sales/QuickDealModal.tsx`
- **用途**: 快速成交彈窗，直接輸入金額完成交易
- **當前實作**: 使用 `createPortal` + 手動管理狀態
- **遷移理由**:
  - ✅ 簡單的確認型對話框
  - ✅ 需要焦點管理和鍵盤導航
  - ✅ 有表單輸入，需要焦點陷阱
- **遷移難度**: 🟢 低
- **預估工時**: 30 分鐘

### 2. `DealDetailModal.tsx` ⭐ 高優先級
- **路徑**: `components/markets/DealDetailModal.tsx`
- **用途**: 成交詳細內容彈窗，顯示成交詳情、商品明細
- **當前實作**: 使用 `createPortal` + 手動管理狀態
- **遷移理由**:
  - ✅ 標準的詳情展示對話框
  - ✅ 有編輯和刪除操作，需要良好的無障礙支援
  - ✅ 需要 ESC 鍵關閉功能
- **遷移難度**: 🟢 低
- **預估工時**: 30 分鐘

### 3. `DailyDealsModal.tsx` ⭐ 高優先級
- **路徑**: `components/markets/DailyDealsModal.tsx`
- **用途**: 日期成交記錄彈窗，顯示指定日期的所有成交記錄
- **當前實作**: 使用 `createPortal` + 手動管理狀態
- **遷移理由**:
  - ✅ 列表展示型對話框
  - ✅ 需要滾動管理和焦點控制
  - ✅ 有子項點擊交互
- **遷移難度**: 🟢 低
- **預估工時**: 30 分鐘

### 4. `InteractionDetailModal.tsx` ⭐ 中優先級
- **路徑**: `components/markets/InteractionDetailModal.tsx`
- **用途**: 互動記錄詳情彈窗，顯示特定互動類型的所有記錄時間
- **當前實作**: 使用 `createPortal` + 手動管理狀態
- **遷移理由**:
  - ✅ 詳情展示型對話框
  - ✅ 有日期分組和滾動列表
  - ✅ 需要無障礙支援
- **遷移難度**: 🟢 低
- **預估工時**: 30 分鐘

### 5. `LoginModal.tsx` ⭐ 中優先級
- **路徑**: `components/auth/LoginModal.tsx`
- **用途**: 登入對話框，Email 登入介面
- **當前實作**: 使用條件渲染 + 手動管理狀態
- **遷移理由**:
  - ✅ 表單型對話框
  - ✅ 需要焦點陷阱和鍵盤導航
  - ✅ 登入流程需要良好的無障礙支援
- **遷移難度**: 🟡 中
- **預估工時**: 45 分鐘
- **注意事項**: 需要處理表單提交和錯誤狀態

### 6. `MigrationModal.tsx` ⭐ 中優先級
- **路徑**: `components/auth/MigrationModal.tsx`
- **用途**: 資料遷移詢問對話框
- **當前實作**: 使用條件渲染 + 手動管理狀態
- **遷移理由**:
  - ✅ 重要的決策型對話框
  - ✅ 有多個選項和確認流程
  - ✅ 需要防止誤操作（焦點管理）
- **遷移難度**: 🟡 中
- **預估工時**: 45 分鐘
- **注意事項**: 需要處理複雜的狀態流轉

---

## ⚠️ 不適合使用 Headless UI 的組件

### 1. `AddRevenueDialog.tsx` ❌
- **路徑**: `components/markets/AddRevenueDialog.tsx`
- **用途**: 補登收入對話框，支持簡化和完整兩種輸入模式
- **當前實作**: 使用 `createPortal` + 複雜的表單狀態管理
- **不適合理由**:
  - ❌ **全屏對話框**: 使用 `hideNavigation/showNavigation` 控制導航欄顯示
  - ❌ **複雜的表單邏輯**: 兩種輸入模式切換、購物車管理
  - ❌ **自定義滾動行為**: 需要精確控制內容區域滾動
  - ❌ **特殊的生命週期**: 開啟/關閉時需要執行特定邏輯
- **建議**: 保持當前實作，使用 `createPortal` 更靈活

### 2. 其他全屏或複雜交互的 Modal
- 如果未來有類似 `AddRevenueDialog` 的全屏、多步驟、複雜表單的對話框
- 建議使用 `createPortal` + 自定義實作
- Headless UI 更適合標準的對話框場景

---

## 📋 遷移優先級建議

### 第一批（高優先級，簡單快速）
1. ✅ `QuickDealModal.tsx` - 30 分鐘
2. ✅ `DealDetailModal.tsx` - 30 分鐘
3. ✅ `DailyDealsModal.tsx` - 30 分鐘

**總計**: 1.5 小時

### 第二批（中優先級，稍複雜）
4. ✅ `InteractionDetailModal.tsx` - 30 分鐘
5. ✅ `LoginModal.tsx` - 45 分鐘
6. ✅ `MigrationModal.tsx` - 45 分鐘

**總計**: 2 小時

### 總遷移時間: 約 3.5 小時

---

## 🎯 遷移收益

### 1. 無障礙改進
- ✅ 自動管理 ARIA 屬性
- ✅ 焦點陷阱（focus trap）
- ✅ 鍵盤導航（ESC 關閉、Tab 循環）
- ✅ 螢幕閱讀器支援

### 2. 代碼質量
- ✅ 減少手動事件處理代碼
- ✅ 統一的對話框實作模式
- ✅ 更少的 bug（焦點管理、滾動鎖定等）

### 3. 用戶體驗
- ✅ 更好的鍵盤操作體驗
- ✅ 背景滾動鎖定
- ✅ 更流暢的動畫過渡

### 4. 維護性
- ✅ 使用成熟的第三方庫，減少維護成本
- ✅ 統一的 API，降低學習成本
- ✅ 更好的 TypeScript 支援

---

## 📝 遷移模板

### 基本 Dialog 遷移模板

```tsx
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

export function MyModal({ isOpen, onClose, title, children }) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      {/* 彈窗容器 */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-white rounded-[1.5rem] p-6 max-w-md w-full shadow-2xl">
          <DialogTitle className="text-lg font-medium mb-4">
            {title}
          </DialogTitle>
          
          {children}
          
          <button
            onClick={onClose}
            className="w-full bg-[#7B9FA6] text-white py-3 rounded-xl hover:bg-[#6A8E95] transition-colors"
          >
            關閉
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

### 帶動畫的 Dialog 遷移模板

```tsx
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';

export function MyAnimatedModal({ isOpen, onClose, title, children }) {
  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* 背景遮罩動畫 */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        </TransitionChild>

        {/* 彈窗內容動畫 */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="bg-white rounded-[1.5rem] p-6 max-w-md w-full shadow-2xl">
              <DialogTitle className="text-lg font-medium mb-4">
                {title}
              </DialogTitle>
              
              {children}
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
```

---

## ✅ 遷移檢查清單

每個組件遷移時需要確認：

- [ ] 導入 Headless UI 組件
- [ ] 替換 `createPortal` 為 `Dialog`
- [ ] 移除手動的 `stopPropagation` 處理
- [ ] 使用 `DialogPanel` 包裹內容
- [ ] 使用 `DialogTitle` 設置標題（無障礙）
- [ ] 測試 ESC 鍵關閉功能
- [ ] 測試背景點擊關閉功能
- [ ] 測試焦點陷阱（Tab 鍵循環）
- [ ] 測試背景滾動鎖定
- [ ] 檢查 TypeScript 類型錯誤
- [ ] 視覺回歸測試（確保樣式一致）

---

## 🚀 下一步行動

1. **立即執行**: 遷移第一批 3 個高優先級組件（1.5 小時）
2. **本週完成**: 遷移第二批 3 個中優先級組件（2 小時）
3. **持續優化**: 為已遷移的組件添加動畫效果
4. **文檔更新**: 更新組件使用文檔，統一團隊開發規範

---

## 📚 參考資源

- [Headless UI Dialog 官方文檔](https://headlessui.com/react/dialog)
- [Headless UI Transition 官方文檔](https://headlessui.com/react/transition)
- [無障礙對話框最佳實踐](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

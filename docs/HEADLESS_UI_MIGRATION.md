# Headless UI 遷移說明

## 📅 更新時間
2026-02-10

## 🎯 更新目標

將互動設定精靈的彈窗從自定義實作遷移到 Headless UI，以獲得：
- ✅ 更好的無障礙支持（ARIA 屬性自動處理）
- ✅ 更好的鍵盤導航（ESC 關閉、Tab 焦點管理）
- ✅ 更流暢的動畫過渡效果
- ✅ 更好的焦點陷阱（Focus Trap）
- ✅ 更好的滾動鎖定（Scroll Lock）

## 🔄 主要變更

### 1. 引入 Headless UI 組件

```typescript
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
```

### 2. 使用 Dialog 組件

**之前（自定義實作）：**
```tsx
if (!isOpen) return null;

return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="bg-white rounded-[2rem] w-full max-w-lg">
      {/* 內容 */}
    </div>
  </div>
);
```

**之後（Headless UI）：**
```tsx
return (
  <Transition appear show={isOpen} as={Fragment}>
    <Dialog as="div" className="relative z-50" onClose={onClose}>
      {/* 背景遮罩 */}
      <Transition.Child
        as={Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-black/50" />
      </Transition.Child>

      {/* 對話框容器 */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-[2rem] bg-white shadow-xl transition-all">
              {/* 內容 */}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </div>
    </Dialog>
  </Transition>
);
```

## ✨ 獲得的功能

### 1. 無障礙支持（Accessibility）

Headless UI 自動處理：
- `role="dialog"` 屬性
- `aria-modal="true"` 屬性
- `aria-labelledby` 和 `aria-describedby` 關聯
- 焦點管理和焦點陷阱

### 2. 鍵盤導航

自動支援：
- **ESC** 鍵關閉對話框
- **Tab** 鍵在對話框內循環焦點
- 開啟時自動聚焦第一個可聚焦元素
- 關閉時恢復到觸發元素

### 3. 滾動鎖定

對話框開啟時：
- 自動鎖定背景滾動
- 防止滾動穿透
- 關閉時恢復滾動

### 4. 動畫過渡

使用 `Transition` 組件：
- 背景遮罩淡入淡出（opacity）
- 對話框縮放進入（scale）
- 流暢的進入/離開動畫

## 🎨 動畫配置

### 背景遮罩動畫
```tsx
enter="ease-out duration-300"
enterFrom="opacity-0"
enterTo="opacity-100"
leave="ease-in duration-200"
leaveFrom="opacity-100"
leaveTo="opacity-0"
```

### 對話框動畫
```tsx
enter="ease-out duration-300"
enterFrom="opacity-0 scale-95"
enterTo="opacity-100 scale-100"
leave="ease-in duration-200"
leaveFrom="opacity-100 scale-100"
leaveTo="opacity-0 scale-95"
```

## 📁 修改的檔案

- `components/settings/InteractionSetupWizard.tsx`
  - 引入 `Dialog` 和 `Transition` 組件
  - 移除 `if (!isOpen) return null` 檢查
  - 使用 `Dialog.Panel` 包裹內容
  - 添加 `Transition.Child` 處理動畫

## 🔍 技術細節

### Fragment 的使用

使用 `Fragment` 作為 `Transition` 的容器：
```tsx
<Transition appear show={isOpen} as={Fragment}>
```

這樣可以避免在 DOM 中添加額外的包裹元素。

### Dialog.Panel

`Dialog.Panel` 是對話框的主要內容容器：
- 自動處理點擊外部關閉
- 自動處理 ESC 鍵關閉
- 自動管理焦點

### onClose 回調

```tsx
<Dialog as="div" className="relative z-50" onClose={onClose}>
```

當使用者：
- 點擊背景遮罩
- 按下 ESC 鍵

時，會自動調用 `onClose` 回調。

## ✅ 測試檢查清單

- [x] TypeScript 編譯無錯誤
- [x] 對話框正常開啟/關閉
- [ ] ESC 鍵可以關閉對話框
- [ ] 點擊背景可以關閉對話框
- [ ] Tab 鍵焦點在對話框內循環
- [ ] 開啟時背景滾動被鎖定
- [ ] 動畫過渡流暢
- [ ] 關閉後焦點恢復到觸發按鈕

## 📚 參考資源

- [Headless UI Dialog 文檔](https://headlessui.com/react/dialog)
- [Headless UI Transition 文檔](https://headlessui.com/react/transition)
- [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

## 💡 最佳實踐

### 1. 使用 Fragment 避免額外 DOM 節點

```tsx
<Transition.Child as={Fragment}>
  <div className="...">
    {/* 內容 */}
  </div>
</Transition.Child>
```

### 2. 分離背景和內容的動畫

背景和對話框使用不同的 `Transition.Child`，可以實現獨立的動畫效果。

### 3. 使用 appear 屬性

```tsx
<Transition appear show={isOpen} as={Fragment}>
```

`appear` 屬性確保首次渲染時也會播放進入動畫。

### 4. 合理的 z-index

```tsx
<Dialog as="div" className="relative z-50">
```

確保對話框在其他元素之上。

## 🚀 未來優化

### 可能的改進
1. 添加 `Dialog.Title` 和 `Dialog.Description` 提升無障礙性
2. 使用 `Dialog.Overlay` 替代手動背景遮罩
3. 添加自定義動畫變體
4. 支援多層對話框堆疊

### 其他組件遷移
考慮將其他彈窗/對話框也遷移到 Headless UI：
- 確認對話框
- 表單對話框
- 圖片預覽對話框

## 📝 總結

這次遷移到 Headless UI 帶來了：
- ✅ 更好的使用者體驗（鍵盤導航、焦點管理）
- ✅ 更好的無障礙支持（ARIA 屬性）
- ✅ 更少的自定義代碼（減少維護成本）
- ✅ 更流暢的動畫效果
- ✅ 更好的瀏覽器兼容性

同時保持了原有的視覺設計和使用者流程不變。

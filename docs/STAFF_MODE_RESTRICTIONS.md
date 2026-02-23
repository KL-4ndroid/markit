# 員工模式權限限制實作文檔

## 概述

本文檔記錄了員工模式下的所有權限限制和 UI 調整，確保員工只能看到和操作被授權的內容。

## 實作日期

2026-02-22

## 修改內容

### 1. 市集卡片 (`components/markets/MarketCard.tsx`)

#### 隱藏的敏感數據
- **收入與淨利潤區塊**：員工模式下完全隱藏整個區塊
- **攤位成本**：員工模式下隱藏，只顯示成交次數

#### 修改前
```tsx
// 收入和利潤都顯示，利潤用鎖圖標遮罩
{variant !== 'upcoming' && (
  <div className="grid grid-cols-2 gap-3 mb-3">
    <div>收入</div>
    <div>利潤（鎖圖標）</div>
  </div>
)}
```

#### 修改後
```tsx
// 員工模式下完全不顯示收入和利潤
{variant !== 'upcoming' && !isStaff && (
  <div className="grid grid-cols-2 gap-3 mb-3">
    <div>收入</div>
    <div>利潤</div>
  </div>
)}

// 成本區塊調整為單列或雙列
<div className={`grid ${isStaff ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-3`}>
  <div>成交次數</div>
  {!isStaff && <div>攤位成本</div>}
</div>
```

### 2. 市集詳情頁面 (`app/markets/[id]/page.tsx`)

#### 隱藏的功能
- **編輯按鈕**：員工模式下完全隱藏
- **成本明細區塊**：員工模式下完全隱藏（包含攤位費、設備租賃、抽成等）

#### 修改內容
```tsx
// 1. 添加權限檢查
import { useUserRole } from '@/hooks/useUserRole';

export default function MarketDetailPage({ params }: PageProps) {
  const { isStaff, canViewSensitiveData } = useUserRole();
  
  // 2. 隱藏編輯按鈕
  {!isStaff && (
    <button onClick={handleOpenEditForm}>
      <Edit className="w-4 h-4" />
      編輯
    </button>
  )}
  
  // 3. 隱藏成本明細
  {!isStaff && (
    <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
      <h2>成本明細</h2>
      {/* 攤位費、設備租賃、抽成等 */}
    </div>
  )}
}
```

### 3. 商品卡片 (`components/products/ProductCard.tsx`)

#### 禁用的功能
- **編輯功能**：員工模式下點擊卡片不會觸發編輯
- **視覺反饋**：移除 hover 效果，改為 `cursor-default`

#### 修改內容
```tsx
// 1. 點擊處理
const handleClick = () => {
  // 員工模式下不允許編輯
  if (isStaff(product)) {
    return;
  }
  
  if (onEdit) {
    onEdit(product);
  } else {
    router.push(`/products/${product.id}`);
  }
};

// 2. 樣式調整
<div
  onClick={handleClick}
  className={`bg-white rounded-[1.5rem] overflow-hidden shadow-md shadow-[#7B9FA6]/5 ${
    isStaff(product) ? 'cursor-default' : 'cursor-pointer hover:shadow-lg'
  } transition-shadow`}
>
```

### 4. 底部導航欄 (`components/BottomNavigation.tsx`)

#### 禁用的功能
- **分析功能**：員工模式下點擊顯示 Toast 提示「此功能僅供老闆使用」

#### 修改內容
```tsx
// 1. 添加權限檢查
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

export function BottomNavigation() {
  const { isStaff } = useUserRole();
  
  // 2. 處理點擊事件
  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    // 員工模式下禁用分析功能
    if (isStaff && item.id === 'analytics') {
      e.preventDefault();
      toast.error('此功能僅供老闆使用', {
        description: '員工無權限查看數據分析',
        duration: 2000,
      });
      return;
    }
    
    setNavigation(currentIndex, item.index);
  };
  
  // 3. 視覺反饋
  const isDisabled = isStaff && item.id === 'analytics';
  
  <Link
    className={`flex flex-col items-center gap-1 min-w-[60px] transition-all hardware-accelerated ${
      isDisabled ? 'opacity-50 cursor-not-allowed' : ''
    }`}
  >
```

### 5. 首頁 (`app/page.tsx`)

#### 已實作的員工模式 UI
- 紫色 Header 漸變
- 員工身份標籤
- 老闆資訊卡片
- 總收入遮罩（敏感數據遮罩組件）

這些功能在之前的實作中已完成，本次修改主要針對市集和商品的權限控制。

## 權限控制總結

### 員工模式下隱藏的內容

| 位置 | 隱藏內容 | 原因 |
|------|---------|------|
| 市集卡片 | 收入、淨利潤、攤位成本 | 敏感財務數據 |
| 市集詳情 | 編輯按鈕、成本明細區塊 | 防止修改和查看成本 |
| 商品卡片 | 編輯功能（點擊無效） | 防止修改商品資訊 |
| 底部導航 | 分析功能（點擊提示） | 數據分析僅供老闆 |

### 員工模式下可見的內容

| 位置 | 可見內容 | 說明 |
|------|---------|------|
| 市集卡片 | 市集名稱、日期、地點、成交次數、租賃設備 | 基本資訊和營運數據 |
| 市集詳情 | 市集資訊、今日時間軸、營業狀態 | 營運相關資訊 |
| 商品卡片 | 商品名稱、價格、庫存、已售數量 | 基本商品資訊 |
| 首頁 | 市集場次、成交數、市集列表 | 營運概覽 |

## 技術實作細節

### 1. 權限檢查 Hook

使用 `useUserRole` hook 進行全局角色檢查：

```tsx
const { isStaff, canViewSensitiveData } = useUserRole();

// isStaff: boolean - 是否為員工
// canViewSensitiveData: boolean - 是否可查看敏感數據（老闆專屬）
```

### 2. 商品權限檢查 Hook

使用 `useStaffPermissions` hook 進行項目級權限檢查：

```tsx
const { isStaff, canViewSensitiveData } = useStaffPermissions();

// isStaff(product): boolean - 檢查商品是否為員工權限
// canViewSensitiveData(product): boolean - 檢查是否可查看敏感數據
```

### 3. 條件渲染模式

```tsx
// 模式 1: 完全隱藏
{!isStaff && <SensitiveComponent />}

// 模式 2: 禁用交互
<div 
  onClick={isStaff ? undefined : handleClick}
  className={isStaff ? 'cursor-default' : 'cursor-pointer'}
>

// 模式 3: 顯示提示
if (isStaff) {
  toast.error('此功能僅供老闆使用');
  return;
}
```

## 測試檢查清單

- [x] 員工登入後，市集卡片不顯示收入和利潤
- [x] 員工登入後，市集卡片不顯示攤位成本
- [x] 員工登入後，市集詳情頁面不顯示編輯按鈕
- [x] 員工登入後，市集詳情頁面不顯示成本明細區塊
- [x] 員工登入後，商品卡片點擊無法編輯
- [x] 員工登入後，商品卡片無 hover 效果
- [x] 員工登入後，點擊分析功能顯示 Toast 提示
- [x] 員工登入後，分析按鈕顯示為禁用狀態（半透明）
- [x] 老闆登入後，所有功能正常顯示和使用

## 相關文檔

- [員工模式 UI 實作文檔](./STAFF_UI_IMPLEMENTATION.md)
- [員工模式 UI 閃爍問題修復](./FIX_STAFF_UI_FLICKER.md)
- [時間軸數據丟失問題修復](./BUG_FIX_TIMELINE_DATA_LOSS.md)

## 注意事項

1. **向後兼容**：所有權限檢查都包含向後兼容邏輯，沒有 `access_type` 欄位的舊數據會被視為老闆權限
2. **緩存機制**：角色狀態使用 localStorage 緩存，避免頁面切換時的 UI 閃爍
3. **用戶體驗**：禁用的功能會顯示視覺反饋（半透明、無 hover 效果）和 Toast 提示
4. **安全性**：前端隱藏只是第一層防護，後端 API 也需要實作相應的權限檢查

## 未來改進

1. 考慮添加更細粒度的權限控制（如：可查看但不可編輯）
2. 添加權限變更的即時通知機制
3. 實作權限審計日誌
4. 添加權限管理界面（老闆可調整員工權限）

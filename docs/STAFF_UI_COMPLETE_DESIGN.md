# 員工模式完整 UI 設計實作文檔

## 概述

本文檔記錄了員工模式的完整 UI 設計系統，包括配色方案、頁面設計和組件實作。員工模式使用紫色主題，與老闆模式的青綠色主題形成區分。

## 實作日期

2026-02-22

## 設計理念

### 配色方案

#### 老闆模式（青綠色系）
- 主色：`#7B9FA6`（霧藍色）
- 次色：`#D4A574`（金棕色）
- 淺色：`#E8F3E8`（淺綠）
- 漸變：`from-[#7B9FA6] to-[#D4A574]`

#### 員工模式（紫色系）
- 主色：`#8B7BA6`（紫灰色）
- 次色：`#A6B4D4`（淺藍紫）
- 淺色：`#F0E8F3`（淺紫）
- 漸變：`from-[#8B7BA6] to-[#A6B4D4]`

### 設計原則

1. **視覺區分**：員工模式使用紫色主題，一眼就能識別當前角色
2. **功能簡化**：隱藏員工不需要的功能（編輯、刪除、成本等）
3. **資訊透明**：顯示員工需要的基本資訊（時間、地點、成交數）
4. **一致性**：所有頁面使用統一的紫色主題和設計語言

## 頁面實作

### 1. 首頁 (`app/page.tsx`)

#### 已實作功能
- ✅ 紫色 Header 漸變背景
- ✅ 員工身份標籤（StaffBadge）
- ✅ 老闆資訊卡片（OwnerInfoCard）
- ✅ 總收入敏感數據遮罩（SensitiveDataMask）
- ✅ 市集卡片紫色邊框和陰影

#### 視覺效果
```tsx
// Header 漸變
<div className={`${getGradientClass(isStaff)} pt-12 pb-8 px-6 rounded-b-[2rem]`}>

// 員工標籤
{isStaff && <StaffBadge />}

// 老闆資訊
{isStaff && userRole.ownerEmail && (
  <OwnerInfoCard ownerEmail={userRole.ownerEmail} />
)}

// 收入遮罩
{isStaff ? (
  <SensitiveDataMask label="僅老闆可見" size="sm" />
) : (
  <div>{formatCurrency(monthlyStats?.totalRevenue ?? 0)}</div>
)}
```

### 2. 市集列表頁面 (`app/markets/page.tsx`)

#### 實作內容
- ✅ 紫色 Header 漸變
- ✅ 標題改為「市集列表」（老闆：「我的市集」）
- ✅ 隱藏新增按鈕
- ✅ Tabs 使用紫色主題
- ✅ 空狀態使用紫色圖標和文字

#### 代碼示例
```tsx
// Header
<div className={`${getGradientClass(isStaff)} pt-12 pb-8 px-6 rounded-b-[2rem]`}>
  <h1>{isStaff ? '市集列表' : '我的市集'}</h1>
  {!isStaff && <button>新增</button>}
</div>

// Tabs
<div className={`bg-white rounded-[1.5rem] p-2 shadow-lg ${getShadowClass(isStaff)} mb-6`}>
  <button className={`${getPrimaryBgClass(isStaff)} text-white`}>
    全部
  </button>
</div>

// 空狀態
<Calendar className={`w-16 h-16 mx-auto mb-4 opacity-50 ${isStaff ? 'text-[#8B7BA6]' : 'text-[#7B9FA6]'}`} />
```

### 3. 商品列表頁面 (`app/products/page.tsx`)

#### 實作內容
- ✅ 紫色 Header 漸變
- ✅ 標題改為「商品列表」（老闆：「商品管理」）
- ✅ 隱藏新增按鈕
- ✅ 搜尋框使用紫色 focus ring
- ✅ Tabs 使用紫色主題
- ✅ 空狀態使用紫色圖標和文字

#### 代碼示例
```tsx
// Header
<div className={`${getGradientClass(isStaff)} pt-12 pb-8 px-6 rounded-b-[2rem]`}>
  <h1>{isStaff ? '商品列表' : '商品管理'}</h1>
  {!isStaff && <button>新增</button>}
</div>

// 搜尋框
<input
  className={`focus:ring-2 ${
    isStaff ? 'focus:ring-[#8B7BA6]/50' : 'focus:ring-[#7B9FA6]/50'
  }`}
/>
```

### 4. 市集詳情頁面 (`app/markets/[id]/page.tsx`)

#### 實作方式
創建專屬的員工視圖組件 `StaffMarketDetailView`，完全重新設計 UI。

#### 員工視圖特點
- ✅ 紫色 Header 漸變
- ✅ 簡化的營業狀態卡片
- ✅ 只顯示成交次數和總收入（不含利潤）
- ✅ 租賃設備資訊
- ✅ 員工模式提示卡片
- ✅ 移除所有編輯、刪除、管理功能

#### 隱藏的功能
- ❌ 編輯按鈕
- ❌ 報名狀態管理
- ❌ 成本明細
- ❌ 淨利潤統計
- ❌ 顧客行為分析
- ❌ 刪除/取消按鈕
- ❌ 快速交易功能
- ❌ 補登收入功能

#### 代碼結構
```tsx
export default function MarketDetailPage({ params }: PageProps) {
  const { isStaff } = useUserRole();
  
  // 員工模式：使用簡化視圖
  if (isStaff) {
    return <StaffMarketDetailView market={market} />;
  }
  
  // 老闆模式：使用完整功能視圖
  return (
    <div>
      {/* 完整的市集管理功能 */}
    </div>
  );
}
```

### 5. 市集卡片 (`components/markets/MarketCard.tsx`)

#### 實作內容
- ✅ 員工模式下完全隱藏收入和利潤區塊
- ✅ 員工模式下隱藏攤位成本
- ✅ 只顯示成交次數和租賃設備資訊

#### 代碼示例
```tsx
// 收入和利潤：員工模式完全隱藏
{variant !== 'upcoming' && !isStaff && (
  <div className="grid grid-cols-2 gap-3 mb-3">
    <div>收入</div>
    <div>利潤</div>
  </div>
)}

// 成交和成本：員工模式只顯示成交
<div className={`grid ${isStaff ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-3`}>
  <div>成交次數</div>
  {!isStaff && <div>攤位成本</div>}
</div>
```

### 6. 商品卡片 (`components/products/ProductCard.tsx`)

#### 實作內容
- ✅ 員工模式下禁用編輯功能（點擊無效）
- ✅ 移除 hover 效果
- ✅ 改為 `cursor-default`

#### 代碼示例
```tsx
const handleClick = () => {
  // 員工模式下不允許編輯
  if (isStaff(product)) {
    return;
  }
  
  if (onEdit) {
    onEdit(product);
  }
};

<div
  onClick={handleClick}
  className={`bg-white rounded-[1.5rem] ${
    isStaff(product) ? 'cursor-default' : 'cursor-pointer hover:shadow-lg'
  }`}
>
```

### 7. 底部導航欄 (`components/BottomNavigation.tsx`)

#### 實作內容
- ✅ 分析功能禁用（員工點擊顯示 Toast 提示）
- ✅ 分析按鈕半透明顯示
- ✅ Toast 提示：「此功能僅供老闆使用」

#### 代碼示例
```tsx
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

const isDisabled = isStaff && item.id === 'analytics';

<Link
  className={`${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
>
```

## 主題配置系統 (`lib/theme-config.ts`)

### 工具函數

```tsx
// 獲取漸變背景
getGradientClass(isStaff: boolean): string
// 老闆：'bg-gradient-to-br from-[#7B9FA6] to-[#D4A574]'
// 員工：'bg-gradient-to-br from-[#8B7BA6] to-[#A6B4D4]'

// 獲取主色調
getPrimaryClass(isStaff: boolean): string
// 老闆：'text-[#7B9FA6]'
// 員工：'text-[#8B7BA6]'

// 獲取主色背景
getPrimaryBgClass(isStaff: boolean): string
// 老闆：'bg-[#7B9FA6]'
// 員工：'bg-[#8B7BA6]'

// 獲取淺色背景
getLightBgClass(isStaff: boolean): string
// 老闆：'bg-[#E8F3E8]'
// 員工：'bg-[#F0E8F3]'

// 獲取陰影
getShadowClass(isStaff: boolean): string
// 老闆：'shadow-[#7B9FA6]/10'
// 員工：'shadow-[#8B7BA6]/10'

// 獲取邊框
getBorderClass(isStaff: boolean): string
// 老闆：'border-[#7B9FA6]/20'
// 員工：'border-[#8B7BA6]/20'
```

## 員工專屬組件

### 1. StaffBadge（員工標籤）
```tsx
<div className="bg-[#F0E8F3] border border-[#8B7BA6]/20 rounded-full px-3 py-1.5">
  <Shield className="w-4 h-4 text-[#8B7BA6]" />
  <span>員工模式</span>
</div>
```

### 2. OwnerInfoCard（老闆資訊卡片）
```tsx
<div className="bg-white rounded-[1.5rem] p-4 shadow-md shadow-[#8B7BA6]/10">
  <UserCircle className="w-5 h-5 text-[#8B7BA6]" />
  <span>老闆：{ownerEmail}</span>
</div>
```

### 3. SensitiveDataMask（敏感數據遮罩）
```tsx
<div className="bg-[#F0E8F3] rounded-xl p-3">
  <Lock className="w-5 h-5 text-[#8B7BA6]" />
  <span>{label}</span>
</div>
```

### 4. StaffMarketDetailView（員工市集詳情視圖）
完整的簡化版市集詳情頁面，只顯示員工需要的資訊。

## 視覺對比

### Header 對比

| 角色 | 漸變色 | 標題 | 操作按鈕 |
|------|--------|------|---------|
| 老闆 | 青綠 → 金棕 | 我的市集 / 商品管理 | 顯示新增按鈕 |
| 員工 | 紫灰 → 淺藍紫 | 市集列表 / 商品列表 | 隱藏新增按鈕 |

### 卡片對比

| 角色 | 陰影色 | 主色調 | 顯示內容 |
|------|--------|--------|---------|
| 老闆 | 青綠 10% | #7B9FA6 | 完整數據（收入、利潤、成本） |
| 員工 | 紫灰 10% | #8B7BA6 | 基本數據（成交數、時間） |

### 按鈕對比

| 角色 | 背景色 | Hover 效果 | 功能 |
|------|--------|-----------|------|
| 老闆 | #7B9FA6 | #6A8E95 | 完整功能 |
| 員工 | #8B7BA6 | opacity-90 | 受限功能 |

## 權限控制總結

### 完全隱藏的功能

| 功能 | 位置 | 原因 |
|------|------|------|
| 新增市集 | 市集列表 | 員工無權創建 |
| 新增商品 | 商品列表 | 員工無權創建 |
| 編輯按鈕 | 市集詳情、商品卡片 | 員工無權修改 |
| 刪除功能 | 市集詳情 | 員工無權刪除 |
| 成本明細 | 市集詳情 | 敏感財務數據 |
| 報名狀態管理 | 市集詳情 | 員工無權管理 |
| 顧客行為分析 | 市集詳情 | 高級分析功能 |
| 分析頁面 | 導航欄 | 數據分析僅供老闆 |

### 部分隱藏的數據

| 數據 | 位置 | 顯示方式 |
|------|------|---------|
| 收入 | 首頁、市集卡片 | 遮罩顯示 |
| 利潤 | 市集卡片、詳情 | 完全隱藏 |
| 成本 | 市集詳情 | 完全隱藏 |
| 攤位費用 | 市集卡片 | 完全隱藏 |

### 可見的內容

| 內容 | 位置 | 說明 |
|------|------|------|
| 市集基本資訊 | 所有頁面 | 名稱、日期、地點 |
| 營業時間 | 市集詳情 | 時間軸資訊 |
| 成交次數 | 市集卡片、詳情 | 營運數據 |
| 租賃設備 | 市集卡片、詳情 | 設備資訊 |
| 商品資訊 | 商品列表 | 名稱、價格、庫存 |

## 技術實作細節

### 1. 角色檢查

```tsx
import { useUserRole } from '@/hooks/useUserRole';

const { isStaff, canViewSensitiveData } = useUserRole();
```

### 2. 條件渲染模式

```tsx
// 模式 1: 完全隱藏
{!isStaff && <SensitiveComponent />}

// 模式 2: 替換組件
{isStaff ? <StaffView /> : <OwnerView />}

// 模式 3: 條件樣式
<div className={isStaff ? 'purple-theme' : 'green-theme'}>
```

### 3. 主題切換

```tsx
import { getGradientClass, getShadowClass, getPrimaryBgClass } from '@/lib/theme-config';

<div className={`${getGradientClass(isStaff)} pt-12 pb-8`}>
<div className={`bg-white shadow-lg ${getShadowClass(isStaff)}`}>
<button className={`${getPrimaryBgClass(isStaff)} text-white`}>
```

## 測試檢查清單

### 視覺測試
- [x] 員工登入後，所有頁面使用紫色主題
- [x] Header 漸變正確顯示（紫灰 → 淺藍紫）
- [x] 卡片陰影使用紫色（shadow-[#8B7BA6]/10）
- [x] 按鈕使用紫色背景（bg-[#8B7BA6]）
- [x] 空狀態圖標使用紫色（text-[#8B7BA6]）

### 功能測試
- [x] 員工無法看到新增按鈕
- [x] 員工無法編輯市集和商品
- [x] 員工無法查看成本明細
- [x] 員工無法訪問分析頁面
- [x] 員工看到簡化的市集詳情頁面

### 數據測試
- [x] 員工無法看到收入和利潤（首頁、卡片）
- [x] 員工無法看到攤位成本
- [x] 員工可以看到成交次數
- [x] 員工可以看到租賃設備資訊

### 交互測試
- [x] 點擊商品卡片無反應（員工模式）
- [x] 點擊分析按鈕顯示 Toast 提示
- [x] 頁面切換時主題正確切換
- [x] 無 UI 閃爍問題

## 相關文檔

- [員工模式權限限制](./STAFF_MODE_RESTRICTIONS.md)
- [員工模式 UI 閃爍問題修復](./FIX_STAFF_UI_FLICKER.md)
- [時間軸數據丟失問題修復](./BUG_FIX_TIMELINE_DATA_LOSS.md)

## 未來改進

1. **更多頁面支援**：設置頁面、分析頁面的員工視圖
2. **動畫效果**：主題切換時的平滑過渡動畫
3. **深色模式**：員工模式的深色主題變體
4. **自訂主題**：允許老闆自訂員工模式的配色
5. **權限細化**：更細粒度的權限控制（如：可查看但不可編輯）

## 總結

員工模式的完整 UI 設計系統已實作完成，包括：

1. **統一的紫色主題**：所有頁面使用一致的紫色配色方案
2. **簡化的功能**：移除員工不需要的編輯、刪除、管理功能
3. **專屬的視圖**：市集詳情頁面使用完全重新設計的員工視圖
4. **清晰的視覺區分**：一眼就能識別當前是員工模式還是老闆模式
5. **完整的權限控制**：前端隱藏敏感數據和功能

整個系統設計簡潔、一致、易用，為員工提供了專屬的使用體驗！🎉

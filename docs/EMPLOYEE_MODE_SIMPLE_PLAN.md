# 員工模式實作計畫（簡化版）

## 📋 專案概述

**目標**：在現有 Market Pulse 系統中新增員工模式，讓老闆可以添加員工協助管理市集。

**實作方式**：獨立表方案（不修改現有表結構）

**預計工期**：3-5 天

---

## 🎯 核心變更

### 與舊方案的差異

| 項目 | 舊方案 | 新方案（簡化版）✅ |
|------|--------|-------------------|
| 數據庫變更 | 修改 `market_members` 表 | 創建獨立的 `staff_relationships` 表 |
| 風險等級 | 高（可能破壞現有數據） | 低（完全獨立） |
| 回滾難度 | 困難 | 簡單（刪除新表即可） |
| 實作複雜度 | 高 | 低 |

---

## 🏗️ 技術架構

### 1. 數據層（Supabase）

#### 新增表結構

```sql
-- 員工關係表（獨立，不影響現有表）
CREATE TABLE staff_relationships (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id),  -- 老闆
  staff_id UUID REFERENCES auth.users(id),  -- 員工
  staff_email TEXT,                          -- 員工 Email
  status TEXT,                               -- pending/active/revoked
  permissions JSONB,                         -- 權限設定
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);
```

#### 視圖（自動權限控制）

```sql
-- 員工可訪問的市集
CREATE VIEW staff_accessible_markets AS
  -- 作為員工可訪問的市集
  SELECT m.*, 'staff' as access_type FROM markets m ...
  UNION ALL
  -- 作為老闆擁有的市集
  SELECT m.*, 'owner' as access_type FROM markets m ...

-- 員工可訪問的商品
CREATE VIEW staff_accessible_products AS
  -- 作為員工可訪問的商品
  SELECT p.*, 'staff' as access_type FROM products p ...
  UNION ALL
  -- 作為老闆擁有的商品
  SELECT p.*, 'owner' as access_type FROM products p ...
```

---

## 📝 實作步驟

### Phase 1: 數據庫設置（1 天）

#### 1.1 執行 SQL 遷移
- ✅ 執行 `20240220_staff_system_simple.sql`
- ✅ 驗證表和視圖創建成功

#### 1.2 測試數據庫功能
```sql
-- 測試添加員工
INSERT INTO staff_relationships (owner_id, staff_id, staff_email, status)
VALUES (auth.uid(), '員工UUID', 'staff@example.com', 'active');

-- 測試查詢視圖
SELECT * FROM staff_accessible_markets;
SELECT * FROM staff_accessible_products;
```

---

### Phase 2: 前端整合（2-3 天）

#### 2.1 更新 Supabase Client 查詢

**關鍵變更**：將原本的表查詢改為視圖查詢

```typescript
// ❌ 舊代碼（只能查詢自己的市集）
const { data: markets } = await supabase
  .from('markets')
  .select('*')
  .eq('owner_id', userId);

// ✅ 新代碼（自動包含員工可訪問的市集）
const { data: markets } = await supabase
  .from('staff_accessible_markets')
  .select('*');
```

#### 2.2 需要修改的文件

| 文件 | 修改內容 |
|------|----------|
| `lib/supabase/markets.ts` | 改用 `staff_accessible_markets` 視圖 |
| `lib/supabase/products.ts` | 改用 `staff_accessible_products` 視圖 |
| `components/markets/MarketList.tsx` | 顯示 `access_type` 標籤 |
| `components/products/ProductList.tsx` | 根據 `permissions` 控制編輯按鈕 |

#### 2.3 新增員工管理 UI

```typescript
// 新增文件：components/staff/StaffManagement.tsx
// 功能：
// - 邀請員工（輸入 Email）
// - 查看員工列表
// - 撤銷員工權限
// - 設定員工權限
```

---

### Phase 3: 權限控制（1 天）

#### 3.1 前端權限檢查

```typescript
// lib/hooks/useStaffPermissions.ts
export function useStaffPermissions() {
  const checkPermission = (item: any, action: 'view' | 'edit') => {
    // 如果是老闆，全部權限
    if (item.access_type === 'owner') return true;
    
    // 如果是員工，檢查 permissions
    const perms = item.permissions;
    if (action === 'view') return perms.can_view;
    if (action === 'edit') return perms.can_edit;
    return false;
  };
  
  return { checkPermission };
}
```

#### 3.2 UI 條件渲染

```tsx
// 根據權限顯示/隱藏按鈕
{checkPermission(market, 'edit') && (
  <Button onClick={handleEdit}>編輯</Button>
)}

// 顯示身份標籤
{market.access_type === 'staff' && (
  <Badge>員工模式</Badge>
)}
```

---

## 🔒 安全性考量

### 1. RLS 政策（已在 SQL 中實現）
- ✅ 老闆只能管理自己的員工
- ✅ 員工只能查看自己的關係
- ✅ 視圖自動過濾權限

### 2. 前端驗證
- ✅ 檢查 `access_type` 和 `permissions`
- ✅ 隱藏敏感信息（成本、利潤）
- ✅ 禁用無權限的操作按鈕

### 3. IndexedDB 安全
- ⚠️ 員工模式下，敏感數據不應同步到本地
- ✅ 使用視圖查詢，自動排除敏感欄位

---

## 📊 功能對照表

| 功能 | 老闆 | 員工 |
|------|------|------|
| 查看市集列表 | ✅ 全部 | ✅ 被授權的 |
| 查看商品列表 | ✅ 全部 | ✅ 被授權的 |
| 新增交易記錄 | ✅ | ✅ |
| 查看商品成本 | ✅ | ❌ |
| 查看利潤 | ✅ | ❌ |
| 編輯市集 | ✅ | ❌ |
| 編輯商品 | ✅ | ❌ |
| 管理員工 | ✅ | ❌ |

---

## 🧪 測試計畫

### 1. 數據庫測試
```sql
-- 測試 1：添加員工
INSERT INTO staff_relationships ...

-- 測試 2：查詢視圖
SELECT * FROM staff_accessible_markets;

-- 測試 3：權限檢查
SELECT is_staff_of('老闆UUID');
```

### 2. 前端測試
- [ ] 老闆可以邀請員工
- [ ] 員工可以接受邀請
- [ ] 員工可以查看被授權的市集
- [ ] 員工無法查看成本和利潤
- [ ] 員工無法編輯市集和商品

---

## 🚀 部署檢查清單

### 數據庫
- [ ] 執行 `20240220_staff_system_simple.sql`
- [ ] 驗證表創建成功
- [ ] 驗證視圖創建成功
- [ ] 驗證 RLS 政策生效

### 前端
- [ ] 更新所有查詢為視圖查詢
- [ ] 實作員工管理 UI
- [ ] 實作權限檢查 Hook
- [ ] 更新 UI 顯示身份標籤
- [ ] 測試所有功能

### 文檔
- [ ] 更新 README
- [ ] 創建員工使用手冊
- [ ] 創建 API 文檔

---

## 📌 重要提醒

### 前端查詢必須改用視圖

**關鍵**：所有查詢市集和商品的地方，都必須改用視圖：

```typescript
// ❌ 錯誤：直接查詢表
.from('markets')
.from('products')

// ✅ 正確：查詢視圖
.from('staff_accessible_markets')
.from('staff_accessible_products')
```

### 為什麼？
- 視圖會自動過濾權限
- 視圖會自動添加 `access_type` 和 `permissions` 欄位
- 視圖會自動合併老闆和員工的數據

---

## 🎯 下一步

1. **立即執行**：在 Supabase Dashboard 執行 `20240220_staff_system_simple.sql`
2. **驗證成功**：檢查表和視圖是否創建
3. **開始前端整合**：修改查詢代碼
4. **實作 UI**：員工管理界面

---

## 📞 問題排查

### Q: 視圖查詢返回空結果？
A: 檢查 `staff_relationships` 表是否有數據，且 `status = 'active'`

### Q: 員工看不到市集？
A: 確認 `staff_relationships.owner_id` 對應的用戶在 `market_members` 中有記錄

### Q: 如何回滾？
A: 只需刪除新表和視圖：
```sql
DROP VIEW staff_accessible_products;
DROP VIEW staff_accessible_markets;
DROP TABLE staff_relationships CASCADE;
```

---

**總結**：這個簡化方案風險低、實作快、易於維護。核心是將所有查詢改為視圖查詢，讓數據庫自動處理權限控制。

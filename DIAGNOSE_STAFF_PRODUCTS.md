## 🔍 員工商品同步問題診斷指南

### 📋 診斷步驟

---

## 步驟 1：在 Supabase SQL Editor 執行診斷

### 1.1 確認當前用戶身份

```sql
-- 以員工身份登入後執行
SELECT 
  auth.uid() as my_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as my_email;
```

**預期結果**：顯示員工的 ID 和 Email

---

### 1.2 檢查員工關係

```sql
-- 檢查員工關係是否存在
SELECT 
  id,
  owner_id,
  (SELECT email FROM auth.users WHERE id = owner_id) as owner_email,
  staff_id,
  staff_email,
  status,
  permissions,
  created_at
FROM staff_relationships
WHERE staff_id = auth.uid()
ORDER BY created_at DESC;
```

**預期結果**：
- 應該看到至少 1 條記錄
- `status` 應該是 `'active'`
- `owner_id` 是老闆的 ID

**如果沒有結果** → 員工關係沒有建立，需要重新邀請

---

### 1.3 檢查老闆的商品

```sql
-- 檢查老闆是否有商品
SELECT 
  p.id,
  p.name,
  p.owner_id,
  (SELECT email FROM auth.users WHERE id = p.owner_id) as owner_email,
  p.is_active,
  p.created_at
FROM products p
WHERE p.owner_id IN (
  SELECT owner_id 
  FROM staff_relationships 
  WHERE staff_id = auth.uid() 
  AND status = 'active'
)
AND p.is_active = TRUE
ORDER BY p.created_at DESC;
```

**預期結果**：
- 應該看到老闆創建的商品
- `owner_id` 是老闆的 ID
- `is_active` 是 `TRUE`

**如果沒有結果** → 可能的原因：
1. 老闆沒有創建商品
2. 商品的 `owner_id` 是 NULL
3. 商品的 `is_active` 是 FALSE

---

### 1.4 檢查視圖是否正常

```sql
-- 檢查視圖定義
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname = 'staff_accessible_products';
```

**預期結果**：應該看到視圖的定義

**如果沒有結果** → 視圖沒有創建，需要執行 Migration 029

---

### 1.5 測試視圖查詢

```sql
-- 以員工身份查詢視圖
SELECT 
  id,
  name,
  owner_id,
  relationship_owner_id,
  access_type,
  permissions,
  is_active,
  created_at
FROM staff_accessible_products
ORDER BY created_at DESC;
```

**預期結果**：
- 員工應該看到 `access_type = 'staff'` 的商品
- `relationship_owner_id` 是老闆的 ID

**如果沒有結果** → 視圖邏輯有問題或數據不符合條件

---

### 1.6 手動測試 JOIN 邏輯

```sql
-- 手動執行視圖的 JOIN 邏輯
SELECT 
  p.id,
  p.name,
  p.owner_id,
  sr.staff_id,
  sr.owner_id as relationship_owner_id,
  sr.status,
  p.is_active
FROM products p
JOIN staff_relationships sr ON sr.owner_id = p.owner_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
AND p.is_active = TRUE
ORDER BY p.created_at DESC;
```

**預期結果**：應該看到老闆的商品

**如果沒有結果** → 檢查：
1. `staff_relationships` 中是否有記錄
2. `products.owner_id` 是否匹配 `staff_relationships.owner_id`
3. `products.is_active` 是否為 TRUE

---

### 1.7 檢查商品的 owner_id

```sql
-- 檢查所有商品的 owner_id 是否正確
SELECT 
  id,
  name,
  owner_id,
  CASE 
    WHEN owner_id IS NULL THEN '❌ owner_id 是 NULL'
    WHEN owner_id = auth.uid() THEN '✅ 是我的商品'
    ELSE '👤 是其他人的商品'
  END as ownership_status,
  is_active,
  created_at
FROM products
ORDER BY created_at DESC
LIMIT 20;
```

**預期結果**：
- 老闆的商品應該有正確的 `owner_id`
- 不應該有 `owner_id IS NULL` 的商品

**如果有 NULL** → 需要執行 Migration 014 更新 owner_id

---

## 步驟 2：檢查前端同步邏輯

### 2.1 打開瀏覽器開發者工具

1. 按 `F12` 打開開發者工具
2. 切換到 **Console** 標籤
3. 以員工身份登入
4. 啟用員工模式
5. 觀察控制台輸出

### 2.2 查找關鍵日誌

**應該看到的日誌**：

```
📊 員工模式已啟用，嘗試從視圖拉取數據...
📥 拉取到 X 個市集
📥 拉取到 Y 個商品  ← 重點：這裡應該 > 0
📥 拉取到 Z 個事件
📝 同步 Y 個商品到 IndexedDB...
✅ 商品同步完成
✅ 視圖數據同步完成
```

**如果看到**：

```
📥 拉取到 0 個商品  ← 問題：視圖沒有返回商品
```

→ 說明視圖查詢有問題，回到步驟 1.5 檢查

**如果看到**：

```
⚠️ 從視圖拉取失敗，降級到原邏輯
```

→ 說明視圖查詢出錯，檢查錯誤訊息

---

### 2.3 手動觸發同步

在瀏覽器控制台執行：

```javascript
// 手動觸發同步
window.dispatchEvent(new Event('trigger-sync'));

// 等待 5 秒後檢查 IndexedDB
setTimeout(async () => {
  const { db } = await import('/lib/db');
  const products = await db.products.toArray();
  console.log('📦 IndexedDB 中的商品數量:', products.length);
  console.log('📦 商品列表:', products);
}, 5000);
```

---

### 2.4 檢查 IndexedDB

1. 在開發者工具中切換到 **Application** 標籤
2. 展開 **IndexedDB** → **market-db** → **products**
3. 查看是否有商品數據

**如果沒有數據** → 同步邏輯有問題

---

## 步驟 3：常見問題排查

### 問題 1：視圖返回 0 個商品

**原因**：
- 員工關係沒有建立（`staff_relationships` 表沒有記錄）
- 商品的 `owner_id` 是 NULL
- 商品的 `is_active` 是 FALSE

**解決方案**：
1. 重新邀請員工
2. 執行 Migration 014 更新 `owner_id`
3. 檢查商品是否被刪除

---

### 問題 2：視圖查詢出錯

**原因**：
- 視圖沒有創建
- RLS 政策阻止查詢

**解決方案**：
1. 執行 Migration 029 創建視圖
2. 檢查 RLS 政策

---

### 問題 3：同步到 IndexedDB 失敗

**原因**：
- 數據格式不正確
- IndexedDB 寫入失敗

**解決方案**：
1. 檢查控制台錯誤訊息
2. 清除 IndexedDB 重新同步

---

## 步驟 4：快速診斷（一鍵檢查）

在 Supabase SQL Editor 執行：

```sql
-- 一鍵診斷
SELECT 
  '1. 當前用戶' as check_item,
  auth.uid()::text as value,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as detail
UNION ALL
SELECT 
  '2. 員工關係數量',
  COUNT(*)::text,
  STRING_AGG(status, ', ')
FROM staff_relationships
WHERE staff_id = auth.uid()
UNION ALL
SELECT 
  '3. 老闆的商品數量',
  COUNT(*)::text,
  STRING_AGG(DISTINCT owner_id::text, ', ')
FROM products
WHERE owner_id IN (
  SELECT owner_id FROM staff_relationships WHERE staff_id = auth.uid()
)
AND is_active = TRUE
UNION ALL
SELECT 
  '4. 視圖返回的商品數量',
  COUNT(*)::text,
  STRING_AGG(DISTINCT access_type, ', ')
FROM staff_accessible_products
UNION ALL
SELECT 
  '5. 視圖是否存在',
  CASE WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'staff_accessible_products') 
    THEN '✅ 存在' 
    ELSE '❌ 不存在' 
  END,
  NULL;
```

**預期結果**：

| check_item | value | detail |
|------------|-------|--------|
| 1. 當前用戶 | [你的 ID] | [你的 Email] |
| 2. 員工關係數量 | 1 | active |
| 3. 老闆的商品數量 | 5 | [老闆的 ID] |
| 4. 視圖返回的商品數量 | 5 | staff |
| 5. 視圖是否存在 | ✅ 存在 | NULL |

---

## 步驟 5：修復方案

### 方案 1：重新執行 Migration 029

如果視圖有問題，重新執行：

```sql
-- 刪除舊視圖
DROP VIEW IF EXISTS staff_accessible_products;

-- 重新創建視圖（從 029_fix_staff_accessible_products.sql 複製）
CREATE OR REPLACE VIEW staff_accessible_products AS
-- 1. 員工可以查看老闆的商品
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN staff_relationships sr ON sr.owner_id = p.owner_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
AND p.is_active = TRUE

UNION ALL

-- 2. 老闆可以查看自己的商品
SELECT 
  p.*,
  p.owner_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
WHERE p.owner_id = auth.uid()
AND p.is_active = TRUE;
```

---

### 方案 2：更新商品的 owner_id

如果商品的 `owner_id` 是 NULL：

```sql
-- 從 events 表推斷 owner_id
UPDATE products p
SET owner_id = (
  SELECT e.actor_id 
  FROM events e 
  WHERE e.type = 'product_created' 
    AND (e.payload->>'productId')::UUID = p.id
  LIMIT 1
)
WHERE owner_id IS NULL;
```

---

### 方案 3：清除 IndexedDB 重新同步

在瀏覽器控制台執行：

```javascript
// 清除 IndexedDB
indexedDB.deleteDatabase('market-db');

// 重新載入頁面
location.reload();
```

---

## 📊 診斷結果報告

請執行以上步驟，並回報以下信息：

1. **步驟 1.7 的結果**：商品的 `owner_id` 是否正確？
2. **步驟 1.5 的結果**：視圖返回了多少個商品？
3. **步驟 2.2 的結果**：控制台顯示拉取了多少個商品？
4. **步驟 2.4 的結果**：IndexedDB 中有多少個商品？
5. **步驟 4 的結果**：一鍵診斷的完整輸出

根據這些信息，我可以精確定位問題並提供解決方案！🔍

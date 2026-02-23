# 員工無法看到新市集問題修復

## 問題描述

**現象**：老闆創建新市集後，員工帳號無法看到該市集。

**原因**：當老闆創建新市集時，系統只會：
1. ✅ 在 `markets` 表中創建市集記錄
2. ✅ 在 `market_members` 表中添加老闆為 owner
3. ❌ **沒有自動添加員工到 `market_members` 表**

員工視圖 `staff_accessible_markets` 是基於 `market_members` 表的，所以員工看不到新市集。

## 解決方案

執行 Migration 021，它會：
1. 創建自動化觸發器，當老闆創建新市集時自動添加員工
2. 補充所有現有市集的員工權限（一次性修復）

## 執行步驟

### 方法 1：使用 Supabase Dashboard

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點擊左側選單的「SQL Editor」
4. 點擊「New query」
5. 複製 `supabase/migrations/021_auto_add_staff_to_markets.sql` 的內容
6. 貼上到編輯器
7. 點擊「Run」執行

### 方法 2：使用 Supabase CLI

```bash
cd e:/market2
supabase db push
```

## 驗證修復

### 1. 檢查觸發器是否創建成功

在 SQL Editor 中執行：

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_add_staff_to_new_market';
```

應該看到觸發器資訊。

### 2. 檢查現有市集的員工權限是否已補充

```sql
-- 查詢每個市集的成員數量
SELECT 
  m.name AS "市集名稱",
  m.owner_id AS "老闆ID",
  COUNT(mm.user_id) AS "成員數量",
  STRING_AGG(mm.role, ', ') AS "角色列表"
FROM markets m
LEFT JOIN market_members mm ON m.id = mm.market_id
GROUP BY m.id, m.name, m.owner_id
ORDER BY m.created_at DESC;
```

每個市集應該至少有 2 個成員（1 個 owner + 1 個或多個 staff）。

### 3. 檢查特定員工能看到的市集

```sql
-- 替換為你的員工 user_id
SELECT 
  m.name AS "市集名稱",
  m.start_date AS "開始日期",
  mm.role AS "角色",
  mm.joined_at AS "加入時間"
FROM market_members mm
JOIN markets m ON mm.market_id = m.id
WHERE mm.user_id = 'your-staff-user-id-here'::UUID
ORDER BY m.start_date DESC;
```

### 4. 測試新市集創建

1. **使用老闆帳號**：
   - 創建一個新市集
   - 記下市集 ID

2. **檢查 market_members 表**：
   ```sql
   SELECT 
     user_id,
     role,
     joined_at
   FROM market_members
   WHERE market_id = 'new-market-id-here'::UUID;
   ```
   
   應該看到：
   - 1 筆 owner 記錄（老闆）
   - 1 筆或多筆 staff 記錄（員工）

3. **使用員工帳號**：
   - 登入員工帳號
   - 重新整理頁面或等待自動同步
   - 檢查市集列表，應該能看到新市集

## 手動修復（如果 Migration 執行失敗）

如果 Migration 執行失敗，可以手動執行以下 SQL：

```sql
-- 1. 查看哪些市集缺少員工權限
SELECT 
  m.id AS market_id,
  m.name AS market_name,
  m.owner_id,
  sr.staff_id,
  p.email AS staff_email
FROM markets m
CROSS JOIN staff_relationships sr
LEFT JOIN profiles p ON sr.staff_id = p.id
WHERE m.owner_id = sr.owner_id
  AND sr.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM market_members mm
    WHERE mm.market_id = m.id 
    AND mm.user_id = sr.staff_id
  )
ORDER BY m.created_at DESC;

-- 2. 如果上面的查詢顯示有缺少的關係，執行以下插入：
INSERT INTO market_members (market_id, user_id, role)
SELECT 
  m.id,
  sr.staff_id,
  'staff'
FROM markets m
CROSS JOIN staff_relationships sr
WHERE m.owner_id = sr.owner_id
  AND sr.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM market_members mm
    WHERE mm.market_id = m.id 
    AND mm.user_id = sr.staff_id
  )
ON CONFLICT (market_id, user_id) DO NOTHING;
```

## 前端同步

執行 Migration 後，員工需要重新同步數據：

### 方法 1：自動同步（推薦）

員工只需：
1. 重新整理頁面
2. 等待自動同步完成（約 5-10 秒）
3. 新市集應該會出現在列表中

### 方法 2：手動觸發同步

在瀏覽器 Console 中執行：

```javascript
// 觸發立即同步
window.dispatchEvent(new CustomEvent('trigger-sync'));

// 等待 3 秒後檢查
setTimeout(async () => {
  const { db } = await import('/lib/db/index.js');
  const markets = await db.markets.toArray();
  console.log('📊 本地市集數量:', markets.length);
  console.table(markets.map(m => ({
    名稱: m.name,
    日期: m.startDate,
    狀態: m.status
  })));
}, 3000);
```

### 方法 3：清除本地數據重新同步

如果自動同步沒有效果：

1. 打開開發者工具（F12）
2. Application → IndexedDB → `market_pulse` → 右鍵刪除資料庫
3. 重新載入頁面
4. 等待完整同步

## 常見問題

### Q1: 執行 Migration 後，員工還是看不到新市集？

**A**: 檢查以下幾點：
1. 員工是否在 `staff_relationships` 表中，且 `status = 'active'`
2. 員工是否已重新同步數據（重新整理頁面）
3. 檢查 `market_members` 表是否有該員工的記錄

### Q2: 舊市集也需要手動添加員工嗎？

**A**: 不需要！Migration 021 會自動補充所有現有市集的員工權限（一次性修復）。

### Q3: 如果我有多個員工，都會自動添加嗎？

**A**: 是的！觸發器會自動將該老闆的**所有活躍員工**添加到新市集。

### Q4: 員工離職後，如何移除他的市集訪問權限？

**A**: 有兩種方法：
1. 將 `staff_relationships` 表中的 `status` 改為 `'inactive'`
2. 直接從 `market_members` 表中刪除該員工的記錄

### Q5: 觸發器會影響性能嗎？

**A**: 不會。觸發器只在創建新市集時執行一次，且使用了 `ON CONFLICT DO NOTHING` 避免重複插入。

## 技術細節

### 觸發器邏輯

```sql
CREATE OR REPLACE FUNCTION auto_add_staff_to_new_market()
RETURNS TRIGGER AS $$
BEGIN
  -- 當新市集創建時，自動將該老闆的所有員工添加到 market_members
  INSERT INTO market_members (market_id, user_id, role)
  SELECT 
    NEW.id,           -- 新市集的 ID
    sr.staff_id,      -- 員工的 ID
    'staff'           -- 角色為 staff
  FROM staff_relationships sr
  WHERE sr.owner_id = NEW.owner_id
    AND sr.status = 'active'
  ON CONFLICT (market_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 觸發時機

- **AFTER INSERT ON markets**：在市集記錄插入後立即執行
- **FOR EACH ROW**：每個新市集都會觸發一次

### 安全性

- 使用 `SECURITY DEFINER` 確保觸發器有足夠權限執行
- 使用 `ON CONFLICT DO NOTHING` 避免重複插入錯誤

## 相關檔案

- `supabase/migrations/021_auto_add_staff_to_markets.sql` - Migration 檔案
- `supabase/migrations/20240220_staff_system_simple.sql` - 員工系統基礎架構

## 總結

執行 Migration 021 後：
- ✅ 老闆創建新市集時，員工會自動獲得訪問權限
- ✅ 所有現有市集的員工權限已補充
- ✅ 員工可以在員工模式下看到所有市集
- ✅ 未來不需要手動管理市集權限

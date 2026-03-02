// ========================================
// 員工商品同步診斷腳本（瀏覽器控制台版）
// ========================================
// 使用方式：
// 1. 以員工身份登入前端應用
// 2. 按 F12 打開開發者工具
// 3. 切換到 Console 標籤
// 4. 複製並執行此腳本
// ========================================

(async () => {
  try {
    console.log('========== 🔍 員工商品同步診斷開始 ==========\n');
    
    // ✅ 修正：使用正確的 import 路徑（相對路徑）
    const { supabase } = await import('./lib/supabase/client.ts');
    const { db } = await import('./lib/db/index.ts');
    
    // 1️⃣ 檢查當前用戶
    console.log('1️⃣ 檢查當前用戶...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ 無法獲取用戶信息:', userError);
      console.log('請確認已登入！');
      return;
    }
    
    console.log('✅ 當前用戶:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('');
    
    // 2️⃣ 檢查員工關係
    console.log('2️⃣ 檢查員工關係...');
    const { data: relationships, error: relError } = await supabase
      .from('staff_relationships')
      .select('*')
      .eq('staff_id', user.id);
    
    if (relError) {
      console.error('❌ 查詢員工關係失敗:', relError);
    } else {
      console.log(`✅ 員工關係: ${relationships?.length || 0} 個`);
      if (relationships && relationships.length > 0) {
        relationships.forEach((rel, index) => {
          console.log(`   [${index + 1}] 老闆 ID: ${rel.owner_id}`);
          console.log(`       狀態: ${rel.status}`);
          console.log(`       權限:`, rel.permissions);
        });
      } else {
        console.warn('⚠️ 沒有找到員工關係！請確認已加入團隊。');
      }
    }
    console.log('');
    
    // 3️⃣ 檢查老闆的商品（直接查詢 products 表）
    console.log('3️⃣ 檢查老闆的商品（直接查詢）...');
    const ownerIds = relationships?.map(r => r.owner_id) || [];
    
    if (ownerIds.length > 0) {
      const { data: ownerProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, owner_id, is_active, created_at')
        .in('owner_id', ownerIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (productsError) {
        console.error('❌ 查詢商品失敗:', productsError);
      } else {
        console.log(`✅ 老闆的商品: ${ownerProducts?.length || 0} 個`);
        if (ownerProducts && ownerProducts.length > 0) {
          ownerProducts.slice(0, 5).forEach((product, index) => {
            console.log(`   [${index + 1}] ${product.name}`);
            console.log(`       ID: ${product.id.substring(0, 8)}...`);
            console.log(`       Owner: ${product.owner_id.substring(0, 8)}...`);
          });
          if (ownerProducts.length > 5) {
            console.log(`   ... 還有 ${ownerProducts.length - 5} 個商品`);
          }
        } else {
          console.warn('⚠️ 老闆沒有創建任何商品！');
        }
      }
    } else {
      console.warn('⚠️ 沒有員工關係，無法查詢老闆的商品');
    }
    console.log('');
    
    // 4️⃣ 檢查視圖返回的商品
    console.log('4️⃣ 檢查視圖返回的商品...');
    const { data: viewProducts, error: viewError } = await supabase
      .from('staff_accessible_products')
      .select('id, name, access_type, relationship_owner_id, is_active')
      .order('created_at', { ascending: false });
    
    if (viewError) {
      console.error('❌ 查詢視圖失敗:', viewError);
      console.log('   可能原因：');
      console.log('   1. 視圖不存在（需要執行 Migration 029）');
      console.log('   2. RLS 政策阻止查詢');
    } else {
      console.log(`✅ 視圖返回的商品: ${viewProducts?.length || 0} 個`);
      if (viewProducts && viewProducts.length > 0) {
        viewProducts.slice(0, 5).forEach((product, index) => {
          console.log(`   [${index + 1}] ${product.name}`);
          console.log(`       ID: ${product.id.substring(0, 8)}...`);
          console.log(`       Access Type: ${product.access_type}`);
          console.log(`       Owner: ${product.relationship_owner_id?.substring(0, 8)}...`);
        });
        if (viewProducts.length > 5) {
          console.log(`   ... 還有 ${viewProducts.length - 5} 個商品`);
        }
      } else {
        console.warn('⚠️ 視圖沒有返回任何商品！');
        console.log('   可能原因：');
        console.log('   1. 視圖邏輯有問題');
        console.log('   2. 商品的 owner_id 不匹配');
        console.log('   3. 商品的 is_active = FALSE');
      }
    }
    console.log('');
    
    // 5️⃣ 檢查 IndexedDB 中的商品
    console.log('5️⃣ 檢查 IndexedDB 中的商品...');
    try {
      const localProducts = await db.products.toArray();
      console.log(`✅ IndexedDB 中的商品: ${localProducts.length} 個`);
      if (localProducts.length > 0) {
        localProducts.slice(0, 5).forEach((product, index) => {
          console.log(`   [${index + 1}] ${product.name}`);
          console.log(`       ID: ${product.id?.substring(0, 8)}...`);
          console.log(`       Owner: ${product.owner_id?.substring(0, 8)}...`);
        });
        if (localProducts.length > 5) {
          console.log(`   ... 還有 ${localProducts.length - 5} 個商品`);
        }
      } else {
        console.warn('⚠️ IndexedDB 中沒有商品！');
        console.log('   可能原因：');
        console.log('   1. 同步尚未執行');
        console.log('   2. 同步失敗');
      }
    } catch (dbError) {
      console.error('❌ 讀取 IndexedDB 失敗:', dbError);
    }
    console.log('');
    
    // 6️⃣ 檢查員工模式狀態
    console.log('6️⃣ 檢查員工模式狀態...');
    try {
      const { isStaffModeEnabled } = await import('./lib/db/feature-flags.ts');
      const staffModeEnabled = isStaffModeEnabled();
      console.log(`✅ 員工模式: ${staffModeEnabled ? '已啟用 ✓' : '未啟用 ✗'}`);
      
      if (!staffModeEnabled && relationships && relationships.length > 0) {
        console.warn('⚠️ 警告：已加入團隊但員工模式未啟用！');
        console.log('   請在設置中啟用員工模式');
      }
    } catch (error) {
      console.error('❌ 檢查員工模式失敗:', error);
    }
    console.log('');
    
    // 📊 診斷總結
    console.log('========== 📊 診斷總結 ==========\n');
    
    const hasRelationship = relationships && relationships.length > 0;
    const hasOwnerProducts = ownerIds.length > 0;
    const viewReturnsProducts = viewProducts && viewProducts.length > 0;
    const hasLocalProducts = (await db.products.count()) > 0;
    
    if (hasRelationship && hasOwnerProducts && viewReturnsProducts && hasLocalProducts) {
      console.log('✅ 一切正常！員工可以看到老闆的商品。');
    } else {
      console.log('❌ 發現問題：\n');
      
      if (!hasRelationship) {
        console.log('🔴 問題 1：沒有員工關係');
        console.log('   解決方案：請老闆重新邀請你加入團隊\n');
      }
      
      if (hasRelationship && !hasOwnerProducts) {
        console.log('🔴 問題 2：老闆沒有創建商品');
        console.log('   解決方案：請老闆先創建商品\n');
      }
      
      if (hasRelationship && hasOwnerProducts && !viewReturnsProducts) {
        console.log('🔴 問題 3：視圖沒有返回商品');
        console.log('   可能原因：');
        console.log('   - 視圖不存在或邏輯錯誤');
        console.log('   - 商品的 owner_id 不正確');
        console.log('   解決方案：執行 Migration 029 修復視圖\n');
      }
      
      if (hasRelationship && hasOwnerProducts && viewReturnsProducts && !hasLocalProducts) {
        console.log('🔴 問題 4：IndexedDB 中沒有商品');
        console.log('   可能原因：');
        console.log('   - 同步尚未執行');
        console.log('   - 同步邏輯有問題');
        console.log('   解決方案：手動觸發同步\n');
        console.log('   執行以下代碼觸發同步：');
        console.log('   window.dispatchEvent(new Event("trigger-sync"));');
      }
    }
    
    console.log('\n========== 🔍 診斷完成 ==========');
    
  } catch (error) {
    console.error('❌ 診斷過程中發生錯誤:', error);
    console.log('\n請確認：');
    console.log('1. 已在前端應用中執行此腳本（不是 SQL Editor）');
    console.log('2. 已登入用戶');
    console.log('3. 網路連線正常');
  }
})();

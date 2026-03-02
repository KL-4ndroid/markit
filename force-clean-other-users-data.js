// ==========================================
// 強制清理其他用戶數據腳本
// ==========================================
// 使用方式：
// 1. 以員工身份登入前端應用
// 2. 按 F12 打開開發者工具
// 3. 切換到 Console 標籤
// 4. 複製並執行此腳本
// ==========================================

(async () => {
  try {
    console.log('========== 🧹 強制清理其他用戶數據 ==========\n');
    
    // 1. 獲取當前用戶
    const { supabase } = await import('./lib/supabase/client.ts');
    const { db } = await import('./lib/db/index.ts');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ 無法獲取用戶信息:', userError);
      return;
    }
    
    console.log('✅ 當前用戶:', user.id.substring(0, 8), user.email);
    console.log('');
    
    // 2. 檢查 IndexedDB 中的數據
    console.log('📊 檢查 IndexedDB 中的數據...');
    
    const allMarkets = await db.markets.toArray();
    const allProducts = await db.products.toArray();
    const allEvents = await db.events.toArray();
    
    console.log(`   市集總數: ${allMarkets.length}`);
    console.log(`   商品總數: ${allProducts.length}`);
    console.log(`   事件總數: ${allEvents.length}`);
    console.log('');
    
    // 3. 分析數據所有權
    console.log('🔍 分析數據所有權...');
    
    const myMarkets = allMarkets.filter(m => m.owner_id === user.id || m.owner_id === 'local');
    const otherMarkets = allMarkets.filter(m => m.owner_id && m.owner_id !== user.id && m.owner_id !== 'local');
    
    const myProducts = allProducts.filter(p => p.owner_id === user.id || p.owner_id === 'local');
    const otherProducts = allProducts.filter(p => p.owner_id && p.owner_id !== user.id && p.owner_id !== 'local');
    
    const myEvents = allEvents.filter(e => e.actor_id === user.id || e.actor_id === 'local');
    const otherEvents = allEvents.filter(e => e.actor_id && e.actor_id !== user.id && e.actor_id !== 'local');
    
    console.log(`   我的市集: ${myMarkets.length}`);
    console.log(`   其他用戶的市集: ${otherMarkets.length}`);
    console.log(`   我的商品: ${myProducts.length}`);
    console.log(`   其他用戶的商品: ${otherProducts.length}`);
    console.log(`   我的事件: ${myEvents.length}`);
    console.log(`   其他用戶的事件: ${otherEvents.length}`);
    console.log('');
    
    // 4. 顯示其他用戶的數據詳情
    if (otherMarkets.length > 0) {
      console.log('🔴 其他用戶的市集:');
      otherMarkets.slice(0, 5).forEach((m, i) => {
        console.log(`   [${i + 1}] ${m.name} (owner: ${m.owner_id?.substring(0, 8)})`);
      });
      if (otherMarkets.length > 5) {
        console.log(`   ... 還有 ${otherMarkets.length - 5} 個`);
      }
      console.log('');
    }
    
    if (otherProducts.length > 0) {
      console.log('🔴 其他用戶的商品:');
      otherProducts.slice(0, 5).forEach((p, i) => {
        console.log(`   [${i + 1}] ${p.name} (owner: ${p.owner_id?.substring(0, 8)})`);
      });
      if (otherProducts.length > 5) {
        console.log(`   ... 還有 ${otherProducts.length - 5} 個`);
      }
      console.log('');
    }
    
    // 5. 詢問是否清理
    const shouldClean = confirm(
      `發現 ${otherMarkets.length} 個其他用戶的市集、${otherProducts.length} 個商品、${otherEvents.length} 個事件。\n\n是否立即清理？`
    );
    
    if (!shouldClean) {
      console.log('❌ 用戶取消清理');
      return;
    }
    
    // 6. 開始清理
    console.log('🧹 開始清理其他用戶的數據...');
    console.log('');
    
    let deletedCount = {
      markets: 0,
      products: 0,
      events: 0,
      stats: 0,
    };
    
    // 6.1 清理市集
    console.log('🗑️ 清理市集...');
    for (const market of otherMarkets) {
      if (market.id) {
        await db.markets.delete(market.id);
        deletedCount.markets++;
        
        // 清理相關統計
        const stats = await db.dailyStats.where('marketId').equals(market.id).toArray();
        for (const stat of stats) {
          if (stat.id) {
            await db.dailyStats.delete(stat.id);
            deletedCount.stats++;
          }
        }
      }
    }
    console.log(`   ✅ 已清理 ${deletedCount.markets} 個市集`);
    
    // 6.2 清理商品
    console.log('🗑️ 清理商品...');
    for (const product of otherProducts) {
      if (product.id) {
        await db.products.delete(product.id);
        deletedCount.products++;
      }
    }
    console.log(`   ✅ 已清理 ${deletedCount.products} 個商品`);
    
    // 6.3 清理事件
    console.log('🗑️ 清理事件...');
    for (const event of otherEvents) {
      if (event.id) {
        await db.events.delete(event.id);
        deletedCount.events++;
      }
    }
    console.log(`   ✅ 已清理 ${deletedCount.events} 個事件`);
    
    console.log('');
    console.log('========== ✅ 清理完成 ==========');
    console.log('清理統計:', deletedCount);
    console.log('');
    
    // 7. 驗證清理結果
    console.log('🔍 驗證清理結果...');
    
    const { validateDataIsolation } = await import('./lib/db/clear-user-data.ts');
    const validation = await validateDataIsolation(user.id);
    
    if (validation.isValid) {
      console.log('✅ 數據隔離性驗證通過！');
      console.log('');
      console.log('🎉 所有其他用戶的數據已清理完成！');
      console.log('');
      console.log('建議：重新載入頁面以確保 UI 更新');
      
      const shouldReload = confirm('是否重新載入頁面？');
      if (shouldReload) {
        location.reload();
      }
    } else {
      console.error('❌ 數據隔離性驗證失敗:', validation.violations);
      console.log('');
      console.log('⚠️ 可能還有殘留數據，建議：');
      console.log('1. 重新執行此腳本');
      console.log('2. 或者清除整個 IndexedDB：');
      console.log('   indexedDB.deleteDatabase("MarketPulseDB");');
      console.log('   location.reload();');
    }
    
  } catch (error) {
    console.error('❌ 清理過程中發生錯誤:', error);
  }
})();
